import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getPrimaryKey } from "../../../keys-store";
import { addPrediction } from "../../../prediction-tracker";
import { analyzeWeeklyGames, ModelCalibration } from "../../../weekly-analyzer";
import { fetchScheduleFromOddsApi } from "../../../weekly-page.helpers";

const prognoDir = path.join(process.cwd(), ".progno");

function saveJson(filename: string, data: any) {
  if (!fs.existsSync(prognoDir)) fs.mkdirSync(prognoDir, { recursive: true });
  fs.writeFileSync(path.join(prognoDir, filename), JSON.stringify(data, null, 2), "utf8");
}

function loadCalibration(): ModelCalibration | undefined {
  const file = path.join(prognoDir, "calibration.json");
  if (!fs.existsSync(file)) return undefined;
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as ModelCalibration;
  } catch {
    return undefined;
  }
}

async function runFridayJob() {
  const key = getPrimaryKey();
  if (!key) throw new Error("No API key configured");

  const games = await fetchScheduleFromOddsApi(key, "NFL" as any);
  if (!games.length) throw new Error("No games returned");

  const stamp = new Date().toISOString().split("T")[0];
  saveJson(`odds-${stamp}.json`, games);
  saveJson(`odds-latest.json`, games);

  const calibration = loadCalibration();
  const result = await analyzeWeeklyGames(games, calibration);
  for (const pred of result?.predictions ?? []) {
    addPrediction(pred.game.id, pred, "NFL");
  }
  saveJson(`picks-${stamp}.json`, result?.predictions);
  saveJson(`picks-latest.json`, result?.predictions);

  return {
    games: games.length,
    bestBets: result.summary.bestBets.length
  };
}

export async function GET() {
  try {
    const result = await runFridayJob();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runFridayJob();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


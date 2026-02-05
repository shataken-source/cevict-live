/**
 * Friday cron: fetch weekly odds, run analysis, persist odds + predictions.
 * Usage:
 *   ODDS_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/cron-friday.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fetchScheduleFromOddsApi } from "../weekly-page.helpers";
import { analyzeWeeklyGames, ModelCalibration } from "../weekly-analyzer";
import { addPrediction } from "../prediction-tracker";
import { getPrimaryKey } from "../keys-store";

const key = getPrimaryKey();
const sport = "NFL";

if (!key) {
  console.error("Set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY");
  process.exit(1);
}

const prognoDir = path.join(process.cwd(), ".progno");
if (!fs.existsSync(prognoDir)) fs.mkdirSync(prognoDir, { recursive: true });

function saveJson(filename: string, data: any) {
  const file = path.join(prognoDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
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

(async () => {
  const games = await fetchScheduleFromOddsApi(key, sport as any);
  if (!games.length) {
    console.error("No games returned");
    return;
  }

  const stamp = new Date().toISOString().split("T")[0];
  saveJson(`odds-${stamp}.json`, games);
  saveJson(`odds-latest.json`, games);

  const calibration = loadCalibration();
  const result = await analyzeWeeklyGames(games, calibration);
  // Persist all predictions to file-backed tracker
  for (const pred of result?.predictions ?? []) {
    addPrediction(pred.game.id, pred, sport);
  }
  saveJson(`picks-${stamp}.json`, result?.predictions);
  saveJson(`picks-latest.json`, result?.predictions);

  console.log(`Saved odds and picks for ${games.length} games`);
  console.log(`Best bets: ${result.summary.bestBets.length}`);
})();


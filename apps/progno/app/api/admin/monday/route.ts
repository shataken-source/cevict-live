import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getPrimaryKey } from "../../../keys-store";
import { getAccuracyMetrics } from "../../../prediction-tracker";
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from "../../../weekly-page.helpers";

export const runtime = 'nodejs';

const prognoDir = path.join(process.cwd(), ".progno");

function saveJson(filename: string, data: any) {
  if (!fs.existsSync(prognoDir)) fs.mkdirSync(prognoDir, { recursive: true });
  fs.writeFileSync(path.join(prognoDir, filename), JSON.stringify(data, null, 2), "utf8");
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

async function computeSpreadTotalBias(
  apiKey: string,
  games: any[]
): Promise<{ spreadBiasDelta: number; totalBiasDelta: number }> {
  const sportKey = "americanfootball_nfl";
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=5&apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { spreadBiasDelta: 0, totalBiasDelta: 0 };
    const data = await res.json();
    if (!Array.isArray(data)) return { spreadBiasDelta: 0, totalBiasDelta: 0 };

    const norm = (name: string) => name?.toLowerCase().replace(/\s+/g, "") || "";

    let spreadErrors: number[] = [];
    let totalErrors: number[] = [];

    for (const g of data) {
      if (!g.completed || !g.scores || !Array.isArray(g.scores)) continue;
      const homeTeam = g.home_team;
      const awayTeam = g.away_team;
      const homeScoreEntry = g.scores.find((s: any) => norm(s.name) === norm(homeTeam));
      const awayScoreEntry = g.scores.find((s: any) => norm(s.name) === norm(awayTeam));
      if (!homeScoreEntry || !awayScoreEntry) continue;

      const homeScore = Number(homeScoreEntry.score ?? homeScoreEntry.points ?? 0);
      const awayScore = Number(awayScoreEntry.score ?? awayScoreEntry.points ?? 0);

      const matchingGame = games.find(
        gg => norm(gg.homeTeam) === norm(homeTeam) && norm(gg.awayTeam) === norm(awayTeam)
      );
      if (!matchingGame || !matchingGame.odds) continue;

      const spread = typeof matchingGame.odds.spread === "number" ? matchingGame.odds.spread : 0;
      const expectedMargin = -spread;
      const actualMargin = homeScore - awayScore;
      spreadErrors.push(actualMargin - expectedMargin);

      if (typeof matchingGame.odds.total === "number") {
        const expectedTotal = matchingGame.odds.total;
        const actualTotal = homeScore + awayScore;
        totalErrors.push(actualTotal - expectedTotal);
      }
    }

    const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const meanSpreadError = mean(spreadErrors);
    const meanTotalError = mean(totalErrors);

    const spreadBiasDelta = clamp(-meanSpreadError * 0.05, -0.5, 0.5);
    const totalBiasDelta = clamp(meanTotalError * 0.05, -1.0, 1.0);

    return { spreadBiasDelta, totalBiasDelta };
  } catch {
    return { spreadBiasDelta: 0, totalBiasDelta: 0 };
  }
}

function updateCalibration(
  metrics: any,
  bias: { spreadBiasDelta: number; totalBiasDelta: number }
) {
  const file = path.join(prognoDir, "calibration.json");
  let current: { spreadBias?: number; totalBias?: number; confidenceBias?: number } = {};
  if (fs.existsSync(file)) {
    try {
      current = JSON.parse(fs.readFileSync(file, "utf8")) || {};
    } catch {
      current = {};
    }
  }

  const avgConf = metrics.averageConfidence || 0;
  const winRate = metrics.winRate || 0;
  const diff = winRate - avgConf;

  const nextConfidenceBias = clamp((current.confidenceBias || 0) + diff * 0.25, -0.05, 0.05);
  const nextSpreadBias = clamp((current.spreadBias || 0) + (bias.spreadBiasDelta || 0), -3, 3);
  const nextTotalBias = clamp((current.totalBias || 0) + (bias.totalBiasDelta || 0), -10, 10);

  const next = {
    ...current,
    confidenceBias: Number(nextConfidenceBias.toFixed(4)),
    spreadBias: Number(nextSpreadBias.toFixed(3)),
    totalBias: Number(nextTotalBias.toFixed(3))
  };

  saveJson("calibration.json", next);
}

async function runMondayJob() {
  const key = getPrimaryKey();
  if (!key) throw new Error("No API key configured");

  const games = await fetchScheduleFromOddsApi(key, "NFL" as any);
  const scoreResult = await fetchScoresAndUpdatePredictions(key, "NFL" as any, games, 5);
  const metrics = getAccuracyMetrics();
  const bias = await computeSpreadTotalBias(key, games);
  const stamp = new Date().toISOString().split("T")[0];

  const payload = {
    scoreResult,
    metrics,
    generatedAt: new Date().toISOString()
  };
  saveJson(`results-${stamp}.json`, payload);
  saveJson(`results-latest.json`, payload);

  updateCalibration(metrics, bias);

  return {
    completedGames: scoreResult.completedGames,
    predictionsUpdated: scoreResult?.predictionsUpdated,
    winRate: metrics.winRate,
    roi: metrics.roi,
    totalPredictions: metrics.totalPredictions
  };
}

export async function GET() {
  try {
    const result = await runMondayJob();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runMondayJob();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


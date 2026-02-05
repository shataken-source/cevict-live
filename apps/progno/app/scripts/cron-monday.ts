/**
 * Monday cron: fetch finals, grade predictions, save results/metrics.
 * Usage:
 *   ODDS_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/cron-monday.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from "../weekly-page.helpers";
import { getAccuracyMetrics } from "../prediction-tracker";
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
      const expectedMargin = -spread; // home margin implied by line
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

    // Small step sizes so adjustments are gradual.
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
  const diff = winRate - avgConf; // <0 = overconfident

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

(async () => {
  // Grab schedule for mapping/team names (helps score matching)
  const games = await fetchScheduleFromOddsApi(key, sport as any);
  const stamp = new Date().toISOString().split("T")[0];

  const scoreResult = await fetchScoresAndUpdatePredictions(key, sport as any, games, 5);
  const metrics = getAccuracyMetrics();
  const bias = await computeSpreadTotalBias(key, games);

  const payload = {
    scoreResult,
    metrics,
    generatedAt: new Date().toISOString()
  };
  saveJson(`results-${stamp}.json`, payload);
  saveJson(`results-latest.json`, payload);

  updateCalibration(metrics, bias);

  console.log(
    `Finals imported: ${scoreResult.completedGames}, predictions updated: ${scoreResult?.predictionsUpdated}`
  );
  console.log(
    `Win rate: ${(metrics.winRate * 100).toFixed(1)}%, ROI: ${metrics.roi.toFixed(1)}% on ${metrics.totalPredictions} preds`
  );
})();


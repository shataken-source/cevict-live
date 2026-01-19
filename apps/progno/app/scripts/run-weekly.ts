/**
 * Quick runner: fetch this week's NFL games via The Odds API and run the weekly analyzer.
 * Usage:
 *   ODDS_API_KEY=your_key pnpm ts-node apps/progno/app/scripts/run-weekly.ts
 * Falls back to NEXT_PUBLIC_ODDS_API_KEY if ODDS_API_KEY is not set.
 */

import { addPrediction } from "../prediction-tracker";
import { analyzeWeeklyGames } from "../weekly-analyzer";
import { fetchScheduleFromOddsApi } from "../weekly-page.helpers";

const key = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;
const sport = "NFL";

if (!key) {
  console.error("Set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY");
  process.exit(1);
}

(async () => {
  const games = await fetchScheduleFromOddsApi(key, sport as any);
  if (!games.length) {
    console.error("No games returned");
    return;
  }

  const result = await analyzeWeeklyGames(games);
  console.log(`Total games: ${result.summary.totalGames}`);
  console.log(`Best bets: ${result.summary.bestBets.length}`);
  console.log("");

  const best = result.summary.bestBets
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);

  // Persist predictions for cron/score tracking (store all, not only best).
  for (const pred of result?.predictions ?? []) {
    addPrediction(pred.game.id, pred, sport);
  }

  for (const bet of best) {
    const dt = bet.game.date ? new Date(bet.game.date).toLocaleString() : "TBD";
    console.log(
      `${bet.game.homeTeam} vs ${bet.game.awayTeam} | kickoff: ${dt} | pick: ${bet.pick} ` +
      `conf ${(bet.confidence * 100).toFixed(1)}% | edge ${(bet.edge * 100).toFixed(1)}% | ` +
      `score ${bet.predictedScore.home}-${bet.predictedScore.away} | spread ${bet.game.odds?.spread ?? "n/a"} total ${bet.game.odds?.total ?? "n/a"}`
    );
  }
})();


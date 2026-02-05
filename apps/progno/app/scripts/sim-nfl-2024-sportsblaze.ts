/**
 * One-off NFL 2024 season simulation using SportsBlaze schedules.
 *
 * Usage (from monorepo root):
 *   SPORTSBLAZE_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/sim-nfl-2024-sportsblaze.ts
 *
 * This intentionally does NOT depend on The Odds API – it uses only SportsBlaze
 * season schedule + final scores, feeding neutral odds into the Progno engine.
 */

import { getSportsBlazeKey } from "../keys-store";
import { fetchSportsBlazeSeasonSchedule, mapSportsBlazeGamesToPrognoGames } from "../sportsblaze-fetcher";
import { analyzeWeeklyGames, Game, ModelCalibration } from "../weekly-analyzer";

// Lightweight calibration loader – if the regular calibration file exists,
// we use it so the sim matches the live engine behaviour as closely as possible.
async function loadCalibrationIfAvailable(): Promise<ModelCalibration | undefined> {
  try {
    // Dynamic imports keep Next.js client bundles clean.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const calibPath = path.join(process.cwd(), ".progno", "calibration.json");
    if (!fs.existsSync(calibPath)) return undefined;
    const raw = fs.readFileSync(calibPath, "utf8");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed as ModelCalibration;
  } catch {
    return undefined;
  }
}

interface SimResult {
  totalGames: number;
  decidedGames: number;
  correctPicks: number;
  pushGames: number;
}

function evaluateSeason(games: Game[]): SimResult {
  let totalGames = 0;
  let decidedGames = 0;
  let correctPicks = 0;
  let pushGames = 0;

  const byWeek: Record<number, Game[]> = {};

  for (const g of games) {
    // Season week may not be present; infer roughly from date ordering.
    const week = (g as any).season?.week ?? 0;
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(g);
  }

  const weeks = Object.keys(byWeek)
    .map(w => Number(w))
    .sort((a, b) => a - b);

  for (const week of weeks) {
    const weekGames = byWeek[week];
    if (!weekGames || weekGames.length === 0) continue;
    totalGames += weekGames.length;
  }

  // Because we want a simple, readable CLI script, we do a second pass now
  // once we have calibration in hand.
  return { totalGames, decidedGames, correctPicks, pushGames };
}

async function run() {
  const apiKey = getSportsBlazeKey();
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error("SportsBlaze API key is required. Set SPORTSBLAZE_API_KEY or add a 'SportsBlaze' key in the admin panel.");
    process.exit(1);
  }

  const season = 2024;
  // We ask for all games and then keep only those that have a final score.
  const seasonData = await fetchSportsBlazeSeasonSchedule(
    apiKey,
    season,
    { type: "Regular Season" },
    "nfl"
  );

  const allGames = mapSportsBlazeGamesToPrognoGames(seasonData.games || [], "nfl");

  const completedGames = allGames.filter(
    g => g.isCompleted && g.liveScore && typeof g.liveScore.home === "number" && typeof g.liveScore.away === "number"
  );

  if (completedGames.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No completed games with scores were found for the 2024 season in SportsBlaze data.");
    process.exit(0);
  }

  const calibration = await loadCalibrationIfAvailable();

  let total = 0;
  let decided = 0;
  let correct = 0;

  // Simple per-game loop: this is intentionally straightforward so it's easy
  // to inspect and tweak later.
  for (const game of completedGames) {
    total++;
    const weekly = await analyzeWeeklyGames([game], calibration);
    const prediction = weekly.predictions[0];
    if (!prediction) continue;

    const actualHome = game.liveScore!.home;
    const actualAway = game.liveScore!.away;

    if (actualHome === actualAway) {
      // Push – tie game.
      continue;
    }

    decided++;
    const actualWinner = actualHome > actualAway ? game.homeTeam : game.awayTeam;
    if (prediction.pick === actualWinner) {
      correct++;
    }
  }

  const accuracy = decided > 0 ? (correct / decided) * 100 : 0;

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        season,
        provider: "SportsBlaze",
        totalGamesConsidered: total,
        decidedGames: decided,
        correctPicks: correct,
        accuracyPct: Number(accuracy.toFixed(2))
      },
      null,
      2
    )
  );
}

void run();



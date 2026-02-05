/**
 * Multi-league 2024 season simulation using SportsBlaze schedules.
 *
 * Usage (from monorepo root):
 *   SPORTSBLAZE_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/sim-all-2024-sportsblaze.ts
 *
 * This runs NFL, NBA, MLB, and NHL through the same Progno weekly analyzer
 * with neutral odds, using only SportsBlaze schedules + final scores.
 */

import { getSportsBlazeKey } from "../keys-store";
import { fetchSportsBlazeSeasonSchedule, mapSportsBlazeGamesToPrognoGames, SportsBlazeLeagueId } from "../sportsblaze-fetcher";
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

interface LeagueSimConfig {
  league: SportsBlazeLeagueId;
  sportLabel: Game["sport"];
  season: number;
  type: string; // e.g. "Regular Season"
}

interface LeagueSimResult {
  league: SportsBlazeLeagueId;
  sport: Game["sport"];
  season: number;
  decidedGames: number;
  totalGamesConsidered: number;
  correctPicks: number;
  accuracyPct: number;
}

async function simulateLeagueSeason(config: LeagueSimConfig, calibration?: ModelCalibration): Promise<LeagueSimResult> {
  const apiKey = getSportsBlazeKey();
  if (!apiKey) {
    throw new Error(
      "SportsBlaze API key is required. Set SPORTSBLAZE_API_KEY or add a 'SportsBlaze' key via the Progno admin panel."
    );
  }

  const seasonData = await fetchSportsBlazeSeasonSchedule(
    apiKey,
    config.season,
    { type: config.type },
    config.league
  );

  const allGames = mapSportsBlazeGamesToPrognoGames(seasonData.games || [], config.league).map(g => ({
    ...g,
    sport: config.sportLabel
  }));

  const completedGames = allGames.filter(
    g =>
      g.isCompleted &&
      g.liveScore &&
      typeof g.liveScore.home === "number" &&
      typeof g.liveScore.away === "number"
  );

  if (completedGames.length === 0) {
    return {
      league: config.league,
      sport: config.sportLabel,
      season: config.season,
      decidedGames: 0,
      totalGamesConsidered: 0,
      correctPicks: 0,
      accuracyPct: 0
    };
  }

  let total = 0;
  let decided = 0;
  let correct = 0;

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

  return {
    league: config.league,
    sport: config.sportLabel,
    season: config.season,
    decidedGames: decided,
    totalGamesConsidered: total,
    correctPicks: correct,
    accuracyPct: Number(accuracy.toFixed(2))
  };
}

async function run() {
  const calibration = await loadCalibrationIfAvailable();

  const leagues: LeagueSimConfig[] = [
    { league: "nfl", sportLabel: "NFL", season: 2024, type: "Regular Season" },
    { league: "nba", sportLabel: "NBA", season: 2024, type: "Regular Season" },
    { league: "mlb", sportLabel: "MLB", season: 2024, type: "Regular Season" },
    { league: "nhl", sportLabel: "NHL", season: 2024, type: "Regular Season" }
  ];

  const results: LeagueSimResult[] = [];

  for (const cfg of leagues) {
    // eslint-disable-next-line no-console
    console.log(`Simulating ${cfg.sportLabel} ${cfg.season} season via SportsBlaze (${cfg.league})...`);
    try {
      const res = await simulateLeagueSeason(cfg, calibration);
      results.push(res);
      // eslint-disable-next-line no-console
      console.log(
        `  ${cfg.sportLabel}: ${res.correctPicks}/${res.decidedGames} correct ` +
          `(${res.accuracyPct.toFixed(2)}% over ${res.totalGamesConsidered} games considered)`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`  ${cfg.sportLabel} sim failed:`, err);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        provider: "SportsBlaze",
        calibrationUsed: Boolean(calibration),
        leagues: results
      },
      null,
      2
    )
  );
}

void run();



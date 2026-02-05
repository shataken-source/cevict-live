/**
 * Tuesday cron: Update scores for all leagues
 * Usage:
 *   ODDS_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/cron-tuesday.ts
 */

import { getPrimaryKey } from "../keys-store";
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from "../weekly-page.helpers";
import { getAccuracyMetrics } from "../prediction-tracker";
import fs from "node:fs";
import path from "node:path";

const ALL_LEAGUES = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"] as const;

const key = getPrimaryKey();

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

(async () => {
  const stamp = new Date().toISOString().split("T")[0];
  const results: Record<string, any> = {};
  let totalCompleted = 0;
  let totalUpdated = 0;

  console.log("Starting Tuesday update for all leagues...");

  // Load all games from Friday picks (all leagues combined)
  let allGamesBySport: Record<string, any[]> = {};
  try {
    // First try the combined all-leagues picks file
    const allPicksFile = path.join(prognoDir, `picks-all-leagues-latest.json`);
    if (fs.existsSync(allPicksFile)) {
      const allPicksData = JSON.parse(fs.readFileSync(allPicksFile, "utf8"));
      if (Array.isArray(allPicksData)) {
        // Extract games from picks - each pick has a "game" property
        allPicksData.forEach((pick: any) => {
          // Get sport from pick.sport or pick.game.sport
          const sport = pick.sport || pick.game?.sport || "NFL";
          if (!allGamesBySport[sport]) allGamesBySport[sport] = [];
          // Extract the game object from the pick
          if (pick.game && typeof pick.game === 'object') {
            allGamesBySport[sport].push(pick.game);
          }
        });
        const totalGames = Object.values(allGamesBySport).reduce((sum, games) => sum + games.length, 0);
        console.log(`Loaded all-leagues picks: ${totalGames} total games across ${Object.keys(allGamesBySport).length} leagues`);
        console.log(`  Breakdown: ${Object.keys(allGamesBySport).map(s => `${s}:${allGamesBySport[s].length}`).join(", ")}`);
      }
    }
  } catch (err) {
    console.warn("Could not load all-leagues picks file, will try individual files...", err);
  }

  // Process all leagues in parallel
  const leaguePromises = ALL_LEAGUES.map(async (sport) => {
    try {
      console.log(`Processing ${sport}...`);

      // Load games for this league
      // Priority: 1) All-leagues picks, 2) Individual league picks, 3) Current schedule API
      let games: any[] = [];

      // Try from all-leagues picks first
      if (allGamesBySport[sport] && allGamesBySport[sport].length > 0) {
        games = allGamesBySport[sport];
        console.log(`Loaded ${games.length} games from all-leagues picks for ${sport}`);
      } else {
        // Fallback to individual league picks file
        try {
          const picksFile = path.join(prognoDir, `picks-${sport}-latest.json`);
          if (fs.existsSync(picksFile)) {
            const picksData = JSON.parse(fs.readFileSync(picksFile, "utf8"));
            if (Array.isArray(picksData) && picksData.length > 0) {
              games = picksData.map((p: any) => p.game).filter((g: any) => g);
              console.log(`Loaded ${games.length} games from individual picks file for ${sport}`);
            }
          }
        } catch (err) {
          console.warn(`Could not load individual picks for ${sport}, trying schedule...`);
        }

        // Final fallback to current schedule API
        if (games.length === 0) {
          try {
            games = await fetchScheduleFromOddsApi(key, sport as any);
            console.log(`Loaded ${games.length} games from schedule API for ${sport}`);
          } catch (err) {
            console.warn(`Could not fetch schedule for ${sport}, continuing...`);
          }
        }
      }

      // Fetch scores and update predictions (look back 7 days to catch weekend games)
      const scoreResult = await fetchScoresAndUpdatePredictions(key, sport as any, games, 7);

      totalCompleted += scoreResult.completedGames;
      totalUpdated += scoreResult?.predictionsUpdated;

      console.log(`${sport}: ${scoreResult.completedGames} completed, ${scoreResult?.predictionsUpdated} updated`);

      return {
        sport,
        success: true,
        ...scoreResult
      };
    } catch (error: any) {
      console.error(`Error processing ${sport}:`, error);
      return {
        sport,
        success: false,
        error: error.message || "Unknown error",
        completedGames: 0,
        predictionsUpdated: 0,
        cursorLearnGames: 0
      };
    }
  });

  const leagueResults = await Promise.all(leaguePromises);

  // Get overall metrics
  const metrics = getAccuracyMetrics();

  // Save results
  const payload = {
    leagueResults,
    metrics,
    summary: {
      totalCompleted,
      totalUpdated,
      timestamp: new Date().toISOString()
    }
  };

  saveJson(`results-all-leagues-${stamp}.json`, payload);
  saveJson(`results-all-leagues-latest.json`, payload);

  const successCount = leagueResults.filter(r => r.success).length;

  console.log("\n=== Tuesday Update Complete ===");
  console.log(`Leagues processed: ${successCount}/${ALL_LEAGUES.length}`);
  console.log(`Total completed games: ${totalCompleted}`);
  console.log(`Total predictions updated: ${totalUpdated}`);
  console.log(`Overall win rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`Overall ROI: ${metrics.roi.toFixed(1)}%`);

  // Exit with error code if any leagues failed
  if (successCount < ALL_LEAGUES.length) {
    process.exit(1);
  }
})().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


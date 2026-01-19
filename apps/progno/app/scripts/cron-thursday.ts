/**
 * Thursday cron: Complete weekly cycle
 * 1. Update final scores from previous week (learn from results)
 * 2. Load odds and make picks for the week ahead
 *
 * Usage:
 *   ODDS_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/cron-thursday.ts
 */

import fs from "node:fs";
import path from "node:path";
import { getPrimaryKey } from "../keys-store";
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from "../weekly-page.helpers";
import { analyzeWeeklyGames, ModelCalibration } from "../weekly-analyzer";
import { addPrediction } from "../prediction-tracker";
import { getAccuracyMetrics } from "../prediction-tracker";

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
  const stamp = new Date().toISOString().split("T")[0];

  console.log("=".repeat(60));
  console.log("THURSDAY WEEKLY CYCLE - Complete Update");
  console.log("=".repeat(60));
  console.log(`Date: ${stamp}\n`);

  // ============================================================
  // PHASE 1: UPDATE FINALS & LEARN FROM PREVIOUS WEEK
  // ============================================================
  console.log("📊 PHASE 1: Updating Final Scores & Learning...\n");

  // Load all games from previous week's picks
  let allGamesBySport: Record<string, any[]> = {};
  try {
    const allPicksFile = path.join(prognoDir, `picks-all-leagues-latest.json`);
    if (fs.existsSync(allPicksFile)) {
      const allPicksData = JSON.parse(fs.readFileSync(allPicksFile, "utf8"));
      if (Array.isArray(allPicksData)) {
        allPicksData.forEach((pick: any) => {
          const sport = pick.sport || pick.game?.sport || "NFL";
          if (!allGamesBySport[sport]) allGamesBySport[sport] = [];
          if (pick.game && typeof pick.game === 'object') {
            allGamesBySport[sport].push(pick.game);
          }
        });
        const totalGames = Object.values(allGamesBySport).reduce((sum, games) => sum + games.length, 0);
        console.log(`Loaded ${totalGames} games from previous week's picks`);
        console.log(`  Breakdown: ${Object.keys(allGamesBySport).map(s => `${s}:${allGamesBySport[s].length}`).join(", ")}\n`);
      }
    }
  } catch (err) {
    console.warn("Could not load previous week's picks, continuing...\n");
  }

  let totalCompleted = 0;
  let totalUpdated = 0;
  let totalLearned = 0;

  // Update scores for all leagues
  const updatePromises = ALL_LEAGUES.map(async (sport) => {
    try {
      let games: any[] = [];

      // Try from all-leagues picks first
      if (allGamesBySport[sport] && allGamesBySport[sport].length > 0) {
        games = allGamesBySport[sport];
      } else {
        // Fallback to individual league picks file
        try {
          const picksFile = path.join(prognoDir, `picks-${sport}-latest.json`);
          if (fs.existsSync(picksFile)) {
            const picksData = JSON.parse(fs.readFileSync(picksFile, "utf8"));
            if (Array.isArray(picksData) && picksData.length > 0) {
              games = picksData.map((p: any) => p.game).filter((g: any) => g);
            }
          }
        } catch (err) {
          // Continue
        }

        // Final fallback to current schedule API
        if (games.length === 0) {
          try {
            games = await fetchScheduleFromOddsApi(key, sport as any);
          } catch (err) {
            // Continue
          }
        }
      }

      // Fetch scores and update predictions (look back 7 days)
      const scoreResult = await fetchScoresAndUpdatePredictions(key, sport as any, games, 7);

      return {
        sport,
        success: true,
        ...scoreResult
      };
    } catch (error: any) {
      console.error(`Error updating ${sport}:`, error);
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

  const updateResults = await Promise.all(updatePromises);

  updateResults.forEach(result => {
    totalCompleted += result.completedGames || 0;
    totalUpdated += result?.predictionsUpdated || 0;
    totalLearned += result.cursorLearnGames || 0;
    console.log(`${result.sport}: ${result.completedGames || 0} completed, ${result?.predictionsUpdated || 0} updated, ${result.cursorLearnGames || 0} learned`);
  });

  // Get metrics after learning
  const metrics = getAccuracyMetrics();

  console.log(`\n📈 Learning Summary:`);
  console.log(`  Total completed games: ${totalCompleted}`);
  console.log(`  Predictions updated: ${totalUpdated}`);
  console.log(`  Games learned from: ${totalLearned}`);
  console.log(`  Overall win rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`  Overall ROI: ${metrics.roi.toFixed(1)}%\n`);

  // Save update results
  const updatePayload = {
    updateResults,
    metrics,
    summary: {
      totalCompleted,
      totalUpdated,
      totalLearned,
      timestamp: new Date().toISOString()
    }
  };
  saveJson(`results-all-leagues-${stamp}.json`, updatePayload);
  saveJson(`results-all-leagues-latest.json`, updatePayload);

  // ============================================================
  // PHASE 2: LOAD ODDS & MAKE PICKS FOR WEEK AHEAD
  // ============================================================
  console.log("🎯 PHASE 2: Loading Odds & Making Picks for Week Ahead...\n");

  const allPicks: any[] = [];
  const allOdds: Record<string, any[]> = {};
  const calibration = loadCalibration();

  // Process all leagues in parallel
  const picksPromises = ALL_LEAGUES.map(async (sport) => {
    try {
      console.log(`Processing ${sport}...`);

      const games = await fetchScheduleFromOddsApi(key, sport as any);
      if (!games.length) {
        console.warn(`No games for ${sport}`);
        return { sport, success: false, error: "No games returned" };
      }

      // Save odds
      allOdds[sport] = games;
      saveJson(`odds-${sport}-${stamp}.json`, games);
      saveJson(`odds-${sport}-latest.json`, games);

      // Analyze games (using learned weights from Phase 1)
      const result = await analyzeWeeklyGames(games, calibration);

      // Persist predictions
      for (const pred of result?.predictions ?? []) {
        addPrediction(pred.game.id, pred, sport);
        allPicks.push({ ...pred, sport });
      }

      // Save picks
      saveJson(`picks-${sport}-${stamp}.json`, result?.predictions);
      saveJson(`picks-${sport}-latest.json`, result?.predictions);

      console.log(`${sport}: ${games.length} games, ${result?.predictions.length} picks, ${result.summary.bestBets.length} best bets`);

      return {
        sport,
        success: true,
        gamesCount: games.length,
        picksCount: result?.predictions.length,
        bestBets: result.summary.bestBets.length
      };
    } catch (error: any) {
      console.error(`Error processing ${sport}:`, error);
      return {
        sport,
        success: false,
        error: error.message || "Unknown error"
      };
    }
  });

  const picksResults = await Promise.all(picksPromises);

  // Save combined results
  saveJson(`odds-all-leagues-${stamp}.json`, allOdds);
  saveJson(`odds-all-leagues-latest.json`, allOdds);
  saveJson(`picks-all-leagues-${stamp}.json`, allPicks);
  saveJson(`picks-all-leagues-latest.json`, allPicks);

  const successCount = picksResults.filter(r => r.success).length;
  const totalGames = picksResults.reduce((sum, r) => sum + (r.gamesCount || 0), 0);
  const totalPicks = allPicks.length;
  const totalBestBets = picksResults.reduce((sum, r) => sum + (r.bestBets || 0), 0);

  console.log(`\n🎲 Picks Summary:`);
  console.log(`  Leagues processed: ${successCount}/${ALL_LEAGUES.length}`);
  console.log(`  Total games: ${totalGames}`);
  console.log(`  Total picks: ${totalPicks}`);
  console.log(`  Total best bets: ${totalBestBets}\n`);

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log("=".repeat(60));
  console.log("✅ THURSDAY CYCLE COMPLETE");
  console.log("=".repeat(60));
  console.log(`📊 Learned from: ${totalLearned} games`);
  console.log(`🎯 Made picks for: ${totalPicks} games`);
  console.log(`💰 Best bets: ${totalBestBets}`);
  console.log(`📈 Win rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`💵 ROI: ${metrics.roi.toFixed(1)}%`);
  console.log("=".repeat(60));

  // Exit with error code if any leagues failed
  const updateSuccessCount = updateResults.filter(r => r.success).length;
  if (updateSuccessCount < ALL_LEAGUES.length || successCount < ALL_LEAGUES.length) {
    process.exit(1);
  }
})().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


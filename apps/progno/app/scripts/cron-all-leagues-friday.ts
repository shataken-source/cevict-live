/**
 * Friday cron: Fetch odds and analyze for ALL leagues at once
 * Usage:
 *   ODDS_API_KEY=your_key pnpm dlx tsx apps/progno/app/scripts/cron-all-leagues-friday.ts
 */

import fs from "node:fs";
import path from "node:path";
import { getPrimaryKey } from "../keys-store";
import { addPrediction } from "../prediction-tracker";
import { analyzeWeeklyGames, ModelCalibration } from "../weekly-analyzer";
import { fetchScheduleFromOddsApi } from "../weekly-page.helpers";

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
  const allPicks: any[] = [];
  const allOdds: Record<string, any[]> = {};
  const calibration = loadCalibration();

  console.log("Starting Friday analysis for all leagues...");

  // Process all leagues in parallel
  const leaguePromises = ALL_LEAGUES.map(async (sport) => {
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

      // Analyze games
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

  const leagueResults = await Promise.all(leaguePromises);

  // Save combined results
  saveJson(`odds-all-leagues-${stamp}.json`, allOdds);
  saveJson(`odds-all-leagues-latest.json`, allOdds);
  saveJson(`picks-all-leagues-${stamp}.json`, allPicks);
  saveJson(`picks-all-leagues-latest.json`, allPicks);

  const successCount = leagueResults.filter(r => r.success).length;
  const totalGames = leagueResults.reduce((sum, r) => sum + (r.gamesCount || 0), 0);
  const totalPicks = allPicks.length;
  const totalBestBets = leagueResults.reduce((sum, r) => sum + (r.bestBets || 0), 0);

  console.log("\n=== Friday Analysis Complete ===");
  console.log(`Leagues processed: ${successCount}/${ALL_LEAGUES.length}`);
  console.log(`Total games: ${totalGames}`);
  console.log(`Total picks: ${totalPicks}`);
  console.log(`Total best bets: ${totalBestBets}`);

  // Exit with error code if any leagues failed
  if (successCount < ALL_LEAGUES.length) {
    process.exit(1);
  }
})().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


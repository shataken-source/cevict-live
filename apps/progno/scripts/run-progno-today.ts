/**
 * Run Progno Picks for Today
 * Fetches today's games, analyzes them, and generates picks
 */

import fs from 'fs';
import path from 'path';
import { getPrimaryKey } from '../app/keys-store';
import { addPrediction } from '../app/prediction-tracker';
import { analyzeWeeklyGames, ModelCalibration } from '../app/weekly-analyzer';
import { fetchScheduleFromOddsApi } from '../app/weekly-page.helpers';

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'] as const;

function saveJson(filename: string, data: any) {
  const prognoDir = path.join(process.cwd(), '.progno');
  if (!fs.existsSync(prognoDir)) fs.mkdirSync(prognoDir, { recursive: true });
  const file = path.join(prognoDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function loadCalibration(): ModelCalibration | undefined {
  const prognoDir = path.join(process.cwd(), '.progno');
  const file = path.join(prognoDir, 'calibration.json');
  if (!fs.existsSync(file)) return undefined;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as ModelCalibration;
  } catch {
    return undefined;
  }
}

async function main() {
  // Load environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^ODDS_API_KEY=(.+)$/);
      if (match) {
        process.env.ODDS_API_KEY = match[1].trim();
        break;
      }
    }
  }

  const key = getPrimaryKey();
  if (!key) {
    console.error('❌ ODDS_API_KEY not found');
    console.error('   Please set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY in environment variables');
    console.error('   Or add it to apps/progno/.env.local');
    process.exit(1);
  }

  const today = new Date();
  const stamp = today.toISOString().split('T')[0];

  console.log(`🚀 Running Progno Picks for Today (${stamp})\n`);

  const results: Record<string, any> = {};
  const allPicks: any[] = [];
  const allOdds: Record<string, any[]> = {};

  const calibration = loadCalibration();
  if (calibration) {
    console.log('✅ Loaded calibration data\n');
  }

  // Process all leagues
  for (const sport of ALL_LEAGUES) {
    try {
      console.log(`📊 Processing ${sport}...`);

      // Fetch schedule and odds
      const games = await fetchScheduleFromOddsApi(key, sport);
      if (!games.length) {
        console.log(`   ⚠️  No games found for ${sport}\n`);
        results[sport] = { success: false, error: 'No games returned' };
        continue;
      }

      console.log(`   Found ${games.length} games`);

      // Save odds
      allOdds[sport] = games;
      saveJson(`odds-${sport}-${stamp}.json`, games);
      saveJson(`odds-${sport}-latest.json`, games);

      // Analyze games
      const result = await analyzeWeeklyGames(games, calibration);

      // Persist predictions
      for (const pred of result.predictions ?? []) {
        addPrediction(pred.game.id, pred, sport);
        allPicks.push({ ...pred, sport });
      }

      // Save picks
      saveJson(`picks-${sport}-${stamp}.json`, result?.predictions);
      saveJson(`picks-${sport}-latest.json`, result?.predictions);

      const picksCount = result?.predictions?.length || 0;
      const bestBetsCount = result.summary.bestBets.length;

      console.log(`   ✅ Generated ${picksCount} picks (${bestBetsCount} best bets)\n`);

      results[sport] = {
        success: true,
        gamesCount: games.length,
        picksCount,
        bestBetsCount
      };
    } catch (error: any) {
      console.error(`   ❌ Error processing ${sport}:`, error.message);
      results[sport] = {
        success: false,
        error: error.message || 'Unknown error'
      };
      console.log('');
    }
  }

  // Save combined results
  saveJson(`odds-all-leagues-${stamp}.json`, allOdds);
  saveJson(`odds-all-leagues-latest.json`, allOdds);
  saveJson(`picks-all-leagues-${stamp}.json`, allPicks);
  saveJson(`picks-all-leagues-latest.json`, allPicks);

  const successCount = Object.values(results).filter((r: any) => r.success).length;
  const totalGames = Object.values(results).reduce((sum: number, r: any) => sum + (r.gamesCount || 0), 0);
  const totalPicks = allPicks.length;

  console.log('=== Summary ===');
  console.log(`Processed: ${successCount}/${ALL_LEAGUES.length} leagues`);
  console.log(`Total games: ${totalGames}`);
  console.log(`Total picks: ${totalPicks}`);
  console.log(`\n✅ Results saved to .progno/picks-all-leagues-latest.json`);
  console.log(`\n🎉 Complete!`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


/**
 * Compare probability-analyzer simulation output to Supabase historical data for the same time frame.
 * Run after: npx tsx scripts/probability-analyzer-simulation.ts --runs=10000
 *
 * Usage: npx tsx scripts/compare-simulation-to-actuals.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ok */ }
}
loadEnvFile(path.resolve(__dirname, '..', '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const resultsPath = path.resolve(__dirname, '..', 'simulation-results.json');
if (!fs.existsSync(resultsPath)) {
  console.error('Run the 7-day simulation first: npx tsx scripts/probability-analyzer-simulation.ts --runs=10000');
  process.exit(1);
}

const simResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Same 7-day window logic as the simulation: latest historical_odds - 7 days
  const { data: latestRow } = await supabase
    .from('historical_odds')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1);

  if (!latestRow?.length) {
    console.error('No historical_odds data in Supabase');
    process.exit(1);
  }

  const latest = new Date(latestRow[0].captured_at);
  const start = new Date(latest);
  start.setDate(start.getDate() - 7);
  const outStart = new Date(start);
  outStart.setDate(outStart.getDate() - 1);
  const outEnd = new Date(latest);
  outEnd.setDate(outEnd.getDate() + 1);
  const startDate = outStart.toISOString().split('T')[0];
  const endDate = outEnd.toISOString().split('T')[0];

  const { data: outcomes, error } = await supabase
    .from('game_outcomes')
    .select('game_date, home_team, away_team, home_score, away_score, winner, league')
    .gte('game_date', startDate)
    .lte('game_date', endDate);

  if (error) {
    console.error('Supabase game_outcomes error:', error.message);
    process.exit(1);
  }

  const actualCount = outcomes?.length ?? 0;
  const byDate = (outcomes || []).reduce((acc: Record<string, number>, r: any) => {
    const d = r.game_date;
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  console.log('\n' + '═'.repeat(72));
  console.log('  SIMULATION vs SUPABASE ACTUALS (same time frame)');
  console.log('═'.repeat(72));
  console.log(`  Time frame: ${startDate} → ${endDate} (7-day window from historical_odds)`);
  console.log('');
  console.log('  SIMULATION OUTPUT (from simulation-results.json):');
  console.log(`    Bootstrap runs:     ${simResults.bootstrapRuns ?? '?'}`);
  console.log(`    Games analyzed:    ${simResults.gamesAnalyzed ?? '?'}`);
  console.log(`    Unmatched games:   ${simResults.unmatchedGames ?? '?'}`);
  console.log(`    Baseline:          WR ${simResults.baseline?.winRate ?? '?'}%  |  ROI ${simResults.baseline?.roi ?? '?'}%`);
  console.log(`    With analyzer:     WR ${simResults.withAnalyzer?.winRate ?? '?'}%  |  ROI ${simResults.withAnalyzer?.roi ?? '?'}%`);
  console.log(`    Verdict:           ${simResults.verdict ?? '?'} (ROI diff: ${simResults.roiDifference ?? '?'}pp)`);
  console.log('');
  console.log('  SUPABASE HISTORICAL (game_outcomes for same window):');
  console.log(`    Total outcomes:    ${actualCount}`);
  console.log('    By date:');
  for (const [d, n] of Object.entries(byDate).sort()) {
    console.log(`      ${d}: ${n} games`);
  }
  console.log('');
  console.log('  COMPARISON:');
  console.log(`    Simulation graded ${simResults.gamesAnalyzed} games that had outcomes in Supabase.`);
  console.log(`    Actual outcome rows in window: ${actualCount}.`);
  if (actualCount > 0 && simResults.gamesAnalyzed != null) {
    const coverage = Math.round((simResults.gamesAnalyzed / actualCount) * 100);
    console.log(`    Coverage: ${simResults.gamesAnalyzed} / ${actualCount} = ${coverage}% of actual games.`);
  }
  console.log('═'.repeat(72) + '\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

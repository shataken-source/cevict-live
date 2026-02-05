/**
 * Run backtest on historical games with known outcomes.
 *
 * Uses the real PredictionEngine (and optionally Claude Effect when wired).
 * Input: JSON file of HistoricalGame[] with odds + actualWinner.
 *
 * ENV OPTIONS (set before running, or inline):
 *
 *   BACKTEST_JSON           Path to games JSON (default: .progno/backtest-games.json)
 *   BACKTEST_START          Start date YYYY-MM-DD (default: 2024-01-01)
 *   BACKTEST_END            End date YYYY-MM-DD (default: 2024-12-31)
 *   BACKTEST_BANKROLL       Starting bankroll (default: 10000)
 *   BACKTEST_BET_SIZE       How much to bet: fixed | kelly | percentage (default: fixed)
 *   BACKTEST_MIN_CONFIDENCE Min confidence 0–1 to place a bet (default: 0.5). Stricter: 0.6
 *   BACKTEST_MIN_EDGE       Min edge 0–1 to place a bet (default: 0). Stricter: 0.02
 *   BACKTEST_LEAGUES        Comma list, e.g. NFL,NBA (default: NFL)
 *   BACKTEST_USE_CLAUDE     false to disable Claude Effect (default: true)
 *
 * USAGE (PowerShell, from repo root):
 *
 *   cd apps/progno
 *   npm run backtest:run
 *
 *   # Stricter: only bet when confidence ≥ 60% and edge ≥ 2%, use Kelly sizing
 *   $env:BACKTEST_MIN_CONFIDENCE="0.6"; $env:BACKTEST_MIN_EDGE="0.02"; $env:BACKTEST_BET_SIZE="kelly"; npm run backtest:run
 *
 *   # Different bankroll / date range
 *   $env:BACKTEST_BANKROLL="5000"; $env:BACKTEST_START="2024-09-01"; npm run backtest:run
 *
 * JSON format (array of):
 *   { id, homeTeam, awayTeam, league, date (ISO string), odds: { home, away }, actualWinner, actualScore?, gameData? }
 *
 * How to get historical games: run fetch script first:
 *   npm run backtest:fetch   → writes .progno/backtest-games.json
 */

import fs from 'fs';
import path from 'path';
import { BacktestEngine, BacktestConfig, HistoricalGame } from '../lib/backtesting/backtest-engine';

const BACKTEST_JSON =
  process.env.BACKTEST_JSON ||
  path.join(process.cwd(), '.progno', 'backtest-games.json');

function loadGames(filePath: string): HistoricalGame[] {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error('❌ Backtest games file not found:', resolved);
    console.error('   Set BACKTEST_JSON to a path, or create .progno/backtest-games.json');
    console.error('   See HISTORICAL_ODDS_AND_BACKTEST.md and BACKTEST_SETUP.md for how to build the file.');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.games || raw.picks || [];
  return arr.map((g: any) => ({
    id: g.id || `${g.homeTeam}-${g.awayTeam}-${g.date}`,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    league: g.league || g.sport || 'NFL',
    date: typeof g.date === 'string' ? new Date(g.date) : new Date(g.game_time || g.commence_time || Date.now()),
    odds: g.odds || { home: g.home ?? -110, away: g.away ?? -110, spread: g.spread, total: g.total },
    actualWinner: g.actualWinner || g.winner,
    actualScore: g.actualScore || (g.homeScore != null && g.awayScore != null ? { home: g.homeScore, away: g.awayScore } : undefined),
    gameData: g.gameData || {},
  }));
}

async function main() {
  console.log('\n📊 Progno historical backtest (real PredictionEngine)\n');

  const games = loadGames(BACKTEST_JSON);
  if (games.length === 0) {
    console.error('❌ No games in file. Ensure each item has homeTeam, awayTeam, odds, actualWinner.');
    process.exit(1);
  }
  console.log(`   Loaded ${games.length} games from ${BACKTEST_JSON}\n`);

  const config: BacktestConfig = {
    startDate: new Date(process.env.BACKTEST_START || '2024-01-01'),
    endDate: new Date(process.env.BACKTEST_END || '2024-12-31'),
    leagues: (process.env.BACKTEST_LEAGUES || 'NFL').split(','),
    useClaudeEffect: process.env.BACKTEST_USE_CLAUDE !== 'false',
    bankroll: parseFloat(process.env.BACKTEST_BANKROLL || '10000'),
    betSize: (process.env.BACKTEST_BET_SIZE as 'kelly' | 'fixed' | 'percentage') || 'fixed',
    minConfidence: parseFloat(process.env.BACKTEST_MIN_CONFIDENCE || '0.5'),
    minEdge: parseFloat(process.env.BACKTEST_MIN_EDGE || '0'),
  };

  console.log('   Config: minConfidence=%s minEdge=%s betSize=%s bankroll=%s', config.minConfidence, config.minEdge, config.betSize, config.bankroll);

  const engine = new BacktestEngine();
  const result = await engine.runBacktest(games, config);

  console.log('   Results:');
  console.log('   ───────────────────────────────────────────');
  console.log(`   Total games:        ${result.totalGames}`);
  console.log(`   Games meeting threshold (minConfidence/minEdge): ${result.withClaudeEffect.gamesBet}`);
  console.log(`   With Claude Effect: win rate ${(result.withClaudeEffect.winRate * 100).toFixed(1)}%, ROI ${result.withClaudeEffect.roi.toFixed(1)}%, wagered ${result.withClaudeEffect.totalWagered.toFixed(0)}, return ${result.withClaudeEffect.totalReturn.toFixed(0)}`);
  console.log(`   Without Claude:     win rate ${(result.withoutClaudeEffect.winRate * 100).toFixed(1)}%, ROI ${result.withoutClaudeEffect.roi.toFixed(1)}%, wagered ${result.withoutClaudeEffect.totalWagered.toFixed(0)}, return ${result.withoutClaudeEffect.totalReturn.toFixed(0)}`);
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`);
    result.errors.slice(0, 5).forEach((e) => console.log(`      ${e}`));
  }
  console.log('\n   Tip: Use known-outcome historical games to tune weights and Claude Effect.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

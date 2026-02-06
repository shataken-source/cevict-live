/**
 * Run backtest on historical games and optionally tune parameters.
 * Uses the same engine path as production (BacktestEngine → PredictionEngine + Claude Effect).
 *
 * Data: JSON array of games with:
 *   id, homeTeam, awayTeam, league, date, odds: { home, away, spread?, total? },
 *   actualWinner, actualScore?: { home, away }, teamStats?, recentForm?, headToHead?
 * You can use data/2024-games.json, or produce data/backtest-games.json from API/scraper.
 *
 * Usage (from apps/progno):
 *   npx tsx scripts/run-backtest-tune.ts [path/to/games.json]
 *   npx tsx scripts/run-backtest-tune.ts --tune [path/to/games.json]
 *
 * --tune  Loop over minConfidence and minEdge, print results, write best to data/tuned-parameters/backtest-tuned.json
 */

import fs from 'fs';
import path from 'path';
import { BacktestEngine, HistoricalGame, BacktestConfig, BacktestResult } from '../lib/backtesting/backtest-engine';
import { estimateTeamStatsFromOdds } from '../app/lib/odds-helpers';
import type { GameData } from '../app/lib/prediction-engine';

const DEFAULT_DATA_PATH = path.join(process.cwd(), 'data', '2024-games.json');

function loadGames(jsonPath: string): HistoricalGame[] {
  if (!fs.existsSync(jsonPath)) {
    console.error(`Data file not found: ${jsonPath}`);
    console.error('Create data/2024-games.json or data/backtest-games.json (see script comment for shape).');
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const rows = JSON.parse(raw) as any[];
  const games: HistoricalGame[] = [];

  for (const row of rows) {
    const odds = row.odds || { home: -110, away: -110, spread: 0, total: 45 };
    const league = row.league || 'NFL';
    const teamStats = row.teamStats || estimateTeamStatsFromOdds(odds, league);

    const gameData: GameData = {
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      league,
      sport: league,
      odds,
      date: row.date,
      teamStats,
      recentForm: row.recentForm,
      headToHead: row.headToHead,
      weather: row.weather,
      injuries: row.injuries,
    };

    games.push({
      id: row.id || `game-${games.length}`,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      league,
      date: row.date ? new Date(row.date) : new Date(),
      odds,
      actualWinner: row.actualWinner,
      actualScore: row.actualScore,
      gameData,
    });
  }

  return games;
}

const TUNE_MIN_CONFIDENCE = [0.55, 0.6, 0.65, 0.7];
const TUNE_MIN_EDGE = [0.02, 0.05, 0.1];

async function main() {
  const args = process.argv.slice(2);
  const tune = args.includes('--tune');
  const dataPath = args.find(a => !a.startsWith('--')) || DEFAULT_DATA_PATH;

  console.log('Progno backtest & tune');
  console.log('======================\n');
  console.log('Data:', dataPath);

  const games = loadGames(dataPath);
  console.log('Games loaded:', games.length);
  if (games.length === 0) {
    console.error('No games to run.');
    process.exit(1);
  }

  const engine = new BacktestEngine();

  const baseConfig: BacktestConfig = {
    startDate: new Date('2020-01-01'),
    endDate: new Date('2030-12-31'),
    leagues: [],
    useClaudeEffect: true,
    useMCValue: false,
    bankroll: 10000,
    betSize: 'fixed',
    minConfidence: 0.6,
    minEdge: 0.05,
    mcIterations: 1000,
  };

  if (!tune) {
    const result = await engine.runBacktest(games, baseConfig);
    printResult(result);
    return;
  }

  console.log('\nTuning (minConfidence × minEdge)...\n');
  let best: { config: BacktestConfig; result: BacktestResult } | null = null;
  const rows: string[] = ['minConf\tminEdge\twinRate\tROI%\tgamesBet'];

  for (const minConf of TUNE_MIN_CONFIDENCE) {
    for (const minEdge of TUNE_MIN_EDGE) {
      const config: BacktestConfig = { ...baseConfig, minConfidence: minConf, minEdge };
      const result = await engine.runBacktest(games, config);
      const wr = (result.withClaudeEffect.winRate * 100).toFixed(1);
      const roi = result.withClaudeEffect.roi.toFixed(1);
      const bet = result.withClaudeEffect.gamesBet;
      rows.push(`${minConf}\t${minEdge}\t${wr}%\t${roi}%\t${bet}`);

      if (!best || result.withClaudeEffect.winRate > best.result.withClaudeEffect.winRate) {
        best = { config, result };
      }
    }
  }

  console.log(rows.join('\n'));
  console.log('\nBest (by win rate):', best?.result.withClaudeEffect.winRate);

  const outDir = path.join(process.cwd(), 'data', 'tuned-parameters');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'backtest-tuned.json');
  if (best) {
    fs.writeFileSync(outPath, JSON.stringify({
      minConfidence: best.config.minConfidence,
      minEdge: best.config.minEdge,
      winRate: best.result.withClaudeEffect.winRate,
      roi: best.result.withClaudeEffect.roi,
      gamesBet: best.result.withClaudeEffect.gamesBet,
      updatedAt: new Date().toISOString(),
    }, null, 2));
    console.log('Wrote', outPath);
  }
}

function printResult(r: BacktestResult) {
  console.log('\n--- Backtest result ---');
  console.log('Total games:', r.totalGames);
  console.log('With Claude Effect:');
  console.log('  Win rate:', (r.withClaudeEffect.winRate * 100).toFixed(1), '%');
  console.log('  ROI:', r.withClaudeEffect.roi.toFixed(1), '%');
  console.log('  Games bet:', r.withClaudeEffect.gamesBet);
  console.log('Without Claude Effect:');
  console.log('  Win rate:', (r.withoutClaudeEffect.winRate * 100).toFixed(1), '%');
  console.log('  Games bet:', r.withoutClaudeEffect.gamesBet);
  if (r.errors.length > 0) console.log('Errors:', r.errors.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

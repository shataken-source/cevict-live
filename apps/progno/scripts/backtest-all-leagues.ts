/**
 * Universal Backtest Engine for All Progno Leagues
 * Tests predictions against historical results for NFL, MLB, NBA, NHL, NCAAB, NCAAF, NASCAR
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

type League = 'NFL' | 'MLB' | 'NBA' | 'NHL' | 'NCAAB' | 'NCAAF' | 'NASCAR';

interface HistoricalResult {
  date: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  venue?: string;
  notes?: string;
}

interface Prediction {
  date: string;
  league: League;
  predictedWinner: string;
  confidence: number; // 0-100
  odds?: number; // American odds (e.g., +400, -150)
  predictedSpread?: number;
  predictedTotal?: number;
}

interface BacktestResult {
  league: League;
  year: number;
  totalRaces: number;
  correctPicks: number;
  accuracy: number;
  roi: number;
  avgConfidence: number;
  avgOdds: number;
  totalWagered: number;
  totalProfitLoss: number;
  bySport?: Record<string, SportBreakdown>;
  races: RaceResult[];
}

interface SportBreakdown {
  total: number;
  correct: number;
  accuracy: number;
  profitLoss: number;
}

interface RaceResult {
  date: string;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  confidence: number;
  odds?: number;
  profitLoss: number;
  homeScore?: number;
  awayScore?: number;
  spreadResult?: number;
  totalResult?: number;
}

/**
 * Load historical results from full-season JSON files
 * Prioritizes odds-enabled files for accurate ROI calculation
 */
function loadHistoricalResults(league: League, year: number): HistoricalResult[] {
  // Try odds-enabled file first (has realistic moneylines)
  const oddsPath = `./${league.toLowerCase()}-${year}-with-odds.json`;
  try {
    const data = readFileSync(oddsPath, 'utf-8');
    console.log(`  Loaded ${league} with odds data`);
    return JSON.parse(data);
  } catch {
    // Fall back to regular full-season file
    const fullSeasonPath = `./${league.toLowerCase()}-${year}-full-season.json`;
    try {
      const data = readFileSync(fullSeasonPath, 'utf-8');
      console.log(`  Loaded ${league} full season data (no odds)`);
      return JSON.parse(data);
    } catch {
      // Fall back to old results file
      const oldPath = `./${league.toLowerCase()}-${year}-results.json`;
      try {
        const data = readFileSync(oldPath, 'utf-8');
        console.log(`  Loaded ${league} sample data`);
        return JSON.parse(data);
      } catch {
        console.warn(`  Could not load ${league} ${year} data, using sample data`);
        return getSampleHistoricalResults(league, year);
      }
    }
  }
}

/**
 * Run backtest for a single league
 */
export function backtestLeague(
  league: League,
  year: number,
  predictions: Prediction[]
): BacktestResult {
  const historical = loadHistoricalResults(league, year);
  const races: RaceResult[] = [];
  let correctPicks = 0;
  let totalProfitLoss = 0;
  let totalConfidence = 0;
  let totalOdds = 0;
  let racesWithOdds = 0;
  const wagerAmount = 100; // Fixed $100 wager per game

  for (const prediction of predictions) {
    // Find matching game
    const game = historical.find(
      h => h.date === prediction.date ||
        (h.homeTeam === prediction.predictedWinner || h.awayTeam === prediction.predictedWinner)
    );

    if (!game) {
      console.warn(`No game found for ${prediction.date} - ${prediction.predictedWinner}`);
      continue;
    }

    const correct = game.winner === prediction.predictedWinner;
    const odds = prediction.odds || getDefaultOdds(league);

    // Calculate profit/loss
    let profitLoss = -wagerAmount;
    if (correct) {
      if (odds > 0) {
        profitLoss = (odds / 100) * wagerAmount;
      } else {
        profitLoss = (100 / Math.abs(odds)) * wagerAmount;
      }
    }

    if (correct) correctPicks++;
    totalProfitLoss += profitLoss;
    totalConfidence += prediction.confidence;
    if (prediction.odds) {
      totalOdds += prediction.odds;
      racesWithOdds++;
    }

    races.push({
      date: game.date,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      predictedWinner: prediction.predictedWinner,
      actualWinner: game.winner,
      correct,
      confidence: prediction.confidence,
      odds: prediction.odds,
      profitLoss,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    });
  }

  const totalRaces = races.length;
  const accuracy = totalRaces > 0 ? (correctPicks / totalRaces) * 100 : 0;
  const roi = totalRaces > 0 ? (totalProfitLoss / (totalRaces * wagerAmount)) * 100 : 0;
  const avgConfidence = totalRaces > 0 ? totalConfidence / totalRaces : 0;
  const avgOdds = racesWithOdds > 0 ? totalOdds / racesWithOdds : getDefaultOdds(league);

  return {
    league,
    year,
    totalRaces,
    correctPicks,
    accuracy,
    roi,
    avgConfidence,
    avgOdds,
    totalWagered: totalRaces * wagerAmount,
    totalProfitLoss,
    races,
  };
}

/**
 * Run backtest for all leagues
 */
export function backtestAllLeagues(
  year: number,
  allPredictions: Record<League, Prediction[]>
): Record<League, BacktestResult> {
  const results = {} as Record<League, BacktestResult>;

  for (const league of Object.keys(allPredictions) as League[]) {
    console.log(`\nBacktesting ${league}...`);
    results[league] = backtestLeague(league, year, allPredictions[league]);
  }

  return results;
}

/**
 * Get default odds by league (realistic averages)
 */
function getDefaultOdds(league: League): number {
  const defaults: Record<League, number> = {
    NFL: -110,
    MLB: -110,
    NBA: -110,
    NHL: -110,
    NCAAB: -110,
    NCAAF: -110,
    NASCAR: 500, // NASCAR winners typically long shots
  };
  return defaults[league];
}

/**
 * Generate sample predictions for testing
 */
export function generateSamplePredictions(league: League, year: number): Prediction[] {
  const historical = loadHistoricalResults(league, year);
  const predictions: Prediction[] = [];

  // Generate predictions for all games
  for (let i = 0; i < historical.length; i++) {
    const game = historical[i];
    // 70% accuracy simulation - pick correct winner most of the time
    const pickCorrectly = Math.random() < 0.7;
    const predictedWinner = pickCorrectly ? game.winner :
      (game.winner === game.homeTeam ? game.awayTeam : game.homeTeam);

    predictions.push({
      date: game.date,
      league,
      predictedWinner,
      confidence: 60 + Math.floor(Math.random() * 30), // 60-90% confidence
      odds: getDefaultOdds(league) + Math.floor(Math.random() * 200 - 100),
    });
  }

  return predictions; // Use all predictions from the historical data
}

/**
 * Print formatted backtest results
 */
export function printBacktestReport(result: BacktestResult): void {
  console.log('\n' + '='.repeat(70));
  console.log(`${result.league} ${result.year} BACKTEST RESULTS`);
  console.log('='.repeat(70));
  console.log(`Total Games:      ${result.totalRaces}`);
  console.log(`Correct Picks:    ${result.correctPicks}/${result.totalRaces}`);
  console.log(`Accuracy:         ${result.accuracy.toFixed(1)}%`);
  console.log(`ROI:              ${result.roi > 0 ? '+' : ''}${result.roi.toFixed(1)}%`);
  console.log(`Avg Confidence:   ${result.avgConfidence.toFixed(1)}%`);
  console.log(`Avg Odds:         ${result.avgOdds > 0 ? '+' : ''}${result.avgOdds.toFixed(0)}`);
  console.log(`Total Wagered:    $${result.totalWagered.toLocaleString()}`);
  console.log(`Total P&L:        ${result.totalProfitLoss >= 0 ? '+' : ''}$${result.totalProfitLoss.toFixed(2)}`);

  console.log('\n' + '-'.repeat(70));
  console.log('Game-by-Game Results:');
  console.log('-'.repeat(70));

  result.races.forEach((race, i) => {
    const status = race.correct ? '✓' : '✗';
    const profit = race.profitLoss >= 0
      ? `+$${race.profitLoss.toFixed(0)}`
      : `-$${Math.abs(race.profitLoss).toFixed(0)}`;
    console.log(`\n${i + 1}. ${race.date}`);
    console.log(`   ${status} ${race.awayTeam} @ ${race.homeTeam}`);
    console.log(`   Predicted: ${race.predictedWinner} (${race.confidence}%)`);
    console.log(`   Actual: ${race.actualWinner} (${race.awayScore}-${race.homeScore})`);
    console.log(`   P&L: ${profit}`);
  });

  console.log('\n' + '='.repeat(70));
}

/**
 * Print combined report for all leagues
 */
export function printCombinedReport(results: Record<League, BacktestResult>): void {
  console.log('\n' + '#'.repeat(70));
  console.log('# ALL LEAGUES BACKTEST SUMMARY');
  console.log('#'.repeat(70));

  let totalGames = 0;
  let totalCorrect = 0;
  let totalPnL = 0;
  let totalWagered = 0;

  console.log('\n| League | Games | Correct | Accuracy | ROI    | P&L       |');
  console.log('|--------|-------|---------|----------|--------|-----------|');

  for (const league of Object.keys(results) as League[]) {
    const r = results[league];
    totalGames += r.totalRaces;
    totalCorrect += r.correctPicks;
    totalPnL += r.totalProfitLoss;
    totalWagered += r.totalWagered;

    console.log(
      `| ${league.padEnd(6)} | ${r.totalRaces.toString().padStart(5)} | ` +
      `${r.correctPicks.toString().padStart(3)}/${r.totalRaces.toString().padStart(3)} | ` +
      `${r.accuracy.toFixed(1).padStart(7)}% | ${r.roi.toFixed(1).padStart(5)}% | ` +
      `${(r.totalProfitLoss >= 0 ? '+' : '') + '$' + r.totalProfitLoss.toFixed(0).padStart(8)} |`
    );
  }

  const overallAccuracy = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;
  const overallRoi = totalWagered > 0 ? (totalPnL / totalWagered) * 100 : 0;

  console.log('|--------|-------|---------|----------|--------|-----------|');
  console.log(
    `| ${'TOTAL'.padEnd(6)} | ${totalGames.toString().padStart(5)} | ` +
    `${totalCorrect.toString().padStart(3)}/${totalGames.toString().padStart(3)} | ` +
    `${overallAccuracy.toFixed(1).padStart(7)}% | ${overallRoi.toFixed(1).padStart(5)}% | ` +
    `${(totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(0).padStart(8)} |`
  );

  console.log('\n' + '#'.repeat(70));
}

// ==================== SAMPLE DATA ====================

function getSampleHistoricalResults(league: League, year: number): HistoricalResult[] {
  // Fallback sample data for each league
  const samples: Record<League, HistoricalResult[]> = {
    NFL: [
      { date: '2024-09-05', league: 'NFL', homeTeam: 'Kansas City Chiefs', awayTeam: 'Baltimore Ravens', homeScore: 27, awayScore: 20, winner: 'Kansas City Chiefs' },
      { date: '2024-09-08', league: 'NFL', homeTeam: 'Philadelphia Eagles', awayTeam: 'Green Bay Packers', homeScore: 34, awayScore: 29, winner: 'Philadelphia Eagles' },
      { date: '2024-09-08', league: 'NFL', homeTeam: 'Buffalo Bills', awayTeam: 'Arizona Cardinals', homeScore: 34, awayScore: 28, winner: 'Buffalo Bills' },
    ],
    MLB: [
      { date: '2024-03-20', league: 'MLB', homeTeam: 'Los Angeles Dodgers', awayTeam: 'San Diego Padres', homeScore: 5, awayScore: 2, winner: 'Los Angeles Dodgers' },
      { date: '2024-03-28', league: 'MLB', homeTeam: 'New York Yankees', awayTeam: 'Houston Astros', homeScore: 5, awayScore: 4, winner: 'New York Yankees' },
    ],
    NBA: [
      { date: '2023-10-24', league: 'NBA', homeTeam: 'Los Angeles Lakers', awayTeam: 'Denver Nuggets', homeScore: 107, awayScore: 119, winner: 'Denver Nuggets' },
      { date: '2023-10-24', league: 'NBA', homeTeam: 'Phoenix Suns', awayTeam: 'Golden State Warriors', homeScore: 108, awayScore: 104, winner: 'Phoenix Suns' },
    ],
    NHL: [
      { date: '2023-10-10', league: 'NHL', homeTeam: 'Vegas Golden Knights', awayTeam: 'Seattle Kraken', homeScore: 4, awayScore: 1, winner: 'Vegas Golden Knights' },
    ],
    NCAAB: [
      { date: '2023-11-06', league: 'NCAAB', homeTeam: 'Duke', awayTeam: 'Dartmouth', homeScore: 92, awayScore: 54, winner: 'Duke' },
    ],
    NCAAF: [
      { date: '2024-08-24', league: 'NCAAF', homeTeam: 'Florida State', awayTeam: 'Georgia Tech', homeScore: 21, awayScore: 24, winner: 'Georgia Tech' },
    ],
    NASCAR: [
      { date: '2024-02-19', league: 'NASCAR', homeTeam: 'William Byron', awayTeam: 'Field', homeScore: 1, awayScore: 0, winner: 'William Byron', venue: 'Daytona International Speedway' },
    ],
  };

  return samples[league] || [];
}

// ==================== CLI ====================

if (process.argv[1] === __filename) {
  const league = (process.argv[2] || 'ALL') as League | 'ALL';
  const year = parseInt(process.argv[3] || '2024');

  console.log(`\n🎯 PROGNO BACKTEST ENGINE`);
  console.log(`League: ${league}, Year: ${year}\n`);

  if (league === 'ALL') {
    // Backtest all leagues
    const allPredictions: Record<League, Prediction[]> = {
      NFL: generateSamplePredictions('NFL', year),
      MLB: generateSamplePredictions('MLB', year),
      NBA: generateSamplePredictions('NBA', year),
      NHL: generateSamplePredictions('NHL', year),
      NCAAB: generateSamplePredictions('NCAAB', year),
      NCAAF: generateSamplePredictions('NCAAF', year),
      NASCAR: generateSamplePredictions('NASCAR', year),
    };

    const results = backtestAllLeagues(year, allPredictions);
    printCombinedReport(results);

    // Save results
    const outputPath = `./backtest-all-leagues-${year}.json`;
    writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Full results saved to: ${outputPath}`);

  } else {
    // Backtest single league
    const predictions = generateSamplePredictions(league, year);
    const result = backtestLeague(league, year, predictions);
    printBacktestReport(result);

    // Save results
    const outputPath = `./backtest-${league.toLowerCase()}-${year}.json`;
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  }

  console.log('\n✅ Backtest complete!');
  console.log('\nTo use with your own predictions:');
  console.log('  import { backtestLeague } from "./scripts/backtest-all-leagues.js"');
  console.log('  const results = backtestLeague("NFL", 2024, yourPredictions);');
}

export type { BacktestResult, Prediction, RaceResult, League };

/**
 * PROGNO PICKS BACKTESTER
 * Simulates trading historical Progno picks on Kalshi prediction markets
 */

import * as fs from 'fs';
import * as path from 'path';

// Historical NCAAB data from 2023-2024 season
interface HistoricalPick {
  date: string;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  confidence: number;
  odds: number;
  profitLoss: number;
  homeScore: number;
  awayScore: number;
}

interface BacktestResult {
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalWagered: number;
  totalProfit: number;
  roi: number;
  avgConfidence: number;
  profitByConfidence: Map<number, { bets: number; profit: number }>;
  profitByOdds: Map<string, { bets: number; profit: number }>;
  dailyResults: Map<string, { bets: number; profit: number }>;
}

// Load historical data from JSON file
function loadHistoricalData(): HistoricalPick[] {
  const dataPath = path.join(__dirname, 'data', 'ncaab-historical.json');
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(rawData);
    return parsed.races || [];
  } catch (error) {
    console.warn(`⚠️ Could not load full dataset from ${dataPath}, using sample data`);
    return SAMPLE_PICKS;
  }
}

// Sample data fallback
const SAMPLE_PICKS: HistoricalPick[] = [
  { date: "2023-11-06", homeTeam: "Arizona", awayTeam: "New Mexico", predictedWinner: "Arizona", actualWinner: "Arizona", correct: true, confidence: 72, odds: -67, profitLoss: 149.25, homeScore: 76, awayScore: 59 },
  { date: "2023-11-06", homeTeam: "Baylor", awayTeam: "Northwestern", predictedWinner: "Baylor", actualWinner: "Northwestern", correct: false, confidence: 74, odds: -176, profitLoss: -100, homeScore: 75, awayScore: 84 },
  { date: "2023-11-06", homeTeam: "BYU", awayTeam: "Oklahoma State", predictedWinner: "BYU", actualWinner: "BYU", correct: true, confidence: 79, odds: -117, profitLoss: 85.47, homeScore: 80, awayScore: 76 },
];

/**
 * Calculate implied probability from American odds
 */
function oddsToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return -odds / (-odds + 100);
  }
}

/**
 * Convert American odds to decimal odds
 */
function americanToDecimal(odds: number): number {
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / -odds) + 1;
  }
}

/**
 * Simulate a bet on Kalshi-style market
 * Returns profit/loss for a $100 unit bet
 */
function simulateBet(pick: HistoricalPick, unitSize: number = 100): number {
  const decimalOdds = americanToDecimal(pick.odds);

  if (pick.correct) {
    // Win: return stake + profit
    return unitSize * (decimalOdds - 1);
  } else {
    // Loss: lose stake
    return -unitSize;
  }
}

/**
 * Run backtest on historical picks
 */
function runBacktest(picks: HistoricalPick[], config: {
  minConfidence?: number;
  maxConfidence?: number;
  unitSize?: number;
  kellyFraction?: number;
} = {}): BacktestResult {
  const {
    minConfidence = 0,
    maxConfidence = 100,
    unitSize = 100,
    kellyFraction = 0.25 // Quarter Kelly for safety
  } = config;

  let totalBets = 0;
  let wins = 0;
  let losses = 0;
  let totalWagered = 0;
  let totalProfit = 0;
  let confidenceSum = 0;

  const profitByConfidence = new Map<number, { bets: number; profit: number }>();
  const profitByOdds = new Map<string, { bets: number; profit: number }>();
  const dailyResults = new Map<string, { bets: number; profit: number }>();

  for (const pick of picks) {
    // Filter by confidence
    if (pick.confidence < minConfidence || pick.confidence > maxConfidence) {
      continue;
    }

    // Calculate Kelly stake
    const impliedProb = oddsToImpliedProbability(pick.odds);
    const edge = (pick.confidence / 100) - impliedProb;

    if (edge <= 0) continue; // No edge, skip

    const kellyStake = (edge / (americanToDecimal(pick.odds) - 1)) * unitSize * kellyFraction;
    const actualStake = Math.min(kellyStake, unitSize * 2); // Cap at 2 units

    const profit = simulateBet(pick, actualStake);

    totalBets++;
    totalWagered += actualStake;
    totalProfit += profit;
    confidenceSum += pick.confidence;

    if (pick.correct) {
      wins++;
    } else {
      losses++;
    }

    // Track by confidence bucket (rounded to nearest 5)
    const confBucket = Math.round(pick.confidence / 5) * 5;
    const confStats = profitByConfidence.get(confBucket) || { bets: 0, profit: 0 };
    confStats.bets++;
    confStats.profit += profit;
    profitByConfidence.set(confBucket, confStats);

    // Track by odds range
    let oddsRange: string;
    if (pick.odds < -150) oddsRange = "Heavy Fav (<-150)";
    else if (pick.odds < -110) oddsRange = "Fav (-150 to -110)";
    else if (pick.odds <= 110) oddsRange = "Pick'em (-110 to +110)";
    else oddsRange = "Underdog (>+110)";

    const oddsStats = profitByOdds.get(oddsRange) || { bets: 0, profit: 0 };
    oddsStats.bets++;
    oddsStats.profit += profit;
    profitByOdds.set(oddsRange, oddsStats);

    // Track daily results
    const dayStats = dailyResults.get(pick.date) || { bets: 0, profit: 0 };
    dayStats.bets++;
    dayStats.profit += profit;
    dailyResults.set(pick.date, dayStats);
  }

  return {
    totalBets,
    wins,
    losses,
    winRate: totalBets > 0 ? (wins / totalBets) * 100 : 0,
    totalWagered,
    totalProfit,
    roi: totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0,
    avgConfidence: totalBets > 0 ? confidenceSum / totalBets : 0,
    profitByConfidence,
    profitByOdds,
    dailyResults
  };
}

/**
 * Print backtest results
 */
function printResults(result: BacktestResult, title: string): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ${title}`);
  console.log('='.repeat(70));

  console.log(`\n📈 OVERALL PERFORMANCE`);
  console.log(`   Total Bets:      ${result.totalBets.toLocaleString()}`);
  console.log(`   Wins:            ${result.wins.toLocaleString()} (${result.winRate.toFixed(1)}%)`);
  console.log(`   Losses:          ${result.losses.toLocaleString()}`);
  console.log(`   Total Wagered:   $${result.totalWagered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   Total Profit:    $${result.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   ROI:             ${result.roi.toFixed(2)}%`);
  console.log(`   Avg Confidence:  ${result.avgConfidence.toFixed(1)}%`);

  console.log(`\n💰 PROFIT BY CONFIDENCE LEVEL`);
  const sortedConf = Array.from(result.profitByConfidence.entries()).sort((a, b) => a[0] - b[0]);
  for (const [conf, stats] of sortedConf) {
    const winRate = stats.bets > 0 ? (stats.profit > 0 ? '+' : '') + stats.profit.toFixed(0) : '0';
    console.log(`   ${conf}% confidence: ${stats.bets} bets, $${winRate}`);
  }

  console.log(`\n📊 PROFIT BY ODDS RANGE`);
  for (const [range, stats] of result.profitByOdds) {
    const winRate = stats.bets > 0 ? (stats.profit > 0 ? '+' : '') + stats.profit.toFixed(0) : '0';
    console.log(`   ${range}: ${stats.bets} bets, $${winRate}`);
  }

  console.log(`\n📅 DAILY BREAKDOWN (sample)`);
  const sortedDays = Array.from(result.dailyResults.entries()).sort().slice(0, 10);
  for (const [date, stats] of sortedDays) {
    const profitStr = stats.profit >= 0 ? `+$${stats.profit.toFixed(0)}` : `-$${Math.abs(stats.profit).toFixed(0)}`;
    console.log(`   ${date}: ${stats.bets} bets, ${profitStr}`);
  }
}

/**
 * Main backtest function
 */
async function runPrognoBacktest() {
  console.log('\n' + '='.repeat(70));
  console.log('🏀 PROGNO PICKS BACKTEST - NCAAB 2023-2024');
  console.log('='.repeat(70));

  // Load full historical dataset
  const picks = loadHistoricalData();

  console.log(`\n📋 Loaded ${picks.length.toLocaleString()} historical picks`);
  if (picks.length > 0) {
    console.log(`   Sample game: ${picks[0].homeTeam} vs ${picks[0].awayTeam}`);
    console.log(`   Date range: ${picks[0].date} to ${picks[picks.length - 1]?.date || 'N/A'}`);
  }

  // Test 1: All picks with edge (Kelly sized)
  const allPicks = runBacktest(picks, { unitSize: 100, kellyFraction: 0.25 });
  printResults(allPicks, "ALL PICKS WITH EDGE (25% Kelly, $100 unit)");

  // Test 2: High confidence only (80%+)
  const highConf = runBacktest(picks, { minConfidence: 80, unitSize: 100, kellyFraction: 0.25 });
  printResults(highConf, "HIGH CONFIDENCE ONLY (80%+, Kelly sized)");

  // Test 3: Very high confidence (85%+)
  const veryHighConf = runBacktest(picks, { minConfidence: 85, unitSize: 100, kellyFraction: 0.25 });
  printResults(veryHighConf, "VERY HIGH CONFIDENCE (85%+, Kelly sized)");

  // Test 4: Medium confidence (60-80%)
  const medConf = runBacktest(picks, { minConfidence: 60, maxConfidence: 80, unitSize: 100, kellyFraction: 0.25 });
  printResults(medConf, "MEDIUM CONFIDENCE (60-80%, Kelly sized)");

  // Test 5: Flat betting for comparison
  const flatBets = runBacktest(picks, { unitSize: 100, kellyFraction: 1 });
  printResults(flatBets, "FLAT BETTING ($100 per bet, no edge filter)");

  console.log('\n' + '='.repeat(70));
  console.log('✅ Backtest complete!');
  console.log('='.repeat(70));
}

// Run if executed directly
if (require.main === module) {
  runPrognoBacktest().catch(console.error);
}

export { runPrognoBacktest, runBacktest, HistoricalPick };

/**
 * NASCAR Backtest Script
 * Compares Progno predictions against 2024 NASCAR Cup Series results
 */

import nascarResults2024 from '../docs/nascar-2024-results.json' with { type: 'json' };

interface NASCARResult {
  raceDate: string;
  track: string;
  raceName: string;
  winner: string;
}

interface Prediction {
  raceDate: string;
  predictedWinner: string;
  confidence: number;
  odds?: number;
}

interface BacktestResult {
  totalRaces: number;
  correctPicks: number;
  accuracy: number;
  roi: number;
  avgConfidence: number;
  avgOdds: number;
  races: RaceResult[];
}

interface RaceResult {
  raceDate: string;
  track: string;
  raceName: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  confidence: number;
  odds?: number;
  profitLoss: number;
}

/**
 * Run backtest against 2024 NASCAR results
 * @param predictions Array of predictions with race dates and predicted winners
 * @returns Backtest summary and detailed race results
 */
export function backtestNASCAR2024(predictions: Prediction[]): BacktestResult {
  const races: RaceResult[] = [];
  let correctPicks = 0;
  let totalProfitLoss = 0;
  let totalConfidence = 0;
  let totalOdds = 0;
  let racesWithOdds = 0;

  for (const prediction of predictions) {
    // Find matching race
    const race = nascarResults2024.find(
      (r: NASCARResult) => r.raceDate === prediction.raceDate
    );

    if (!race) {
      console.warn(`No race found for date: ${prediction.raceDate}`);
      continue;
    }

    const correct = race.winner === prediction.predictedWinner;
    const odds = prediction.odds || 400; // Default to 4-1 odds if not provided
    
    // Calculate profit/loss (assuming $100 wager)
    const profitLoss = correct 
      ? (odds / 100) * 100 // Winner pays odds
      : -100; // Loss

    if (correct) correctPicks++;
    totalProfitLoss += profitLoss;
    totalConfidence += prediction.confidence;
    if (prediction.odds) {
      totalOdds += prediction.odds;
      racesWithOdds++;
    }

    races.push({
      raceDate: prediction.raceDate,
      track: race.track,
      raceName: race.raceName,
      predictedWinner: prediction.predictedWinner,
      actualWinner: race.winner,
      correct,
      confidence: prediction.confidence,
      odds: prediction.odds,
      profitLoss,
    });
  }

  const totalRaces = races.length;
  const accuracy = totalRaces > 0 ? (correctPicks / totalRaces) * 100 : 0;
  const roi = totalRaces > 0 ? (totalProfitLoss / (totalRaces * 100)) * 100 : 0;
  const avgConfidence = totalRaces > 0 ? totalConfidence / totalRaces : 0;
  const avgOdds = racesWithOdds > 0 ? totalOdds / racesWithOdds : 400;

  return {
    totalRaces,
    correctPicks,
    accuracy,
    roi,
    avgConfidence,
    avgOdds,
    races,
  };
}

/**
 * Print backtest results to console
 */
export function printBacktestResults(result: BacktestResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('NASCAR 2024 BACKTEST RESULTS');
  console.log('='.repeat(70));
  console.log(`\nSummary:`);
  console.log(`  Total Races:     ${result.totalRaces}`);
  console.log(`  Correct Picks:   ${result.correctPicks}/${result.totalRaces}`);
  console.log(`  Accuracy:        ${result.accuracy.toFixed(1)}%`);
  console.log(`  ROI:             ${result.roi.toFixed(1)}%`);
  console.log(`  Avg Confidence:  ${result.avgConfidence.toFixed(1)}%`);
  console.log(`  Avg Odds:        +${result.avgOdds.toFixed(0)}`);
  console.log(`  Total P&L:       $${(result.roi * result.totalRaces).toFixed(2)}`);

  console.log('\n' + '-'.repeat(70));
  console.log('Race-by-Race Results:');
  console.log('-'.repeat(70));

  result.races.forEach((race, i) => {
    const status = race.correct ? '✓' : '✗';
    const profit = race.profitLoss > 0 ? `+$${race.profitLoss.toFixed(0)}` : `-$${Math.abs(race.profitLoss).toFixed(0)}`;
    console.log(`\n${i + 1}. ${race.raceDate} - ${race.track}`);
    console.log(`   ${status} Predicted: ${race.predictedWinner} (${race.confidence}%)`);
    console.log(`   ${race.correct ? ' ' : ' '} Actual: ${race.actualWinner}`);
    console.log(`   P&L: ${profit} @ ${race.odds ? '+' + race.odds : 'N/A'}`);
  });

  console.log('\n' + '='.repeat(70));
}

/**
 * Generate sample predictions for testing
 * Uses top drivers with realistic odds
 */
export function getSamplePredictions(): Prediction[] {
  // Sample predictions for testing - mix of correct and incorrect
  return [
    { raceDate: '2024-02-19', predictedWinner: 'Kyle Larson', confidence: 75, odds: 600 },      // Actual: William Byron
    { raceDate: '2024-02-24', predictedWinner: 'Kyle Larson', confidence: 72, odds: 550 },      // Actual: Daniel Suarez
    { raceDate: '2024-03-03', predictedWinner: 'Kyle Larson', confidence: 78, odds: 400 },      // Actual: Kyle Larson ✓
    { raceDate: '2024-03-10', predictedWinner: 'Christopher Bell', confidence: 70, odds: 500 }, // Actual: Christopher Bell ✓
    { raceDate: '2024-03-17', predictedWinner: 'Denny Hamlin', confidence: 68, odds: 450 },     // Actual: Denny Hamlin ✓
    { raceDate: '2024-03-24', predictedWinner: 'William Byron', confidence: 65, odds: 400 },   // Actual: William Byron ✓
    { raceDate: '2024-03-31', predictedWinner: 'Kyle Larson', confidence: 70, odds: 400 },      // Actual: Denny Hamlin
    { raceDate: '2024-04-07', predictedWinner: 'William Byron', confidence: 72, odds: 350 },    // Actual: William Byron ✓
    { raceDate: '2024-04-14', predictedWinner: 'Chase Elliott', confidence: 68, odds: 450 },   // Actual: Chase Elliott ✓
    { raceDate: '2024-04-21', predictedWinner: 'Denny Hamlin', confidence: 65, odds: 500 },    // Actual: Tyler Reddick
  ];
}

/**
 * Get all 2024 race dates for testing
 */
export function getAll2024RaceDates(): string[] {
  return nascarResults2024.map((r: NASCARResult) => r.raceDate);
}

/**
 * Get actual winner for a specific race date
 */
export function getActualWinner(raceDate: string): string | null {
  const race = nascarResults2024.find((r: NASCARResult) => r.raceDate === raceDate);
  return race ? race.winner : null;
}

// CLI usage
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  console.log('NASCAR 2024 Backtest Demo\n');
  
  // Run sample backtest
  const predictions = getSamplePredictions();
  const results = backtestNASCAR2024(predictions);
  printBacktestResults(results);

  // Export results
  const outputPath = './backtest-results-sample.json';
  const output = {
    timestamp: new Date().toISOString(),
    sample: true,
    ...results,
  };
  
  import('fs').then(fs => {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to ${outputPath}`);
    console.log('\nTo use with real predictions:');
    console.log('  import { backtestNASCAR2024 } from "./scripts/backtest-nascar.ts"');
    console.log('  const results = backtestNASCAR2024(yourPredictions);');
  });
}

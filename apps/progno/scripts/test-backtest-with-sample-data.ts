/**
 * Test backtesting with real sample data from backtest-results-sample.json
 * Run with: npx ts-node scripts/test-backtest-with-sample-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import backtest database functions
import {
  saveGameOutcome,
  saveOddsSnapshot,
  savePredictionFactors,
  gradePrediction,
  calculateWinRate,
  getGradedPredictions
} from '../lib/backtest-db.ts';

interface BacktestRace {
  raceDate: string;
  track: string;
  raceName: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  confidence: number;
  odds: number;
  profitLoss: number;
}

interface BacktestData {
  timestamp: string;
  sample: boolean;
  totalRaces: number;
  correctPicks: number;
  accuracy: number;
  roi: number;
  avgConfidence: number;
  avgOdds: number;
  races: BacktestRace[];
}

async function loadSampleData(): Promise<BacktestData | null> {
  try {
    const filePath = path.join(process.cwd(), 'backtest-results-sample.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as BacktestData;
  } catch (error) {
    console.error('Failed to load sample data:', error);
    return null;
  }
}

async function testWithSampleData() {
  console.log('=====================================');
  console.log('SAMPLE DATA BACKTEST TEST');
  console.log('=====================================');

  const data = await loadSampleData();
  if (!data) {
    console.error('❌ Failed to load sample data');
    return;
  }

  console.log(`✓ Loaded ${data.races.length} races from sample data`);
  console.log(`  Accuracy: ${(data.accuracy * 100).toFixed(1)}%`);
  console.log(`  ROI: ${data.roi.toFixed(1)}%`);

  // Test 1: Save game outcomes from sample data
  console.log('--- Test 1: Saving Game Outcomes ---');
  let savedOutcomes = 0;
  for (const race of data.races.slice(0, 3)) { // Test with first 3
    const outcome: GameOutcome = {
      external_id: `nascar-${race.raceDate.replace(/-/g, '')}`,
      sport: 'nascar',
      sport_key: 'motorsport_nascar',
      home_team: race.actualWinner, // Winner is the actual winner
      away_team: race.predictedWinner, // Predicted vs actual
      game_date: race.raceDate,
      commence_time: `${race.raceDate}T14:00:00Z`,
      completed: true,
      source: 'sample-backtest'
    };

    const result = await saveGameOutcome(outcome);
    if (result) savedOutcomes++;
    console.log(`  ${race.raceName}: ${result ? '✓' : '✗'}`);
  }
  console.log(`Saved ${savedOutcomes} game outcomes\n`);

  // Test 2: Save odds snapshots
  console.log('--- Test 2: Saving Odds Snapshots ---');
  let savedSnapshots = 0;
  for (const race of data.races.slice(0, 3)) {
    // Convert odds to moneyline format
    const odds = race.odds;
    const moneyline = odds > 0 ? odds : Math.round((100 / Math.abs(odds)) * 100);

    const snapshot: OddsLineSnapshot = {
      external_id: `nascar-${race.raceDate.replace(/-/g, '')}`,
      sport: 'nascar',
      game_date: race.raceDate,
      snapshot_type: 'closing',
      home_moneyline: moneyline,
      away_moneyline: 100, // Field odds
      bookmaker: 'sample',
      market_count: 1
    };

    const result = await saveOddsSnapshot(snapshot);
    if (result) savedSnapshots++;
    console.log(`  ${race.raceName} (odds: ${race.odds}): ${result ? '✓' : '✗'}`);
  }
  console.log(`Saved ${savedSnapshots} odds snapshots\n`);

  // Test 3: Save prediction factors
  console.log('--- Test 3: Saving Prediction Factors ---');
  let savedFactors = 0;
  for (let i = 0; i < Math.min(3, data.races.length); i++) {
    const race = data.races[i];
    // Create mock prediction ID based on race data
    const predictionId = `00000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`;

    const factors: PredictionFactors = {
      prediction_id: predictionId,
      model_version: '2.0.0',
      algorithm_name: 'cevict-flex',
      factors: {
        recent_form: race.confidence * 0.3,
        track_history: race.confidence * 0.2,
        qualifying_position: race.confidence * 0.25,
        car_speed: race.confidence * 0.25
      },
      key_metrics: {
        predicted_winner: race.predictedWinner,
        actual_winner: race.actualWinner,
        correct: race.correct,
        odds: race.odds
      },
      data_sources: ['sample-backtest'],
      confidence_breakdown: {
        base: Math.round(race.confidence * 0.7),
        recent_form: Math.round(race.confidence * 0.15),
        track_history: Math.round(race.confidence * 0.15),
        total: race.confidence
      }
    };

    const result = await savePredictionFactors(factors);
    if (result) savedFactors++;
    console.log(`  ${race.raceName} (conf: ${race.confidence}%): ${result ? '✓' : '✗'}`);
  }
  console.log(`Saved ${savedFactors} prediction factors\n`);

  // Test 4: Grade predictions (we'll create mock prediction IDs)
  console.log('--- Test 4: Grading Predictions ---');
  let gradedCount = 0;
  for (let i = 0; i < Math.min(3, data.races.length); i++) {
    const race = data.races[i];
    const predictionId = `00000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`;
    const gameOutcomeId = `00000000-0000-0000-0000-${(100 + i + 1).toString().padStart(12, '0')}`;

    const grade: GradePredictionInput = {
      prediction_id: predictionId,
      result: race.correct ? 'win' : 'loss',
      profit: race.profitLoss,
      game_outcome_id: gameOutcomeId,
      odds_at_prediction: race.odds
    };

    const result = await gradePrediction(grade);
    if (result) gradedCount++;
    console.log(`  ${race.raceName} (${race.correct ? 'WIN' : 'LOSS'}): ${result ? '✓' : '✗'}`);
  }
  console.log(`Graded ${gradedCount} predictions\n`);

  // Test 5: Query backtest stats
  console.log('--- Test 5: Querying Backtest Stats ---');
  const stats = await calculateWinRate({
    sport: 'nascar',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  });

  if (stats) {
    console.log('  Win Rate Stats:');
    console.log(`    Total Predictions: ${stats.total_predictions}`);
    console.log(`    Wins: ${stats.wins}`);
    console.log(`    Losses: ${stats.losses}`);
    console.log(`    Win Rate: ${stats.win_rate}%`);
    console.log(`    Total Profit: ${stats.total_profit}`);
    console.log(`    Avg Confidence: ${stats.avg_confidence}%`);
  } else {
    console.log('  No stats available yet (need more data)');
  }

  // Test 6: Get graded predictions
  console.log('\n--- Test 6: Fetching Graded Predictions ---');
  const graded = await getGradedPredictions({
    sport: 'nascar',
    minConfidence: 60
  });
  console.log(`  Found ${graded.length} graded predictions`);

  console.log('\n=====================================');
  console.log('SAMPLE DATA TEST COMPLETE');
  console.log('=====================================');
  console.log(`\nSummary:`);
  console.log(`  - Game Outcomes: ${savedOutcomes} saved`);
  console.log(`  - Odds Snapshots: ${savedSnapshots} saved`);
  console.log(`  - Prediction Factors: ${savedFactors} saved`);
  console.log(`  - Predictions Graded: ${gradedCount} graded`);
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWithSampleData().catch(console.error);
}

export { testWithSampleData, loadSampleData };

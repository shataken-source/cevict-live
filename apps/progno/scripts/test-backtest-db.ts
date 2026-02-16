/**
 * Test script for backtesting database functions
 * Run with: npx ts-node scripts/test-backtest-db.ts
 */

import {
  saveGameOutcome,
  getGameOutcome,
  saveOddsSnapshot,
  getLineMovement,
  savePredictionFactors,
  getPredictionFactors,
  gradePrediction,
  getGradedPredictions,
  calculateWinRate,
  GameOutcome,
  OddsLineSnapshot,
  PredictionFactors,
  GradePredictionInput
} from '../lib/backtest-db';

async function testGameOutcomes() {
  console.log('\n--- Testing Game Outcomes ---');

  const testOutcome: GameOutcome = {
    external_id: 'test-game-001',
    sport: 'nba',
    sport_key: 'basketball_nba',
    home_team: 'Lakers',
    away_team: 'Celtics',
    game_date: '2026-02-15',
    commence_time: '2026-02-15T20:00:00Z',
    home_score: 112,
    away_score: 108,
    completed: true,
    source: 'test'
  };

  // Save
  const saved = await saveGameOutcome(testOutcome);
  console.log('Save game outcome:', saved ? 'SUCCESS' : 'FAILED');

  // Retrieve
  const retrieved = await getGameOutcome('test-game-001', 'nba', '2026-02-15');
  console.log('Get game outcome:', retrieved ? 'SUCCESS' : 'FAILED');
  if (retrieved) {
    console.log('  Winner:', retrieved.winner);
    console.log('  Total points:', retrieved.total_points);
  }
}

async function testOddsSnapshots() {
  console.log('\n--- Testing Odds Snapshots ---');

  const testSnapshot: OddsLineSnapshot = {
    external_id: 'test-game-001',
    sport: 'nba',
    game_date: '2026-02-15',
    snapshot_type: 'opening',
    home_moneyline: -150,
    away_moneyline: +130,
    home_spread: -3.5,
    away_spread: 3.5,
    spread_line: -3.5,
    total_line: 220.5,
    bookmaker: 'draftkings',
    market_count: 3
  };

  // Save
  const saved = await saveOddsSnapshot(testSnapshot);
  console.log('Save odds snapshot:', saved ? 'SUCCESS' : 'FAILED');

  // Save closing line
  const closingSnapshot = { ...testSnapshot, snapshot_type: 'closing', home_moneyline: -160 };
  await saveOddsSnapshot(closingSnapshot);

  // Retrieve line movement
  const movement = await getLineMovement('test-game-001', 'nba', '2026-02-15');
  console.log('Get line movement:', movement.length > 0 ? 'SUCCESS' : 'FAILED');
  console.log('  Number of snapshots:', movement.length);
}

async function testPredictionFactors() {
  console.log('\n--- Testing Prediction Factors ---');

  // First we need a prediction ID - this would normally come from the database
  // For testing, we'll use a placeholder
  const testPredictionId = '00000000-0000-0000-0000-000000000001';

  const testFactors: PredictionFactors = {
    prediction_id: testPredictionId,
    model_version: '2.1.0',
    algorithm_name: 'cevict-flex',
    factors: {
      home_field: 0.15,
      rest_days: 0.10,
      recent_form: 0.20,
      injuries: 0.15
    },
    key_metrics: {
      home_win_pct: '0.65',
      away_win_pct: '0.45',
      rest_diff: 2
    },
    data_sources: ['the-odds-api', 'api-sports'],
    confidence_breakdown: {
      base: 60,
      home_field: 5,
      rest: 3,
      total: 68
    }
  };

  const saved = await savePredictionFactors(testFactors);
  console.log('Save prediction factors:', saved ? 'SUCCESS' : 'FAILED');

  const retrieved = await getPredictionFactors(testPredictionId);
  console.log('Get prediction factors:', retrieved ? 'SUCCESS' : 'FAILED');
}

async function testGrading() {
  console.log('\n--- Testing Prediction Grading ---');

  // Test with a mock prediction ID
  const testPredictionId = '00000000-0000-0000-0000-000000000001';
  const testGameOutcomeId = '00000000-0000-0000-0000-000000000002';

  const gradeInput: GradePredictionInput = {
    prediction_id: testPredictionId,
    result: 'win',
    profit: 100,
    game_outcome_id: testGameOutcomeId,
    odds_at_prediction: -150
  };

  const graded = await gradePrediction(gradeInput);
  console.log('Grade prediction:', graded ? 'SUCCESS' : 'FAILED');
}

async function testQueries() {
  console.log('\n--- Testing Backtest Queries ---');

  // Test getGradedPredictions
  const predictions = await getGradedPredictions({
    sport: 'nba',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    minConfidence: 50
  });
  console.log('Get graded predictions:', predictions.length >= 0 ? 'SUCCESS' : 'FAILED');
  console.log('  Found', predictions.length, 'predictions');

  // Test calculateWinRate
  const winRate = await calculateWinRate({
    sport: 'nba',
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  });
  console.log('Calculate win rate:', winRate ? 'SUCCESS' : 'FAILED');
  if (winRate) {
    console.log('  Total predictions:', winRate.total_predictions);
    console.log('  Wins:', winRate.wins);
    console.log('  Win rate:', winRate.win_rate + '%');
    console.log('  Total profit:', winRate.total_profit);
  }
}

async function runAllTests() {
  console.log('=====================================');
  console.log('BACKTEST DATABASE TESTS');
  console.log('=====================================');

  try {
    await testGameOutcomes();
    await testOddsSnapshots();
    await testPredictionFactors();
    await testGrading();
    await testQueries();

    console.log('\n=====================================');
    console.log('ALL TESTS COMPLETED');
    console.log('=====================================');
  } catch (error) {
    console.error('\nTEST ERROR:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };

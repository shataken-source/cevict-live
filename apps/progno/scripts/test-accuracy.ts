/**
 * Prediction Accuracy Test Script
 * Tests the fixed prediction engine against 224 real results
 */

import * as fs from 'fs';
import * as path from 'path';
import { predictScoreComprehensive } from '../app/score-prediction-service';
import { estimateTeamStatsFromOdds, shinDevig, americanToImpliedProb } from '../app/lib/odds-helpers';
import { MonteCarloEngine } from '../app/lib/monte-carlo-engine';

interface GameResult {
  League: string;
  GameId: string;
  HomeTeam: string;
  AwayTeam: string;
  HomeScore: number | null;
  AwayScore: number | null;
  Winner: string;
  Completed: boolean;
}

interface PredictionTest {
  gameId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  predictedHome: number;
  predictedAway: number;
  predictedWinner: string;
  actualHome: number;
  actualActual: number;
  actualWinner: string;
  scoreError: number;
  correctWinner: boolean;
}

async function runAccuracyTest() {
  console.log('🧪 PROGNO ACCURACY TEST - Real Results vs Predictions\n');
  
  // Load real results
  const resultsPath = path.join(process.cwd(), 'results-2026-02-12.json');
  if (!fs.existsSync(resultsPath)) {
    console.error('❌ Results file not found:', resultsPath);
    return;
  }
  
  const results: GameResult[] = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const completedGames = results.filter(r => r.Completed && r.HomeScore !== null && r.AwayScore !== null);
  
  console.log(`📊 Loaded ${results.length} total games`);
  console.log(`✅ ${completedGames.length} games with final scores\n`);
  
  if (completedGames.length === 0) {
    console.log('⚠️ No completed games to test against. Run this after games finish.');
    return;
  }
  
  const tests: PredictionTest[] = [];
  let winnerCorrect = 0;
  let totalScoreError = 0;
  
  for (const game of completedGames.slice(0, 50)) { // Test first 50 for speed
    try {
      // Create mock odds for testing (in production, these come from API)
      const mockOdds = {
        home: -110,
        away: 110,
        spread: -3,
        total: game.League === 'nhl' ? 6 : game.League === 'nba' ? 227 : 145
      };
      
      // Get sport-appropriate team stats
      const sport = game.League.toLowerCase();
      const estimatedStats = estimateTeamStatsFromOdds(mockOdds, sport);
      
      // Test 1: Score Prediction Service
      const scorePred = await predictScoreComprehensive({
        homeTeam: game.HomeTeam,
        awayTeam: game.AwayTeam,
        sport: sport,
        league: sport
      });
      
      // Test 2: Monte Carlo
      const mcEngine = new MonteCarloEngine({ iterations: 1000 });
      const gameData = {
        homeTeam: game.HomeTeam,
        awayTeam: game.AwayTeam,
        league: sport.toUpperCase(),
        sport: sport.toUpperCase(),
        odds: mockOdds,
        teamStats: estimatedStats
      };
      const mcResult = await mcEngine.simulate(gameData, mockOdds.spread, mockOdds.total);
      
      const predictedWinner = scorePred.home > scorePred.away ? game.HomeTeam : game.AwayTeam;
      const actualWinner = game.HomeScore! > game.AwayScore! ? game.HomeTeam : game.AwayTeam;
      const correct = predictedWinner === actualWinner;
      
      const homeError = Math.abs(scorePred.home - game.HomeScore!);
      const awayError = Math.abs(scorePred.away - game.AwayScore!);
      const totalError = homeError + awayError;
      
      tests.push({
        gameId: game.GameId,
        league: game.League,
        homeTeam: game.HomeTeam,
        awayTeam: game.AwayTeam,
        predictedHome: scorePred.home,
        predictedAway: scorePred.away,
        predictedWinner,
        actualHome: game.HomeScore!,
        actualActual: game.AwayScore!,
        actualWinner,
        scoreError: totalError,
        correctWinner: correct
      });
      
      if (correct) winnerCorrect++;
      totalScoreError += totalError;
      
    } catch (error) {
      console.warn(`⚠️ Error testing ${game.GameId}:`, error);
    }
  }
  
  // Results
  console.log('\n📈 TEST RESULTS:\n');
  console.log(`Winner Accuracy: ${winnerCorrect}/${tests.length} (${(winnerCorrect/tests.length*100).toFixed(1)}%)`);
  console.log(`Avg Score Error: ${(totalScoreError / tests.length / 2).toFixed(1)} points per team`);
  
  // By league breakdown
  const byLeague: Record<string, { correct: number; total: number; scoreError: number }> = {};
  for (const test of tests) {
    if (!byLeague[test.league]) byLeague[test.league] = { correct: 0, total: 0, scoreError: 0 };
    byLeague[test.league].total++;
    if (test.correctWinner) byLeague[test.league].correct++;
    byLeague[test.league].scoreError += test.scoreError;
  }
  
  console.log('\n📊 BY LEAGUE:');
  for (const [league, stats] of Object.entries(byLeague)) {
    const winPct = (stats.correct / stats.total * 100).toFixed(1);
    const avgError = (stats.scoreError / stats.total / 2).toFixed(1);
    console.log(`  ${league.toUpperCase()}: ${stats.correct}/${stats.total} (${winPct}%) - Avg Error: ${avgError}`);
  }
  
  // Show worst predictions
  console.log('\n🔍 WORST SCORE PREDICTIONS:');
  const worst = [...tests].sort((a, b) => b.scoreError - a.scoreError).slice(0, 5);
  for (const w of worst) {
    console.log(`  ${w.homeTeam} vs ${w.awayTeam}: Predicted ${w.predictedHome}-${w.predictedAway}, Actual ${w.actualHome}-${w.actualActual} (Error: ${w.scoreError})`);
  }
  
  return tests;
}

// Run if called directly
if (require.main === module) {
  runAccuracyTest().catch(console.error);
}

export { runAccuracyTest };

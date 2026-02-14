/**
 * Test Prediction Accuracy Against 2024 Real Results
 * Runs the fixed prediction engine against 286 real NFL games
 */

import * as fs from 'fs';
import * as path from 'path';
import { PredictionEngine, GameData } from '../app/lib/prediction-engine';
import { MonteCarloEngine } from '../app/lib/monte-carlo-engine';

interface Game2024 {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  actualWinner: string;
  actualScore: {
    home: number;
    away: number;
  };
  teamStats: {
    home: any;
    away: any;
  };
  recentForm?: {
    home: string[];
    away: string[];
  };
  headToHead?: {
    homeWins: number;
    awayWins: number;
  };
}

interface TestResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  actualWinner: string;
  correct: boolean;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  actualHomeScore: number;
  actualAwayScore: number;
  confidence: number;
  edge: number;
  homeProb: number;
}

async function run2024AccuracyTest() {
  console.log('🧪 TESTING FIXED PREDICTION ENGINE\n');
  console.log('Testing against 286 real 2024 NFL games\n');
  
  // Load 2024 games
  const gamesPath = path.join(process.cwd(), 'data', '2024-games.json');
  if (!fs.existsSync(gamesPath)) {
    console.error('❌ 2024 games file not found:', gamesPath);
    return;
  }
  
  const games: Game2024[] = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
  console.log(`📊 Loaded ${games.length} real 2024 games\n`);
  
  const predictionEngine = new PredictionEngine();
  const monteCarloEngine = new MonteCarloEngine({ iterations: 1000 });
  const results: TestResult[] = [];
  
  let correctWinners = 0;
  let totalHomeScoreError = 0;
  let totalAwayScoreError = 0;
  let highConfCorrect = 0;
  let highConfTotal = 0;
  let valueBetsCorrect = 0;
  let valueBetsTotal = 0;
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    
    try {
      // Build GameData
      const gameData: GameData = {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        league: game.league,
        sport: game.league,
        odds: game.odds,
        date: game.date,
        teamStats: game.teamStats,
        recentForm: game.recentForm,
        headToHead: game.headToHead
      };
      
      // Run prediction
      const prediction = await predictionEngine.predict(gameData);
      
      // Run Monte Carlo for score prediction
      const mcResult = await monteCarloEngine.simulate(gameData, game.odds.spread, game.odds.total);
      
      const predictedWinner = prediction.predictedWinner;
      const actualWinner = game.actualWinner;
      const correct = predictedWinner === actualWinner;
      
      if (correct) correctWinners++;
      
      // Score prediction accuracy
      const homeScoreError = Math.abs(mcResult.predictedScore.home - game.actualScore.home);
      const awayScoreError = Math.abs(mcResult.predictedScore.away - game.actualScore.away);
      totalHomeScoreError += homeScoreError;
      totalAwayScoreError += awayScoreError;
      
      // High confidence tracking
      if (prediction.confidence >= 0.65) {
        highConfTotal++;
        if (correct) highConfCorrect++;
      }
      
      // Value bet tracking
      if (prediction.recommendedBet && prediction.edge > 3) {
        valueBetsTotal++;
        if (correct) valueBetsCorrect++;
      }
      
      results.push({
        gameId: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        predictedWinner,
        actualWinner,
        correct,
        predictedHomeScore: mcResult.predictedScore.home,
        predictedAwayScore: mcResult.predictedScore.away,
        actualHomeScore: game.actualScore.home,
        actualAwayScore: game.actualScore.away,
        confidence: prediction.confidence,
        edge: prediction.edge,
        homeProb: mcResult.homeWinProbability
      });
      
      // Progress
      if ((i + 1) % 50 === 0) {
        const runningAccuracy = (correctWinners / (i + 1) * 100).toFixed(1);
        console.log(`  ${i + 1}/${games.length} tested... Running accuracy: ${runningAccuracy}%`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Error testing ${game.id}:`, error);
    }
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL ACCURACY RESULTS');
  console.log('='.repeat(60));
  
  const overallAccuracy = (correctWinners / games.length * 100).toFixed(1);
  console.log(`\nOverall Winner Accuracy: ${correctWinners}/${games.length} (${overallAccuracy}%)`);
  
  const avgHomeError = (totalHomeScoreError / games.length).toFixed(1);
  const avgAwayError = (totalAwayScoreError / games.length).toFixed(1);
  console.log(`\nScore Prediction Error:`);
  console.log(`  Home teams: ${avgHomeError} points average`);
  console.log(`  Away teams: ${avgAwayError} points average`);
  
  if (highConfTotal > 0) {
    const highConfAccuracy = (highConfCorrect / highConfTotal * 100).toFixed(1);
    console.log(`\nHigh Confidence (≥65%) Accuracy: ${highConfCorrect}/${highConfTotal} (${highConfAccuracy}%)`);
  }
  
  if (valueBetsTotal > 0) {
    const valueAccuracy = (valueBetsCorrect / valueBetsTotal * 100).toFixed(1);
    console.log(`\nValue Bet (edge > 3%) Accuracy: ${valueBetsCorrect}/${valueBetsTotal} (${valueAccuracy}%)`);
  }
  
  // Best and worst predictions
  console.log('\n' + '-'.repeat(60));
  console.log('🔍 BEST PREDICTIONS (High confidence + correct):');
  const best = results
    .filter(r => r.correct && r.confidence >= 0.70)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  best.forEach(r => {
    console.log(`  ${r.homeTeam} vs ${r.awayTeam}: ${r.confidence.toFixed(0)}% conf, ${r.edge.toFixed(1)}% edge ✓`);
  });
  
  console.log('\n🔍 WORST PREDICTIONS (High confidence + wrong):');
  const worst = results
    .filter(r => !r.correct && r.confidence >= 0.65)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  worst.forEach(r => {
    console.log(`  ${r.homeTeam} vs ${r.awayTeam}: ${r.confidence.toFixed(0)}% conf, picked ${r.predictedWinner}, actual ${r.actualWinner} ✗`);
  });
  
  console.log('\n🔍 BIGGEST SCORE ERRORS:');
  const scoreErrors = results.map(r => ({
    ...r,
    totalError: Math.abs((r.predictedHomeScore || 0) - r.actualHomeScore) + 
                Math.abs((r.predictedAwayScore || 0) - r.actualAwayScore)
  })).sort((a, b) => b.totalError - a.totalError).slice(0, 5);
  
  scoreErrors.forEach(r => {
    console.log(`  ${r.homeTeam} vs ${r.awayTeam}: Predicted ${r.predictedHomeScore}-${r.predictedAwayScore}, Actual ${r.actualHomeScore}-${r.actualAwayScore} (Error: ${r.totalError})`);
  });
  
  // Save results
  const outputPath = path.join(process.cwd(), 'test-results-2024-accuracy.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      totalGames: games.length,
      correctWinners,
      overallAccuracy: parseFloat(overallAccuracy),
      avgHomeError: parseFloat(avgHomeError),
      avgAwayError: parseFloat(avgAwayError),
      highConfAccuracy: highConfTotal > 0 ? highConfCorrect / highConfTotal : 0,
      valueBetAccuracy: valueBetsTotal > 0 ? valueBetsCorrect / valueBetsTotal : 0
    },
    results
  }, null, 2));
  console.log(`\n✅ Detailed results saved to: ${outputPath}`);
  
  return results;
}

// Run if called directly
if (require.main === module) {
  run2024AccuracyTest().catch(console.error);
}

export { run2024AccuracyTest };

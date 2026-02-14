/**
 * Test Prediction Accuracy Against 2024 Real Results
 * Quick test to verify fixes work with real data
 */

const fs = require('fs');
const path = require('path');

// Load the prediction modules
const { PredictionEngine } = require('../app/lib/prediction-engine');
const { MonteCarloEngine } = require('../app/lib/monte-carlo-engine');

async function run2024Test() {
  console.log('🧪 TESTING FIXED PREDICTION ENGINE\n');
  
  // Load 2024 games
  const gamesPath = path.join(process.cwd(), 'data', '2024-games.json');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
  
  console.log(`📊 Loaded ${games.length} real 2024 NFL games\n`);
  console.log('Running first 20 games as quick test...\n');
  
  const predictionEngine = new PredictionEngine();
  const monteCarloEngine = new MonteCarloEngine({ iterations: 500 });
  
  let correct = 0;
  let totalScoreError = 0;
  
  for (let i = 0; i < Math.min(20, games.length); i++) {
    const game = games[i];
    
    try {
      const gameData = {
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
      
      const prediction = await predictionEngine.predict(gameData);
      const mcResult = await monteCarloEngine.simulate(gameData, game.odds.spread, game.odds.total);
      
      const isCorrect = prediction.predictedWinner === game.actualWinner;
      if (isCorrect) correct++;
      
      const scoreError = Math.abs(mcResult.predictedScore.home - game.actualScore.home) + 
                        Math.abs(mcResult.predictedScore.away - game.actualScore.away);
      totalScoreError += scoreError;
      
      console.log(`${i+1}. ${game.homeTeam} vs ${game.awayTeam}:`);
      console.log(`   Predicted: ${prediction.predictedWinner} (${(prediction.confidence*100).toFixed(0)}% conf)`);
      console.log(`   Score: ${mcResult.predictedScore.home}-${mcResult.predictedScore.away} (actual: ${game.actualScore.home}-${game.actualScore.away})`);
      console.log(`   Result: ${isCorrect ? '✓ CORRECT' : '✗ WRONG'} | Edge: ${prediction.edge.toFixed(1)}%`);
      console.log();
      
    } catch (err) {
      console.warn(`   ⚠️ Error: ${err.message}`);
    }
  }
  
  console.log('-'.repeat(50));
  console.log(`RESULTS: ${correct}/20 correct (${(correct/20*100).toFixed(1)}%)`);
  console.log(`Avg score error: ${(totalScoreError/20/2).toFixed(1)} points per team`);
}

run2024Test().catch(console.error);

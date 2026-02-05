#!/usr/bin/env node
/**
 * Simulate Yesterday's Games with Claude Effect
 * Fetches yesterday's games and runs predictions with full Claude Effect
 */

import { fetchScoresAndUpdatePredictions } from '../app/weekly-page.helpers';
import { analyzeWeeklyGames } from '../app/weekly-analyzer';

// Get yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

console.log(`\n🎯 SIMULATING YESTERDAY'S GAMES (${yesterdayStr}) WITH CLAUDE EFFECT\n`);

// Get API key
const apiKey = process.env.ODDS_API_KEY;
if (!apiKey) {
  console.error('❌ ODDS_API_KEY not set in environment');
  process.exit(1);
}

// Supported sports
const SPORTS: Array<'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB'> = [
  'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'
];

interface SimulationResult {
  sport: string;
  gamesFound: number;
  predictions: number;
  claudeEffectApplied: number;
  results: Array<{
    game: string;
    predictedWinner: string;
    confidence: number;
    actualWinner?: string | null;
    correct?: boolean;
    claudeEffect?: {
      adjustedProbability: number;
      scores: any;
      warnings: string[];
    };
  }>;
}

async function simulateYesterday() {
  const allResults: SimulationResult[] = [];

  for (const sport of SPORTS) {
    try {
      console.log(`\n📊 Processing ${sport}...`);

      // Fetch completed games from yesterday (look back 1 day)
      const scoreResult = await fetchScoresAndUpdatePredictions(apiKey, sport, [], 1);

      if (scoreResult.completedGames === 0) {
        console.log(`   ⚠️  No completed games found for ${sport}`);
        continue;
      }

      console.log(`   ✅ Found ${scoreResult.completedGames} completed games`);

      // For simulation, we need to fetch the games with their pre-game data
      // We'll use the scores API which returns completed games with scores
      const sportKey = sport === 'NFL' ? 'americanfootball_nfl' :
                      sport === 'NBA' ? 'basketball_nba' :
                      sport === 'MLB' ? 'baseball_mlb' :
                      sport === 'NHL' ? 'icehockey_nhl' :
                      sport === 'NCAAF' ? 'americanfootball_ncaaf' :
                      'basketball_ncaab';

      const scoresUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=1&apiKey=${apiKey}`;
      const scoresRes = await fetch(scoresUrl);

      if (!scoresRes.ok) {
        console.log(`   ⚠️  Could not fetch scores for ${sport}`);
        continue;
      }

      const scoresData = await scoresRes.json();
      if (!Array.isArray(scoresData) || scoresData.length === 0) {
        console.log(`   ⚠️  No score data for ${sport}`);
        continue;
      }

      // Filter to yesterday's games only
      const yesterdayGames = scoresData.filter((game: any) => {
        if (!game.commence_time) return false;
        const gameDate = new Date(game.commence_time);
        return gameDate.toISOString().split('T')[0] === yesterdayStr;
      });

      if (yesterdayGames.length === 0) {
        console.log(`   ⚠️  No games from yesterday (${yesterdayStr}) for ${sport}`);
        continue;
      }

      console.log(`   📋 Processing ${yesterdayGames.length} games from yesterday`);

      // Convert to Game format and run predictions
      const games = yesterdayGames.map((item: any) => ({
        id: item.id || `${item.home_team}-${item.away_team}-${item.commence_time}`,
        homeTeam: item.home_team,
        awayTeam: item.away_team,
        sport: sport,
        date: new Date(item.commence_time),
        venue: item.venue || 'TBD',
        odds: {
          home: -110, // Default if not available
          away: 110,
          spread: item.scores?.[0]?.spread || undefined,
          total: item.scores?.[0]?.total || undefined,
        },
        liveScore: item.scores?.[0] ? {
          home: item.scores[0].scores?.find((s: any) => s.name === item.home_team)?.score || 0,
          away: item.scores[0].scores?.find((s: any) => s.name === item.away_team)?.score || 0,
        } : undefined,
      }));

      // Run predictions with Claude Effect
      const analysis = await analyzeWeeklyGames(games);

      const predictions = analysis.predictions.map(pred => {
        // Check if Claude Effect was applied (it should be automatically)
        const claudeEffect = (pred as any).claudeEffect || null;

        return {
          game: `${pred.game.homeTeam} vs ${pred.game.awayTeam}`,
          predictedWinner: pred.predictedWinner,
          confidence: pred.confidence,
          actualWinner: pred.game.liveScore
            ? (pred.game.liveScore.home > pred.game.liveScore.away
                ? pred.game.homeTeam
                : pred.game.awayTeam)
            : null,
          correct: pred.game.liveScore
            ? pred.predictedWinner === (pred.game.liveScore.home > pred.game.liveScore.away
                ? pred.game.homeTeam
                : pred.game.awayTeam)
            : null,
          claudeEffect: claudeEffect ? {
            adjustedProbability: claudeEffect.adjustedProbability,
            scores: claudeEffect.scores,
            warnings: claudeEffect.warnings || [],
          } : null,
        };
      });

      const claudeEffectCount = predictions.filter(p => p.claudeEffect !== null).length;

      allResults.push({
        sport,
        gamesFound: yesterdayGames.length,
        predictions: predictions.length,
        claudeEffectApplied: claudeEffectCount,
        results: predictions,
      });

      console.log(`   ✅ Generated ${predictions.length} predictions (${claudeEffectCount} with Claude Effect)`);

      // Show accuracy if we have actual results
      const withResults = predictions.filter(p => p.actualWinner !== null);
      if (withResults.length > 0) {
        const correct = withResults.filter(p => p.correct === true).length;
        const accuracy = (correct / withResults.length) * 100;
        console.log(`   📈 Accuracy: ${correct}/${withResults.length} (${accuracy.toFixed(1)}%)`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error processing ${sport}:`, error.message);
    }
  }

  // Summary
  console.log(`\n\n📊 SIMULATION SUMMARY\n`);
  console.log(`Date: ${yesterdayStr}`);
  console.log(`Total Sports: ${allResults.length}`);

  const totalGames = allResults.reduce((sum, r) => sum + r.gamesFound, 0);
  const totalPredictions = allResults.reduce((sum, r) => sum + r.predictions, 0);
  const totalClaudeEffect = allResults.reduce((sum, r) => sum + r.claudeEffectApplied, 0);

  console.log(`Total Games: ${totalGames}`);
  console.log(`Total Predictions: ${totalPredictions}`);
  console.log(`Claude Effect Applied: ${totalClaudeEffect} (${((totalClaudeEffect / totalPredictions) * 100).toFixed(1)}%)`);

  // Show results by sport
  for (const result of allResults) {
    console.log(`\n${result.sport}:`);
    console.log(`  Games: ${result.gamesFound}`);
    console.log(`  Predictions: ${result.predictions}`);
    console.log(`  Claude Effect: ${result.claudeEffectApplied}`);

    // Show sample predictions
    if (result.results.length > 0) {
      console.log(`  Sample Predictions:`);
      result.results.slice(0, 3).forEach(p => {
        const status = p.actualWinner
          ? (p.correct ? '✅' : '❌')
          : '⏳';
        console.log(`    ${status} ${p.game}: ${p.predictedWinner} (${(p.confidence * 100).toFixed(0)}% confidence)`);
        if (p.claudeEffect) {
          console.log(`       Claude Effect: ${(p.claudeEffect.adjustedProbability * 100).toFixed(1)}% prob`);
          if (p.claudeEffect.warnings.length > 0) {
            console.log(`       ⚠️  ${p.claudeEffect.warnings[0]}`);
          }
        }
      });
    }
  }

  // Overall accuracy
  const allWithResults = allResults.flatMap(r => r.results.filter(p => p.actualWinner !== null));
  if (allWithResults.length > 0) {
    const totalCorrect = allWithResults.filter(p => p.correct === true).length;
    const overallAccuracy = (totalCorrect / allWithResults.length) * 100;
    console.log(`\n\n🎯 OVERALL ACCURACY: ${totalCorrect}/${allWithResults.length} (${overallAccuracy.toFixed(1)}%)`);
  }

  console.log(`\n✅ Simulation complete!\n`);
}

// Run simulation
simulateYesterday().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});


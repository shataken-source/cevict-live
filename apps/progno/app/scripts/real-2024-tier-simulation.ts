/**
 * Real NFL 2024 Tier System Simulation
 * Uses actual 2024 NFL game data to test the tier allocation system
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface RealGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds: {
    home: number;
    away: number;
    spread: number;
    total: number;
  };
  actualWinner: string;
  actualScore: {
    home: number;
    away: number;
  };
  teamStats: {
    home: {
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
      recentAvgPoints: number;
      recentAvgAllowed: number;
    };
    away: {
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
      recentAvgPoints: number;
      recentAvgAllowed: number;
    };
  };
  recentForm: {
    home: string[];
    away: string[];
  };
}

interface Prediction {
  game: RealGame;
  predictedWinner: string;
  confidence: number;
  edge: number;
  compositeScore: number;
  assignedTier: 'elite' | 'premium' | 'free';
  isCorrect: boolean;
}

// Load real 2024 NFL data
function load2024Data(): RealGame[] {
  try {
    const dataPath = join(process.cwd(), 'data', '2024-games.json');
    const rawData = readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData) as RealGame[];
  } catch (error) {
    console.error('Failed to load 2024 data:', error);
    return [];
  }
}

// Generate realistic prediction based on team stats and odds
function generatePrediction(game: RealGame): Prediction {
  // Calculate team strength based on stats
  const homeStrength = calculateTeamStrength(game.teamStats.home, game.recentForm.home);
  const awayStrength = calculateTeamStrength(game.teamStats.away, game.recentForm.away);

  // Factor in odds (implied probability)
  const homeImpliedProb = game.odds.home > 0 ? 100 / (game.odds.home + 100) : Math.abs(game.odds.home) / (Math.abs(game.odds.home) + 100);
  const awayImpliedProb = 1 - homeImpliedProb;

  // Combine team strength with odds
  const homeWinProb = (homeStrength * 0.6) + (homeImpliedProb * 0.4);
  const awayWinProb = (awayStrength * 0.6) + (awayImpliedProb * 0.4);

  // Determine predicted winner
  const predictedWinner = homeWinProb > awayWinProb ? game.homeTeam : game.awayTeam;

  // Calculate confidence based on probability difference
  const probDiff = Math.abs(homeWinProb - awayWinProb);
  const confidence = 0.5 + (probDiff * 0.8); // Scale to 50-90%

  // Calculate edge based on odds vs our probability
  const ourProb = predictedWinner === game.homeTeam ? homeWinProb : awayWinProb;
  const marketProb = predictedWinner === game.homeTeam ? homeImpliedProb : awayImpliedProb;
  const edge = (ourProb - marketProb) * 100; // Edge in percentage

  // Calculate composite score
  const compositeScore = (confidence * 100) + (edge * 2);

  // Determine tier
  let assignedTier: 'elite' | 'premium' | 'free';
  if (compositeScore >= 80) {
    assignedTier = 'elite';
  } else if (compositeScore >= 65) {
    assignedTier = 'premium';
  } else {
    assignedTier = 'free';
  }

  // Check if prediction is correct
  const isCorrect = predictedWinner === game.actualWinner;

  return {
    game,
    predictedWinner,
    confidence,
    edge,
    compositeScore,
    assignedTier,
    isCorrect
  };
}

// Calculate team strength from stats
function calculateTeamStrength(stats: any, recentForm: string[]): number {
  const winRate = stats.wins / (stats.wins + stats.losses);
  const pointsRatio = stats.pointsFor / (stats.pointsFor + stats.pointsAgainst);
  const recentWinRate = recentForm.filter(r => r === 'W').length / recentForm.length;

  // Combine factors
  return (winRate * 0.4) + (pointsRatio * 0.3) + (recentWinRate * 0.3);
}

// Apply tier allocation with fallback logic
function allocatePicksToTiers(predictions: Prediction[]) {
  // Sort by composite score (highest first)
  const sortedPredictions = [...predictions].sort((a, b) => b.compositeScore - a.compositeScore);

  // Separate by assigned tiers
  const elitePicks = sortedPredictions.filter(p => p.assignedTier === 'elite');
  const premiumPicks = sortedPredictions.filter(p => p.assignedTier === 'premium');
  const freePicks = sortedPredictions.filter(p => p.assignedTier === 'free');

  // Apply tier allocation with fallback logic
  const eliteAllocation = [];
  const premiumAllocation = [];
  const freeAllocation = [];

  // Elite gets top 5 picks, uses premium/free if needed
  let elitePicksToTake = elitePicks.slice(0, 5);
  if (elitePicksToTake.length < 5) {
    const needed = 5 - elitePicksToTake.length;
    const premiumFallback = premiumPicks.slice(0, needed);
    elitePicksToTake = [...elitePicksToTake, ...premiumFallback];
  }
  if (elitePicksToTake.length < 5) {
    const needed = 5 - elitePicksToTake.length;
    const freeFallback = freePicks.slice(0, needed);
    elitePicksToTake = [...elitePicksToTake, ...freeFallback];
  }
  eliteAllocation.push(...elitePicksToTake);

  // Premium gets top 3 picks (excluding elite picks), uses free if needed
  const usedElitePicks = new Set(elitePicksToTake.map(p => p.game.id));
  const availablePremium = premiumPicks.filter(p => !usedElitePicks.has(p.game.id));
  let premiumPicksToTake = availablePremium.slice(0, 3);
  if (premiumPicksToTake.length < 3) {
    const needed = 3 - premiumPicksToTake.length;
    const freeFallback = freePicks.filter(p => !usedElitePicks.has(p.game.id)).slice(0, needed);
    premiumPicksToTake = [...premiumPicksToTake, ...freeFallback];
  }
  premiumAllocation.push(...premiumPicksToTake);

  // Free gets leftovers (max 2 picks)
  const usedPremiumPicks = new Set(premiumPicksToTake.map(p => p.game.id));
  const availableFree = freePicks.filter(p => !usedElitePicks.has(p.game.id) && !usedPremiumPicks.has(p.game.id));
  freeAllocation.push(...availableFree.slice(0, 2));

  return {
    elite: eliteAllocation,
    premium: premiumAllocation,
    free: freeAllocation
  };
}

// Calculate performance metrics
function calculatePerformance(allocation: { elite: Prediction[], premium: Prediction[], free: Prediction[] }) {
  const results = {
    elite: { total: 0, correct: 0, accuracy: 0, avgConfidence: 0, avgEdge: 0 },
    premium: { total: 0, correct: 0, accuracy: 0, avgConfidence: 0, avgEdge: 0 },
    free: { total: 0, correct: 0, accuracy: 0, avgConfidence: 0, avgEdge: 0 }
  };

  // Calculate elite performance
  results.elite.total = allocation.elite.length;
  results.elite.correct = allocation.elite.filter(p => p.isCorrect).length;
  results.elite.accuracy = results.elite.total > 0 ? (results.elite.correct / results.elite.total) * 100 : 0;
  results.elite.avgConfidence = results.elite.total > 0 ? allocation.elite.reduce((sum, p) => sum + p.confidence, 0) / results.elite.total : 0;
  results.elite.avgEdge = results.elite.total > 0 ? allocation.elite.reduce((sum, p) => sum + p.edge, 0) / results.elite.total : 0;

  // Calculate premium performance
  results.premium.total = allocation.premium.length;
  results.premium.correct = allocation.premium.filter(p => p.isCorrect).length;
  results.premium.accuracy = results.premium.total > 0 ? (results.premium.correct / results.premium.total) * 100 : 0;
  results.premium.avgConfidence = results.premium.total > 0 ? allocation.premium.reduce((sum, p) => sum + p.confidence, 0) / results.premium.total : 0;
  results.premium.avgEdge = results.premium.total > 0 ? allocation.premium.reduce((sum, p) => sum + p.edge, 0) / results.premium.total : 0;

  // Calculate free performance
  results.free.total = allocation.free.length;
  results.free.correct = allocation.free.filter(p => p.isCorrect).length;
  results.free.accuracy = results.free.total > 0 ? (results.free.correct / results.free.total) * 100 : 0;
  results.free.avgConfidence = results.free.total > 0 ? allocation.free.reduce((sum, p) => sum + p.confidence, 0) / results.free.total : 0;
  results.free.avgEdge = results.free.total > 0 ? allocation.free.reduce((sum, p) => sum + p.edge, 0) / results.free.total : 0;

  return results;
}

// Analyze weekly performance
function analyzeWeeklyPerformance(predictions: Prediction[]) {
  const weekly: Record<string, { total: number, correct: number, accuracy: number }> = {};

  predictions.forEach(pred => {
    const week = pred.game.id.includes('w') ? pred.game.id.split('w')[1]?.split('-')[0] : 'unknown';
    if (!week || week === 'unknown') return;

    if (!weekly[week]) {
      weekly[week] = { total: 0, correct: 0, accuracy: 0 };
    }

    weekly[week].total++;
    if (pred.isCorrect) weekly[week].correct++;
  });

  // Calculate accuracy for each week
  Object.keys(weekly).forEach(week => {
    const data = weekly[week];
    data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
  });

  return weekly;
}

// Run the simulation with real 2024 data
function runReal2024Simulation() {
  console.log("🏈 Real NFL 2024 Tier System Simulation");
  console.log("========================================");

  // Load real 2024 data
  const games = load2024Data();
  if (games.length === 0) {
    console.error("No 2024 data found!");
    return;
  }

  console.log(`Loaded ${games.length} real NFL games from 2024 season`);

  // Generate predictions for all games
  const allPredictions = games.map(game => generatePrediction(game));
  console.log(`Generated ${allPredictions.length} predictions`);

  // Show tier distribution
  const eliteCount = allPredictions.filter(p => p.assignedTier === 'elite').length;
  const premiumCount = allPredictions.filter(p => p.assignedTier === 'premium').length;
  const freeCount = allPredictions.filter(p => p.assignedTier === 'free').length;

  console.log(`\n📊 Original Tier Distribution:`);
  console.log(`   Elite: ${eliteCount} picks (${((eliteCount / allPredictions.length) * 100).toFixed(1)}%)`);
  console.log(`   Premium: ${premiumCount} picks (${((premiumCount / allPredictions.length) * 100).toFixed(1)}%)`);
  console.log(`   Free: ${freeCount} picks (${((freeCount / allPredictions.length) * 100).toFixed(1)}%)`);

  // Apply tier allocation with fallback logic
  const allocation = allocatePicksToTiers(allPredictions);

  console.log(`\n🎯 Tier Allocation with Fallback Logic:`);
  console.log(`   Elite: ${allocation.elite.length} picks (target: 5)`);
  console.log(`   Premium: ${allocation.premium.length} picks (target: 3)`);
  console.log(`   Free: ${allocation.free.length} picks (max: 2)`);

  // Calculate performance
  const performance = calculatePerformance(allocation);

  console.log(`\n📈 Performance Metrics:`);
  console.log(`   Elite: ${performance.elite.correct}/${performance.elite.total} (${performance.elite.accuracy.toFixed(1)}% accuracy)`);
  console.log(`   Elite Avg Confidence: ${(performance.elite.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Elite Avg Edge: ${performance.elite.avgEdge.toFixed(1)}%`);

  console.log(`   Premium: ${performance.premium.correct}/${performance.premium.total} (${performance.premium.accuracy.toFixed(1)}% accuracy)`);
  console.log(`   Premium Avg Confidence: ${(performance.premium.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Premium Avg Edge: ${performance.premium.avgEdge.toFixed(1)}%`);

  console.log(`   Free: ${performance.free.correct}/${performance.free.total} (${performance.free.accuracy.toFixed(1)}% accuracy)`);
  console.log(`   Free Avg Confidence: ${(performance.free.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Free Avg Edge: ${performance.free.avgEdge.toFixed(1)}%`);

  // Show sample picks for each tier
  console.log(`\n🔍 Sample Picks by Tier:`);
  console.log(`\n   Elite Picks (Top 3):`);
  allocation.elite.slice(0, 3).forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game.homeTeam} vs ${pick.game.awayTeam}`);
    console.log(`        Pick: ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${pick.edge.toFixed(1)}% edge)`);
    console.log(`        Result: ${pick.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} (Actual: ${pick.game.actualWinner})`);
    console.log(`        Score: ${pick.game.actualScore.home}-${pick.game.actualScore.away}`);
  });

  console.log(`\n   Premium Picks (Top 3):`);
  allocation.premium.slice(0, 3).forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game.homeTeam} vs ${pick.game.awayTeam}`);
    console.log(`        Pick: ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${pick.edge.toFixed(1)}% edge)`);
    console.log(`        Result: ${pick.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} (Actual: ${pick.game.actualWinner})`);
    console.log(`        Score: ${pick.game.actualScore.home}-${pick.game.actualScore.away}`);
  });

  console.log(`\n   Free Picks (All):`);
  allocation.free.forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game.homeTeam} vs ${pick.game.awayTeam}`);
    console.log(`        Pick: ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${pick.edge.toFixed(1)}% edge)`);
    console.log(`        Result: ${pick.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} (Actual: ${pick.game.actualWinner})`);
    console.log(`        Score: ${pick.game.actualScore.home}-${pick.game.actualScore.away}`);
  });

  // Weekly breakdown
  const weeklyBreakdown = analyzeWeeklyPerformance(allPredictions);
  console.log(`\n📅 Weekly Performance Breakdown (Top 10 weeks):`);
  const sortedWeeks = Object.entries(weeklyBreakdown)
    .sort(([, a], [, b]) => (b as any).total - (a as any).total)
    .slice(0, 10);

  sortedWeeks.forEach(([week, data]) => {
    const weekData = data as any;
    console.log(`   Week ${week}: ${weekData.correct}/${weekData.total} (${weekData.accuracy.toFixed(1)}% accuracy)`);
  });

  // Summary
  const totalCorrect = performance.elite.correct + performance.premium.correct + performance.free.correct;
  const totalPicks = performance.elite.total + performance.premium.total + performance.free.total;
  const overallAccuracy = totalPicks > 0 ? (totalCorrect / totalPicks) * 100 : 0;

  console.log(`\n🎉 Overall Results:`);
  console.log(`   Total Games Analyzed: ${games.length}`);
  console.log(`   Total Picks Distributed: ${totalPicks}`);
  console.log(`   Total Correct: ${totalCorrect}`);
  console.log(`   Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
  console.log(`   Elite Users Get: ${allocation.elite.length} picks/day`);
  console.log(`   Premium Users Get: ${allocation.premium.length} picks/day`);
  console.log(`   Free Users Get: ${allocation.free.length} picks/day`);

  return {
    totalGames: games.length,
    totalPredictions: allPredictions.length,
    allocation,
    performance,
    overallAccuracy
  };
}

// Run the simulation
runReal2024Simulation();

export { runReal2024Simulation, load2024Data, generatePrediction, allocatePicksToTiers, calculatePerformance };

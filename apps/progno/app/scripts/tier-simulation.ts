/**
 * Tier System Simulation for NFL 2024
 * Tests the new tier allocation system with fallback logic
 */

interface MockPrediction {
  id: string;
  game: string;
  homeTeam: string;
  awayTeam: string;
  actualWinner: string;
  predictedWinner: string;
  confidence: number;
  edge: number;
  compositeScore: number;
  assignedTier: 'elite' | 'premium' | 'free';
}

// Generate mock NFL 2024 predictions with realistic distribution
function generateMockPredictions(): MockPrediction[] {
  const teams = ["Chiefs", "Bills", "Bengals", "Ravens", "Browns", "Steelers", "Colts", "Texans", "Jaguars", "Titans", "Broncos", "Raiders", "Chargers", "Chiefs"];
  const predictions: MockPrediction[] = [];
  
  for (let week = 1; week <= 18; week++) {
    for (let i = 0; i < 8; i++) {
      const homeTeam = teams[i % teams.length];
      const awayTeam = teams[(i + 1) % teams.length];
      const actualWinner = Math.random() > 0.5 ? homeTeam : awayTeam;
      
      // Generate realistic confidence and edge values
      const confidence = Math.random() * 0.4 + 0.5; // 50% to 90%
      const edge = Math.random() * 0.15 - 0.02; // -2% to 13%
      const compositeScore = (confidence * 100) + (edge * 2);
      
      // Determine tier based on composite score
      let assignedTier: 'elite' | 'premium' | 'free';
      if (compositeScore >= 80) {
        assignedTier = 'elite';
      } else if (compositeScore >= 65) {
        assignedTier = 'premium';
      } else {
        assignedTier = 'free';
      }
      
      // Predict winner (70% accuracy for elite, 60% for premium, 50% for free)
      let predictionAccuracy = 0.5;
      if (assignedTier === 'elite') predictionAccuracy = 0.7;
      else if (assignedTier === 'premium') predictionAccuracy = 0.6;
      
      const predictedWinner = Math.random() < predictionAccuracy ? actualWinner : (actualWinner === homeTeam ? awayTeam : homeTeam);
      
      predictions.push({
        id: `mock_${week}_${i}`,
        game: `${homeTeam} vs ${awayTeam}`,
        homeTeam,
        awayTeam,
        actualWinner,
        predictedWinner,
        confidence,
        edge,
        compositeScore,
        assignedTier
      });
    }
  }
  
  return predictions;
}

// Apply the new tier allocation system with fallback logic
function allocatePicksToTiers(predictions: MockPrediction[]) {
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
  const usedElitePicks = new Set(elitePicksToTake.map(p => p.id));
  const availablePremium = premiumPicks.filter(p => !usedElitePicks.has(p.id));
  let premiumPicksToTake = availablePremium.slice(0, 3);
  if (premiumPicksToTake.length < 3) {
    const needed = 3 - premiumPicksToTake.length;
    const freeFallback = freePicks.filter(p => !usedElitePicks.has(p.id)).slice(0, needed);
    premiumPicksToTake = [...premiumPicksToTake, ...freeFallback];
  }
  premiumAllocation.push(...premiumPicksToTake);
  
  // Free gets leftovers (max 2 picks)
  const usedPremiumPicks = new Set(premiumPicksToTake.map(p => p.id));
  const availableFree = freePicks.filter(p => !usedElitePicks.has(p.id) && !usedPremiumPicks.has(p.id));
  freeAllocation.push(...availableFree.slice(0, 2));
  
  return {
    elite: eliteAllocation,
    premium: premiumAllocation,
    free: freeAllocation
  };
}

// Calculate performance metrics
function calculatePerformance(allocation: { elite: MockPrediction[], premium: MockPrediction[], free: MockPrediction[] }) {
  const results = {
    elite: { total: 0, correct: 0, accuracy: 0 },
    premium: { total: 0, correct: 0, accuracy: 0 },
    free: { total: 0, correct: 0, accuracy: 0 }
  };
  
  // Calculate elite performance
  results.elite.total = allocation.elite.length;
  results.elite.correct = allocation.elite.filter(p => p.predictedWinner === p.actualWinner).length;
  results.elite.accuracy = results.elite.total > 0 ? (results.elite.correct / results.elite.total) * 100 : 0;
  
  // Calculate premium performance
  results.premium.total = allocation.premium.length;
  results.premium.correct = allocation.premium.filter(p => p.predictedWinner === p.actualWinner).length;
  results.premium.accuracy = results.premium.total > 0 ? (results.premium.correct / results.premium.total) * 100 : 0;
  
  // Calculate free performance
  results.free.total = allocation.free.length;
  results.free.correct = allocation.free.filter(p => p.predictedWinner === p.actualWinner).length;
  results.free.accuracy = results.free.total > 0 ? (results.free.correct / results.free.total) * 100 : 0;
  
  return results;
}

// Run the simulation
function runSimulation() {
  console.log("🏈 NFL 2024 Tier System Simulation");
  console.log("=====================================");
  
  // Generate mock predictions
  const allPredictions = generateMockPredictions();
  console.log(`Generated ${allPredictions.length} mock predictions for 2024 NFL season`);
  
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
  console.log(`   Premium: ${performance.premium.correct}/${performance.premium.total} (${performance.premium.accuracy.toFixed(1)}% accuracy)`);
  console.log(`   Free: ${performance.free.correct}/${performance.free.total} (${performance.free.accuracy.toFixed(1)}% accuracy)`);
  
  // Show sample picks for each tier
  console.log(`\n🔍 Sample Picks by Tier:`);
  console.log(`\n   Elite Picks (Top 3):`);
  allocation.elite.slice(0, 3).forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game} - ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${(pick.edge * 100).toFixed(1)}% edge)`);
  });
  
  console.log(`\n   Premium Picks (Top 3):`);
  allocation.premium.slice(0, 3).forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game} - ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${(pick.edge * 100).toFixed(1)}% edge)`);
  });
  
  console.log(`\n   Free Picks (All):`);
  allocation.free.forEach((pick, i) => {
    console.log(`     ${i + 1}. ${pick.game} - ${pick.predictedWinner} (${(pick.confidence * 100).toFixed(1)}% confidence, ${(pick.edge * 100).toFixed(1)}% edge)`);
  });
  
  // Summary
  const totalCorrect = performance.elite.correct + performance.premium.correct + performance.free.correct;
  const totalPicks = performance.elite.total + performance.premium.total + performance.free.total;
  const overallAccuracy = totalPicks > 0 ? (totalCorrect / totalPicks) * 100 : 0;
  
  console.log(`\n🎉 Overall Results:`);
  console.log(`   Total Picks Distributed: ${totalPicks}`);
  console.log(`   Total Correct: ${totalCorrect}`);
  console.log(`   Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
  console.log(`   Elite Users Get: ${allocation.elite.length} picks/day`);
  console.log(`   Premium Users Get: ${allocation.premium.length} picks/day`);
  console.log(`   Free Users Get: ${allocation.free.length} picks/day`);
  
  return {
    totalPredictions: allPredictions.length,
    allocation,
    performance,
    overallAccuracy
  };
}

// Run the simulation
if (require.main === module) {
  runSimulation();
}

export { runSimulation, generateMockPredictions, allocatePicksToTiers, calculatePerformance };

/**
 * Risk Engine - Monte Carlo Simulation Module
 * Prognostication Capital
 * 
 * Advanced bankroll simulation with:
 * - Multiple scenario analysis
 * - Drawdown forecasting
 * - Ruin probability calculation
 * - Path-dependent variance
 * - Confidence intervals
 */

export interface SimulatedTrade {
  probability: number;
  stake: number;
  odds: number;
  edge: number;
  variance?: number;
}

export interface SimulationConfig {
  runs: number;
  startingBankroll: number;
  kellyFraction: number;
  targetReturn?: number;
  maxDrawdownTolerance?: number;
  correlatedBatchSize?: number;
}

export interface SimulationResults {
  // Final bankroll statistics
  finalBankrolls: number[];
  meanFinalBankroll: number;
  medianFinalBankroll: number;
  stdDevFinal: number;
  
  // Percentiles
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  
  // Risk metrics
  probabilityOfRuin: number;
  probabilityOfProfit: number;
  probabilityOfTargetReturn: number;
  expectedMaxDrawdown: number;
  maxDrawdownP95: number;
  
  // Path statistics
  avgNumTrades: number;
  winRate: number;
  avgReturnPerTrade: number;
  sharpeRatio: number;
  sortinoRatio: number;
  
  // Scenario analysis
  bestCase: number;
  worstCase: number;
  realisticCase: number;
  
  // Time series for charting
  samplePaths: number[][];
}

export interface DrawdownPoint {
  tradeIndex: number;
  bankroll: number;
  drawdown: number;
  isPeak: boolean;
}

/**
 * Run Monte Carlo simulation on a set of trades
 */
export function runMonteCarlo(
  trades: SimulatedTrade[],
  config: SimulationConfig
): SimulationResults {
  const {
    runs,
    startingBankroll,
    kellyFraction,
    targetReturn = 0.20, // 20% return target
    maxDrawdownTolerance = 0.20,
    correlatedBatchSize = 1,
  } = config;

  const finalBankrolls: number[] = [];
  const maxDrawdowns: number[] = [];
  const pathReturns: number[] = [];
  const samplePaths: number[][] = [];
  const tradeOutcomes: boolean[] = [];
  
  let ruinCount = 0;
  let profitCount = 0;
  let targetReturnCount = 0;
  let totalTradesExecuted = 0;
  
  // Run simulations
  for (let run = 0; run < runs; run++) {
    let bankroll = startingBankroll;
    let peak = startingBankroll;
    let maxDD = 0;
    const path: number[] = [bankroll];
    
    // Shuffle trades for this run
    const shuffledTrades = shuffleArray([...trades]);
    
    for (let i = 0; i < shuffledTrades.length; i++) {
      const trade = shuffledTrades[i];
      
      // Apply Kelly fraction to stake
      const adjustedStake = trade.stake * kellyFraction;
      
      // Simulate outcome
      const isWin = Math.random() < trade.probability;
      tradeOutcomes.push(isWin);
      
      if (isWin) {
        bankroll += adjustedStake * (trade.odds - 1);
      } else {
        bankroll -= adjustedStake;
      }
      
      // Track peak and drawdown
      if (bankroll > peak) {
        peak = bankroll;
      }
      const currentDD = (peak - bankroll) / peak;
      if (currentDD > maxDD) {
        maxDD = currentDD;
      }
      
      // Store path point (only store every Nth point for performance)
      if (run < 100 && i % 10 === 0) {
        path.push(bankroll);
      }
      
      // Check for ruin (50% of starting bankroll)
      if (bankroll < startingBankroll * 0.5) {
        break;
      }
    }
    
    finalBankrolls.push(bankroll);
    maxDrawdowns.push(maxDD);
    totalTradesExecuted += shuffledTrades.length;
    
    if (bankroll < startingBankroll * 0.5) {
      ruinCount++;
    }
    if (bankroll > startingBankroll) {
      profitCount++;
    }
    if ((bankroll - startingBankroll) / startingBankroll >= targetReturn) {
      targetReturnCount++;
    }
    
    if (run < 100) {
      samplePaths.push(path);
    }
  }
  
  // Calculate statistics
  finalBankrolls.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => b - a); // Descending
  
  const mean = finalBankrolls.reduce((a, b) => a + b, 0) / runs;
  const median = finalBankrolls[Math.floor(runs * 0.5)];
  
  // Standard deviation
  const variance = finalBankrolls.reduce((sum, val) => {
    const diff = val - mean;
    return sum + diff * diff;
  }, 0) / runs;
  const stdDev = Math.sqrt(variance);
  
  // Calculate returns for Sharpe/Sortino
  const returns = finalBankrolls.map(fb => (fb - startingBankroll) / startingBankroll);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / runs;
  
  // Sharpe ratio (simplified, assuming risk-free rate = 0)
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / runs
  );
  const sharpeRatio = returnStdDev > 0 ? meanReturn / returnStdDev : 0;
  
  // Sortino ratio (downside deviation only)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideDev = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r ** 2, 0) / downsideReturns.length)
    : 0;
  const sortinoRatio = downsideDev > 0 ? meanReturn / downsideDev : 0;
  
  return {
    finalBankrolls,
    meanFinalBankroll: mean,
    medianFinalBankroll: median,
    stdDevFinal: stdDev,
    
    p5: finalBankrolls[Math.floor(runs * 0.05)],
    p10: finalBankrolls[Math.floor(runs * 0.10)],
    p25: finalBankrolls[Math.floor(runs * 0.25)],
    p50: median,
    p75: finalBankrolls[Math.floor(runs * 0.75)],
    p90: finalBankrolls[Math.floor(runs * 0.90)],
    p95: finalBankrolls[Math.floor(runs * 0.95)],
    
    probabilityOfRuin: ruinCount / runs,
    probabilityOfProfit: profitCount / runs,
    probabilityOfTargetReturn: targetReturnCount / runs,
    expectedMaxDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / runs,
    maxDrawdownP95: maxDrawdowns[Math.floor(runs * 0.05)],
    
    avgNumTrades: totalTradesExecuted / runs,
    winRate: tradeOutcomes.filter(o => o).length / tradeOutcomes.length,
    avgReturnPerTrade: meanReturn / (totalTradesExecuted / runs),
    sharpeRatio,
    sortinoRatio,
    
    bestCase: finalBankrolls[Math.floor(runs * 0.95)],
    worstCase: finalBankrolls[Math.floor(runs * 0.05)],
    realisticCase: finalBankrolls[Math.floor(runs * 0.5)],
    
    samplePaths,
  };
}

/**
 * Calculate optimal Kelly fraction via simulation
 */
export function findOptimalKellyFraction(
  trades: SimulatedTrade[],
  startingBankroll: number,
  fractionsToTest: number[] = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1.0],
  runs: number = 5000
): { fraction: number; score: number; results: SimulationResults }[] {
  const results: { fraction: number; score: number; results: SimulationResults }[] = [];
  
  for (const fraction of fractionsToTest) {
    const simResults = runMonteCarlo(trades, {
      runs,
      startingBankroll,
      kellyFraction: fraction,
    });
    
    // Score based on: growth * (1 - ruin_prob) * (1 - max_dd_penalty)
    const growth = (simResults.medianFinalBankroll - startingBankroll) / startingBankroll;
    const ruinPenalty = simResults.probabilityOfRuin * 10; // Heavy penalty for ruin
    const ddPenalty = Math.max(0, simResults.expectedMaxDrawdown - 0.2) * 2;
    
    const score = growth * (1 - ruinPenalty) * (1 - ddPenalty);
    
    results.push({ fraction, score, results: simResults });
  }
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Track drawdown path through a simulation
 */
export function trackDrawdownPath(
  trades: SimulatedTrade[],
  startingBankroll: number,
  kellyFraction: number = 0.33
): DrawdownPoint[] {
  let bankroll = startingBankroll;
  let peak = startingBankroll;
  const points: DrawdownPoint[] = [];
  
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    const adjustedStake = trade.stake * kellyFraction;
    
    const isWin = Math.random() < trade.probability;
    
    if (isWin) {
      bankroll += adjustedStake * (trade.odds - 1);
    } else {
      bankroll -= adjustedStake;
    }
    
    const isPeak = bankroll > peak;
    if (isPeak) {
      peak = bankroll;
    }
    
    const drawdown = (peak - bankroll) / peak;
    
    points.push({
      tradeIndex: i,
      bankroll,
      drawdown,
      isPeak,
    });
  }
  
  return points;
}

/**
 * Scenario analysis for different market conditions
 */
export interface ScenarioAnalysis {
  scenario: string;
  winRateAdjustment: number;
  edgeAdjustment: number;
  results: SimulationResults;
}

export function runScenarioAnalysis(
  baseTrades: SimulatedTrade[],
  startingBankroll: number,
  kellyFraction: number = 0.33,
  runs: number = 3000
): ScenarioAnalysis[] {
  const scenarios = [
    { name: 'Bull Market', winRateAdj: 1.1, edgeAdj: 1.2 },
    { name: 'Bear Market', winRateAdj: 0.9, edgeAdj: 0.8 },
    { name: 'High Volatility', winRateAdj: 1.0, edgeAdj: 1.3 },
    { name: 'Low Volatility', winRateAdj: 1.0, edgeAdj: 0.9 },
    { name: 'Base Case', winRateAdj: 1.0, edgeAdj: 1.0 },
  ];
  
  return scenarios.map(s => {
    const adjustedTrades = baseTrades.map(t => ({
      ...t,
      probability: Math.min(0.95, t.probability * s.winRateAdj),
      edge: t.edge * s.edgeAdj,
    }));
    
    return {
      scenario: s.name,
      winRateAdjustment: s.winRateAdj,
      edgeAdjustment: s.edgeAdj,
      results: runMonteCarlo(adjustedTrades, {
        runs,
        startingBankroll,
        kellyFraction,
      }),
    };
  });
}

/**
 * Helper: Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format simulation results for display
 */
export function formatSimulationReport(results: SimulationResults): string {
  const lines = [
    '=== MONTE CARLO SIMULATION REPORT ===',
    '',
    `Runs: ${results.finalBankrolls.length.toLocaleString()}`,
    `Mean Final Bankroll: $${results.meanFinalBankroll.toFixed(2)}`,
    `Median Final Bankroll: $${results.medianFinalBankroll.toFixed(2)}`,
    `Std Dev: $${results.stdDevFinal.toFixed(2)}`,
    '',
    '--- Percentiles ---',
    `P5 (Worst): $${results.p5.toFixed(2)}`,
    `P25: $${results.p25.toFixed(2)}`,
    `P50 (Median): $${results.p50.toFixed(2)}`,
    `P75: $${results.p75.toFixed(2)}`,
    `P95 (Best): $${results.p95.toFixed(2)}`,
    '',
    '--- Risk Metrics ---',
    `Probability of Ruin: ${(results.probabilityOfRuin * 100).toFixed(2)}%`,
    `Probability of Profit: ${(results.probabilityOfProfit * 100).toFixed(2)}%`,
    `Expected Max Drawdown: ${(results.expectedMaxDrawdown * 100).toFixed(2)}%`,
    `Max Drawdown (P95): ${(results.maxDrawdownP95 * 100).toFixed(2)}%`,
    '',
    '--- Performance Metrics ---',
    `Sharpe Ratio: ${results.sharpeRatio.toFixed(3)}`,
    `Sortino Ratio: ${results.sortinoRatio.toFixed(3)}`,
    `Win Rate: ${(results.winRate * 100).toFixed(1)}%`,
    `Avg Return Per Trade: ${(results.avgReturnPerTrade * 100).toFixed(3)}%`,
    '',
    '--- Scenario Summary ---',
    `Best Case: $${results.bestCase.toFixed(2)}`,
    `Realistic Case: $${results.realisticCase.toFixed(2)}`,
    `Worst Case: $${results.worstCase.toFixed(2)}`,
  ];
  
  return lines.join('\n');
}

/**
 * Generate path data for charting
 */
export function generatePathData(
  samplePaths: number[][],
  percentiles: number[] = [5, 25, 50, 75, 95]
): { step: number; [key: string]: number }[] {
  if (samplePaths.length === 0 || samplePaths[0].length === 0) {
    return [];
  }
  
  const pathLength = samplePaths[0].length;
  const data: { step: number; [key: string]: number }[] = [];
  
  for (let step = 0; step < pathLength; step++) {
    const valuesAtStep = samplePaths.map(p => p[step]).sort((a, b) => a - b);
    
    const point: { step: number; [key: string]: number } = { step };
    
    for (const p of percentiles) {
      const idx = Math.floor(valuesAtStep.length * (p / 100));
      point[`p${p}`] = valuesAtStep[idx];
    }
    
    data.push(point);
  }
  
  return data;
}

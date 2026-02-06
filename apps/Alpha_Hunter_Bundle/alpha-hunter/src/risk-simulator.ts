/**
 * RISK PARAMETER SIMULATOR
 * 
 * Simulates trading with different risk parameters to find optimal settings.
 * Tests historical scenarios with varying:
 * - Take profit / stop loss levels
 * - Position sizing
 * - Confidence thresholds
 * - Daily limits
 */

interface RiskConfig {
  name: string;
  maxTradeSize: number;
  minConfidence: number;
  maxOpenPositions: number;
  dailyLossLimit: number;
  dailySpendingLimit: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxSlippagePercent?: number;
  minRiskRewardRatio?: number;
}

interface Trade {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  side: 'buy' | 'sell';
  confidence: number;
  pnl: number;
  fees: number;
  reason: 'take_profit' | 'stop_loss' | 'manual';
}

interface SimulationResult {
  config: RiskConfig;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  totalFees: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  avgRiskRewardRatio: number;
  daysToMaxDrawdown: number;
  hitDailyLossLimit: number;
  hitDailySpendingLimit: number;
  avgTradesPerDay: number;
  score: number; // Overall score for ranking
}

class RiskSimulator {
  // Simulated market scenarios (based on historical crypto volatility)
  private marketScenarios = [
    // Trending up (bull market)
    { name: 'Bull Trend', winRate: 0.65, avgMove: 2.5, volatility: 1.2 },
    // Ranging (sideways)
    { name: 'Range Bound', winRate: 0.45, avgMove: 1.0, volatility: 1.5 },
    // Trending down (bear market)
    { name: 'Bear Trend', winRate: 0.40, avgMove: -1.5, volatility: 2.0 },
    // High volatility (crash/pump)
    { name: 'High Volatility', winRate: 0.50, avgMove: 0.5, volatility: 4.0 },
    // Low volatility (stable)
    { name: 'Low Volatility', winRate: 0.55, avgMove: 0.8, volatility: 0.5 },
  ];

  // Test configurations
  private testConfigs: RiskConfig[] = [
    {
      name: 'Current (Baseline)',
      maxTradeSize: 5,
      minConfidence: 55,
      maxOpenPositions: 8,
      dailyLossLimit: 25,
      dailySpendingLimit: 50,
      takeProfitPercent: 1.5,
      stopLossPercent: 2.5,
    },
    {
      name: 'Conservative',
      maxTradeSize: 5,
      minConfidence: 65,
      maxOpenPositions: 5,
      dailyLossLimit: 10,
      dailySpendingLimit: 30,
      takeProfitPercent: 2.5,
      stopLossPercent: 1.5,
    },
    {
      name: 'Balanced',
      maxTradeSize: 5,
      minConfidence: 60,
      maxOpenPositions: 8,
      dailyLossLimit: 15,
      dailySpendingLimit: 40,
      takeProfitPercent: 3.0,
      stopLossPercent: 2.0,
    },
    {
      name: 'Aggressive',
      maxTradeSize: 8,
      minConfidence: 50,
      maxOpenPositions: 10,
      dailyLossLimit: 30,
      dailySpendingLimit: 80,
      takeProfitPercent: 2.0,
      stopLossPercent: 3.0,
    },
    {
      name: 'Wide Stops',
      maxTradeSize: 5,
      minConfidence: 60,
      maxOpenPositions: 6,
      dailyLossLimit: 20,
      dailySpendingLimit: 40,
      takeProfitPercent: 4.0,
      stopLossPercent: 3.0,
    },
    {
      name: 'Tight Stops',
      maxTradeSize: 5,
      minConfidence: 60,
      maxOpenPositions: 8,
      dailyLossLimit: 15,
      dailySpendingLimit: 40,
      takeProfitPercent: 2.0,
      stopLossPercent: 1.0,
    },
    {
      name: 'High Confidence',
      maxTradeSize: 6,
      minConfidence: 70,
      maxOpenPositions: 8,
      dailyLossLimit: 20,
      dailySpendingLimit: 48,
      takeProfitPercent: 3.5,
      stopLossPercent: 2.5,
    },
    {
      name: 'Fee Optimized',
      maxTradeSize: 5,
      minConfidence: 60,
      maxOpenPositions: 6,
      dailyLossLimit: 15,
      dailySpendingLimit: 35,
      takeProfitPercent: 3.0,
      stopLossPercent: 2.0,
      maxSlippagePercent: 0.3,
      minRiskRewardRatio: 1.5,
    },
  ];

  constructor() {}

  /**
   * Generate random trade based on market scenario
   */
  private generateTrade(scenario: any, config: RiskConfig): Trade | null {
    // Random confidence based on config
    const confidence = 50 + Math.random() * 40; // 50-90%

    // Skip if below minimum confidence
    if (confidence < config.minConfidence) {
      return null;
    }

    // Random symbol
    const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    // Entry price (random between $100-$50000)
    const entryPrice = 100 + Math.random() * 49900;

    // Determine if win or loss based on scenario win rate
    const isWin = Math.random() < scenario.winRate;

    // Calculate price move based on scenario + config
    let priceMove: number;
    if (isWin) {
      // Win: hit take profit (with some variance)
      priceMove = config.takeProfitPercent * (0.8 + Math.random() * 0.4);
    } else {
      // Loss: hit stop loss (with some variance)
      priceMove = -config.stopLossPercent * (0.8 + Math.random() * 0.4);
    }

    // Apply market bias and volatility
    priceMove += (scenario.avgMove * 0.1);
    priceMove += (Math.random() - 0.5) * scenario.volatility;

    // Calculate exit price
    const exitPrice = entryPrice * (1 + priceMove / 100);

    // Calculate P&L
    const COINBASE_FEE_RATE = 0.006; // 0.6%
    const entryFees = config.maxTradeSize * COINBASE_FEE_RATE;
    const exitFees = config.maxTradeSize * COINBASE_FEE_RATE;
    const totalFees = entryFees + exitFees;

    const rawPnL = (exitPrice - entryPrice) / entryPrice * config.maxTradeSize;
    const pnl = rawPnL - totalFees;

    return {
      symbol,
      entryPrice,
      exitPrice,
      size: config.maxTradeSize,
      side: 'buy',
      confidence,
      pnl,
      fees: totalFees,
      reason: isWin ? 'take_profit' : 'stop_loss',
    };
  }

  /**
   * Simulate trading for one day
   */
  private simulateDay(scenario: any, config: RiskConfig): Trade[] {
    const trades: Trade[] = [];
    let dailySpending = 0;
    let dailyPnL = 0;
    let openPositions = 0;

    // Simulate 24 hours (288 5-minute periods)
    // Each period has small chance to generate signal
    for (let i = 0; i < 288; i++) {
      // Check daily limits
      if (dailySpending >= config.dailySpendingLimit) break;
      if (dailyPnL <= -config.dailyLossLimit) break;
      if (openPositions >= config.maxOpenPositions) {
        // Close random position
        if (Math.random() < 0.3) openPositions--;
        continue;
      }

      // 5% chance per period to get signal (12-15 signals per day)
      if (Math.random() > 0.05) continue;

      // Generate trade
      const trade = this.generateTrade(scenario, config);
      if (!trade) continue;

      // Execute trade
      trades.push(trade);
      dailySpending += trade.size;
      dailyPnL += trade.pnl;
      openPositions++;

      // Position holds for 2-10 periods (10-50 minutes)
      const holdPeriods = 2 + Math.floor(Math.random() * 8);
      setTimeout(() => { openPositions--; }, 0); // Simulate async close
    }

    return trades;
  }

  /**
   * Run full simulation for a config
   */
  private simulateConfig(config: RiskConfig, days: number = 30): SimulationResult {
    console.log(`\n  📊 Simulating: ${config.name}`);
    
    const allTrades: Trade[] = [];
    let totalPnL = 0;
    let totalFees = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    let peakPnL = 0;
    let hitDailyLossLimit = 0;
    let hitDailySpendingLimit = 0;

    // Run simulation for each day
    for (let day = 0; day < days; day++) {
      // Randomly select scenario for this day
      const scenario = this.marketScenarios[Math.floor(Math.random() * this.marketScenarios.length)];
      
      const dayTrades = this.simulateDay(scenario, config);
      allTrades.push(...dayTrades);

      // Track daily P&L
      const dailyPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      const dailySpending = dayTrades.reduce((sum, t) => sum + t.size, 0);

      runningPnL += dailyPnL;
      if (runningPnL > peakPnL) peakPnL = runningPnL;

      const drawdown = peakPnL - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      // Check if hit limits
      if (dailyPnL <= -config.dailyLossLimit) hitDailyLossLimit++;
      if (dailySpending >= config.dailySpendingLimit) hitDailySpendingLimit++;
    }

    // Calculate metrics
    const wins = allTrades.filter(t => t.pnl > 0).length;
    const losses = allTrades.filter(t => t.pnl <= 0).length;
    const winRate = allTrades.length > 0 ? wins / allTrades.length : 0;

    totalPnL = allTrades.reduce((sum, t) => sum + t.pnl, 0);
    totalFees = allTrades.reduce((sum, t) => sum + t.fees, 0);
    const netPnL = totalPnL;

    const winningTrades = allTrades.filter(t => t.pnl > 0);
    const losingTrades = allTrades.filter(t => t.pnl <= 0);
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Sharpe ratio (simplified)
    const avgDailyReturn = netPnL / days;
    const dailyReturns = [];
    for (let day = 0; day < days; day++) {
      const dayStart = Math.floor(allTrades.length * day / days);
      const dayEnd = Math.floor(allTrades.length * (day + 1) / days);
      const dayPnL = allTrades.slice(dayStart, dayEnd).reduce((sum, t) => sum + t.pnl, 0);
      dailyReturns.push(dayPnL);
    }
    const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / days);
    const sharpeRatio = stdDev > 0 ? avgDailyReturn / stdDev : 0;

    // Average risk/reward
    const avgRiskRewardRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    // Calculate score (weighted combination of metrics)
    const score = 
      (netPnL > 0 ? netPnL : 0) * 0.3 +           // 30% weight on profit
      winRate * 100 * 0.2 +                        // 20% weight on win rate
      profitFactor * 10 * 0.2 +                    // 20% weight on profit factor
      Math.max(0, sharpeRatio) * 10 * 0.15 +       // 15% weight on Sharpe
      avgRiskRewardRatio * 10 * 0.15 -             // 15% weight on R:R
      (maxDrawdown * 0.5);                         // Penalty for drawdown

    return {
      config,
      totalTrades: allTrades.length,
      wins,
      losses,
      winRate: winRate * 100,
      totalPnL,
      totalFees,
      netPnL,
      avgWin,
      avgLoss,
      maxDrawdown,
      profitFactor,
      sharpeRatio,
      avgRiskRewardRatio,
      daysToMaxDrawdown: days,
      hitDailyLossLimit,
      hitDailySpendingLimit,
      avgTradesPerDay: allTrades.length / days,
      score,
    };
  }

  /**
   * Run all simulations and compare results
   */
  async runSimulations(days: number = 30): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         🎯 RISK PARAMETER SIMULATION SUITE 🎯                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\nSimulating ${days} days of trading for each configuration...\n`);

    const results: SimulationResult[] = [];

    for (const config of this.testConfigs) {
      const result = this.simulateConfig(config, days);
      results.push(result);
    }

    // Sort by score (best to worst)
    results.sort((a, b) => b.score - a.score);

    // Display results
    console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 SIMULATION RESULTS 📊                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Summary table
    console.log('┌─────┬───────────────────────┬────────┬─────────┬──────────┬─────────┬──────────┐');
    console.log('│ Rank│ Configuration         │ Net P&L│ Win Rate│ Profit F.│ Sharpe  │ Score    │');
    console.log('├─────┼───────────────────────┼────────┼─────────┼──────────┼─────────┼──────────┤');

    results.forEach((result, index) => {
      const rank = (index + 1).toString().padStart(2);
      const name = result.config.name.padEnd(20);
      const pnl = (result.netPnL >= 0 ? '+' : '') + result.netPnL.toFixed(2);
      const pnlStr = pnl.padStart(7);
      const winRate = result.winRate.toFixed(1).padStart(6) + '%';
      const profitFactor = result.profitFactor.toFixed(2).padStart(8);
      const sharpe = result.sharpeRatio.toFixed(2).padStart(7);
      const score = result.score.toFixed(1).padStart(8);

      console.log(`│  ${rank} │ ${name} │ ${pnlStr} │ ${winRate} │ ${profitFactor} │ ${sharpe} │ ${score} │`);
    });

    console.log('└─────┴───────────────────────┴────────┴─────────┴──────────┴─────────┴──────────┘\n');

    // Detailed results for top 3
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('              📈 TOP 3 CONFIGURATIONS (DETAILED) 📈              ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < Math.min(3, results.length); i++) {
      const result = results[i];
      const config = result.config;

      console.log(`\n${i + 1}. ${config.name.toUpperCase()}`);
      console.log('─'.repeat(60));
      console.log(`\n  Configuration:`);
      console.log(`    • Trade Size:          $${config.maxTradeSize}`);
      console.log(`    • Min Confidence:      ${config.minConfidence}%`);
      console.log(`    • Max Positions:       ${config.maxOpenPositions}`);
      console.log(`    • Daily Loss Limit:    $${config.dailyLossLimit}`);
      console.log(`    • Daily Spend Limit:   $${config.dailySpendingLimit}`);
      console.log(`    • Take Profit:         ${config.takeProfitPercent}%`);
      console.log(`    • Stop Loss:           ${config.stopLossPercent}%`);

      console.log(`\n  Performance (${days} days):`);
      console.log(`    • Total Trades:        ${result.totalTrades} (${result.avgTradesPerDay.toFixed(1)}/day)`);
      console.log(`    • Win Rate:            ${result.winRate.toFixed(1)}% (${result.wins}W / ${result.losses}L)`);
      console.log(`    • Net P&L:             ${result.netPnL >= 0 ? '+' : ''}$${result.netPnL.toFixed(2)}`);
      console.log(`    • Total Fees:          -$${result.totalFees.toFixed(2)}`);
      console.log(`    • Avg Win:             +$${result.avgWin.toFixed(2)}`);
      console.log(`    • Avg Loss:            -$${Math.abs(result.avgLoss).toFixed(2)}`);
      console.log(`    • Risk/Reward Ratio:   1:${result.avgRiskRewardRatio.toFixed(2)}`);
      console.log(`    • Profit Factor:       ${result.profitFactor.toFixed(2)}`);
      console.log(`    • Max Drawdown:        -$${result.maxDrawdown.toFixed(2)}`);
      console.log(`    • Sharpe Ratio:        ${result.sharpeRatio.toFixed(2)}`);
      console.log(`    • Hit Daily Loss:      ${result.hitDailyLossLimit} days`);
      console.log(`    • Hit Daily Spend:     ${result.hitDailySpendingLimit} days`);
      console.log(`    • Overall Score:       ${result.score.toFixed(1)}`);
    }

    // Recommendations
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('                     💡 RECOMMENDATIONS 💡                      ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const winner = results[0];
    const baseline = results.find(r => r.config.name === 'Current (Baseline)');

    console.log(`🏆 WINNER: ${winner.config.name}`);
    console.log(`   Score: ${winner.score.toFixed(1)}`);
    console.log(`   Net P&L: ${winner.netPnL >= 0 ? '+' : ''}$${winner.netPnL.toFixed(2)}`);
    console.log(`   Win Rate: ${winner.winRate.toFixed(1)}%\n`);

    if (baseline) {
      const improvement = ((winner.netPnL - baseline.netPnL) / Math.abs(baseline.netPnL) * 100);
      if (winner.config.name !== 'Current (Baseline)') {
        console.log(`📊 vs. Baseline:`);
        console.log(`   P&L Improvement: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`);
        console.log(`   Win Rate Change: ${(winner.winRate - baseline.winRate >= 0 ? '+' : '')}${(winner.winRate - baseline.winRate).toFixed(1)}%`);
        console.log(`   Trade Count Change: ${(winner.totalTrades - baseline.totalTrades >= 0 ? '+' : '')}${(winner.totalTrades - baseline.totalTrades)}\n`);
      }
    }

    console.log('✅ Suggested Next Steps:');
    console.log('   1. Review top 3 configurations');
    console.log('   2. Consider hybrid of best features');
    console.log('   3. Test winner with paper trading');
    console.log('   4. Monitor for 7 days before live rollout');
    console.log('   5. Keep daily limits conservative initially\n');

    // Export results
    const exportData = {
      simulationDate: new Date().toISOString(),
      days,
      scenarios: this.marketScenarios,
      results: results.map(r => ({
        name: r.config.name,
        config: r.config,
        metrics: {
          totalTrades: r.totalTrades,
          winRate: r.winRate,
          netPnL: r.netPnL,
          profitFactor: r.profitFactor,
          sharpeRatio: r.sharpeRatio,
          maxDrawdown: r.maxDrawdown,
          score: r.score,
        },
      })),
    };

    // Save to file
    const fs = await import('fs');
    const path = await import('path');
    const outputPath = path.join(process.cwd(), 'simulation-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Results saved to: simulation-results.json\n`);
  }
}

// Run simulation
const simulator = new RiskSimulator();
simulator.runSimulations(30).catch(console.error);


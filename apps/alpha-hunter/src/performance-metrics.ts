/**
 * Performance Metrics & Reporting
 * Comprehensive tracking and reporting for trading bots
 */

import { fundManager } from './fund-manager';
import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetrics {
  // Overall stats
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  averageWin: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
  
  // Platform breakdown
  kalshiStats: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
    avgWin: number;
    avgLoss: number;
  };
  
  cryptoStats: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
    avgWin: number;
    avgLoss: number;
  };
  
  // Time-based metrics
  today: {
    trades: number;
    pnl: number;
    winRate: number;
  };
  
  thisWeek: {
    trades: number;
    pnl: number;
    winRate: number;
  };
  
  thisMonth: {
    trades: number;
    pnl: number;
    winRate: number;
  };
  
  // Risk metrics
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  
  // Allocation metrics
  allocation: {
    kalshiPercent: number;
    cryptoPercent: number;
    reservePercent: number;
    kalshiBalance: number;
    cryptoBalance: number;
    totalBalance: number;
  };
  
  // Performance trends
  trends: {
    dailyPnL: Array<{ date: string; pnl: number }>;
    winRateHistory: Array<{ date: string; winRate: number }>;
  };
}

export class PerformanceTracker {
  private supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

  /**
   * Get comprehensive performance metrics
   */
  async getMetrics(): Promise<PerformanceMetrics> {
    const stats = await fundManager.getPerformanceStats();
    const kalshiStats = fundManager.getKalshiStats();
    const cryptoStats = fundManager.getCryptoStats();
    const account = await fundManager.getAccount();
    const allocation = fundManager.getAllocation();
    
    const totalBalance = fundManager.getTotalFunds();
    const kalshiBalance = fundManager['kalshiBalance'].total;
    const cryptoBalance = fundManager['cryptoBalance'].total;

    // Calculate risk metrics
    const sharpeRatio = this.calculateSharpeRatio(stats);
    const maxDrawdown = await this.calculateMaxDrawdown();
    const profitFactor = this.calculateProfitFactor(stats);
    const expectancy = this.calculateExpectancy(stats);

    // Get time-based metrics
    const today = await this.getTodayMetrics();
    const thisWeek = await this.getWeekMetrics();
    const thisMonth = await this.getMonthMetrics();

    // Get trends
    const trends = await this.getTrends();

    return {
      totalTrades: stats.totalTrades,
      totalWins: stats.wins,
      totalLosses: stats.losses,
      winRate: stats.winRate,
      totalPnL: stats.totalProfit,
      averageWin: stats.avgWin,
      averageLoss: stats.avgLoss,
      bestTrade: await this.getBestTrade(),
      worstTrade: await this.getWorstTrade(),
      
      kalshiStats: {
        trades: kalshiStats.trades,
        wins: kalshiStats.wins,
        losses: kalshiStats.losses,
        winRate: kalshiStats.winRate,
        pnl: kalshiStats.pnl,
        avgWin: await this.getAverageWin('kalshi'),
        avgLoss: await this.getAverageLoss('kalshi'),
      },
      
      cryptoStats: {
        trades: cryptoStats.trades,
        wins: cryptoStats.wins,
        losses: cryptoStats.losses,
        winRate: cryptoStats.winRate,
        pnl: cryptoStats.pnl,
        avgWin: await this.getAverageWin('crypto'),
        avgLoss: await this.getAverageLoss('crypto'),
      },
      
      today,
      thisWeek,
      thisMonth,
      
      sharpeRatio,
      maxDrawdown,
      profitFactor,
      expectancy,
      
      allocation: {
        kalshiPercent: allocation.kalshiPercent,
        cryptoPercent: allocation.cryptoPercent,
        reservePercent: allocation.reservePercent,
        kalshiBalance,
        cryptoBalance,
        totalBalance,
      },
      
      trends,
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const metrics = await this.getMetrics();
    const account = await fundManager.getAccount();
    
    const report = `
╔══════════════════════════════════════════════════════════════╗
║           📊 ALPHA HUNTER PERFORMANCE REPORT                  ║
║                    ${new Date().toLocaleDateString().padEnd(40)}║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  💰 ACCOUNT SUMMARY                                          ║
║  ─────────────────────────────────────────────────────────  ║
║  Total Balance:      $${metrics.allocation.totalBalance.toFixed(2).padStart(10)}                    ║
║  Available Funds:     $${account.availableFunds.toFixed(2).padStart(10)}                    ║
║  Today's P&L:         ${(metrics.today.pnl >= 0 ? '+' : '')}$${metrics.today.pnl.toFixed(2).padStart(10)}                    ║
║  Total P&L:           ${(metrics.totalPnL >= 0 ? '+' : '')}$${metrics.totalPnL.toFixed(2).padStart(10)}                    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📈 TRADING STATISTICS                                       ║
║  ─────────────────────────────────────────────────────────  ║
║  Total Trades:        ${metrics.totalTrades.toString().padStart(10)}                    ║
║  Wins:                ${metrics.totalWins.toString().padStart(10)}                    ║
║  Losses:               ${metrics.totalLosses.toString().padStart(10)}                    ║
║  Win Rate:             ${metrics.winRate.toFixed(1).padStart(9)}%                    ║
║  Average Win:          ${(metrics.averageWin >= 0 ? '+' : '')}$${metrics.averageWin.toFixed(2).padStart(9)}                    ║
║  Average Loss:         ${(metrics.averageLoss >= 0 ? '+' : '')}$${metrics.averageLoss.toFixed(2).padStart(9)}                    ║
║  Best Trade:           ${(metrics.bestTrade >= 0 ? '+' : '')}$${metrics.bestTrade.toFixed(2).padStart(9)}                    ║
║  Worst Trade:          ${(metrics.worstTrade >= 0 ? '+' : '')}$${metrics.worstTrade.toFixed(2).padStart(9)}                    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎯 PLATFORM BREAKDOWN                                        ║
║  ─────────────────────────────────────────────────────────  ║
║  KALSHI:                                                      ║
║    Trades:            ${metrics.kalshiStats.trades.toString().padStart(10)}                    ║
║    Win Rate:           ${metrics.kalshiStats.winRate.toFixed(1).padStart(9)}%                    ║
║    P&L:                ${(metrics.kalshiStats.pnl >= 0 ? '+' : '')}$${metrics.kalshiStats.pnl.toFixed(2).padStart(9)}                    ║
║                                                              ║
║  CRYPTO:                                                      ║
║    Trades:            ${metrics.cryptoStats.trades.toString().padStart(10)}                    ║
║    Win Rate:           ${metrics.cryptoStats.winRate.toFixed(1).padStart(9)}%                    ║
║    P&L:                ${(metrics.cryptoStats.pnl >= 0 ? '+' : '')}$${metrics.cryptoStats.pnl.toFixed(2).padStart(9)}                    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ⚡ RISK METRICS                                              ║
║  ─────────────────────────────────────────────────────────  ║
║  Sharpe Ratio:         ${metrics.sharpeRatio.toFixed(2).padStart(10)}                    ║
║  Max Drawdown:         ${(metrics.maxDrawdown >= 0 ? '+' : '')}$${metrics.maxDrawdown.toFixed(2).padStart(9)}                    ║
║  Profit Factor:        ${metrics.profitFactor.toFixed(2).padStart(10)}                    ║
║  Expectancy:           ${(metrics.expectancy >= 0 ? '+' : '')}$${metrics.expectancy.toFixed(2).padStart(9)}                    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  💼 FUND ALLOCATION                                          ║
║  ─────────────────────────────────────────────────────────  ║
║  Kalshi:               ${metrics.allocation.kalshiPercent.toString().padStart(10)}%                    ║
║  Crypto:               ${metrics.allocation.cryptoPercent.toString().padStart(10)}%                    ║
║  Reserve:              ${metrics.allocation.reservePercent.toString().padStart(10)}%                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `.trim();

    return report;
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(stats: any): number {
    if (stats.totalTrades < 2) return 0;
    
    // Simplified Sharpe: average return / standard deviation
    const avgReturn = stats.totalProfit / stats.totalTrades;
    // For simplicity, use a basic approximation
    return avgReturn > 0 ? avgReturn / Math.max(1, Math.abs(stats.avgLoss)) : 0;
  }

  /**
   * Calculate Maximum Drawdown
   */
  private async calculateMaxDrawdown(): Promise<number> {
    if (!this.supabase) return 0;
    
    const { data } = await this.supabase
      .from('alpha_hunter_trades')
      .select('profit, executed_at')
      .order('executed_at', { ascending: true });
    
    if (!data || data.length === 0) return 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    
    for (const trade of data) {
      runningTotal += parseFloat(trade.profit || '0');
      if (runningTotal > peak) peak = runningTotal;
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate Profit Factor
   */
  private calculateProfitFactor(stats: any): number {
    if (stats.losses === 0) return stats.wins > 0 ? Infinity : 0;
    const totalWins = stats.avgWin * stats.wins;
    const totalLosses = Math.abs(stats.avgLoss * stats.losses);
    return totalLosses > 0 ? totalWins / totalLosses : 0;
  }

  /**
   * Calculate Expectancy
   */
  private calculateExpectancy(stats: any): number {
    if (stats.totalTrades === 0) return 0;
    const winProb = stats.winRate / 100;
    const lossProb = 1 - winProb;
    return (winProb * stats.avgWin) - (lossProb * Math.abs(stats.avgLoss));
  }

  /**
   * Get today's metrics
   */
  private async getTodayMetrics(): Promise<{ trades: number; pnl: number; winRate: number }> {
    const account = await fundManager.getAccount();
    // Simplified - in production would query database
    return {
      trades: 0, // Would calculate from trades
      pnl: account.todayProfit,
      winRate: 0
    };
  }

  /**
   * Get this week's metrics
   */
  private async getWeekMetrics(): Promise<{ trades: number; pnl: number; winRate: number }> {
    // Would calculate from database
    return { trades: 0, pnl: 0, winRate: 0 };
  }

  /**
   * Get this month's metrics
   */
  private async getMonthMetrics(): Promise<{ trades: number; pnl: number; winRate: number }> {
    // Would calculate from database
    return { trades: 0, pnl: 0, winRate: 0 };
  }

  /**
   * Get trends
   */
  private async getTrends(): Promise<{
    dailyPnL: Array<{ date: string; pnl: number }>;
    winRateHistory: Array<{ date: string; winRate: number }>;
  }> {
    // Would query database for historical data
    return {
      dailyPnL: [],
      winRateHistory: []
    };
  }

  /**
   * Get best trade
   */
  private async getBestTrade(): Promise<number> {
    if (!this.supabase) return 0;
    const { data } = await this.supabase
      .from('alpha_hunter_trades')
      .select('profit')
      .order('profit', { ascending: false })
      .limit(1)
      .single();
    return data ? parseFloat(data.profit || '0') : 0;
  }

  /**
   * Get worst trade
   */
  private async getWorstTrade(): Promise<number> {
    if (!this.supabase) return 0;
    const { data } = await this.supabase
      .from('alpha_hunter_trades')
      .select('profit')
      .order('profit', { ascending: true })
      .limit(1)
      .single();
    return data ? parseFloat(data.profit || '0') : 0;
  }

  /**
   * Get average win for platform
   */
  private async getAverageWin(platform: 'kalshi' | 'crypto'): Promise<number> {
    if (!this.supabase) return 0;
    const { data } = await this.supabase
      .from('alpha_hunter_trades')
      .select('profit')
      .eq('platform', platform)
      .gt('profit', 0);
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, t) => acc + parseFloat(t.profit || '0'), 0);
    return sum / data.length;
  }

  /**
   * Get average loss for platform
   */
  private async getAverageLoss(platform: 'kalshi' | 'crypto'): Promise<number> {
    if (!this.supabase) return 0;
    const { data } = await this.supabase
      .from('alpha_hunter_trades')
      .select('profit')
      .eq('platform', platform)
      .lt('profit', 0);
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, t) => acc + parseFloat(t.profit || '0'), 0);
    return sum / data.length;
  }
}

export const performanceTracker = new PerformanceTracker();


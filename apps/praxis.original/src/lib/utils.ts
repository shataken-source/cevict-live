import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Trade, PortfolioStats, DailyStats, TimeRange } from '@/types';

/** Filter trades to those within the given time range (by entry_time). */
export function filterTradesByTimeRange(trades: Trade[], range: TimeRange): Trade[] {
  if (range === 'ALL') return trades;
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = range === '1D' ? 1 : range === '1W' ? 7 : range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 180 : 365;
  const cutoff = now - days * msPerDay;
  return trades.filter(t => new Date(t.entry_time).getTime() >= cutoff);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============ FORMATTING ============

export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPnL(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// ============ ANALYTICS CALCULATIONS ============

export function calculatePortfolioStats(trades: Trade[]): PortfolioStats {
  const closedTrades = trades.filter(t => t.status === 'settled' || t.status === 'closed');
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Calculate daily returns for Sharpe/Sortino
  const dailyStats = calculateDailyStats(trades);
  const dailyReturns = dailyStats.map(d => d.pnl);
  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  const sortinoRatio = calculateSortinoRatio(dailyReturns);

  // Calculate drawdown
  const { maxDrawdown, maxDrawdownDate, currentDrawdown } = calculateDrawdown(dailyStats);

  // Kelly Criterion
  const kellyFraction = calculateKellyFraction(winRate / 100, avgWin, avgLoss);

  // Average hold time
  const holdTimes = closedTrades
    .filter(t => t.exit_time)
    .map(t => (t.exit_time!.getTime() - t.entry_time.getTime()) / (1000 * 60 * 60));
  const avgHoldTime = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

  return {
    total_value: 0, // Set from account balance
    cash_balance: 0,
    positions_value: 0,
    total_pnl: totalPnL,
    total_pnl_percent: 0,
    day_pnl: dailyStats.length > 0 ? dailyStats[dailyStats.length - 1].pnl : 0,
    day_pnl_percent: 0,
    win_rate: winRate,
    total_trades: closedTrades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    avg_win: avgWin,
    avg_loss: avgLoss,
    profit_factor: profitFactor,
    sharpe_ratio: sharpeRatio,
    sortino_ratio: sortinoRatio,
    max_drawdown: maxDrawdown,
    max_drawdown_date: maxDrawdownDate,
    current_drawdown: currentDrawdown,
    best_trade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0,
    worst_trade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0,
    avg_hold_time_hours: avgHoldTime,
    kelly_fraction: kellyFraction,
  };
}

export function calculateDailyStats(trades: Trade[]): DailyStats[] {
  const byDate = new Map<string, Trade[]>();

  trades.forEach(trade => {
    const exitDate = trade.exit_time || trade.entry_time;
    const dateKey = exitDate.toISOString().split('T')[0];
    const existing = byDate.get(dateKey) || [];
    byDate.set(dateKey, [...existing, trade]);
  });

  const sortedDates = Array.from(byDate.keys()).sort();
  let cumulativePnL = 0;

  return sortedDates.map(dateStr => {
    const dayTrades = byDate.get(dateStr)!;
    const closedTrades = dayTrades.filter(t => t.status === 'settled' || t.status === 'closed');
    const dayPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    cumulativePnL += dayPnL;
    const winners = closedTrades.filter(t => (t.pnl || 0) > 0).length;

    return {
      date: new Date(dateStr),
      pnl: dayPnL,
      cumulative_pnl: cumulativePnL,
      trades_count: closedTrades.length,
      win_rate: closedTrades.length > 0 ? (winners / closedTrades.length) * 100 : 0,
      portfolio_value: cumulativePnL,
    };
  });
}

export function calculateSharpeRatio(dailyReturns: number[], riskFreeRate = 0.05): number {
  if (dailyReturns.length < 2) return 0;

  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const dailyRiskFree = riskFreeRate / 365;
  const excessReturns = dailyReturns.map(r => r - dailyRiskFree);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;

  const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (avgExcess / stdDev) * Math.sqrt(365); // Annualized
}

export function calculateSortinoRatio(dailyReturns: number[], riskFreeRate = 0.05): number {
  if (dailyReturns.length < 2) return 0;

  const dailyRiskFree = riskFreeRate / 365;
  const excessReturns = dailyReturns.map(r => r - dailyRiskFree);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;

  const downsideReturns = excessReturns.filter(r => r < 0);
  if (downsideReturns.length === 0) return avgExcess > 0 ? Infinity : 0;

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);

  if (downsideDev === 0) return 0;
  return (avgExcess / downsideDev) * Math.sqrt(365);
}

export function calculateDrawdown(dailyStats: DailyStats[]): {
  maxDrawdown: number;
  maxDrawdownDate?: Date;
  currentDrawdown: number;
} {
  if (dailyStats.length === 0) {
    return { maxDrawdown: 0, currentDrawdown: 0 };
  }

  let peak = dailyStats[0].cumulative_pnl;
  let maxDrawdown = 0;
  let maxDrawdownDate: Date | undefined;

  for (const day of dailyStats) {
    if (day.cumulative_pnl > peak) {
      peak = day.cumulative_pnl;
    }
    const drawdown = peak - day.cumulative_pnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = day.date;
    }
  }

  const currentValue = dailyStats[dailyStats.length - 1].cumulative_pnl;
  const currentDrawdown = peak - currentValue;

  return { maxDrawdown, maxDrawdownDate, currentDrawdown };
}

export function calculateKellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0 || avgWin === 0) return 0;
  const b = avgWin / avgLoss;
  const kelly = winRate - ((1 - winRate) / b);
  return Math.max(0, Math.min(kelly, 1)); // Clamp between 0 and 1
}

// ============ COLOR HELPERS ============

export function getPnLColor(value: number): string {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-neutral';
}

export function getPnLBgColor(value: number): string {
  if (value > 0) return 'bg-profit/10';
  if (value < 0) return 'bg-loss/10';
  return 'bg-neutral/10';
}

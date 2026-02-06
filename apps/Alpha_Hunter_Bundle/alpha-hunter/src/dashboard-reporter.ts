/**
 * Trading Bot Data Reporter
 * Each trading bot uses this to report stats to the dashboard
 */

export interface TradeReport {
  id: string;
  platform: 'kalshi' | 'coinbase' | 'microcap';
  type: 'buy' | 'sell';
  symbol?: string;
  marketId?: string;
  amount: number;
  price: number;
  profit?: number;
  status: 'open' | 'won' | 'lost';
  timestamp: string;
  confidence?: number;
}

export interface StatsReport {
  platform: 'kalshi' | 'coinbase' | 'microcap';
  balance: number;
  totalTrades: number;
  wins: number;
  losses: number;
  buys: number;
  sells: number;
  totalPnL: number;
  winRate: number;
  openPositions: number;
}

export class DashboardReporter {
  private apiUrl = 'http://localhost:3011/api/update';

  /**
   * Report stats to dashboard
   */
  async reportStats(stats: StatsReport): Promise<void> {
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: stats.platform, stats }),
      });
    } catch (error) {
      console.error('Failed to report stats to dashboard:', error);
    }
  }

  /**
   * Report trades to dashboard
   */
  async reportTrades(trades: TradeReport[]): Promise<void> {
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: trades[0]?.platform || 'unknown',
          trades
        }),
      });
    } catch (error) {
      console.error('Failed to report trades to dashboard:', error);
    }
  }
}

export const dashboardReporter = new DashboardReporter();


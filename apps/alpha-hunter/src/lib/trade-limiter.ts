/**
 * Trade Limiter - Persistent Daily Trade Counter
 * Prevents exceeding daily trade limits even across bot restarts
 */

import fs from 'fs';
import path from 'path';

interface DailyTradeData {
  date: string;
  tradeCount: number;
  totalSpent: number;
  trades: {
    timestamp: string;
    symbol: string;
    amount: number;
    type: 'crypto' | 'kalshi' | 'polymarket';
  }[];
}

export class TradeLimiter {
  private dataFile: string;
  private data: DailyTradeData;
  private maxDailyTrades: number;
  private maxDailySpending: number;

  constructor() {
    // Use __dirname so path is stable regardless of where process is started
    const alphaRoot = path.resolve(__dirname, '..', '..');
    this.dataFile = path.join(alphaRoot, 'data', 'daily-trades.json');
    this.maxDailyTrades = parseInt(process.env.CRYPTO_MAX_DAILY_TRADES || '2');
    this.maxDailySpending = parseFloat(process.env.MAX_DAILY_LOSS || '50');
    this.data = this.loadData();
  }

  /**
   * Load trade data from file
   */
  private loadData(): DailyTradeData {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing data
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const data = JSON.parse(raw) as DailyTradeData;

        // Check if data is from today
        const today = new Date().toISOString().split('T')[0];
        if (data.date === today) {
          return data;
        }
      }

      // Return fresh data for today
      return this.createFreshData();
    } catch (error) {
      console.error('[TRADE-LIMITER] Error loading data:', error);
      return this.createFreshData();
    }
  }

  /**
   * Create fresh data for a new day
   */
  private createFreshData(): DailyTradeData {
    return {
      date: new Date().toISOString().split('T')[0],
      tradeCount: 0,
      totalSpent: 0,
      trades: [],
    };
  }

  /**
   * Save trade data to file
   */
  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[TRADE-LIMITER] Error saving data:', error);
    }
  }

  /**
   * Check if a trade is allowed
   */
  canTrade(amount: number, type: 'crypto' | 'kalshi' | 'polymarket' = 'crypto'): {
    allowed: boolean;
    reason?: string;
  } {
    // Check if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (this.data.date !== today) {
      this.data = this.createFreshData();
      this.saveData();
    }

    // Check daily trade limit
    if (this.data.tradeCount >= this.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Daily trade limit reached (${this.data.tradeCount}/${this.maxDailyTrades})`,
      };
    }

    // Check daily spending limit
    if (this.data.totalSpent + amount > this.maxDailySpending) {
      return {
        allowed: false,
        reason: `Daily spending limit would be exceeded ($${(this.data.totalSpent + amount).toFixed(2)}/$${this.maxDailySpending})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a trade
   */
  recordTrade(symbol: string, amount: number, type: 'crypto' | 'kalshi' | 'polymarket' = 'crypto'): void {
    const today = new Date().toISOString().split('T')[0];

    // Reset if new day
    if (this.data.date !== today) {
      this.data = this.createFreshData();
    }

    // Record trade
    this.data.tradeCount++;
    this.data.totalSpent += amount;
    this.data.trades.push({
      timestamp: new Date().toISOString(),
      symbol,
      amount,
      type,
    });

    // Save to file
    this.saveData();

    console.log(`[TRADE-LIMITER] Trade recorded: ${symbol} $${amount.toFixed(2)} (${this.data.tradeCount}/${this.maxDailyTrades} trades, $${this.data.totalSpent.toFixed(2)}/$${this.maxDailySpending} spent)`);
  }

  /**
   * Get current trade stats
   */
  getStats(): {
    tradeCount: number;
    totalSpent: number;
    remainingTrades: number;
    remainingBudget: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.date !== today) {
      this.data = this.createFreshData();
      this.saveData();
    }

    return {
      tradeCount: this.data.tradeCount,
      totalSpent: this.data.totalSpent,
      remainingTrades: Math.max(0, this.maxDailyTrades - this.data.tradeCount),
      remainingBudget: Math.max(0, this.maxDailySpending - this.data.totalSpent),
    };
  }

  /**
   * Reset daily counter (for testing or manual reset)
   */
  reset(): void {
    this.data = this.createFreshData();
    this.saveData();
    console.log('[TRADE-LIMITER] Daily counter reset');
  }

  /**
   * Get today's trades
   */
  getTodaysTrades(): DailyTradeData['trades'] {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.date !== today) {
      return [];
    }
    return this.data.trades;
  }
}

// Singleton instance
export const tradeLimiter = new TradeLimiter();

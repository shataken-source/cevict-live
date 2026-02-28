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
  /** Per-platform counters (added Feb 2026) */
  platformCounts?: Record<string, number>;
  platformSpent?: Record<string, number>;
  /** Set of tickers/symbols already bet on today (prevents duplicate bets) */
  bettedTickers?: string[];
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
  /** Per-platform daily trade caps */
  private platformLimits: Record<string, number>;

  constructor() {
    // Use __dirname so path is stable regardless of where process is started
    const alphaRoot = path.resolve(__dirname, '..', '..');
    this.dataFile = path.join(alphaRoot, 'data', 'daily-trades.json');
    this.maxDailyTrades = parseInt(process.env.MAX_DAILY_TRADES || '20');
    this.maxDailySpending = parseFloat(process.env.MAX_DAILY_LOSS || '50');
    this.platformLimits = {
      crypto: parseInt(process.env.CRYPTO_MAX_DAILY_TRADES || '10'),
      kalshi: parseInt(process.env.KALSHI_MAX_DAILY_TRADES || '10'),
      polymarket: parseInt(process.env.POLYMARKET_MAX_DAILY_TRADES || '5'),
    };
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

    // Check per-platform trade limit first (so crypto doesn't starve kalshi)
    const platformCount = (this.data.platformCounts || {})[type] || 0;
    const platformMax = this.platformLimits[type] || this.maxDailyTrades;
    if (platformCount >= platformMax) {
      return {
        allowed: false,
        reason: `Daily ${type} trade limit reached (${platformCount}/${platformMax})`,
      };
    }

    // Check for duplicate bet on same ticker (prevent re-betting same market)
    // Caller should use hasAlreadyBet() before canTrade() for specific ticker check

    // Check global daily trade limit as a safety net
    if (this.data.tradeCount >= this.maxDailyTrades) {
      return {
        allowed: false,
        reason: `Daily trade limit reached (${this.data.tradeCount} total)`,
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

    // Record trade (global + per-platform)
    this.data.tradeCount++;
    this.data.totalSpent += amount;
    if (!this.data.platformCounts) this.data.platformCounts = {};
    if (!this.data.platformSpent) this.data.platformSpent = {};
    this.data.platformCounts[type] = (this.data.platformCounts[type] || 0) + 1;
    this.data.platformSpent[type] = (this.data.platformSpent[type] || 0) + amount;
    // Track ticker for duplicate prevention
    if (!this.data.bettedTickers) this.data.bettedTickers = [];
    const normalizedSymbol = symbol.toUpperCase().trim();
    if (!this.data.bettedTickers.includes(normalizedSymbol)) {
      this.data.bettedTickers.push(normalizedSymbol);
    }
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
   * Extract the game identifier from a Kalshi ticker.
   * e.g. KXNBAGAME-26FEB27ARISLE-ARI => '26FEB27ARISLE'
   *      KXNBA1HSPREAD-26FEB27ARISLE-ARI5 => '26FEB27ARISLE'
   *      KXNBATOTAL-26FEB27ARISLE-130 => '26FEB27ARISLE'
   * The game ID is the date+teams segment (2nd dash-delimited part).
   */
  private extractGameId(ticker: string): string {
    const parts = ticker.toUpperCase().split('-');
    // Kalshi tickers: PREFIX-DATEANDTEAMS-SELECTION
    // The game ID is the middle segment containing the date + team codes
    if (parts.length >= 2) {
      return parts[1]; // e.g. '26FEB27ARISLE'
    }
    return ticker.toUpperCase();
  }

  /**
   * Check if we've already bet on this ticker/symbol today.
   * Also checks if we've bet on the same GAME (different market type).
   */
  hasAlreadyBet(symbol: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.date !== today) return false;
    const normalizedSymbol = symbol.toUpperCase().trim();
    const tickers = this.data.bettedTickers || [];

    // Exact ticker match
    if (tickers.includes(normalizedSymbol)) return true;

    // Same-game match: if any previous ticker shares the same game ID, skip
    const gameId = this.extractGameId(normalizedSymbol);
    if (gameId.length >= 8) { // Only match if game ID looks real (date+teams)
      for (const prev of tickers) {
        if (this.extractGameId(prev) === gameId) return true;
      }
    }

    return false;
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

/**
 * TRADE PROTECTION SERVICE - PRODUCTION
 * Comprehensive protection against duplicate trades, correlation, and rate limiting
 * INCLUDES BUG #11: AI Call Deduplication
 * [STATUS: UPDATED] - Implements all 11 critical bug fixes
 */

import { PositionTracker } from './position-tracker';
import { ApiCache } from './api-cache';

export interface TradeProtectionResult {
  allowed: boolean;
  reason?: string;
  details?: any;
}

export class TradeProtectionService {
  private positionTracker: PositionTracker;
  private apiCache: ApiCache;
  
  // Kalshi correlation tracking
  private kalshiEventMap: Map<string, Set<string>> = new Map(); // eventID -> Set of market IDs
  
  // Spending rate limiter
  private spendingWindow: Array<{ amount: number; timestamp: number }> = [];
  private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SPEND_PER_WINDOW = 10; // $10 per 5 minutes
  
  // Sync deduplication
  private lastSyncHash = '';
  
  // Global trading lock
  private tradingLock = false;
  private lockQueue: Array<() => void> = [];
  
  // ==========================================================================
  // BUG #11: AI CALL DEDUPLICATION
  // ==========================================================================
  // Session-level tracking (reset each cycle)
  private analyzedThisCycle: Set<string> = new Set();
  
  // Daily tracking (reset at midnight)
  private analyzedToday: Set<string> = new Set();
  private lastResetDate: string = new Date().toDateString();
  
  // Betting tracking (markets we've bet on today)
  private bettedToday: Set<string> = new Set();
  
  // Cooldown tracking (1 hour cooldown per ticker)
  private analysisCooldowns: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  
  // Efficiency metrics
  private totalAICalls = 0;
  private totalBetsPlaced = 0;
  
  constructor() {
    this.positionTracker = new PositionTracker();
    this.apiCache = new ApiCache();
  }
  
  /**
   * BUG #11: Check if ticker should be analyzed (deduplication)
   */
  shouldAnalyzeTicker(ticker: string, marketId?: string): { shouldAnalyze: boolean; reason?: string } {
    // Reset daily tracking if needed
    this.resetDailyTracking();
    
    // Check 1: Already analyzed this cycle?
    if (this.analyzedThisCycle.has(ticker)) {
      return { shouldAnalyze: false, reason: `Already analyzed this cycle` };
    }
    
    // Check 2: Already analyzed today?
    if (this.analyzedToday.has(ticker)) {
      return { shouldAnalyze: false, reason: `Already analyzed today` };
    }
    
    // Check 3: Already bet on this market today?
    if (this.bettedToday.has(ticker)) {
      return { shouldAnalyze: false, reason: `Already bet on this market today` };
    }
    
    // Check 4: On cooldown?
    if (this.isOnCooldown(ticker)) {
      const lastAnalysis = this.analysisCooldowns.get(ticker) || 0;
      const remaining = Math.ceil((this.COOLDOWN_MS - (Date.now() - lastAnalysis)) / 60000);
      return { shouldAnalyze: false, reason: `On cooldown (${remaining}min remaining)` };
    }
    
    return { shouldAnalyze: true };
  }
  
  /**
   * Enhanced: Check if market should be skipped (all dedup checks)
   */
  shouldSkipMarket(ticker: string, marketId?: string): { shouldSkip: boolean; reason?: string } {
    return this.shouldAnalyzeTicker(ticker, marketId);
  }
  
  /**
   * BUG #11: Mark ticker as analyzed
   */
  markTickerAnalyzed(ticker: string, success: boolean = true): void {
    this.analyzedThisCycle.add(ticker);
    this.totalAICalls++;
    
    if (success) {
      this.analyzedToday.add(ticker);
      this.analysisCooldowns.set(ticker, Date.now());
    } else {
      // On error, remove from cycle tracking to allow retry next cycle
      this.analyzedThisCycle.delete(ticker);
    }
  }
  
  /**
   * Enhanced: Mark market as analyzed (alias)
   */
  markAnalyzed(ticker: string, success: boolean = true): void {
    this.markTickerAnalyzed(ticker, success);
  }
  
  /**
   * Enhanced: Mark market as bet on
   */
  markBetted(ticker: string): void {
    this.bettedToday.add(ticker);
    this.totalBetsPlaced++;
  }
  
  /**
   * BUG #11: Reset cycle-level tracking (call at start of each scan)
   */
  resetCycleTracking(): void {
    this.analyzedThisCycle.clear();
  }
  
  /**
   * BUG #11: Reset daily tracking if date changed
   */
  private resetDailyTracking(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      console.log(`📅 New day - resetting daily analysis tracking`);
      this.analyzedToday.clear();
      this.bettedToday.clear();
      this.lastResetDate = today;
      this.totalAICalls = 0;
      this.totalBetsPlaced = 0;
    }
  }
  
  /**
   * BUG #11: Check if ticker is on cooldown
   */
  private isOnCooldown(ticker: string): boolean {
    const lastAnalysis = this.analysisCooldowns.get(ticker);
    if (!lastAnalysis) return false;
    
    const elapsed = Date.now() - lastAnalysis;
    return elapsed < this.COOLDOWN_MS;
  }
  
  /**
   * BUG #11: Mark bet placed (for efficiency tracking)
   */
  markBetPlaced(): void {
    this.totalBetsPlaced++;
  }
  
  /**
   * BUG #11: Get efficiency metrics
   */
  getEfficiencyMetrics(): {
    totalAICalls: number;
    totalBetsPlaced: number;
    callsPerBet: number;
    efficiency: number;
    analyzedToday: number;
    analyzedThisCycle: number;
    bettedToday: number;
  } {
    return {
      totalAICalls: this.totalAICalls,
      totalBetsPlaced: this.totalBetsPlaced,
      callsPerBet: this.totalBetsPlaced > 0 ? (this.totalAICalls / this.totalBetsPlaced) : 0,
      efficiency: this.totalAICalls > 0 ? (this.totalBetsPlaced / this.totalAICalls * 100) : 0,
      analyzedToday: this.analyzedToday.size,
      analyzedThisCycle: this.analyzedThisCycle.size,
      bettedToday: this.bettedToday.size,
    };
  }
  
  /**
   * 1. POSITION DEDUPLICATION - Check if duplicate position exists
   */
  async checkDuplicatePosition(
    symbol: string,
    side: 'buy' | 'sell' | 'yes' | 'no',
    platform: 'coinbase' | 'kalshi'
  ): Promise<TradeProtectionResult> {
    // Check for open position
    if (this.positionTracker.hasOpenPosition(symbol, platform)) {
      return {
        allowed: false,
        reason: `Duplicate position detected: ${symbol} on ${platform}`,
      };
    }
    
    // Check for recent position (60 minute window)
    const recent = this.positionTracker.hasRecentPosition(symbol, platform, 60 * 60 * 1000);
    if (recent.hasRecent) {
      const minutesAgo = Math.floor((recent.timeSinceEntry || 0) / 1000 / 60);
      return {
        allowed: false,
        reason: `Recent position exists: ${symbol} traded ${minutesAgo} minutes ago`,
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 2. TRADE COOLDOWN - Check if symbol is on cooldown (5 minutes)
   */
  async checkCooldown(symbol: string): Promise<TradeProtectionResult> {
    const cooldown = this.positionTracker.isOnCooldown(symbol);
    
    if (cooldown.onCooldown) {
      const remainingSeconds = Math.floor((cooldown.remainingMs || 0) / 1000);
      return {
        allowed: false,
        reason: `${symbol} on cooldown (${remainingSeconds}s remaining)`,
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 3. API CACHING - Get cached price or fetch new
   */
  async getCachedPrice(symbol: string, fetchFn: () => Promise<number>): Promise<number> {
    return this.apiCache.getPrice(symbol, fetchFn);
  }
  
  async getCachedTicker(symbol: string, fetchFn: () => Promise<any>): Promise<any> {
    return this.apiCache.getTicker(symbol, fetchFn);
  }
  
  async getCachedCandles(symbol: string, fetchFn: () => Promise<any[]>): Promise<any[]> {
    return this.apiCache.getCandles(symbol, fetchFn);
  }
  
  /**
   * 4. KALSHI CORRELATION DETECTOR - Extract event ID from ticker
   */
  private extractEventID(ticker: string): string {
    // Example: KXLOWTLAX-26JAN01-B53.5 → "LOWTLAX-JAN01"
    const parts = ticker.split('-');
    if (parts.length >= 2) {
      // Remove prefix (KX) and get base event + date
      const base = parts[0].replace(/^KX/, '');
      const date = parts[1];
      return `${base}-${date}`;
    }
    return ticker; // Fallback to full ticker
  }
  
  /**
   * Check if we already have a bet on this event
   */
  async checkKalshiCorrelation(ticker: string): Promise<TradeProtectionResult> {
    const eventID = this.extractEventID(ticker);
    const existingMarkets = this.kalshiEventMap.get(eventID);
    
    if (existingMarkets && existingMarkets.size > 0) {
      return {
        allowed: false,
        reason: `Already have bet on event ${eventID} (${existingMarkets.size} market(s))`,
        details: { eventID, existingMarkets: Array.from(existingMarkets) },
      };
    }
    
    return { allowed: true, details: { eventID } };
  }
  
  /**
   * Register a Kalshi bet for correlation tracking
   */
  registerKalshiBet(ticker: string, marketId: string): void {
    const eventID = this.extractEventID(ticker);
    if (!this.kalshiEventMap.has(eventID)) {
      this.kalshiEventMap.set(eventID, new Set());
    }
    this.kalshiEventMap.get(eventID)!.add(marketId);
  }
  
  /**
   * Remove a Kalshi bet from correlation tracking
   */
  unregisterKalshiBet(ticker: string, marketId: string): void {
    const eventID = this.extractEventID(ticker);
    const markets = this.kalshiEventMap.get(eventID);
    if (markets) {
      markets.delete(marketId);
      if (markets.size === 0) {
        this.kalshiEventMap.delete(eventID);
      }
    }
  }

  /**
   * CLAUDE FIX #3: Get all correlated bets (for pre-filter)
   * Returns Set of all market IDs that are correlated to existing bets
   */
  getCorrelatedBets(): Set<string> {
    const correlated = new Set<string>();
    for (const [eventID, markets] of this.kalshiEventMap.entries()) {
      for (const marketId of markets) {
        correlated.add(marketId);
      }
    }
    return correlated;
  }
  
  /**
   * 5. PORTFOLIO CONCENTRATION LIMITS - Dynamic based on bankroll
   * FIX: Small bankrolls (<$500) can use 60%, larger accounts use 40%
   */
  async checkConcentration(
    symbol: string,
    amount: number,
    platform: 'coinbase' | 'kalshi',
    bankroll?: number
  ): Promise<TradeProtectionResult> {
    const positions = this.positionTracker.getPositions(platform);
    const symbolPositions = positions.filter(p => p.symbol === symbol);
    const symbolCount = symbolPositions.length;
    const totalCount = positions.length;
    
    if (totalCount === 0) {
      return { allowed: true };
    }
    
    const concentration = (symbolCount + 1) / (totalCount + 1);
    
    // FIX: Dynamic portfolio limit based on bankroll
    const maxConcentration = bankroll && bankroll < 500 ? 0.60 : 0.40; // 60% for small accounts, 40% for larger
    
    if (concentration > maxConcentration) {
      return {
        allowed: false,
        reason: `${symbol} would be ${(concentration * 100).toFixed(1)}% of portfolio (max ${(maxConcentration * 100).toFixed(0)}%)`,
        details: { concentration, symbolCount, totalCount, maxConcentration },
      };
    }
    
    return { allowed: true, details: { concentration } };
  }
  
  /**
   * 6. GLOBAL TRADING LOCK - Prevent concurrent execution
   */
  async acquireTradingLock(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.tradingLock) {
        this.tradingLock = true;
        resolve(() => {
          this.tradingLock = false;
          if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift();
            if (next) next();
          }
        });
      } else {
        // Queue the request
        this.lockQueue.push(() => {
          this.tradingLock = true;
          resolve(() => {
            this.tradingLock = false;
            if (this.lockQueue.length > 0) {
              const next = this.lockQueue.shift();
              if (next) next();
            }
          });
        });
      }
    });
  }
  
  /**
   * 7. SPENDING RATE LIMITER - Spread spending over time
   */
  async checkSpendingRate(amount: number): Promise<TradeProtectionResult> {
    const now = Date.now();
    
    // Remove old entries
    this.spendingWindow = this.spendingWindow.filter(
      s => now - s.timestamp < this.WINDOW_MS
    );
    
    const recentSpend = this.spendingWindow.reduce((sum, s) => sum + s.amount, 0);
    
    if (recentSpend + amount > this.MAX_SPEND_PER_WINDOW) {
      const remaining = this.MAX_SPEND_PER_WINDOW - recentSpend;
      const waitTime = Math.min(
        ...this.spendingWindow.map(s => this.WINDOW_MS - (now - s.timestamp))
      );
      
      return {
        allowed: false,
        reason: `Spending too fast: $${recentSpend.toFixed(2)} in last 5min (max $${this.MAX_SPEND_PER_WINDOW}). Can spend $${remaining.toFixed(2)} now.`,
        details: { recentSpend, waitTime },
      };
    }
    
    // Record this spending
    this.spendingWindow.push({ amount, timestamp: now });
    
    return { allowed: true, details: { recentSpend: recentSpend + amount } };
  }
  
  /**
   * 8. SYNC DEDUPLICATION - Prevent redundant syncs
   */
  shouldSync(picks: any[]): boolean {
    const currentHash = JSON.stringify(picks);
    if (currentHash === this.lastSyncHash) {
      return false;
    }
    this.lastSyncHash = currentHash;
    return true;
  }
  
  /**
   * 9. COMPREHENSIVE ERROR HANDLING - Safe API call wrapper
   */
  async safeAPICall<T>(
    fn: () => Promise<T>,
    context: string,
    retries: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      console.error(`❌ API call failed [${context}]:`, {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      });
      
      if (retries > 0) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          return await fn();
        } catch (retryError: any) {
          console.error(`❌ Retry failed [${context}] - giving up`);
          throw retryError;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * 10. EXIT/CLOSE POSITION LOGGING - Enhanced logging
   */
  logPositionClose(
    position: {
      symbol: string;
      entryPrice: number;
      amount: number;
      side: string;
      platform: string;
    },
    exitPrice: number,
    pnl: number,
    reason: string,
    duration?: number
  ): void {
    const pnlPercent = (pnl / (position.entryPrice * position.amount)) * 100;
    
    console.log(`
💰 POSITION CLOSED:
   Symbol: ${position.symbol}
   Platform: ${position.platform}
   Side: ${position.side.toUpperCase()}
   Entry: $${position.entryPrice.toFixed(2)}
   Exit: $${exitPrice.toFixed(2)}
   Amount: $${position.amount.toFixed(2)}
   P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
   Reason: ${reason}
   ${duration ? `Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s` : ''}
    `);
  }
  
  /**
   * Get position tracker instance
   */
  getPositionTracker(): PositionTracker {
    return this.positionTracker;
  }
  
  /**
   * Get API cache instance
   */
  getApiCache(): ApiCache {
    return this.apiCache;
  }
  
  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.apiCache.getStats();
  }
}

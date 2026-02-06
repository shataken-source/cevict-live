/**
 * Trade Safety Module - Critical Bug Fixes
 * 
 * Implements all safety guards to prevent:
 * - Duplicate trades
 * - API spam
 * - Capital loss
 * - Race conditions
 */

import { getOpenTradeRecords } from '../lib/supabase-memory';

// ============================================================================
// BUG #1: DUPLICATE TRADE PREVENTION
// ============================================================================

const openPositions = new Map<string, { ticker: string; timestamp: number; entryPrice?: number }>();

export function canPlaceTrade(ticker: string): { allowed: boolean; reason?: string } {
  const existing = openPositions.get(ticker);
  
  if (existing) {
    const ageMinutes = (Date.now() - existing.timestamp) / 60000;
    return {
      allowed: false,
      reason: `Position already open (${ageMinutes.toFixed(1)}min ago)`
    };
  }
  
  return { allowed: true };
}

export function recordPosition(ticker: string, entryPrice?: number) {
  openPositions.set(ticker, {
    ticker,
    timestamp: Date.now(),
    entryPrice
  });
}

export function removePosition(ticker: string) {
  openPositions.delete(ticker);
}

// ============================================================================
// BUG #2: TRADE COOLDOWN (5-MINUTE MINIMUM)
// ============================================================================

const tradeCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function isOnCooldown(ticker: string): { onCooldown: boolean; remainingMin?: number } {
  const lastTrade = tradeCooldowns.get(ticker);
  
  if (!lastTrade) return { onCooldown: false };
  
  const elapsed = Date.now() - lastTrade;
  const remainingMs = COOLDOWN_MS - elapsed;
  
  if (remainingMs > 0) {
    const remainingMin = Math.ceil(remainingMs / 60000);
    return { onCooldown: true, remainingMin };
  }
  
  return { onCooldown: false };
}

export function recordTradeCooldown(ticker: string) {
  tradeCooldowns.set(ticker, Date.now());
}

// ============================================================================
// BUG #3: API CALL CACHING
// ============================================================================

class APICache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;
  
  constructor(ttlMs: number = 10000) {
    this.ttl = ttlMs;
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  clear() {
    this.cache.clear();
  }
}

export const apiCache = new APICache(10000); // 10 second TTL

// ============================================================================
// BUG #4: KALSHI CORRELATION DETECTION
// ============================================================================

const activeEvents = new Set<string>();

export function getKalshiEventId(ticker: string): string {
  // Kalshi format: KXEVENT-DATE-OUTCOME
  // Example: KXNFLPREPACK-26JAN03CARTB-CARU44
  const parts = ticker.split('-');
  if (parts.length >= 2) {
    return parts.slice(0, 2).join('-'); // KXNFLPREPACK-26JAN03CARTB
  }
  return ticker; // Fallback to full ticker if format unexpected
}

export function hasCorrelatedPosition(ticker: string): { hasCorrelation: boolean; eventId?: string } {
  const eventId = getKalshiEventId(ticker);
  
  if (activeEvents.has(eventId)) {
    return { hasCorrelation: true, eventId };
  }
  
  return { hasCorrelation: false };
}

export function recordEventPosition(ticker: string) {
  const eventId = getKalshiEventId(ticker);
  activeEvents.add(eventId);
}

export function removeEventPosition(ticker: string) {
  const eventId = getKalshiEventId(ticker);
  activeEvents.delete(eventId);
}

// ============================================================================
// BUG #5: PORTFOLIO CONCENTRATION LIMITS
// ============================================================================

const MAX_POSITION_CONCENTRATION = 0.40; // 40% max

export async function checkConcentration(
  ticker: string,
  newAmount: number,
  platform: 'kalshi' | 'coinbase' = 'kalshi'
): Promise<{ allowed: boolean; concentration?: number; reason?: string }> {
  try {
    const allPositions = await getOpenTradeRecords(platform, 200);
    
    const totalValue = allPositions.reduce((sum, p) => sum + (p.amount || 0), 0);
    const tickerValue = allPositions
      .filter(p => p.market_id === ticker || p.symbol === ticker)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const newTickerValue = tickerValue + newAmount;
    const totalWithNew = totalValue + newAmount;
    const concentration = totalWithNew > 0 ? newTickerValue / totalWithNew : 0;
    
    if (concentration > MAX_POSITION_CONCENTRATION) {
      return {
        allowed: false,
        concentration: concentration * 100,
        reason: `Concentration ${(concentration * 100).toFixed(1)}% exceeds ${MAX_POSITION_CONCENTRATION * 100}% limit`
      };
    }
    
    return { allowed: true, concentration: concentration * 100 };
  } catch (error) {
    // If we can't check, allow the trade (fail open, but log)
    console.error('Error checking concentration:', error);
    return { allowed: true };
  }
}

// ============================================================================
// BUG #6: GLOBAL TRADING LOCK
// ============================================================================

let tradingLock = false;
let lockAcquiredAt: number | null = null;

export async function executeTradeWithLock<T>(
  fn: () => Promise<T>,
  context: string = 'trade'
): Promise<{ success: boolean; result?: T; reason?: string }> {
  if (tradingLock) {
    const lockAge = lockAcquiredAt ? (Date.now() - lockAcquiredAt) / 1000 : 0;
    return {
      success: false,
      reason: `Trading lock active (held for ${lockAge.toFixed(1)}s)`
    };
  }
  
  tradingLock = true;
  lockAcquiredAt = Date.now();
  
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error: any) {
    return {
      success: false,
      reason: error?.message || 'Trade execution failed'
    };
  } finally {
    tradingLock = false;
    lockAcquiredAt = null;
  }
}

// ============================================================================
// BUG #7: EXIT/CLOSE LOGGING
// ============================================================================

export interface PositionCloseLog {
  timestamp: number;
  ticker: string;
  action: 'CLOSE';
  holdTimeMin: number;
  pnl: number;
  entryPrice?: number;
  exitPrice?: number;
}

export async function logPositionClose(
  ticker: string,
  pnl: number,
  exitPrice?: number
): Promise<void> {
  const position = openPositions.get(ticker);
  
  if (!position) {
    console.log(`⚠️ ${ticker}: No open position to close`);
    return;
  }
  
  const holdTimeMin = (Date.now() - position.timestamp) / 60000;
  
  console.log(`📊 POSITION CLOSED: ${ticker}`);
  console.log(`   Hold Time: ${holdTimeMin.toFixed(1)} minutes`);
  console.log(`   P&L: $${pnl.toFixed(2)}`);
  if (position.entryPrice) console.log(`   Entry: ${position.entryPrice}¢`);
  if (exitPrice) console.log(`   Exit: ${exitPrice}¢`);
  
  // Remove from tracking
  removePosition(ticker);
  removeEventPosition(ticker);
  
  // Log to structured format (could write to file/db)
  const logEntry: PositionCloseLog = {
    timestamp: Date.now(),
    ticker,
    action: 'CLOSE',
    holdTimeMin,
    pnl,
    entryPrice: position.entryPrice,
    exitPrice
  };
  
  // TODO: Write to log file or Supabase if needed
  // await writeLogToFile(logEntry);
}

// ============================================================================
// BUG #8: PROGNOSTICATION SYNC DEDUPLICATION
// ============================================================================

const lastSync = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60000; // 1 minute

export async function syncToPrognostication(
  data: { ticker: string; [key: string]: any },
  syncFn: (data: any) => Promise<void>
): Promise<{ synced: boolean; reason?: string }> {
  const syncKey = `sync:${data.ticker}`;
  const lastSyncTime = lastSync.get(syncKey);
  
  if (lastSyncTime && (Date.now() - lastSyncTime) < SYNC_COOLDOWN_MS) {
    const ageSeconds = ((Date.now() - lastSyncTime) / 1000).toFixed(0);
    return {
      synced: false,
      reason: `Synced ${ageSeconds}s ago (cooldown: ${SYNC_COOLDOWN_MS / 1000}s)`
    };
  }
  
  try {
    await syncFn(data);
    lastSync.set(syncKey, Date.now());
    return { synced: true };
  } catch (error: any) {
    return {
      synced: false,
      reason: error?.message || 'Sync failed'
    };
  }
}

// ============================================================================
// BUG #9: SPENDING RATE LIMITER
// ============================================================================

const spendingWindow = {
  amount: 0,
  windowStart: Date.now()
};

const MAX_SPEND_PER_WINDOW = 200; // $200 per 5-minute window (allows $1000/day with room)
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function canSpend(amount: number): { allowed: boolean; currentSpend?: number; timeLeftMin?: number; reason?: string } {
  const now = Date.now();
  
  // Reset window if expired
  if (now - spendingWindow.windowStart > WINDOW_MS) {
    spendingWindow.amount = 0;
    spendingWindow.windowStart = now;
  }
  
  const newTotal = spendingWindow.amount + amount;
  
  if (newTotal > MAX_SPEND_PER_WINDOW) {
    const timeLeft = WINDOW_MS - (now - spendingWindow.windowStart);
    const timeLeftMin = timeLeft / 60000;
    return {
      allowed: false,
      currentSpend: spendingWindow.amount,
      timeLeftMin,
      reason: `Spending limit: $${spendingWindow.amount.toFixed(2)}/$${MAX_SPEND_PER_WINDOW} (${timeLeftMin.toFixed(1)}min until reset)`
    };
  }
  
  spendingWindow.amount = newTotal;
  return {
    allowed: true,
    currentSpend: newTotal
  };
}

export function resetSpendingWindow() {
  spendingWindow.amount = 0;
  spendingWindow.windowStart = Date.now();
}

// ============================================================================
// BUG #10: COMPREHENSIVE ERROR HANDLING
// ============================================================================

export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: string,
  retries: number = 3
): Promise<{ success: boolean; result?: T; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return { success: true, result };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error(`❌ ${context} (attempt ${attempt}/${retries}):`, errorMsg);
      
      if (attempt < retries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: `${context}: All ${retries} retries failed`
  };
}

// ============================================================================
// COMPREHENSIVE TRADE PRE-FLIGHT CHECK
// ============================================================================

export interface TradePreFlightResult {
  allowed: boolean;
  reasons: string[];
}

export async function preFlightTradeCheck(
  ticker: string,
  amount: number,
  platform: 'kalshi' | 'coinbase' = 'kalshi'
): Promise<TradePreFlightResult> {
  const reasons: string[] = [];
  
  // Check 1: Duplicate position
  const duplicateCheck = canPlaceTrade(ticker);
  if (!duplicateCheck.allowed) {
    reasons.push(`Duplicate: ${duplicateCheck.reason}`);
  }
  
  // Check 2: Cooldown
  const cooldownCheck = isOnCooldown(ticker);
  if (cooldownCheck.onCooldown) {
    reasons.push(`Cooldown: ${cooldownCheck.remainingMin}min remaining`);
  }
  
  // Check 3: Correlation
  const correlationCheck = hasCorrelatedPosition(ticker);
  if (correlationCheck.hasCorrelation) {
    reasons.push(`Correlation: Event ${correlationCheck.eventId} already has position`);
  }
  
  // Check 4: Concentration
  const concentrationCheck = await checkConcentration(ticker, amount, platform);
  if (!concentrationCheck.allowed) {
    reasons.push(`Concentration: ${concentrationCheck.reason}`);
  }
  
  // Check 5: Spending limit
  const spendingCheck = canSpend(amount);
  if (!spendingCheck.allowed) {
    reasons.push(`Spending: ${spendingCheck.reason}`);
  }
  
  const allowed = reasons.length === 0;
  
  if (!allowed) {
    console.log(`⏭️ ${ticker}: Trade blocked - ${reasons.join('; ')}`);
  }
  
  return { allowed, reasons };
}

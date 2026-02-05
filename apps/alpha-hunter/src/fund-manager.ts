/**
 * UNIFIED FUND MANAGER
 * Links Kalshi + Coinbase accounts into a single pool
 * Allocates capital intelligently across platforms
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { FundAccount, Trade, Opportunity } from './types';

// ANSI Color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
};

interface PlatformBalance {
  available: number;
  inPositions: number;
  pending: number;
  total: number;
  lastUpdated: Date;
}

interface AllocationConfig {
  kalshiPercent: number;  // % of funds for Kalshi
  cryptoPercent: number;  // % of funds for Crypto
  reservePercent: number; // % to keep as reserve
}

export class UnifiedFundManager {
  private kalshiBalance: PlatformBalance = { available: 0, inPositions: 0, pending: 0, total: 0, lastUpdated: new Date() };
  private cryptoBalance: PlatformBalance = { available: 0, inPositions: 0, pending: 0, total: 0, lastUpdated: new Date() };

  private allocation: AllocationConfig = {
    kalshiPercent: 40,
    cryptoPercent: 50,
    reservePercent: 10
  };

  // Track manual adjustments (when user moves money between platforms)
  private manualAdjustments: number = 0;

  // Cumulative P&L tracking
  private kalshiCumulativePnL: number = 0;
  private cryptoCumulativePnL: number = 0;
  private kalshiTotalTrades: number = 0;
  private cryptoTotalTrades: number = 0;
  private kalshiWins: number = 0;
  private kalshiLosses: number = 0;
  private cryptoWins: number = 0;
  private cryptoLosses: number = 0;

  // Supabase client for persistence
  private supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

  // In-memory tracking for trades and allocations
  private allocatedFunds: Map<string, number> = new Map();
  private trades: Map<string, Trade> = new Map();

  constructor(config?: Partial<AllocationConfig>) {
    if (config) {
      this.allocation = { ...this.allocation, ...config };
    }
  }

  /**
   * Update Kalshi balance (call after fetching from API)
   */
  updateKalshiBalance(available: number, inPositions: number = 0, pending: number = 0): void {
    this.kalshiBalance = {
      available,
      inPositions,
      pending,
      total: available + inPositions + pending,
      lastUpdated: new Date()
    };
  }

  /**
   * Update Crypto balance (call after fetching from Coinbase)
   */
  updateCryptoBalance(available: number, inPositions: number = 0, pending: number = 0): void {
    this.cryptoBalance = {
      available,
      inPositions,
      pending,
      total: available + inPositions + pending,
      lastUpdated: new Date()
    };
  }

  /**
   * Update Kalshi cumulative P&L and stats
   */
  updateKalshiStats(pnl: number, isWin: boolean): void {
    this.kalshiCumulativePnL += pnl;
    this.kalshiTotalTrades++;
    if (isWin) {
      this.kalshiWins++;
    } else {
      this.kalshiLosses++;
    }
  }

  /**
   * Update Crypto cumulative P&L and stats
   */
  updateCryptoStats(pnl: number, isWin: boolean): void {
    this.cryptoCumulativePnL += pnl;
    this.cryptoTotalTrades++;
    if (isWin) {
      this.cryptoWins++;
    } else {
      this.cryptoLosses++;
    }
  }

  /**
   * Get Kalshi cumulative stats
   */
  getKalshiStats(): { pnl: number; trades: number; wins: number; losses: number; winRate: number } {
    const winRate = this.kalshiTotalTrades > 0
      ? (this.kalshiWins / this.kalshiTotalTrades * 100)
      : 0;
    return {
      pnl: this.kalshiCumulativePnL,
      trades: this.kalshiTotalTrades,
      wins: this.kalshiWins,
      losses: this.kalshiLosses,
      winRate
    };
  }

  /**
   * Get Crypto cumulative stats
   */
  getCryptoStats(): { pnl: number; trades: number; wins: number; losses: number; winRate: number } {
    const winRate = this.cryptoTotalTrades > 0
      ? (this.cryptoWins / this.cryptoTotalTrades * 100)
      : 0;
    return {
      pnl: this.cryptoCumulativePnL,
      trades: this.cryptoTotalTrades,
      wins: this.cryptoWins,
      losses: this.cryptoLosses,
      winRate
    };
  }
  /**
   * Get TOTAL funds across all platforms
   */
  getTotalFunds(): number {
    return this.kalshiBalance.total + this.cryptoBalance.total;
  }

  /**
   * Get available funds across all platforms
   */
  getTotalAvailable(): number {
    return this.kalshiBalance.available + this.cryptoBalance.available;
  }

  /**
   * Calculate how much a platform SHOULD have based on allocation
   */
  getTargetAllocation(platform: 'kalshi' | 'crypto'): number {
    const total = this.getTotalFunds();
    const reserveAmount = total * (this.allocation.reservePercent / 100);
    const investable = total - reserveAmount;

    if (platform === 'kalshi') {
      return investable * (this.allocation.kalshiPercent / (this.allocation.kalshiPercent + this.allocation.cryptoPercent));
    } else {
      return investable * (this.allocation.cryptoPercent / (this.allocation.kalshiPercent + this.allocation.cryptoPercent));
    }
  }

  /**
   * Check if platform is over/under allocated
   * Returns: positive = over-allocated, negative = under-allocated
   */
  getAllocationDelta(platform: 'kalshi' | 'crypto'): number {
    const target = this.getTargetAllocation(platform);
    const current = platform === 'kalshi' ? this.kalshiBalance.total : this.cryptoBalance.total;
    return current - target;
  }

  /**
   * Get maximum amount available for a trade on a platform
   * Respects allocation limits and reserves
   */
  getMaxTradeAmount(platform: 'kalshi' | 'crypto', maxPerTrade: number = 25): number {
    const balance = platform === 'kalshi' ? this.kalshiBalance : this.cryptoBalance;
    const delta = this.getAllocationDelta(platform);

    // If over-allocated, can only use what won't exceed allocation more
    // If under-allocated, can use available funds
    let maxFromAllocation = delta < 0 ? balance.available : Math.max(0, balance.available - delta);

    // Apply per-trade limit
    return Math.min(maxFromAllocation, maxPerTrade, balance.available);
  }

  /**
   * Should we trade on this platform right now?
   * Based on allocation balance and opportunity
   */
  shouldTradeOnPlatform(platform: 'kalshi' | 'crypto', opportunityScore: number): boolean {
    const balance = platform === 'kalshi' ? this.kalshiBalance : this.cryptoBalance;
    const delta = this.getAllocationDelta(platform);

    // Always allow if under-allocated and good opportunity
    if (delta < 0 && opportunityScore >= 60) return true;

    // Allow if at target and excellent opportunity
    if (Math.abs(delta) < 20 && opportunityScore >= 70) return true;

    // Allow if over-allocated only for exceptional opportunities
    if (delta > 0 && opportunityScore >= 85) return true;

    // Block if no funds
    if (balance.available < 5) return false;

    return opportunityScore >= 75;
  }

  /**
   * Get rebalancing suggestion
   */
  getRebalanceSuggestion(): { action: string; amount: number; from: string; to: string } | null {
    const kalshiDelta = this.getAllocationDelta('kalshi');
    const cryptoDelta = this.getAllocationDelta('crypto');

    // Only suggest if imbalance is significant (>$50)
    if (Math.abs(kalshiDelta) < 50 && Math.abs(cryptoDelta) < 50) {
      return null;
    }

    if (kalshiDelta > 50) {
      return {
        action: 'Consider moving funds',
        amount: Math.round(kalshiDelta),
        from: 'Kalshi',
        to: 'Coinbase (Crypto)'
      };
    }

    if (cryptoDelta > 50) {
      return {
        action: 'Consider moving funds',
        amount: Math.round(cryptoDelta),
        from: 'Coinbase (Crypto)',
        to: 'Kalshi'
      };
    }

    return null;
  }

  /**
   * Get complete status for display
   */
  getStatus(): string {
    const total = this.getTotalFunds();
    const available = this.getTotalAvailable();
    const kalshiTarget = this.getTargetAllocation('kalshi');
    const cryptoTarget = this.getTargetAllocation('crypto');
    const reserve = total * (this.allocation.reservePercent / 100);
    const kalshiStats = this.getKalshiStats();
    const cryptoStats = this.getCryptoStats();
    const totalPnL = kalshiStats.pnl + cryptoStats.pnl;

    const pnlColor = totalPnL >= 0 ? c.brightGreen : c.brightRed;
    const kalshiPnlColor = kalshiStats.pnl >= 0 ? c.brightGreen : c.brightRed;
    const cryptoPnlColor = cryptoStats.pnl >= 0 ? c.brightGreen : c.brightRed;

    const lines = [
      `${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`,
      `${c.brightCyan}║${c.reset}            ${c.brightYellow}💰 UNIFIED FUND MANAGER 💰${c.reset}                        ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.brightWhite}TOTAL FUNDS:${c.reset}     ${c.brightGreen}$${total.toFixed(2).padStart(10)}${c.reset}                          ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.dim}AVAILABLE:${c.reset}       ${c.white}${available.toFixed(2).padStart(10)}${c.reset}                          ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.brightWhite}CUMULATIVE P&L:${c.reset} ${pnlColor}${(totalPnL >= 0 ? '+' : '')}${totalPnL.toFixed(2).padStart(9)}${c.reset}                          ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.dim}PLATFORM BREAKDOWN:${c.reset}                                         ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.brightMagenta}🎯 Kalshi:${c.reset}     ${c.brightWhite}$${this.kalshiBalance.total.toFixed(2).padStart(8)}${c.reset} ${c.dim}(target: $${kalshiTarget.toFixed(0).padStart(6)})${c.reset}       ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}     ${c.dim}Available:${c.reset} $${this.kalshiBalance.available.toFixed(2).padStart(8)}                              ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}     ${c.dim}P&L:${c.reset}       ${kalshiPnlColor}${(kalshiStats.pnl >= 0 ? '+' : '')}$${kalshiStats.pnl.toFixed(2).padStart(8)}${c.reset} ${c.dim}(${kalshiStats.trades} trades, ${kalshiStats.winRate.toFixed(1)}% win)${c.reset} ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.brightYellow}🪙 Crypto:${c.reset}     ${c.brightWhite}$${this.cryptoBalance.total.toFixed(2).padStart(8)}${c.reset} ${c.dim}(target: $${cryptoTarget.toFixed(0).padStart(6)})${c.reset}       ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}     ${c.dim}Available:${c.reset} $${this.cryptoBalance.available.toFixed(2).padStart(8)}                              ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}     ${c.dim}P&L:${c.reset}       ${cryptoPnlColor}${(cryptoStats.pnl >= 0 ? '+' : '')}$${cryptoStats.pnl.toFixed(2).padStart(8)}${c.reset} ${c.dim}(${cryptoStats.trades} trades, ${cryptoStats.winRate.toFixed(1)}% win)${c.reset} ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}║${c.reset}  ${c.cyan}🛡️  Reserve:${c.reset}    $${reserve.toFixed(2).padStart(8)} ${c.dim}(${this.allocation.reservePercent}%)${c.reset}                         ${c.brightCyan}║${c.reset}`,
      `${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`,
    ];

    const rebalance = this.getRebalanceSuggestion();
    if (rebalance) {
      lines.push(`${c.brightYellow}⚠️  REBALANCE:${c.reset} Move ${c.brightGreen}$${rebalance.amount}${c.reset} from ${c.brightRed}${rebalance.from}${c.reset} to ${c.brightGreen}${rebalance.to}${c.reset}`);
    }

    return lines.join('\n');
  }

  /**
   * Set custom allocation percentages
   */
  setAllocation(kalshi: number, crypto: number, reserve: number): void {
    if (kalshi + crypto + reserve !== 100) {
      console.warn('⚠️ Allocation percentages should sum to 100');
    }
    this.allocation = {
      kalshiPercent: kalshi,
      cryptoPercent: crypto,
      reservePercent: reserve
    };
  }

  /**
   * Get allocation config
   */
  getAllocation(): AllocationConfig {
    return { ...this.allocation };
  }

  // ============================================================================
  // COMPATIBILITY METHODS - For existing code that expects database-backed fund manager
  // ============================================================================

  /**
   * Get account information (compatible with FundAccount interface)
   */
  async getAccount(): Promise<FundAccount> {
    const total = this.getTotalFunds();
    const allocated = Array.from(this.allocatedFunds.values()).reduce((sum, val) => sum + val, 0);
    const available = this.getTotalAvailable() - allocated;
    const totalPnL = this.kalshiCumulativePnL + this.cryptoCumulativePnL;

    // Calculate today's profit from trades
    const todayTrades = Array.from(this.trades.values()).filter(t => {
      const tradeDate = new Date(t.executedAt);
      const today = new Date();
      return tradeDate.toDateString() === today.toDateString();
    });
    const todayProfit = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const todaySpent = todayTrades.reduce((sum, t) => sum + t.amount, 0);

    return {
      id: 'alpha_hunter_main',
      balance: total,
      allocatedFunds: allocated,
      availableFunds: Math.max(0, available),
      dailyLimit: parseFloat(process.env.DAILY_PROFIT_TARGET || '250'),
      maxRiskPerTrade: parseFloat(process.env.MAX_SINGLE_TRADE || '50'),
      todaySpent,
      todayProfit,
      totalProfit: totalPnL,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Deposit funds (adds to total pool)
   */
  async deposit(amount: number, source: string = 'manual'): Promise<void> {
    // For now, add to crypto balance as default
    // In production, this would be configurable
    this.updateCryptoBalance(
      this.cryptoBalance.available + amount,
      this.cryptoBalance.inPositions,
      this.cryptoBalance.pending
    );

    // Log transaction if Supabase available
    if (this.supabase) {
      await this.supabase.from('alpha_hunter_transactions').insert({
        account_id: 'alpha_hunter_main',
        type: 'deposit',
        amount,
        source,
        balance_after: this.getTotalFunds(),
        notes: `Deposit via ${source}`
      });
    }
  }

  /**
   * Withdraw funds
   */
  async withdraw(amount: number, source: string = 'manual'): Promise<void> {
    const available = this.getTotalAvailable();
    if (amount > available) {
      throw new Error(`Insufficient funds. Available: $${available}, Requested: $${amount}`);
    }

    // Withdraw from crypto balance first
    const cryptoWithdraw = Math.min(amount, this.cryptoBalance.available);
    const kalshiWithdraw = amount - cryptoWithdraw;

    if (cryptoWithdraw > 0) {
      this.updateCryptoBalance(
        this.cryptoBalance.available - cryptoWithdraw,
        this.cryptoBalance.inPositions,
        this.cryptoBalance.pending
      );
    }

    if (kalshiWithdraw > 0) {
      this.updateKalshiBalance(
        this.kalshiBalance.available - kalshiWithdraw,
        this.kalshiBalance.inPositions,
        this.kalshiBalance.pending
      );
    }

    // Log transaction
    if (this.supabase) {
      await this.supabase.from('alpha_hunter_transactions').insert({
        account_id: 'alpha_hunter_main',
        type: 'withdrawal',
        amount,
        source,
        balance_after: this.getTotalFunds(),
        notes: `Withdrawal via ${source}`
      });
    }
  }

  /**
   * Check if we can trade an opportunity
   */
  async canTrade(opportunity: Opportunity): Promise<{ allowed: boolean; reason?: string }> {
    const account = await this.getAccount();
    const maxTrade = parseFloat(process.env.MAX_SINGLE_TRADE || '50');
    const maxPositions = parseInt(process.env.MAX_OPEN_POSITIONS || '5');
    const dailyLossLimit = parseFloat(process.env.MAX_DAILY_LOSS || '100');
    const dailyTarget = parseFloat(process.env.DAILY_PROFIT_TARGET || '250');

    // Check available funds
    if (account.availableFunds < opportunity.requiredCapital) {
      return { allowed: false, reason: 'Insufficient funds' };
    }

    // Check trade size limit
    if (opportunity.requiredCapital > maxTrade) {
      return { allowed: false, reason: `Trade size exceeds limit of $${maxTrade}` };
    }

    // Check position limit
    const openTrades = await this.getOpenTrades();
    if (openTrades.length >= maxPositions) {
      return { allowed: false, reason: `Maximum ${maxPositions} open positions reached` };
    }

    // Check daily loss limit
    if (account.todayProfit <= -dailyLossLimit) {
      return { allowed: false, reason: `Daily loss limit of $${dailyLossLimit} reached` };
    }

    // Check if target already hit
    if (account.todayProfit >= dailyTarget) {
      return { allowed: false, reason: `Daily target of $${dailyTarget} already achieved` };
    }

    // Check confidence threshold
    const minConfidence = parseFloat(process.env.MIN_CONFIDENCE || '65');
    if (opportunity.confidence < minConfidence) {
      return { allowed: false, reason: `Confidence ${opportunity.confidence}% below minimum ${minConfidence}%` };
    }

    // Platform-specific checks
    if (opportunity.action.platform === 'kalshi') {
      const maxKalshi = this.getMaxTradeAmount('kalshi', maxTrade);
      if (opportunity.requiredCapital > maxKalshi) {
        return { allowed: false, reason: `Kalshi allocation limit: max $${maxKalshi}` };
      }
    }

    if (opportunity.action.platform === 'crypto_exchange') {
      const maxCrypto = this.getMaxTradeAmount('crypto', maxTrade);
      if (opportunity.requiredCapital > maxCrypto) {
        return { allowed: false, reason: `Crypto allocation limit: max $${maxCrypto}` };
      }
    }

    return { allowed: true };
  }

  /**
   * Allocate funds for a trade
   */
  async allocateFunds(opportunityId: string, amount: number): Promise<void> {
    this.allocatedFunds.set(opportunityId, amount);

    // Deduct from appropriate platform balance
    if (amount <= this.kalshiBalance.available) {
      this.updateKalshiBalance(
        this.kalshiBalance.available - amount,
        this.kalshiBalance.inPositions + amount,
        this.kalshiBalance.pending
      );
    } else {
      const kalshiPart = this.kalshiBalance.available;
      const cryptoPart = amount - kalshiPart;
      this.updateKalshiBalance(0, this.kalshiBalance.inPositions + kalshiPart, this.kalshiBalance.pending);
      this.updateCryptoBalance(
        this.cryptoBalance.available - cryptoPart,
        this.cryptoBalance.inPositions + cryptoPart,
        this.cryptoBalance.pending
      );
    }
  }

  /**
   * Release funds after trade settlement
   */
  async releaseFunds(opportunityId: string, originalAmount: number, profit: number): Promise<void> {
    const allocated = this.allocatedFunds.get(opportunityId) || originalAmount;
    this.allocatedFunds.delete(opportunityId);

    const totalReturn = originalAmount + profit;

    // Add back to appropriate platform with profit
    // For simplicity, add to crypto balance
    this.updateCryptoBalance(
      this.cryptoBalance.available + totalReturn,
      this.cryptoBalance.inPositions - allocated,
      this.cryptoBalance.pending
    );

    // Update stats
    if (profit > 0) {
      this.updateCryptoStats(profit, true);
    } else {
      this.updateCryptoStats(profit, false);
    }
  }

  /**
   * Get open trades
   */
  async getOpenTrades(): Promise<Trade[]> {
    const openStatuses: Trade['status'][] = ['pending', 'active'];
    const allTrades = Array.from(this.trades.values());

    if (this.supabase) {
      const { data } = await this.supabase
        .from('alpha_hunter_trades')
        .select('*')
        .in('status', openStatuses);

      if (data) {
        return data.map(t => ({
          id: t.id,
          opportunityId: t.opportunity_id,
          type: t.type as Trade['type'],
          platform: t.platform,
          amount: parseFloat(t.amount),
          target: t.target,
          entryPrice: t.entry_price ? parseFloat(t.entry_price) : undefined,
          exitPrice: t.exit_price ? parseFloat(t.exit_price) : undefined,
          status: t.status as Trade['status'],
          profit: parseFloat(t.profit || '0'),
          reasoning: t.reasoning || '',
          executedAt: t.executed_at,
          settledAt: t.settled_at || undefined
        }));
      }
    }

    return allTrades.filter(t => openStatuses.includes(t.status));
  }

  /**
   * Record a trade
   */
  async recordTrade(trade: Trade): Promise<void> {
    this.trades.set(trade.id, trade);

    if (this.supabase) {
      await this.supabase.from('alpha_hunter_trades').insert({
        id: trade.id,
        opportunity_id: trade.opportunityId,
        type: trade.type,
        platform: trade.platform,
        amount: trade.amount,
        target: trade.target,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        status: trade.status,
        profit: trade.profit,
        reasoning: trade.reasoning,
        executed_at: trade.executedAt,
        settled_at: trade.settledAt
      });
    }
  }

  /**
   * Update a trade
   */
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    const existing = this.trades.get(tradeId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.trades.set(tradeId, updated);

      if (this.supabase) {
        await this.supabase
          .from('alpha_hunter_trades')
          .update({
            status: updated.status,
            profit: updated.profit,
            exit_price: updated.exitPrice,
            settled_at: updated.settledAt
          })
          .eq('id', tradeId);
      }
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    avgWin: number;
    avgLoss: number;
  }> {
    const kalshiStats = this.getKalshiStats();
    const cryptoStats = this.getCryptoStats();

    const totalTrades = kalshiStats.trades + cryptoStats.trades;
    const wins = kalshiStats.wins + cryptoStats.wins;
    const losses = kalshiStats.losses + cryptoStats.losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalProfit = kalshiStats.pnl + cryptoStats.pnl;

    // Calculate averages from trades
    const allTrades = Array.from(this.trades.values());
    const winningTrades = allTrades.filter(t => t.status === 'won' && t.profit > 0);
    const losingTrades = allTrades.filter(t => t.status === 'lost' && t.profit < 0);

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length
      : 0;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      totalProfit,
      avgWin,
      avgLoss
    };
  }

  /**
   * Reset daily counters
   */
  async resetDailyCounters(): Promise<void> {
    // Clear today's allocations and reset counters
    this.allocatedFunds.clear();

    if (this.supabase) {
      await this.supabase
        .from('alpha_hunter_accounts')
        .update({
          today_spent: 0,
          today_profit: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'alpha_hunter_main');
    }
  }
}

// Rebalance tracking
interface RebalanceRequest {
  id: string;
  from: 'kalshi' | 'crypto';
  to: 'kalshi' | 'crypto';
  amount: number;
  status: 'pending' | 'initiated' | 'completed' | 'cancelled';
  createdAt: Date;
  initiatedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

// Extended fund manager with rebalance tracking
class ExtendedFundManager extends UnifiedFundManager {
  private rebalanceRequests: RebalanceRequest[] = [];

  /**
   * Create a new rebalance request
   */
  createRebalanceRequest(from: 'kalshi' | 'crypto', to: 'kalshi' | 'crypto', amount: number, notes?: string): RebalanceRequest {
    const request: RebalanceRequest = {
      id: `rebal_${Date.now()}`,
      from,
      to,
      amount,
      status: 'pending',
      createdAt: new Date(),
      notes
    };
    this.rebalanceRequests.push(request);
    console.log(`\n📋 REBALANCE REQUEST CREATED:`);
    console.log(`   ID: ${request.id}`);
    console.log(`   Move $${amount.toFixed(2)} from ${from === 'kalshi' ? 'Kalshi' : 'Coinbase'} to ${to === 'kalshi' ? 'Kalshi' : 'Coinbase'}`);
    console.log(`   Status: PENDING`);
    if (notes) console.log(`   Notes: ${notes}`);
    return request;
  }

  /**
   * Mark rebalance as initiated (user started the manual transfer)
   */
  initiateRebalance(requestId: string): boolean {
    const request = this.rebalanceRequests.find(r => r.id === requestId);
    if (!request) {
      console.log(`❌ Rebalance request ${requestId} not found`);
      return false;
    }
    request.status = 'initiated';
    request.initiatedAt = new Date();
    console.log(`\n✅ REBALANCE INITIATED: ${requestId}`);
    console.log(`   Started at: ${request.initiatedAt.toLocaleString()}`);
    console.log(`   Expected completion: 3-5 business days`);
    return true;
  }

  /**
   * Mark rebalance as completed
   */
  completeRebalance(requestId: string): boolean {
    const request = this.rebalanceRequests.find(r => r.id === requestId);
    if (!request) {
      console.log(`❌ Rebalance request ${requestId} not found`);
      return false;
    }
    request.status = 'completed';
    request.completedAt = new Date();
    console.log(`\n🎉 REBALANCE COMPLETED: ${requestId}`);
    console.log(`   Amount: $${request.amount.toFixed(2)}`);
    console.log(`   Duration: ${this.getDuration(request.createdAt, request.completedAt)}`);
    return true;
  }

  /**
   * Cancel a rebalance request
   */
  cancelRebalance(requestId: string, reason?: string): boolean {
    const request = this.rebalanceRequests.find(r => r.id === requestId);
    if (!request) {
      console.log(`❌ Rebalance request ${requestId} not found`);
      return false;
    }
    request.status = 'cancelled';
    request.notes = reason || request.notes;
    console.log(`\n⛔ REBALANCE CANCELLED: ${requestId}`);
    if (reason) console.log(`   Reason: ${reason}`);
    return true;
  }

  /**
   * Get all pending rebalance requests
   */
  getPendingRebalances(): RebalanceRequest[] {
    return this.rebalanceRequests.filter(r => r.status === 'pending' || r.status === 'initiated');
  }

  /**
   * Get rebalance history
   */
  getRebalanceHistory(): RebalanceRequest[] {
    return [...this.rebalanceRequests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Auto-create rebalance request if imbalance detected
   */
  checkAndCreateRebalance(): RebalanceRequest | null {
    const suggestion = this.getRebalanceSuggestion();
    if (!suggestion) return null;

    // Check if there's already a pending request for this direction
    const existingPending = this.rebalanceRequests.find(r =>
      (r.status === 'pending' || r.status === 'initiated') &&
      ((suggestion.from === 'Kalshi' && r.from === 'kalshi') ||
       (suggestion.from.includes('Crypto') && r.from === 'crypto'))
    );

    if (existingPending) {
      console.log(`\n⏳ Existing rebalance already pending: ${existingPending.id}`);
      return existingPending;
    }

    // Create new request
    const from = suggestion.from === 'Kalshi' ? 'kalshi' : 'crypto';
    const to = suggestion.to === 'Kalshi' ? 'kalshi' : 'crypto';
    return this.createRebalanceRequest(from as 'kalshi' | 'crypto', to as 'kalshi' | 'crypto', suggestion.amount, 'Auto-detected imbalance');
  }

  /**
   * Show rebalance status dashboard
   */
  showRebalanceStatus(): string {
    const pending = this.getPendingRebalances();
    const lines: string[] = [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║            🔄 REBALANCE TRACKER 🔄                           ║',
      '╠══════════════════════════════════════════════════════════════╣',
    ];

    if (pending.length === 0) {
      lines.push('║  ✅ No pending rebalances                                    ║');
    } else {
      for (const req of pending) {
        const fromName = req.from === 'kalshi' ? 'Kalshi' : 'Coinbase';
        const toName = req.to === 'kalshi' ? 'Kalshi' : 'Coinbase';
        const statusIcon = req.status === 'pending' ? '⏳' : '🔄';
        lines.push(`║  ${statusIcon} ${req.id.substring(0, 15).padEnd(15)}                              ║`);
        lines.push(`║     $${req.amount.toFixed(2).padStart(8)} : ${fromName.padEnd(10)} → ${toName.padEnd(10)}     ║`);
        lines.push(`║     Status: ${req.status.toUpperCase().padEnd(12)} Created: ${req.createdAt.toLocaleDateString()}    ║`);
        if (req.status === 'initiated' && req.initiatedAt) {
          lines.push(`║     ⏱️  In transit since ${req.initiatedAt.toLocaleDateString()}                     ║`);
        }
      }
    }

    // Show suggestion if no pending
    const suggestion = this.getRebalanceSuggestion();
    if (suggestion && pending.length === 0) {
      lines.push('╠══════════════════════════════════════════════════════════════╣');
      lines.push(`║  💡 SUGGESTION: Move $${suggestion.amount} from ${suggestion.from}       ║`);
      lines.push(`║     to ${suggestion.to}                                       ║`);
      lines.push(`║     Run: fundManager.checkAndCreateRebalance()              ║`);
    }

    lines.push('╚══════════════════════════════════════════════════════════════╝');
    return lines.join('\n');
  }

  private getDuration(start: Date, end: Date): string {
    const diff = end.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }
}

// Singleton instance for use across the app
export const fundManager = new ExtendedFundManager();




/**
 * EXIT LOGGER
 * Tracks all position closures with P&L
 * [STATUS: TESTED] - Production-ready exit logging
 */

import { saveTradeRecord, TradeRecord } from '../lib/supabase-memory';

export interface ExitLog {
  positionId: string;
  platform: 'coinbase' | 'kalshi';
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  exitTime: Date;
  duration: number; // milliseconds
  outcome: 'win' | 'loss' | 'breakeven';
}

export class ExitLogger {
  private exits: ExitLog[] = [];
  private readonly MAX_LOGS = 1000;

  /**
   * Log a position exit
   */
  async logExit(
    positionId: string,
    platform: 'coinbase' | 'kalshi',
    symbol: string,
    entryPrice: number,
    exitPrice: number,
    amount: number,
    entryTime: Date,
    fees: number = 0
  ): Promise<void> {
    const exitTime = new Date();
    const duration = exitTime.getTime() - entryTime.getTime();

    // Calculate P&L
    let pnl: number;
    let pnlPercent: number;

    if (platform === 'coinbase') {
      // For crypto: P&L = (exitPrice - entryPrice) / entryPrice * amount
      pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      pnl = (amount * pnlPercent) / 100 - fees;
    } else {
      // For Kalshi: P&L depends on outcome
      // Simplified: assume exit at market price
      const contracts = Math.floor((amount * 100) / entryPrice);
      const exitValue = (contracts * exitPrice) / 100;
      pnl = exitValue - amount - fees;
      pnlPercent = (pnl / amount) * 100;
    }

    const outcome: 'win' | 'loss' | 'breakeven' = pnl > 0.01 ? 'win' : pnl < -0.01 ? 'loss' : 'breakeven';

    const log: ExitLog = {
      positionId,
      platform,
      symbol,
      entryPrice,
      exitPrice,
      amount,
      pnl,
      pnlPercent,
      entryTime,
      exitTime,
      duration,
      outcome,
    };

    this.exits.push(log);
    if (this.exits.length > this.MAX_LOGS) {
      this.exits.shift();
    }

    // Save to Supabase
    try {
      await saveTradeRecord({
        platform,
        trade_type: 'close',
        symbol,
        entry_price: entryPrice,
        exit_price: exitPrice,
        amount,
        fees,
        opened_at: entryTime,
        closed_at: exitTime,
        pnl,
        pnl_percent: pnlPercent,
        outcome: outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'breakeven',
      } as TradeRecord);
    } catch (error: any) {
      console.error(`❌ Failed to log exit to Supabase: ${error.message}`);
    }

    // Console log
    const pnlColor = pnl >= 0 ? '\x1b[92m' : '\x1b[91m';
    const pnlSign = pnl >= 0 ? '+' : '';
    console.log(
      `   ${pnlColor}💰 EXIT: ${symbol} | ${pnlSign}$${pnl.toFixed(2)} (${pnlSign}${pnlPercent.toFixed(2)}%) | Duration: ${(duration / 1000 / 60).toFixed(1)}m\x1b[0m`
    );
  }

  /**
   * Get win rate
   */
  getWinRate(): { wins: number; losses: number; breakeven: number; winRate: number } {
    const wins = this.exits.filter(e => e.outcome === 'win').length;
    const losses = this.exits.filter(e => e.outcome === 'loss').length;
    const breakeven = this.exits.filter(e => e.outcome === 'breakeven').length;
    const total = wins + losses + breakeven;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return { wins, losses, breakeven, winRate };
  }

  /**
   * Get total P&L
   */
  getTotalPnL(): number {
    return this.exits.reduce((sum, e) => sum + e.pnl, 0);
  }

  /**
   * Get recent exits
   */
  getRecentExits(count: number = 10): ExitLog[] {
    return this.exits.slice(-count).reverse();
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.exits = [];
  }
}


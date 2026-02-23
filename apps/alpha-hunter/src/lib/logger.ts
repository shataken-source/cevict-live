/**
 * Trade Logger
 * Logs all trade executions to file with timestamps
 */

import * as fs from 'fs';
import * as path from 'path';

export class TradeLogger {
  private logFile: string;
  private enabled: boolean;

  constructor() {
    this.logFile = path.join(process.cwd(), process.env.LOG_FILE || 'trades.log');
    this.enabled = process.env.LOG_TRADES === 'true';
  }

  log(message: string) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
      fs.appendFileSync(this.logFile, logEntry, 'utf8');
    } catch (error) {
      console.error('[LOGGER] Failed to write to log file:', error);
    }
  }

  logTrade(trade: {
    action: 'BUY' | 'SELL';
    pair: string;
    amount: number;
    price: number;
    total: number;
    confidence: number;
    reason: string;
  }) {
    const message = `TRADE EXECUTED: ${trade.action} ${trade.amount.toFixed(8)} ${trade.pair} @ $${trade.price.toFixed(2)} | Total: $${trade.total.toFixed(2)} | Confidence: ${trade.confidence}% | Reason: ${trade.reason}`;
    this.log(message);
    console.log(`\n📝 ${message}`);
  }

  logTradeClose(trade: {
    pair: string;
    entryPrice: number;
    exitPrice: number;
    profit: number;
    profitPercent: number;
    duration: string;
  }) {
    const emoji = trade.profit >= 0 ? '✅' : '❌';
    const message = `TRADE CLOSED: ${trade.pair} | Entry: $${trade.entryPrice.toFixed(2)} → Exit: $${trade.exitPrice.toFixed(2)} | P&L: ${emoji} $${trade.profit.toFixed(2)} (${trade.profitPercent.toFixed(2)}%) | Duration: ${trade.duration}`;
    this.log(message);
    console.log(`\n📝 ${message}`);
  }

  logCycle(stats: {
    timestamp: string;
    usdcBalance: number;
    openTrades: number;
    sessionPnL: number;
    totalTrades: number;
  }) {
    const message = `CYCLE: Balance: $${stats.usdcBalance.toFixed(2)} | Open: ${stats.openTrades} | Session P&L: $${stats.sessionPnL.toFixed(2)} | Total Trades: ${stats.totalTrades}`;
    this.log(message);
  }

  logError(error: string) {
    const message = `ERROR: ${error}`;
    this.log(message);
    console.error(`\n❌ ${message}`);
  }

  getLogPath(): string {
    return this.logFile;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const tradeLogger = new TradeLogger();

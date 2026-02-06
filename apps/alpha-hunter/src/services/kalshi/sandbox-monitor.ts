/**
 * Kalshi Sandbox Monitor
 * 
 * Tracks performance metrics, statistics, and health status
 * for the sandbox autopilot system.
 */

import { getOpenTradeRecords, getTradeHistory } from "../../lib/supabase-memory";

export interface SandboxStats {
  timestamp: Date;
  openPositions: number;
  totalTrades: number;
  wins: number;
  losses: number;
  totalPnL: number;
  dailySpending: number;
  dailyLimit: number;
  avgConfidence: number;
  avgEdge: number;
  categories: {
    [category: string]: {
      trades: number;
      wins: number;
      pnl: number;
    };
  };
}

export class SandboxMonitor {
  private startTime: Date;
  private cycleCount: number = 0;
  private tradesPlaced: number = 0;
  private tradesBlocked: number = 0;
  private apiCalls: number = 0;
  private lastStats: SandboxStats | null = null;

  constructor() {
    this.startTime = new Date();
  }

  recordCycle() {
    this.cycleCount++;
  }

  recordTradePlaced() {
    this.tradesPlaced++;
  }

  recordTradeBlocked() {
    this.tradesBlocked++;
  }

  recordAPICall() {
    this.apiCalls++;
  }

  async getStats(): Promise<SandboxStats> {
    const openTrades = await getOpenTradeRecords("kalshi", 500);
    const recentTrades = await getTradeHistory("kalshi", 1000);

    const closedTrades = recentTrades.filter(t => t.outcome !== "open");
    const wins = closedTrades.filter(t => t.outcome === "win").length;
    const losses = closedTrades.filter(t => t.outcome === "loss").length;
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const dailyTrades = recentTrades.filter(t => {
      const tradeDate = new Date(t.opened_at);
      const today = new Date();
      return tradeDate.toDateString() === today.toDateString();
    });

    const dailySpending = dailyTrades.reduce((sum, t) => sum + (t.amount || 0), 0);

    const categories: { [key: string]: { trades: number; wins: number; pnl: number } } = {};
    for (const trade of closedTrades) {
      const cat = trade.bot_category || "unknown";
      if (!categories[cat]) {
        categories[cat] = { trades: 0, wins: 0, pnl: 0 };
      }
      categories[cat].trades++;
      if (trade.outcome === "win") categories[cat].wins++;
      categories[cat].pnl += trade.pnl || 0;
    }

    const avgConfidence = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + (t.confidence || 0), 0) / closedTrades.length
      : 0;

    const avgEdge = closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + (t.edge || 0), 0) / closedTrades.length
      : 0;

    const stats: SandboxStats = {
      timestamp: new Date(),
      openPositions: openTrades.length,
      totalTrades: closedTrades.length,
      wins,
      losses,
      totalPnL,
      dailySpending,
      dailyLimit: 50, // Default, should come from config
      avgConfidence,
      avgEdge,
      categories,
    };

    this.lastStats = stats;
    return stats;
  }

  printStats(): void {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000 / 60; // minutes
    console.log("\n" + "═".repeat(60));
    console.log("📊 SANDBOX STATISTICS");
    console.log("═".repeat(60));
    console.log(`⏱️  Uptime: ${uptime.toFixed(1)} minutes`);
    console.log(`🔄 Cycles: ${this.cycleCount}`);
    console.log(`💰 Trades Placed: ${this.tradesPlaced}`);
    console.log(`⏭️  Trades Blocked: ${this.tradesBlocked}`);
    console.log(`📡 API Calls: ${this.apiCalls} (${(this.apiCalls / Math.max(uptime, 1)).toFixed(1)}/min)`);
    
    if (this.lastStats) {
      console.log(`\n📈 Performance:`);
      console.log(`   Open Positions: ${this.lastStats.openPositions}`);
      console.log(`   Total Trades: ${this.lastStats.totalTrades}`);
      console.log(`   Wins: ${this.lastStats.wins} | Losses: ${this.lastStats.losses}`);
      const winRate = this.lastStats.totalTrades > 0
        ? (this.lastStats.wins / this.lastStats.totalTrades * 100).toFixed(1)
        : "0.0";
      console.log(`   Win Rate: ${winRate}%`);
      console.log(`   Total P&L: $${this.lastStats.totalPnL.toFixed(2)}`);
      console.log(`   Daily Spending: $${this.lastStats.dailySpending.toFixed(2)} / $${this.lastStats.dailyLimit}`);
      console.log(`   Avg Confidence: ${this.lastStats.avgConfidence.toFixed(1)}%`);
      console.log(`   Avg Edge: ${this.lastStats.avgEdge.toFixed(2)}%`);

      if (Object.keys(this.lastStats.categories).length > 0) {
        console.log(`\n📂 By Category:`);
        for (const [cat, data] of Object.entries(this.lastStats.categories)) {
          const catWinRate = data.trades > 0 ? (data.wins / data.trades * 100).toFixed(1) : "0.0";
          console.log(`   ${cat}: ${data.trades} trades, ${catWinRate}% win rate, $${data.pnl.toFixed(2)} P&L`);
        }
      }
    }
    console.log("═".repeat(60) + "\n");
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const uptime = (Date.now() - this.startTime.getTime()) / 1000 / 60;
    const apiRate = this.apiCalls / Math.max(uptime, 1);

    if (apiRate > 15) {
      warnings.push(`High API call rate: ${apiRate.toFixed(1)}/min (target: <10/min)`);
    }

    if (this.tradesBlocked > this.tradesPlaced * 2) {
      warnings.push(`Many trades blocked: ${this.tradesBlocked} vs ${this.tradesPlaced} placed`);
    }

    if (uptime < 5) {
      warnings.push("System just started - metrics may be incomplete");
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    };
  }
}

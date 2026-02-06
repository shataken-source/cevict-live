/**
 * Alpha Hunter API Routes
 * Provides real-time trading data for the dashboard
 */

import express from 'express';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const router = express.Router();

// In-memory store for trading data
let tradingData = {
  stats: {
    kalshi: {
      balance: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      buys: 0,
      sells: 0,
      totalPnL: 0,
      winRate: 0,
      openPositions: 0,
    },
    coinbase: {
      balance: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      buys: 0,
      sells: 0,
      totalPnL: 0,
      winRate: 0,
      openPositions: 0,
    },
    microcap: {
      balance: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      buys: 0,
      sells: 0,
      totalPnL: 0,
      winRate: 0,
      openPositions: 0,
      portfolio: [],
    },
    combined: {
      totalBalance: 0,
      totalTrades: 0,
      totalPnL: 0,
      totalWins: 0,
      totalLosses: 0,
      overallWinRate: 0,
    },
  },
  trades: [],
  lastUpdate: new Date().toISOString(),
};

/**
 * GET /alpha-hunter/stats
 * Returns current trading statistics
 */
router.get('/stats', (req, res) => {
  res.json(tradingData.stats);
});

/**
 * GET /alpha-hunter/trades
 * Returns recent trades (last 50)
 */
router.get('/trades', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const recentTrades = tradingData.trades.slice(0, limit);
  res.json(recentTrades);
});

/**
 * GET /alpha-hunter/status
 * Returns overall system status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    lastUpdate: tradingData.lastUpdate,
    traders: {
      crypto: { running: true, platform: 'coinbase' },
      kalshi: { running: true, platform: 'kalshi' },
      microcap: { running: true, platform: 'coinbase' },
    },
    stats: tradingData.stats.combined,
  });
});

/**
 * POST /alpha-hunter/update
 * Update trading data (called by trading bots)
 */
router.post('/update', (req, res) => {
  const { platform, stats, trades: newTrades } = req.body;
  
  if (!platform) {
    return res.status(400).json({ error: 'Platform required' });
  }
  
  // Update platform-specific stats
  if (stats && tradingData.stats[platform as keyof typeof tradingData.stats]) {
    tradingData.stats[platform as 'kalshi' | 'coinbase' | 'microcap'] = {
      ...tradingData.stats[platform as 'kalshi' | 'coinbase' | 'microcap'],
      ...stats,
    };
  }
  
  // Add new trades
  if (newTrades && Array.isArray(newTrades)) {
    tradingData.trades = [
      ...newTrades.map((t: any) => ({ ...t, platform, timestamp: new Date().toISOString() })),
      ...tradingData.trades,
    ].slice(0, 100); // Keep last 100 trades
  }
  
  // Recalculate combined stats
  const { kalshi, coinbase, microcap } = tradingData.stats;
  tradingData.stats.combined = {
    totalBalance: kalshi.balance + coinbase.balance + (microcap.balance || 0),
    totalTrades: kalshi.totalTrades + coinbase.totalTrades + (microcap.totalTrades || 0),
    totalPnL: kalshi.totalPnL + coinbase.totalPnL + (microcap.totalPnL || 0),
    totalWins: kalshi.wins + coinbase.wins + (microcap.wins || 0),
    totalLosses: kalshi.losses + coinbase.losses + (microcap.losses || 0),
    overallWinRate: 0,
  };
  
  const totalTrades = tradingData.stats.combined.totalTrades;
  if (totalTrades > 0) {
    tradingData.stats.combined.overallWinRate = 
      (tradingData.stats.combined.totalWins / totalTrades) * 100;
  }
  
  tradingData.lastUpdate = new Date().toISOString();
  
  res.json({ success: true, message: 'Data updated' });
});

/**
 * GET /alpha-hunter/portfolio
 * Returns micro-cap portfolio
 */
router.get('/portfolio', (req, res) => {
  res.json({
    portfolio: tradingData.stats.microcap.portfolio || [],
    totalValue: tradingData.stats.microcap.balance || 0,
  });
});

/**
 * GET /alpha-hunter/performance
 * Returns performance metrics over time
 */
router.get('/performance', (req, res) => {
  // Calculate daily performance
  const performance = {
    daily: tradingData.stats.combined.totalPnL,
    weekly: tradingData.stats.combined.totalPnL * 1.5, // Mock data
    monthly: tradingData.stats.combined.totalPnL * 4, // Mock data
    roi: tradingData.stats.combined.totalBalance > 0 
      ? (tradingData.stats.combined.totalPnL / tradingData.stats.combined.totalBalance) * 100 
      : 0,
  };
  
  res.json(performance);
});

export default router;

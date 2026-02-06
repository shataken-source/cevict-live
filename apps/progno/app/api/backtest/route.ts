/**
 * Backtesting API Endpoint
 * POST /api/backtest/run - Run backtest on historical data
 */

import { NextRequest, NextResponse } from 'next/server';
import { BacktestEngine, BacktestConfig } from '../../../lib/backtesting/backtest-engine';

export const runtime = 'nodejs';

/**
 * POST /api/backtest/run
 * Run backtest
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { games, config } = body;

    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { success: false, error: 'games array required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'config required' },
        { status: 400 }
      );
    }

    // Validate config
    const backtestConfig: BacktestConfig = {
      startDate: new Date(config.startDate || '2023-01-01'),
      endDate: new Date(config.endDate || '2024-12-31'),
      leagues: config.leagues || ['NFL'],
      useClaudeEffect: config.useClaudeEffect !== false,
      bankroll: config.bankroll || 10000,
      betSize: config.betSize || 'kelly',
      minConfidence: config.minConfidence || 0.6,
      minEdge: config.minEdge || 0.02,
    };

    // Run backtest
    const engine = new BacktestEngine();
    const result = await engine.runBacktest(games, backtestConfig);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Backtest API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Backtest failed' },
      { status: 500 }
    );
  }
}


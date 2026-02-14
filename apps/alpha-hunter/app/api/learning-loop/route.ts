/**
 * Kalshi Learning Loop Dashboard API
 * GET /api/alpha-hunter/learning-loop
 * Returns calibration stats, recent trades, and performance metrics
 */

import { NextResponse } from 'next/server';
import { getAllKalshiCalibrations, getRecentKalshiTrades } from '../../../src/services/kalshi/learning-loop';

export async function GET() {
  try {
    const [calibrations, recentTrades] = await Promise.all([
      getAllKalshiCalibrations(),
      getRecentKalshiTrades(undefined, 100),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        calibrations,
        recentTrades: recentTrades.slice(0, 20), // Latest 20 for display
        summary: {
          totalCategories: calibrations.length,
          calibratedCategories: calibrations.filter(c => c.is_calibrated).length,
          totalTrades: calibrations.reduce((sum, c) => sum + c.total_trades, 0),
          settledTrades: calibrations.reduce((sum, c) => sum + c.settled_trades, 0),
          totalPnl: calibrations.reduce((sum, c) => sum + c.total_pnl, 0),
          avgWinRate: calibrations.length > 0
            ? calibrations.reduce((sum, c) => sum + c.win_rate, 0) / calibrations.length
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching learning loop data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch learning loop data',
    }, { status: 500 });
  }
}

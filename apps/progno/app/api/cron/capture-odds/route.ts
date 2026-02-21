/**
 * Live Odds Capture Cron Job
 * GET /api/cron/capture-odds
 * Runs every 15-30 minutes to capture odds and detect RLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureAllOdds } from '@/app/lib/live-odds-dashboard';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const oddsApiKey = process.env.ODDS_API_KEY;
    if (!oddsApiKey) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured',
      }, { status: 500 });
    }

    const captured = await captureAllOdds(oddsApiKey);

    return NextResponse.json({
      success: true,
      data: {
        gamesCaptured: captured,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

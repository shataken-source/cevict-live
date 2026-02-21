/**
 * Live Odds Dashboard API
 * GET /api/progno/live-odds/alerts
 * Returns recent sharp money alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentAlerts } from '@/app/lib/live-odds-dashboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24');
    const limit = parseInt(searchParams.get('limit') || '50');

    const alerts = await getRecentAlerts(hoursBack, limit);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        summary: {
          total: alerts.length,
          rlm: alerts.filter(a => a.is_reverse_line_movement).length,
          lineFreeze: alerts.filter(a => a.is_line_freeze).length,
          avgConfidence: alerts.length > 0
            ? alerts.reduce((sum, a) => sum + a.confidence_score, 0) / alerts.length
            : 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

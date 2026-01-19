/**
 * Weekly Learning Cycle Endpoint
 * Should be called via cron job every week
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine } from '../../../lib/prediction-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger');
    const auth = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    // Security: Only allow cron triggers or admin with auth token
    const cronSecret = process.env.CRON_SECRET;
    const isCron = isVercelCron || trigger === 'cron' || (auth && auth === `Bearer ${cronSecret}`);

    if (!isCron && trigger !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Use ?trigger=cron with auth header or ?trigger=admin' },
        { status: 401 }
      );
    }

    console.log('[PROGNO] Starting weekly learning cycle...');

    // Run weekly learning cycle
    await predictionEngine.weeklyLearningCycle();

    // Get updated weights and performance
    const weights = Object.fromEntries(predictionEngine.getMethodWeights());
    const performance = Object.fromEntries(
      Array.from(predictionEngine.getMethodPerformance().entries()).map(([key, value]) => [
        key,
        {
          winRate: value.total > 0 ? (value.correct / value.total) * 100 : 0,
          total: value.total,
          correct: value.correct,
          avgAccuracy: value.avgAccuracy * 100
        }
      ])
    );

    console.log('[PROGNO] Weekly learning cycle completed');

    return NextResponse.json({
      success: true,
      message: 'Weekly learning cycle completed',
      methodWeights: weights,
      methodPerformance: performance,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[PROGNO] Weekly learning cycle error:', error);
    return NextResponse.json(
      {
        error: 'Learning cycle failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}


/**
 * Cursor Bot Background Worker
 * 
 * Runs the autonomous bot in the background
 * Can be triggered by cron jobs or manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutonomousBot } from '../../../lib/autonomous-cursor-bot';

export const runtime = 'nodejs';

// GET - Run a single cycle (for cron jobs)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow if no secret is set (development) or if secret matches
      if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const bot = getAutonomousBot();
    const cycle = await bot.runCycle();

    return NextResponse.json({
      success: true,
      message: 'Cycle completed',
      data: {
        cycleId: cycle.id,
        predictionsMade: cycle.predictionsMade,
        gamesAnalyzed: cycle.gamesAnalyzed,
        performance: cycle.performance,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Cursor Bot Worker] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to run cycle',
    }, { status: 500 });
  }
}

// POST - Start/stop background worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, intervalMinutes } = body;

    const bot = getAutonomousBot();

    if (action === 'start') {
      await bot.start(intervalMinutes || 60);
      return NextResponse.json({
        success: true,
        message: 'Background worker started',
        data: bot.getState(),
      });
    } else if (action === 'stop') {
      bot.stop();
      return NextResponse.json({
        success: true,
        message: 'Background worker stopped',
        data: bot.getState(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Cursor Bot Worker] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to process request',
    }, { status: 500 });
  }
}


/**
 * Bot Academy Training Endpoint
 * Runs weekly training curriculum for the autonomous bot
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAutonomousBot } from '../../../lib/autonomous-cursor-bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Run academy training (for cron jobs)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bot = getAutonomousBot();
    await (bot as any).runBotAcademyTraining();

    return NextResponse.json({
      success: true,
      message: 'Bot Academy training completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Bot Academy] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to run academy training',
    }, { status: 500 });
  }
}


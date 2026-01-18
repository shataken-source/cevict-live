/**
 * API endpoint to trigger the daily bot
 * 
 * This endpoint can be called by cron jobs, webhooks, or scheduled tasks
 * to run the daily bot that updates laws and maintains the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { DailyBot } from '@/lib/bot/dailyBot';

// Authentication key for security (should be set in environment)
const BOT_API_KEY = process.env.BOT_API_KEY || '';

function isVercelCron(request: NextRequest): boolean {
  // Vercel Cron sets this header on scheduled invocations
  return request.headers.get('x-vercel-cron') === '1';
}

function isAuthorized(request: NextRequest): boolean {
  if (isVercelCron(request)) return true;
  if (!BOT_API_KEY) return false;
  const authHeader = request.headers.get('Authorization') || '';
  const providedKey = authHeader.replace('Bearer ', '');
  return providedKey === BOT_API_KEY;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for configuration
    const body = await request.json().catch(() => ({}));
    const config = body.config || {};

    // Initialize and run the daily bot
    const bot = new DailyBot(config);
    const result = await bot.runDaily();

    // Return the result
    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      duration: result.duration,
      results: result.results,
      errors: result.errors,
      summary: {
        totalUpdated: Object.values(result.results).reduce((sum: number, result: any) => {
          return sum + (result?.updated || result?.new || result?.sent || 0);
        }, 0),
        errorsCount: result.errors.length
      }
    });

  } catch (error) {
    console.error('Bot API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Cron should run the bot via GET
    if (isVercelCron(request)) {
      const bot = new DailyBot();
      const result = await bot.runDaily();
      return NextResponse.json({
        success: result.success,
        timestamp: result.timestamp,
        duration: result.duration,
        results: result.results,
        errors: result.errors,
      });
    }

    // Otherwise, authenticated status endpoint
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bot = new DailyBot();
    return NextResponse.json(await bot.getStatus());

  } catch (error) {
    console.error('Bot status API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

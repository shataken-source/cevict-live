/**
 * API endpoint to trigger the daily bot
 * 
 * This endpoint can be called by cron jobs, webhooks, or scheduled tasks
 * to run the daily bot that updates laws and maintains the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { DailyBot } from '@/lib/bot/dailyBot';

// Authentication key for security (should be set in environment)
const BOT_API_KEY = process.env.BOT_API_KEY || 'your-secret-bot-key';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (providedKey !== BOT_API_KEY) {
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
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (providedKey !== BOT_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get bot status
    const bot = new DailyBot();
    const status = await bot.getStatus();

    return NextResponse.json(status);

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

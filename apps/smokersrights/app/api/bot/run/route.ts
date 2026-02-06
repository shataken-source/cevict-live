import { NextRequest, NextResponse } from 'next/server';
import { LawUpdateService } from '@/lib/bot/lawUpdateService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API endpoint to run daily law updates
 * Can be called by cron jobs or scheduled tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.BOT_SECRET_TOKEN || 'smokersrights-bot-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const lawUpdateService = new LawUpdateService();
    const result = await lawUpdateService.updateLawDates();

    return NextResponse.json({
      success: result.errors.length === 0,
      result: {
        totalChecked: result.totalChecked,
        updated: result.updated,
        errors: result.errors,
        timestamp: result.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Bot run error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run law updates',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
  try {
    const lawUpdateService = new LawUpdateService();
    const result = await lawUpdateService.updateLawDates();

    return NextResponse.json({
      success: result.errors.length === 0,
      result: {
        totalChecked: result.totalChecked,
        updated: result.updated,
        errors: result.errors,
        timestamp: result.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Bot run error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run law updates',
      },
      { status: 500 }
    );
  }
}

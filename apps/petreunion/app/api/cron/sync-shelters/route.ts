/**
 * Shelter Sync Cron Job
 * GET /api/cron/sync-shelters
 * Runs nightly to sync all active shelter integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllActiveShelters } from '@/lib/shelter-api-integration';

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

    const result = await syncAllActiveShelters();

    return NextResponse.json({
      success: true,
      data: {
        totalPetsSynced: result.totalSynced,
        sheltersProcessed: result.shelterCount,
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

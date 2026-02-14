/**
 * GET /api/progno/portfolio/[id]/snapshots - Get daily snapshots for performance chart
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioDailySnapshots } from '@/lib/pick-portfolio';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing portfolio id' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '30');

    const snapshots = await getPortfolioDailySnapshots(id, daysBack);

    return NextResponse.json({
      success: true,
      data: snapshots,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

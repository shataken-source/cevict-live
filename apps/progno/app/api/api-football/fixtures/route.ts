import { NextRequest, NextResponse } from 'next/server';
import { getFixtures, getTodayFixtures } from '../../../../enhancements/api-football';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const league = searchParams.get('league');
    const team = searchParams.get('team');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const season = searchParams.get('season');
    const status = searchParams.get('status') as any;

    // If no params, get today's fixtures
    if (!date && !league && !team && !from && !to) {
      const fixtures = await getTodayFixtures(league ? parseInt(league) : undefined);
      return NextResponse.json({ success: true, fixtures });
    }

    const fixtures = await getFixtures({
      ...(date && { date }),
      ...(league && { league: parseInt(league) }),
      ...(team && { team: parseInt(team) }),
      ...(from && { from }),
      ...(to && { to }),
      ...(season && { season: parseInt(season) }),
      ...(status && { status }),
    });

    return NextResponse.json({ success: true, fixtures });
  } catch (error: any) {
    console.error('[API-Football] Fixtures error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}


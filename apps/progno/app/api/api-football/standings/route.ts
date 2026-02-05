import { NextRequest, NextResponse } from 'next/server';
import { getStandings } from '../../../../enhancements/api-football';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const league = searchParams.get('league');
    const season = searchParams.get('season');

    if (!league || !season) {
      return NextResponse.json(
        { success: false, error: 'league and season parameters are required' },
        { status: 400 }
      );
    }

    const standings = await getStandings({
      league: parseInt(league),
      season: parseInt(season),
    });

    return NextResponse.json({ success: true, standings });
  } catch (error: any) {
    console.error('[API-Football] Standings error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}


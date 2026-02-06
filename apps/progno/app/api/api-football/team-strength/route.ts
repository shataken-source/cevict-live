import { NextRequest, NextResponse } from 'next/server';
import { calculateTeamStrength } from '../../../../enhancements/api-football';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get('team');
    const league = searchParams.get('league');
    const season = searchParams.get('season');

    if (!team || !league || !season) {
      return NextResponse.json(
        { success: false, error: 'team, league, and season parameters are required' },
        { status: 400 }
      );
    }

    const strength = await calculateTeamStrength({
      team: parseInt(team),
      league: parseInt(league),
      season: parseInt(season),
    });

    return NextResponse.json({ success: true, strength });
  } catch (error: any) {
    console.error('[API-Football] Team strength error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate team strength' },
      { status: 500 }
    );
  }
}


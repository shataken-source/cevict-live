import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine, GameData } from '@/app/lib/prediction-engine';

export const runtime = 'nodejs';

function validateBody(body: any) {
  const errors: string[] = [];

  if (!body) {
    errors.push('Request body is required');
    return { valid: false, errors };
  }

  if (!body.homeTeam || typeof body.homeTeam !== 'string') {
    errors.push('homeTeam (string) is required');
  }
  if (!body.awayTeam || typeof body.awayTeam !== 'string') {
    errors.push('awayTeam (string) is required');
  }
  if (!body.league && !body.sport) {
    errors.push('league or sport is required');
  }

  const odds = body.odds || {};
  if (odds.home == null || odds.away == null) {
    errors.push('odds.home and odds.away moneylines are required');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { valid, errors } = validateBody(body);

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: errors,
        },
        { status: 400 }
      );
    }

    const sport: string = body.league || body.sport;
    const now = new Date();

    const game: GameData = {
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      league: sport,
      sport,
      date: body.date ? new Date(body.date).toISOString() : now.toISOString(),
      venue: body.venue || 'Unknown',
      odds: {
        home: Number(body.odds?.home),
        away: Number(body.odds?.away),
        spread: body.odds?.spread != null ? Number(body.odds.spread) : body.line != null ? Number(body.line) : undefined,
        total: body.odds?.total != null ? Number(body.odds.total) : undefined,
      },
      weather: body.weather ? {
        temperature: Number(body.weather.temperature ?? 70),
        conditions: String(body.weather.conditions ?? 'Clear'),
        windSpeed: Number(body.weather.windSpeed ?? 5),
      } : undefined,
      injuries: body.injuries ? {
        homeImpact: body.injuries.homeImpact != null ? Number(body.injuries.homeImpact) : undefined,
        awayImpact: body.injuries.awayImpact != null ? Number(body.injuries.awayImpact) : undefined,
      } : undefined,
    };

    const prediction = await predictionEngine.predict(game);

    return NextResponse.json({
      success: true,
      model: 'progno-weekly-analyzer-enriched',
      league: sport,
      prediction,
      dataSources: {
        teamStats: process.env.SPORTSDATAIO_API_KEY ? 'SportsDataIO API' : 'Historical data',
        injuries: process.env.ROTOWIRE_API_KEY ? 'Rotowire API' : 'File-based',
        odds: 'The Odds API',
        historical: 'Historical results database',
        lineMovement: 'Line movement tracker'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[PROGNO] /api/progno/sports/game error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}



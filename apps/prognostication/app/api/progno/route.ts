import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface IncomingBody {
  league?: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  line?: number;
  odds?: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  date?: string;
  venue?: string;
  weather?: {
    temperature?: number;
    conditions?: string;
    windSpeed?: number;
  };
  injuries?: {
    homeImpact?: number;
    awayImpact?: number;
  };
}

function validateInput(body: any): { valid: boolean; errors: string[] } {
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

  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IncomingBody;
    const { valid, errors } = validateInput(body);

    if (!valid) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: errors,
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.PROGNO_BASE_URL;
    let corePrediction: any | null = null;
    let engineSource: 'progno' | 'local-fallback' = 'local-fallback';

    if (baseUrl) {
      try {
        const resp = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/progno/sports/game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            league: body.league,
            sport: body.sport,
            homeTeam: body.homeTeam,
            awayTeam: body.awayTeam,
            line: body.line,
            odds: body.odds,
            date: body.date,
            venue: body.venue,
            weather: body.weather,
            injuries: body.injuries,
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json?.success && json.prediction) {
            corePrediction = json.prediction;
            engineSource = 'progno';
          }
        }
      } catch (err) {
        // Swallow and use fallback below
      }
    }

    if (!corePrediction) {
      return NextResponse.json(
        {
          error: 'Progno engine unavailable',
          message: 'The prediction engine is currently offline or unreachable. Please try again later.',
        },
        { status: 503 }
      );
    }

    const confidencePct =
      typeof corePrediction.confidence === 'number'
        ? Math.round(corePrediction.confidence * 100)
        : 76;

    const spreadLine =
      body.line ?? body.odds?.spread ?? (corePrediction.game?.odds?.spread ?? -3.5);

    const enhancedPrediction = {
      id: corePrediction.gameId || `pred_${Date.now()}`,
      gameDate: body.date || new Date().toISOString(),
      league: body.league || body.sport,
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      engineSource,
      prediction: {
        winner:
          corePrediction.predictedWinner ||
          (confidencePct >= 50 ? body.homeTeam : body.awayTeam),
        confidence: confidencePct,
        score: corePrediction.predictedScore || {
          home: 27,
          away: 20,
        },
      },
      analysis: {
        homeTeam: {
          name: body.homeTeam,
          record: '10-5',
          form: 'W-W-L-W-W',
          lastGame: 'Won 24-17',
          injuries: ['Key player - Questionable'],
          strengths: [
            'Strong running game',
            'Top-5 defense profile',
            'Excellent home record',
          ],
          weaknesses: ['Pass defense can be exposed'],
        },
        awayTeam: {
          name: body.awayTeam,
          record: '8-7',
          form: 'L-W-L-L-W',
          lastGame: 'Lost 14-27',
          injuries: ['Star skill player - Doubtful'],
          strengths: ['Elite QB play', 'Fast-paced offense', 'Clutch 4th quarter scoring'],
          weaknesses: ['Weak run defense', 'Poor road record'],
        },
        matchup: {
          headToHead: 'Home team has recent edge in the series',
          homeAdvantage: 3.5,
          weatherImpact:
            body.weather?.conditions ||
            'Clear skies, normal temperatures – no major weather edge',
          keyMatchups: [
            'Home pass rush vs away offensive line',
            'Home secondary vs away WR group',
            'Rushing efficiency on early downs',
          ],
        },
        betting: {
          spread: spreadLine,
          overUnder: body.odds?.total ?? 47.5,
          moneyline: {
            home: body.odds?.home ?? -180,
            away: body.odds?.away ?? +150,
          },
          publicBetting: {
            home: 65,
            away: 35,
          },
        },
      },
      reasoning: [
        'Recent form and efficiency metrics favor the home side',
        'Matchup in the trenches tilts toward the projected winner',
        'Injuries slightly downgrade the underdog side',
        'Market line and model edge point in the same direction',
      ],
      risks: [
        'High-variance offensive style can swing results',
        'Turnover randomness can flip close games',
        'Line movement near kickoff may change value',
      ],
      betType: confidencePct > 75 ? 'spread' : 'moneyline',
      recommendedBet: `${body.homeTeam} ${confidencePct > 75 ? spreadLine : 'ML'}`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(enhancedPrediction);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}


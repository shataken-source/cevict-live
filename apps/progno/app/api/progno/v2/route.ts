// app/api/progno/v2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OddsService } from '@/lib/odds-service';
import { getDisclaimer } from '@/lib/legal-disclaimers';
import { getSingleGamePick } from '@/app/api/picks/today/route';

const API_VERSION = '2.0.0';
const API_NAME = 'Cevict Flux v2.0';

const SPORT_TO_ODDS_KEY: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
  ncaaf: 'americanfootball_ncaaf',
  cfb: 'americanfootball_ncaaf',
  ncaab: 'basketball_ncaab',
  cbb: 'baseball_ncaa',
};

function toOddsApiSportKey(sport: string): string {
  const key = SPORT_TO_ODDS_KEY[sport?.toLowerCase()];
  return key || sport;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function handleError(error: any): NextResponse {
  console.error('API Error:', error);
  return NextResponse.json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: error.message || 'An unexpected error occurred' },
  }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const url = request.url;
  const { searchParams } = new URL(url);
  const action = searchParams.get('action') || 'info';
  const gameId = searchParams.get('gameId');

  console.log(`[ROUTE v2] Incoming request - ID: ${requestId} | Action: ${action} | GameID: ${gameId || 'none'} | URL: ${url}`);

  try {
    let response: NextResponse;

    switch (action) {
      case 'health':
        console.log(`[ROUTE v2] Handling health check`);
        response = NextResponse.json({
          success: true,
          data: { status: 'healthy', version: API_VERSION, timestamp: new Date().toISOString() }
        });
        break;

      case 'info':
        console.log(`[ROUTE v2] Handling info`);
        response = NextResponse.json({
          success: true,
          data: { name: API_NAME, version: API_VERSION, supportedSports: ['nfl', 'nba', 'mlb', 'nhl', 'ncaab', 'cfb'] }
        });
        break;

      case 'games':
        const sport = searchParams.get('sport');
        const date = searchParams.get('date');
        console.log(`[ROUTE v2] Fetching games - sport: ${sport || 'all'}, date: ${date || 'today'}`);
        const games = await OddsService.getGames({ sport: sport || undefined, date: date || undefined });
        console.log(`[ROUTE v2] Games fetched: ${games?.length || 0} events`);
        response = NextResponse.json({ success: true, data: games });
        break;

      case 'prediction': {
        if (!gameId) {
          console.log(`[PREDICTION] ❌ Missing gameId - returning 400`);
          response = NextResponse.json({ success: false, error: { message: 'gameId required' } }, { status: 400 });
          break;
        }
        // Optional sport hint to avoid fetching all 6 sports (e.g. sport=basketball_nba or sport=nba)
        const sportParam = searchParams.get('sport');
        const sportHint = sportParam ? toOddsApiSportKey(sportParam) : undefined;
        console.log(`[PREDICTION] 🔍 Cevict Flex single-game for gameId: ${gameId}${sportHint ? `, sport: ${sportHint}` : ''}`);
        const pick = await getSingleGamePick(gameId, sportHint);
        if (!pick) {
          console.log(`[PREDICTION] ❌ Game not found or no odds for ${gameId} - returning 404`);
          response = NextResponse.json({ success: false, error: { message: 'Game not found' } }, { status: 404 });
          break;
        }
        // Map Cevict Flex pick to v2 response shape (same as previous predictGameWithEnrichment contract)
        const r2 = (n: number) => Math.round((n ?? 0) * 100) / 100;
        const r4 = (n: number) => Math.round((n ?? 0) * 10000) / 10000;
        const prediction = {
          winner: pick.pick,
          confidence: r2(pick.confidence / 100),
          score: pick.mc_predicted_score ? { home: pick.mc_predicted_score.home, away: pick.mc_predicted_score.away } : { home: 0, away: 0 },
          edge: r2(pick.value_bet_edge ?? 0),
          keyFactors: Array.isArray(pick.reasoning) ? pick.reasoning : [pick.analysis].filter(Boolean),
          claudeEffect: {
            sentimentField: r4(pick.sentiment_field),
            narrativeMomentum: r4(pick.narrative_momentum),
            informationAsymmetry: r4(pick.information_asymmetry),
            chaosSensitivity: r4(pick.chaos_sensitivity),
            networkInfluence: r4(pick.news_impact),
            temporalDecay: r4(pick.temporal_decay),
            emergentPattern: r4(pick.external_pressure),
          },
          engine: 'cevict_flex',
          pick_type: pick.pick_type,
          odds: pick.odds,
          analysis: pick.analysis,
        };
        console.log(`[PREDICTION] ✅ Cevict Flex - returning prediction for ${gameId}`);
        response = NextResponse.json({
          success: true,
          data: prediction,
          disclaimer: getDisclaimer('prediction'),
        });
        break;
      }

      case 'live-scores':
        const liveSport = searchParams.get('sport') || 'nhl';
        console.log(`[ROUTE v2] Fetching live scores - sport: ${liveSport}`);
        const liveData = await OddsService.getLiveScores(liveSport);
        console.log(`[ROUTE v2] Live scores fetched: ${liveData?.length || 0} events`);
        response = NextResponse.json({ success: true, data: liveData });
        break;

      default:
        console.log(`[ROUTE v2] Unknown action: ${action}`);
        response = NextResponse.json({
          success: true,
          data: { name: API_NAME, version: API_VERSION, message: 'Use ?action=games or ?action=prediction' }
        });
    }

    const duration = Date.now() - startTime;
    console.log(`[AUDIT] ${action} completed in ${duration}ms | ID: ${requestId}`);

    return response;
  } catch (error: any) {
    console.error(`[ERROR] ${action} failed | ID: ${requestId} |`, error);
    return handleError(error);
  }
}

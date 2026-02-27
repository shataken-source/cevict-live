import { NextRequest, NextResponse } from 'next/server';
import { getPrimaryKey } from '../../../keys-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPORT_KEY_MAP: Record<string, string> = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'NCAAF': 'americanfootball_ncaaf',
  'NCAAB': 'basketball_ncaab'
};

// In-memory cache: 10-minute TTL to avoid burning API quota
const CACHE_TTL = 10 * 60 * 1000;
const oddsCache: Map<string, { data: any; ts: number }> = new Map();

export async function GET(request: NextRequest) {
  try {
    // Get API key from keys store (which checks env vars first, then stored keys)
    const oddsApiKey = getPrimaryKey();

    if (!oddsApiKey) {
      return NextResponse.json(
        {
          error: 'ODDS_API_KEY not configured. Please set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY in environment variables, or add it via the admin panel.',
          details: 'The Odds API key is required to fetch live sports betting odds. Get a free key at https://the-odds-api.com/'
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!sport) {
      return NextResponse.json(
        { error: 'Sport parameter is required (e.g., ?sport=americanfootball_nfl)' },
        { status: 400 }
      );
    }

    // Check in-memory cache first
    const cacheKey = `${sport}_${dateFrom || ''}_${dateTo || ''}`;
    const cached = oddsCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      console.log(`[Odds API] Cache hit for ${sport} (${Math.round((Date.now() - cached.ts) / 1000)}s old)`);
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', 'X-Cache': 'HIT' }
      });
    }

    // Build URL
    let url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;

    // Add date filters if provided
    if (dateFrom) {
      url += `&dateFrom=${dateFrom}`;
    }
    if (dateTo) {
      url += `&dateTo=${dateTo}`;
    }

    // Fetch from The Odds API
    const response = await fetch(url, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.message || errorData.error || '';
      } catch {
        errorDetails = response.statusText;
      }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Invalid or expired API key. Please check your ODDS_API_KEY.' },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: `Odds API error (${response.status}): ${errorDetails || 'Unknown error'}` },
          { status: response.status }
        );
      }
    }

    const games = await response.json();
    const remaining = response.headers.get('x-requests-remaining');
    console.log(`[Odds API] Fresh fetch for ${sport}: ${Array.isArray(games) ? games.length : '?'} games (remaining: ${remaining || '?'})`);

    // Store in cache
    oddsCache.set(cacheKey, { data: games, ts: Date.now() });

    return NextResponse.json(games, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'MISS'
      }
    });

  } catch (error: any) {
    console.error('Error fetching odds:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch odds' },
      { status: 500 }
    );
  }
}


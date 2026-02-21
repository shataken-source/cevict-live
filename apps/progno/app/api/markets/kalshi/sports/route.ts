/**
 * Kalshi Sports Markets API
 * Returns sports probability picks for Kalshi markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { KalshiClient } from '@/lib/markets/kalshi-client';
import { SportsProbabilityEngine, SportsMarket } from '@/lib/markets/sports-probability-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minEdge = parseFloat(searchParams.get('minEdge') || '0.05');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '60');

    const kalshiClient = new KalshiClient();
    const probabilityEngine = new SportsProbabilityEngine();

    // Check if Kalshi is configured
    if (!kalshiClient.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'KALSHI_NOT_CONFIGURED',
        message: 'Kalshi API credentials not configured. Set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY.',
      }, { status: 503 });
    }

    // Fetch sports markets
    const markets = await kalshiClient.getSportsMarkets(limit * 2, 'open'); // Get more to filter

    if (markets.length === 0) {
      return NextResponse.json({
        success: true,
        picks: [],
        message: 'No open sports markets found on Kalshi',
        timestamp: new Date().toISOString(),
      });
    }

    // Convert to SportsMarket format and calculate probabilities
    const picks = [];
    for (const market of markets.slice(0, limit * 2)) {
      try {
        // Extract sport and teams from market title
        const sportInfo = extractSportInfo(market);

        const sportsMarket: SportsMarket = {
          id: market.ticker,
          platform: 'kalshi',
          question: market.title,
          description: market.subtitle,
          sport: sportInfo.sport,
          league: sportInfo.league,
          teams: sportInfo.teams,
          eventType: determineEventType(market.title),
          eventDate: market.expiry_time,
          marketData: market,
        };

        // Calculate probability
        const prediction = await probabilityEngine.calculateProbability(sportsMarket);

        // Filter by criteria
        if (
          Math.abs(prediction.edge) >= minEdge &&
          prediction.confidence >= minConfidence &&
          prediction.recommendation !== 'PASS'
        ) {
          picks.push({
            ...prediction,
            kalshiTicker: market.ticker,
            kalshiUrl: `https://kalshi.com/markets/${market.event_ticker}/${market.ticker}`,
            marketInfo: {
              volume: market.volume,
              openInterest: market.open_interest,
              lastPrice: market.last_price,
              spread: prediction.marketProbability - (1 - prediction.marketProbability),
            },
          });
        }
      } catch (error: any) {
        console.error(`Error processing market ${market.ticker}:`, error);
        continue; // Skip this market
      }
    }

    // Sort by edge (highest first)
    picks.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      platform: 'kalshi',
      count: picks.length,
      picks: picks.slice(0, limit),
      filters: {
        minEdge,
        minConfidence,
      },
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    console.error('Error fetching Kalshi sports picks:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Extract sport information from market title
 */
function extractSportInfo(market: any): {
  sport: string;
  league?: string;
  teams?: { home: string; away: string };
} {
  const title = market.title.toLowerCase();

  // Detect sport
  let sport = 'unknown';
  let league: string | undefined;

  if (title.includes('nfl') || title.includes('football')) {
    sport = 'americanfootball';
    league = 'NFL';
  } else if (title.includes('nba') || title.includes('basketball')) {
    sport = 'basketball';
    league = 'NBA';
  } else if (title.includes('mlb') || title.includes('baseball')) {
    sport = 'baseball';
    league = 'MLB';
  } else if (title.includes('nhl') || title.includes('hockey')) {
    sport = 'icehockey';
    league = 'NHL';
  } else if (title.includes('soccer') || title.includes('premier league')) {
    sport = 'soccer';
    league = 'Premier League';
  }

  // Try to extract teams (simple pattern matching)
  const teams = extractTeams(market.title);

  return { sport, league, teams };
}

/**
 * Extract team names from market title
 */
function extractTeams(title: string): { home: string; away: string } | undefined {
  // Common patterns: "Team A vs Team B", "Team A @ Team B", etc.
  const patterns = [
    /(.+?)\s+(?:vs|@|v\.|versus)\s+(.+?)(?:\s|$)/i,
    /(.+?)\s+to\s+beat\s+(.+?)(?:\s|$)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        home: match[2].trim(),
        away: match[1].trim(),
      };
    }
  }

  return undefined;
}

/**
 * Determine event type from market title
 */
function determineEventType(title: string): SportsMarket['eventType'] {
  const lower = title.toLowerCase();

  if (lower.includes('win') || lower.includes('winner') || lower.includes('beat')) {
    return 'game_winner';
  } else if (lower.includes('total') || lower.includes('over') || lower.includes('under')) {
    return 'total';
  } else if (lower.includes('spread') || lower.includes('points')) {
    return 'spread';
  } else if (lower.includes('player')) {
    return 'player_prop';
  } else if (lower.includes('team')) {
    return 'team_prop';
  }

  return 'other';
}

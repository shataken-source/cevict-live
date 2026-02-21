/**
 * Polymarket Sports Markets API
 * Returns sports probability picks for Polymarket
 */

import { NextRequest, NextResponse } from 'next/server';
import { PolymarketClient } from '@/app/lib/markets/polymarket-client';
import { SportsProbabilityEngine, SportsMarket } from '@/app/lib/markets/sports-probability-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minEdge = parseFloat(searchParams.get('minEdge') || '0.05');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '60');

    const polymarketClient = new PolymarketClient();
    const probabilityEngine = new SportsProbabilityEngine();

    // Fetch sports markets
    const markets = await polymarketClient.getSportsMarkets(limit * 2, true);

    if (markets.length === 0) {
      return NextResponse.json({
        success: true,
        picks: [],
        message: 'No active sports markets found on Polymarket',
        timestamp: new Date().toISOString(),
      });
    }

    // Convert to SportsMarket format and calculate probabilities
    const picks = [];
    for (const market of markets.slice(0, limit * 2)) {
      try {
        // Extract sport and teams from market question
        const sportInfo = extractSportInfo(market);
        
        const sportsMarket: SportsMarket = {
          id: market.conditionId,
          platform: 'polymarket',
          question: market.question,
          description: market.description,
          sport: sportInfo.sport,
          league: sportInfo.league,
          teams: sportInfo.teams,
          eventType: determineEventType(market.question),
          eventDate: market.endDate,
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
            polymarketConditionId: market.conditionId,
            polymarketUrl: `https://polymarket.com/event/${market.slug}`,
            marketInfo: {
              volume: market.volume,
              liquidity: market.liquidity,
              hasMarketMaker: polymarketClient.hasMarketMakerActivity(market),
            },
          });
        }
      } catch (error: any) {
        console.error(`Error processing market ${market.conditionId}:`, error);
        continue; // Skip this market
      }
    }

    // Sort by edge (highest first)
    picks.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      platform: 'polymarket',
      count: picks.length,
      picks: picks.slice(0, limit),
      filters: {
        minEdge,
        minConfidence,
      },
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      note: 'Polymarket access may be limited for U.S. users. Check platform availability.',
    });
  } catch (error: any) {
    console.error('Error fetching Polymarket sports picks:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Extract sport information from market question
 */
function extractSportInfo(market: any): {
  sport: string;
  league?: string;
  teams?: { home: string; away: string };
} {
  const question = market.question.toLowerCase();
  
  // Detect sport
  let sport = 'unknown';
  let league: string | undefined;
  
  if (question.includes('nfl') || question.includes('football')) {
    sport = 'americanfootball';
    league = 'NFL';
  } else if (question.includes('nba') || question.includes('basketball')) {
    sport = 'basketball';
    league = 'NBA';
  } else if (question.includes('mlb') || question.includes('baseball')) {
    sport = 'baseball';
    league = 'MLB';
  } else if (question.includes('nhl') || question.includes('hockey')) {
    sport = 'icehockey';
    league = 'NHL';
  } else if (question.includes('soccer') || question.includes('premier league')) {
    sport = 'soccer';
    league = 'Premier League';
  }

  // Try to extract teams
  const teams = extractTeams(market.question);
  
  return { sport, league, teams };
}

/**
 * Extract team names from market question
 */
function extractTeams(question: string): { home: string; away: string } | undefined {
  const patterns = [
    /(.+?)\s+(?:vs|@|v\.|versus)\s+(.+?)(?:\s|$)/i,
    /(.+?)\s+to\s+beat\s+(.+?)(?:\s|$)/i,
    /will\s+(.+?)\s+beat\s+(.+?)(?:\s|\?)/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
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
 * Determine event type from market question
 */
function determineEventType(question: string): SportsMarket['eventType'] {
  const lower = question.toLowerCase();
  
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

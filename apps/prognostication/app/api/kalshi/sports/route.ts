import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SportsPick {
  gameId: string;
  game: string;
  sport: string;
  pick: string;
  confidencePct: number;
  edgePct: number;
  kickoff: string | null;
  keyFactors?: string[];
  rationale?: string;
  mcWinProbability?: number;
  recommendedLine?: number;
  pickType?: 'SPREAD' | 'MONEYLINE' | 'TOTAL';
  homeTeam?: string;
  awayTeam?: string;
}

interface KalshiBet {
  id: string;
  market: string;
  category: 'sports';
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  marketId?: string;
  tier: 'elite' | 'pro' | 'free';
  originalSport: string;
  gameInfo: string;
}

interface TieredKalshiResponse {
  elite: KalshiBet[];
  pro: KalshiBet[];
  free: KalshiBet[];
  total: number;
  timestamp: string;
  source: string;
}

/**
 * Fetch sports picks from syndicated_picks table
 */
async function fetchSportsPicks(): Promise<SportsPick[]> {
  if (!supabaseUrl || !supabaseKey) {
    console.log('[KALSHI_SPORTS_API] Supabase not configured');
    return [];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get picks from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('syndicated_picks')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('confidence', { ascending: false });

    if (error) {
      console.error('[KALSHI_SPORTS_API] Database error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[KALSHI_SPORTS_API] No picks found in database');
      return [];
    }

    // Transform to SportsPick format
    const picks: SportsPick[] = data.map((record: any) => ({
      gameId: record.game_id || record.id || '',
      game: record.game || `${record.away_team || ''} vs ${record.home_team || ''}`,
      sport: (record.sport || 'NFL').toUpperCase(),
      pick: record.pick_selection || record.pick || 'Unknown',
      confidencePct: record.confidence || 70,
      edgePct: record.edge || record.value_bet_edge || 5.0,
      kickoff: record.game_time || record.created_at,
      keyFactors: record.analysis ? [record.analysis.substring(0, 200)] : undefined,
      rationale: record.analysis,
      mcWinProbability: record.mc_win_probability,
      recommendedLine: record.recommended_line,
      pickType: record.pick_type,
      homeTeam: record.home_team,
      awayTeam: record.away_team,
    }));

    console.log(`[KALSHI_SPORTS_API] Fetched ${picks.length} sports picks`);
    return picks;
  } catch (error) {
    console.error('[KALSHI_SPORTS_API] Error fetching picks:', error);
    return [];
  }
}

/**
 * Convert sports pick to Kalshi YES/NO format
 * Maps spread picks to "Will [Team] cover the spread?"
 * Maps moneyline picks to "Will [Team] win?"
 */
function convertToKalshiFormat(pick: SportsPick, tier: 'elite' | 'pro' | 'free'): KalshiBet {
  const isSpread = pick.pickType === 'SPREAD' || pick.pick.includes('-') || pick.pick.includes('+');
  const isTotal = pick.pickType === 'TOTAL' || pick.pick.toLowerCase().includes('over') || pick.pick.toLowerCase().includes('under');
  
  let marketTitle: string;
  let pickSide: 'YES' | 'NO';
  let probability: number;
  
  // Parse the team from the pick
  let teamName = pick.pick;
  const spreadMatch = pick.pick.match(/^([A-Za-z\s\.]+)\s*([\+\-]\d+\.?\d*)/);
  
  if (spreadMatch) {
    teamName = spreadMatch[1].trim();
  }
  
  // Determine YES/NO based on pick type and confidence
  if (isSpread) {
    marketTitle = `Will ${teamName} cover ${pick.recommendedLine || 'the spread'}?`;
    // High confidence = YES (they'll cover)
    pickSide = pick.confidencePct >= 60 ? 'YES' : 'NO';
    probability = pick.confidencePct;
  } else if (isTotal) {
    const isOver = pick.pick.toLowerCase().includes('over');
    marketTitle = `Will ${pick.game} go ${isOver ? 'Over' : 'Under'} ${pick.recommendedLine || 'the total'}?`;
    pickSide = isOver ? 'YES' : 'NO';
    probability = pick.confidencePct;
  } else {
    // Moneyline
    marketTitle = `Will ${teamName} win?`;
    pickSide = pick.confidencePct >= 60 ? 'YES' : 'NO';
    probability = pick.confidencePct;
  }
  
  // Calculate market price (Kalshi uses cents 0-100)
  // If our probability is 70%, YES price should be around 70, NO around 30
  const marketPrice = pickSide === 'YES' ? probability : 100 - probability;
  
  // Build reasoning from available data
  let reasoning = pick.rationale || '';
  if (pick.keyFactors && pick.keyFactors.length > 0) {
    reasoning = pick.keyFactors.join('. ');
  }
  if (!reasoning && pick.mcWinProbability) {
    reasoning = `Monte Carlo simulation shows ${(pick.mcWinProbability * 100).toFixed(1)}% win probability with ${pick.confidencePct}% model confidence.`;
  }
  if (!reasoning) {
    reasoning = `Statistical model indicates ${pick.confidencePct}% confidence in this outcome based on historical patterns.`;
  }
  
  // Generate a pseudo-market ID for Kalshi reference
  const marketId = `${pick.sport.toLowerCase()}-${pick.gameId}-${Date.now()}`;
  
  return {
    id: marketId,
    market: marketTitle,
    category: 'sports',
    pick: pickSide,
    probability: Math.round(probability),
    edge: Math.round(pick.edgePct * 100) / 100,
    marketPrice: Math.round(marketPrice),
    expires: pick.kickoff || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    reasoning: reasoning.substring(0, 280), // Keep it concise
    confidence: Math.round(pick.confidencePct),
    marketId: marketId,
    tier,
    originalSport: pick.sport,
    gameInfo: pick.game,
  };
}

/**
 * Allocate picks to tiers based on confidence thresholds
 * - Elite: Confidence >= 80% (top 10)
 * - Pro: Confidence >= 65% and < 80% (top 10)
 * - Free: Confidence < 65% (top 10)
 */
function allocateToTiers(picks: SportsPick[]): TieredKalshiResponse {
  if (!picks.length) {
    return {
      elite: [],
      pro: [],
      free: [],
      total: 0,
      timestamp: new Date().toISOString(),
      source: 'empty',
    };
  }

  // Sort by confidence (highest first)
  const sorted = [...picks].sort((a, b) => b.confidencePct - a.confidencePct);

  // Allocate by confidence thresholds
  const elitePicks: SportsPick[] = [];
  const proPicks: SportsPick[] = [];
  const freePicks: SportsPick[] = [];

  for (const pick of sorted) {
    if (pick.confidencePct >= 80 && elitePicks.length < 10) {
      elitePicks.push(pick);
    } else if (pick.confidencePct >= 65 && pick.confidencePct < 80 && proPicks.length < 10) {
      proPicks.push(pick);
    } else if (pick.confidencePct < 65 && freePicks.length < 10) {
      freePicks.push(pick);
    }
  }

  // Convert to Kalshi format
  const elite = elitePicks.map(p => convertToKalshiFormat(p, 'elite'));
  const pro = proPicks.map(p => convertToKalshiFormat(p, 'pro'));
  const free = freePicks.map(p => convertToKalshiFormat(p, 'free'));

  return {
    elite,
    pro,
    free,
    total: elite.length + pro.length + free.length,
    timestamp: new Date().toISOString(),
    source: 'syndicated_picks',
  };
}

/**
 * GET /api/kalshi/sports
 * Returns sports picks converted to Kalshi YES/NO format, organized by tier
 * Query params:
 * - tier: 'elite' | 'pro' | 'free' | 'all' (default: 'all')
 * - limit: number (default: 10, max: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    console.log(`[KALSHI_SPORTS_API] Request: tier=${tier}, limit=${limit}`);

    // Fetch sports picks from database
    const sportsPicks = await fetchSportsPicks();

    if (!sportsPicks.length) {
      return NextResponse.json(
        {
          success: true,
          elite: [],
          pro: [],
          free: [],
          total: 0,
          timestamp: new Date().toISOString(),
          source: 'no_data',
          message: 'No sports picks available. Ensure syndicated_picks table has data.',
        },
        { status: 200 }
      );
    }

    // Allocate to tiers
    const tieredPicks = allocateToTiers(sportsPicks);

    // Filter by requested tier
    let response: Partial<TieredKalshiResponse> = {
      timestamp: tieredPicks.timestamp,
      source: tieredPicks.source,
    };

    if (tier === 'all') {
      response = {
        ...tieredPicks,
        elite: tieredPicks.elite.slice(0, limit),
        pro: tieredPicks.pro.slice(0, limit),
        free: tieredPicks.free.slice(0, limit),
      };
    } else if (tier === 'elite') {
      response.elite = tieredPicks.elite.slice(0, limit);
      response.total = response.elite.length;
    } else if (tier === 'pro') {
      response.pro = tieredPicks.pro.slice(0, limit);
      response.total = response.pro.length;
    } else if (tier === 'free') {
      response.free = tieredPicks.free.slice(0, limit);
      response.total = response.free.length;
    }

    return NextResponse.json({
      success: true,
      ...response,
      tier_thresholds: {
        elite: '>= 80% confidence',
        pro: '65-79% confidence',
        free: '< 65% confidence',
      },
      format: 'kalshi_yes_no',
    });
  } catch (error: any) {
    console.error('[KALSHI_SPORTS_API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch sports picks',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

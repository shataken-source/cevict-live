import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Feature flag - set USE_LIVE_ODDS=false to disable live API calls
const USE_LIVE_ODDS = process.env.USE_LIVE_ODDS !== 'false';
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Initialize Supabase client for cached data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface EnginePick {
  gameId: string;
  game: string;
  sport: string;
  pick: string;
  confidencePct: number;
  edgePct: number;
  kickoff: string | null;
  // Game analysis for paid tiers
  keyFactors?: string[];
  rationale?: string;
  simulationResults?: {
    winRate: number;
    stdDev?: number;
    iterations?: number;
  };
  predictedScore?: {
    home: number;
    away: number;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  stake?: number;
  // Kalshi bet markers
  isKalshi?: boolean;
  kalshiMarket?: {
    ticker: string;
    title: string;
    probability: number;
    volume: number;
    lastPrice: number;
  };
}

interface TieredPicks {
  free: EnginePick[];
  pro: EnginePick[];
  elite: EnginePick[];
}

// No mock picks - always serve real data or empty state
const MOCK_PICKS: EnginePick[] = [];

const _REMOVED_MOCK_PICKS_PLACEHOLDER = [
  {
    gameId: 'nfl-1',
    game: 'Chiefs vs Eagles',
    sport: 'NFL',
    pick: 'Chiefs -3',
    confidencePct: 72,
    edgePct: 4.5,
    kickoff: new Date().toISOString(),
    keyFactors: ['Mahomes 10-0 vs top-5 defenses', 'Eagles secondary injuries'],
    rationale: 'Strong QB advantage with Mahomes healthy'
  },
  {
    gameId: 'nba-1',
    game: 'Lakers vs Celtics',
    sport: 'NBA',
    pick: 'Over 224.5',
    confidencePct: 68,
    edgePct: 3.2,
    kickoff: new Date(Date.now() + 86400000).toISOString(),
    keyFactors: ['Both teams top 10 in pace', 'No major injuries'],
    rationale: 'High pace matchup with offensive efficiency'
  },
  {
    gameId: 'nfl-2',
    game: '49ers vs Seahawks',
    sport: 'NFL',
    pick: '49ers -6.5',
    confidencePct: 75,
    edgePct: 5.8,
    kickoff: new Date(Date.now() + 172800000).toISOString(),
    keyFactors: ['49ers defense ranked #1', 'Seahawks QB questionable'],
    rationale: 'Defensive mismatch favors 49ers'
  },
  {
    gameId: 'nba-2',
    game: 'Warriors vs Suns',
    sport: 'NBA',
    pick: 'Warriors ML',
    confidencePct: 71,
    edgePct: 4.1,
    kickoff: new Date(Date.now() + 90000000).toISOString(),
    keyFactors: ['Curry back from rest', 'Suns on back-to-back'],
    rationale: 'Rest advantage for Warriors'
  },
  {
    gameId: 'mlb-1',
    game: 'Yankees vs Red Sox',
    sport: 'MLB',
    pick: 'Yankees ML',
    confidencePct: 66,
    edgePct: 3.5,
    kickoff: new Date(Date.now() + 129600000).toISOString(),
    keyFactors: ['Cole pitching', 'Fenway wind favorable'],
    rationale: 'Ace pitcher advantage'
  },
  {
    gameId: 'nfl-3',
    game: 'Ravens vs Steelers',
    sport: 'NFL',
    pick: 'Under 41.5',
    confidencePct: 82,
    edgePct: 7.2,
    kickoff: new Date(Date.now() + 259200000).toISOString(),
    keyFactors: ['Weather: 20mph winds', 'Both defenses top 5', 'Rivalry game defensive'],
    rationale: 'Weather + rivalry = low scoring'
  },
  {
    gameId: 'nba-3',
    game: 'Nuggets vs Thunder',
    sport: 'NBA',
    pick: 'Nuggets +4.5',
    confidencePct: 79,
    edgePct: 6.1,
    kickoff: new Date(Date.now() + 100800000).toISOString(),
    keyFactors: ['Jokic dominant vs OKC', 'Thunder fatigued'],
    rationale: 'MVP performance expected'
  },
  {
    gameId: 'nhl-1',
    game: 'Avalanche vs Golden Knights',
    sport: 'NHL',
    pick: 'Avalanche ML',
    confidencePct: 76,
    edgePct: 5.5,
    kickoff: new Date(Date.now() + 115200000).toISOString(),
    keyFactors: ['MacKinnon hot streak', 'VGK goalie injured'],
    rationale: 'Goaltending advantage to Colorado'
  },
  {
    gameId: 'nascar-1',
    game: 'Daytona 500',
    sport: 'NASCAR',
    pick: 'Top 3: Blaney',
    confidencePct: 74,
    edgePct: 4.8,
    kickoff: new Date(Date.now() + 345600000).toISOString(),
    keyFactors: ['Plate racing specialist', 'Fast in practice'],
    rationale: 'Experience at superspeedways'
  },
  {
    gameId: 'ncaaf-1',
    game: 'Georgia vs Alabama',
    sport: 'NCAAF',
    pick: 'Georgia -3.5',
    confidencePct: 80,
    edgePct: 6.8,
    kickoff: new Date(Date.now() + 432000000).toISOString(),
    keyFactors: ['SEC Championship experience', 'Defense dominates'],
    rationale: 'Championship pedigree'
  }
];

/**
 * Fetch picks from Supabase database (syndicated_picks table)
 */
async function fetchPicksFromDatabase(): Promise<EnginePick[] | null> {
  if (!supabaseUrl || !supabaseKey) {
    console.log('[PICKS_API] Supabase not configured, skipping database fetch');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get picks from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('syndicated_picks')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PICKS_API] Database error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[PICKS_API] No picks found in database');
      return null;
    }

    // Transform database records to EnginePick format
    const picks: EnginePick[] = data.map((record: { game_id?: string; id?: string; game?: string; away_team?: string; home_team?: string; sport?: string; pick_selection?: string; confidence?: number; edge?: number; game_time?: string; created_at: string; analysis?: string }) => ({
      gameId: record.game_id || record.id || '',
      game: record.game || `${record.away_team || ''} vs ${record.home_team || ''}`,
      sport: (record.sport || 'NFL').toUpperCase(),
      pick: record.pick_selection || 'Unknown',
      confidencePct: record.confidence || 70,
      edgePct: record.edge || 5.0,
      kickoff: record.game_time || record.created_at,
      keyFactors: record.analysis ? [record.analysis.substring(0, 100)] : undefined,
      rationale: record.analysis
    }));

    console.log(`[PICKS_API] Fetched ${picks.length} picks from database`);
    return picks;
  } catch (error) {
    console.error('[PICKS_API] Error fetching from database:', error);
    return null;
  }
}

/**
 * Fetch today's games directly from The Odds API and generate picks.
 * Runs when DB is empty — makes prognostication self-sufficient on Vercel.
 */
async function fetchPicksFromLiveApi(): Promise<EnginePick[] | null> {
  if (!USE_LIVE_ODDS) {
    console.log('[PICKS_API] Live odds disabled, skipping API fetch');
    return null;
  }
  if (!ODDS_API_KEY) {
    console.log('[PICKS_API] ODDS_API_KEY not set, skipping live fetch');
    return null;
  }

  const sports = [
    'basketball_nba',
    'basketball_ncaab',
    'americanfootball_nfl',
    'icehockey_nhl',
    'baseball_mlb',
  ];

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const picks: EnginePick[] = [];

  for (const sport of sports) {
    try {
      const url = `${ODDS_API_BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads&oddsFormat=american&commenceTimeTo=${windowEnd.toISOString()}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) continue;

      const games: any[] = await res.json();
      if (!Array.isArray(games)) continue;

      for (const game of games) {
        if (!game.bookmakers?.length) continue;

        // Convert American odds to decimal probability
        const toProb = (odds: number) => odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);

        // ── Step 1: Build consensus probability across ALL bookmakers ──────────
        // Averaging across books removes individual book bias and gives a
        // better estimate of true market probability than any single book.
        let homeRawSum = 0, awayRawSum = 0, bookCount = 0;
        let bestHomeOdds = -99999, bestAwayOdds = -99999; // best (highest payout) odds

        for (const bk of game.bookmakers) {
          const h2h = bk.markets?.find((m: any) => m.key === 'h2h');
          if (!h2h?.outcomes?.length) continue;
          const ho = h2h.outcomes.find((o: any) => o.name === game.home_team);
          const ao = h2h.outcomes.find((o: any) => o.name === game.away_team);
          if (!ho || !ao) continue;
          homeRawSum += toProb(ho.price);
          awayRawSum += toProb(ao.price);
          bookCount++;
          // Track best available odds (highest payout = most positive American)
          if (ho.price > bestHomeOdds) bestHomeOdds = ho.price;
          if (ao.price > bestAwayOdds) bestAwayOdds = ao.price;
        }
        if (bookCount === 0) continue;

        const homeRawAvg = homeRawSum / bookCount;
        const awayRawAvg = awayRawSum / bookCount;
        const vigTotal = homeRawAvg + awayRawAvg;

        // Shin devig on consensus: removes average vig
        const homeConsensus = homeRawAvg / vigTotal;
        const awayConsensus = awayRawAvg / vigTotal;
        const avgVig = ((vigTotal - 1) * 100);

        // ── Step 2: Model probability — home-field adjusted ───────────────────
        // Home-field baselines from historical data (real win rates at home):
        const HOME_BIAS: Record<string, number> = {
          basketball_nba: 0.595,
          americanfootball_nfl: 0.575,
          baseball_mlb: 0.540,
          icehockey_nhl: 0.550,
          basketball_ncaab: 0.620,
          americanfootball_ncaaf: 0.600,
        };
        const homeBias = HOME_BIAS[sport] ?? 0.540;
        const REG_WEIGHT = 0.20; // 20% regression to home-field mean

        // Model blends consensus with home-field prior
        // This creates genuine disagreement when market under/over-prices home edge
        const modelHome = (1 - REG_WEIGHT) * homeConsensus + REG_WEIGHT * homeBias;
        const modelAway = 1 - modelHome;

        // ── Step 3: Edge = model disagrees with market ────────────────────────
        // Positive edge means our model thinks this side is underpriced by market
        const homeEdge = modelHome - homeConsensus;
        const awayEdge = modelAway - awayConsensus;
        const MIN_EDGE = 0.03; // 3% minimum edge (matches backtest best_enhanced strategy)

        let pickTeam: string, pickProb: number, pickOdds: number, pickEdge: number, pickSide: string;

        if (homeEdge >= awayEdge && homeEdge >= MIN_EDGE) {
          pickTeam = game.home_team;
          pickProb = modelHome;
          pickOdds = bestHomeOdds !== -99999 ? bestHomeOdds : -110;
          pickEdge = homeEdge;
          pickSide = 'home';
        } else if (awayEdge > homeEdge && awayEdge >= MIN_EDGE) {
          pickTeam = game.away_team;
          pickProb = modelAway;
          pickOdds = bestAwayOdds !== -99999 ? bestAwayOdds : -110;
          pickEdge = awayEdge;
          pickSide = 'away';
        } else {
          continue; // No edge — skip this game
        }

        // Confidence = model probability scaled to 50-95 range
        // 50% model prob = 50 confidence, 70% = 90 confidence
        const confidencePct = Math.min(95, Math.round(50 + (pickProb - 0.5) * 200));
        const edgePct = Math.round(pickEdge * 1000) / 10;

        const sportLabel = sport.split('_').pop()?.toUpperCase() || sport.toUpperCase();
        const isFavorite = pickOdds < 0;
        const marketImplied = pickSide === 'home' ? homeConsensus : awayConsensus;

        picks.push({
          gameId: game.id,
          game: `${game.away_team} @ ${game.home_team}`,
          sport: sportLabel,
          pick: pickTeam,
          confidencePct,
          edgePct,
          kickoff: game.commence_time,
          keyFactors: [
            `Model prob: ${(pickProb * 100).toFixed(1)}% vs market: ${(marketImplied * 100).toFixed(1)}%`,
            `Edge: +${edgePct}% | Books sampled: ${bookCount} | Avg vig: ${avgVig.toFixed(1)}%`,
            `${isFavorite ? 'Favorite' : 'Underdog'} pick | Best odds: ${pickOdds > 0 ? '+' : ''}${pickOdds}`,
          ],
          rationale: `${bookCount}-book consensus gives ${pickTeam} ${(marketImplied * 100).toFixed(1)}% win probability. Home-field adjusted model gives ${(pickProb * 100).toFixed(1)}%, a +${edgePct}% edge vs market.`,
        });
      }
    } catch (err) {
      console.error(`[PICKS_API] Odds API error for ${sport}:`, err);
    }
  }

  if (picks.length === 0) return null;

  // Sort by edge descending, cap at 20 picks
  picks.sort((a, b) => b.edgePct - a.edgePct);
  console.log(`[PICKS_API] Generated ${picks.length} picks from Odds API (live)`);
  return picks.slice(0, 20);
}

/**
 * Smart tier allocation based on new Progno syndication system
 *
 * Strategy:
 * - Elite: 5 picks (target: 5) - uses premium/free if needed
 * - Premium: 3 picks (target: 3) - uses free if needed
 * - Free: 2 picks (max: 2) - gets leftovers
 *
 * Pro and Elite get DIFFERENT picks - no overlap
 * Elite gets all remaining picks after Free and Pro are allocated
 */
function allocateTiers(all: EnginePick[]): TieredPicks {
  if (!all.length) {
    return { free: [], pro: [], elite: [] };
  }

  // Sort by quality score (edge weighted more heavily + confidence)
  const sorted = [...all].sort((a, b) => {
    // Quality score = edge * 2.5 + confidence (edge is more important for value)
    const scoreA = (a.edgePct * 2.5) + a.confidencePct;
    const scoreB = (b.edgePct * 2.5) + b.confidencePct;
    return scoreB - scoreA;
  });

  // Apply new tier allocation with fallback logic
  const eliteAllocation = [];
  const premiumAllocation = [];
  const freeAllocation = [];
  const usedPicks = new Set<string>();

  // ELITE: Top 5 picks, uses premium/free if needed
  let elitePicksToTake = sorted.filter((p: EnginePick) => p.confidencePct >= 80);
  if (elitePicksToTake.length < 5) {
    const needed = 5 - elitePicksToTake.length;
    const premiumPicks = sorted.filter((p: EnginePick) => p.confidencePct >= 65 && p.confidencePct < 80 && !usedPicks.has(p.gameId));
    elitePicksToTake = [...elitePicksToTake, ...premiumPicks.slice(0, needed)];
  }
  elitePicksToTake.slice(0, 5).forEach(pick => usedPicks.add(pick.gameId));
  eliteAllocation.push(...elitePicksToTake);

  // PREMIUM: Top 3 picks (excluding elite picks), uses free if needed
  const availablePremium = sorted.filter((p: EnginePick) =>
    p.confidencePct >= 65 && p.confidencePct < 80 &&
    !usedPicks.has(p.gameId)
  );
  let premiumPicksToTake = availablePremium.slice(0, 3);
  if (premiumPicksToTake.length < 3) {
    const needed = 3 - premiumPicksToTake.length;
    const freePicks = sorted.filter((p: EnginePick) => p.confidencePct < 65 && !usedPicks.has(p.gameId));
    premiumPicksToTake = [...premiumPicksToTake, ...freePicks.slice(0, needed)];
  }
  premiumPicksToTake.slice(0, 3).forEach(pick => usedPicks.add(pick.gameId));
  premiumAllocation.push(...premiumPicksToTake);

  // FREE: Gets leftovers (max 2 picks)
  const availableFree = sorted.filter((p: EnginePick) => !usedPicks.has(p.gameId));
  freeAllocation.push(...availableFree.slice(0, 2));

  return { free: freeAllocation, pro: premiumAllocation, elite: eliteAllocation };
}

export async function GET(request: NextRequest) {
  try {
    // Check user tier from query params or headers
    const email = request.nextUrl.searchParams.get('email');
    const sessionId = request.nextUrl.searchParams.get('session_id');

    let userTier: 'free' | 'pro' | 'elite' = 'free';
    let hasAccess = false;

    // Verify user has paid subscription
    if ((email || sessionId) && stripe) {
      try {
        let customerId: string | null = null;

        if (sessionId) {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.customer && typeof session.customer === 'string') {
            customerId = session.customer;
          }
        }

        if (email && !customerId) {
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }

        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            const priceId = subscription.items.data[0]?.price.id;

            const elitePriceIds = [
              process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
              process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
              process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
            ].filter(Boolean);

            const proPriceIds = [
              process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
              process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
              process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
            ].filter(Boolean);

            if (priceId && elitePriceIds.includes(priceId)) {
              userTier = 'elite';
              hasAccess = true;
            } else if (priceId && proPriceIds.includes(priceId)) {
              userTier = 'pro';
              hasAccess = true;
            }
          }
        }
      } catch (err) {
        console.error('Failed to verify user tier:', err);
      }
    }

    // ============================================
    // CACHED DATA STRATEGY (prevents API token burn)
    // Order: 1) Database → 2) Mock Data → 3) Live API (if enabled)
    // ============================================

    let enginePicks: EnginePick[] = [];
    let source: 'database' | 'mock' | 'live' | 'unavailable' = 'unavailable';

    // 1. Try database first (cached picks from webhook)
    const dbPicks = await fetchPicksFromDatabase();
    if (dbPicks && dbPicks.length > 0) {
      enginePicks = dbPicks;
      source = 'database';
      console.log(`[PICKS_API] Serving ${enginePicks.length} picks from database (cached)`);
    }

    // 2. No mock fallback - if DB is empty, try live API or return empty
    // (Mock picks were removed to prevent serving fake data to real users)

    // 3. Only try live API if explicitly enabled (USE_LIVE_ODDS=true)
    // This prevents accidental API token usage during testing
    if (USE_LIVE_ODDS && enginePicks.length === 0) {
      const livePicks = await fetchPicksFromLiveApi();
      if (livePicks && livePicks.length > 0) {
        enginePicks = livePicks;
        source = 'live';
        console.log(`[PICKS_API] Serving ${enginePicks.length} picks from LIVE API (tokens consumed)`);
      }
    }

    // If still no picks, return empty response
    if (!enginePicks || enginePicks.length === 0) {
      return NextResponse.json(
        {
          success: true,
          free: [],
          pro: [],
          elite: [],
          total: 0,
          timestamp: new Date().toISOString(),
          source: 'unavailable',
          mode: USE_LIVE_ODDS ? 'live-enabled' : 'cached-only',
          note: 'No picks available. Set USE_LIVE_ODDS=true to enable live API calls.',
        },
        { status: 200 }
      );
    }

    const tiers = allocateTiers(enginePicks);

    // Strip game analysis from free picks (maintain value proposition)
    const freePicksWithoutAnalysis = tiers.free.map(pick => ({
      gameId: pick.gameId,
      game: pick.game,
      sport: pick.sport,
      pick: pick.pick,
      confidencePct: pick.confidencePct,
      edgePct: pick.edgePct,
      kickoff: pick.kickoff,
    }));

    // SECURITY: Only return premium picks if user has paid access
    // Never expose pro/elite picks to free users
    const response: any = {
      success: true,
      free: freePicksWithoutAnalysis,
      total: enginePicks.length,
      timestamp: new Date().toISOString(),
      source,
      mode: USE_LIVE_ODDS ? 'live-enabled' : 'cached-only',
      note: USE_LIVE_ODDS
        ? 'Live odds enabled - may consume API tokens'
        : 'Using cached data - no API tokens consumed'
    };

    // Only include pro/elite picks if user has verified access
    // Paid tiers get full game analysis (keyFactors, rationale, simulationResults, etc.)
    if (hasAccess) {
      if (userTier === 'elite') {
        response.pro = tiers.pro; // Full analysis included
        response.elite = tiers.elite; // Full analysis included
      } else if (userTier === 'pro') {
        response.pro = tiers.pro; // Full analysis included
        // Elite picks not included for Pro tier
      }
    } else {
      // Free users get empty arrays for premium tiers
      response.pro = [];
      response.elite = [];
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load picks',
      },
      { status: 500 }
    );
  }
}



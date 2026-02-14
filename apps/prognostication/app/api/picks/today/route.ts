import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

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
  let elitePicksToTake = sorted.filter(p => p.confidencePct >= 80);
  if (elitePicksToTake.length < 5) {
    const needed = 5 - elitePicksToTake.length;
    const premiumPicks = sorted.filter(p => p.confidencePct >= 65 && p.confidencePct < 80 && !usedPicks.has(p.gameId));
    elitePicksToTake = [...elitePicksToTake, ...premiumPicks.slice(0, needed)];
  }
  elitePicksToTake.slice(0, 5).forEach(pick => usedPicks.add(p.gameId));
  eliteAllocation.push(...elitePicksToTake);

  // PREMIUM: Top 3 picks (excluding elite picks), uses free if needed
  const availablePremium = sorted.filter(p =>
    p.confidencePct >= 65 && p.confidencePct < 80 &&
    !usedPicks.has(p.gameId)
  );
  let premiumPicksToTake = availablePremium.slice(0, 3);
  if (premiumPicksToTake.length < 3) {
    const needed = 3 - premiumPicksToTake.length;
    const freePicks = sorted.filter(p => p.confidencePct < 65 && !usedPicks.has(p.gameId));
    premiumPicksToTake = [...premiumPicksToTake, ...freePicks.slice(0, needed)];
  }
  premiumPicksToTake.slice(0, 3).forEach(pick => usedPicks.add(p.gameId));
  premiumAllocation.push(...premiumPicksToTake);

  // FREE: Gets leftovers (max 2 picks)
  const availableFree = sorted.filter(p => !usedPicks.has(p.gameId));
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

    const baseUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3008';

    let enginePicks: EnginePick[] = [];
    let source: 'progno' | 'unavailable' = 'unavailable';

    if (baseUrl) {
      try {
        // Try to get real predictions from Progno API
        let realPicks = [];
        try {
          const prognoUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
          const resp = await fetch(`${prognoUrl}/api/picks/today`, {
            cache: 'no-store'
          });

          if (resp.ok) {
            const picksData = await resp.json();
            if (picksData.picks && Array.isArray(picksData.picks)) {
              realPicks = picksData.picks.map(pick => ({
                id: pick.game_id ?? pick.gameId,
                game: pick.game ?? `${pick.away_team ?? ''} @ ${pick.home_team ?? ''}`,
                league: pick.league?.toUpperCase() || 'UNKNOWN',
                sport: pick.sport?.toUpperCase() || 'UNKNOWN',
                homeTeam: pick.home_team || 'Unknown',
                awayTeam: pick.away_team || 'Unknown',
                gameTime: pick.game_time || new Date().toISOString(),
                venue: pick.venue,
                prediction: {
                  winner: pick.pick || 'Unknown',
                  confidence: (pick.confidence || 0) / 100,
                  score: pick.mc_predicted_score || { home: 0, away: 0 },
                  edge: pick.value_bet_edge || 0,
                  keyFactors: pick.analysis ? pick.analysis.split('\n').filter(f => f.trim()) : []
                },
                odds: {
                  moneyline: pick.odds ? { home: pick.odds, away: 0 } : undefined,
                  spread: pick.odds ? { home: pick.odds, away: 0 } : undefined,
                  total: pick.odds ? pick.odds : undefined
                },
                isLive: false,
                isCompleted: false
              }));
              source = 'progno';
            }
          }
        } catch (innerErr) {
          // Inner try failed
          console.warn('Inner fetch failed:', innerErr?.message);
        }
      } catch (err: any) {
        // PROGNO unavailable - return empty picks
        console.warn('PROGNO picks/today fetch failed:', err?.message);
      }
    }

    if (!enginePicks.length) {
      return NextResponse.json(
        {
          success: true,
          free: [],
          pro: [],
          elite: [],
          total: 0,
          timestamp: new Date().toISOString(),
          source: baseUrl ? 'progno-empty' : 'unavailable',
          prognoUrl: baseUrl || null, // Include PROGNO URL even when no picks
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
      prognoUrl: baseUrl || null, // Include PROGNO URL in response for admin page
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



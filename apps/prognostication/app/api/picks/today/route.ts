import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  })
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
 * Smart tier allocation based on confidence and edge
 *
 * Strategy:
 * - Free: 1 decent pick (60-70% confidence, good value but not premium)
 * - Pro: 3 great picks (70-85% confidence range, different from Elite)
 * - Elite: ALL picks (gets everything, including the absolute best)
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

  // FREE: 1 decent pick (60-70% confidence range)
  // Give them a solid pick but not premium quality
  let free: EnginePick[] = [];
  const freeCandidates = sorted.filter(p => p.confidencePct >= 60 && p.confidencePct <= 70);
  if (freeCandidates.length > 0) {
    // Pick the best one from this range
    free = [freeCandidates[0]];
  } else if (sorted.length > 0) {
    // Fallback: give them a mid-range pick (not the absolute best)
    const midIndex = Math.min(Math.floor(sorted.length * 0.6), sorted.length - 1);
    free = [sorted[midIndex]];
  }

  // PRO: 3 great picks (70-85% confidence, excluding Free pick)
  // Pro gets excellent picks but not the absolute elite tier
  // Prioritize Kalshi bets for Pro tier
  const proCandidates = sorted.filter(p =>
    p.confidencePct >= 70 &&
    p.confidencePct < 85 &&
    !free.some(f => f.gameId === p.gameId) // Exclude Free pick
  );

  // Separate Kalshi and regular picks
  const kalshiCandidates = proCandidates.filter(p => p.isKalshi);
  const regularCandidates = proCandidates.filter(p => !p.isKalshi);

  // Take top picks: prioritize Kalshi bets, then regular picks
  const pro = [
    ...kalshiCandidates.sort((a, b) => {
      const scoreA = (a.edgePct * 2.5) + a.confidencePct;
      const scoreB = (b.edgePct * 2.5) + b.confidencePct;
      return scoreB - scoreA;
    }).slice(0, Math.min(2, kalshiCandidates.length)), // Up to 2 Kalshi bets
    ...regularCandidates.sort((a, b) => {
      const scoreA = (a.edgePct * 2.5) + a.confidencePct;
      const scoreB = (b.edgePct * 2.5) + b.confidencePct;
      return scoreB - scoreA;
    }).slice(0, 3 - Math.min(2, kalshiCandidates.length)) // Fill remaining slots
  ].slice(0, 3);

  // If we don't have enough Pro picks, expand range slightly
  if (pro.length < 3) {
    const additionalPro = sorted
      .filter(p =>
        p.confidencePct >= 68 &&
        p.confidencePct < 70 &&
        !pro.some(pr => pr.gameId === p.gameId) &&
        !free.some(f => f.gameId === p.gameId)
      )
      .slice(0, 3 - pro.length);
    pro.push(...additionalPro);
  }

  // ELITE: Gets EVERYTHING (all remaining picks)
  // Elite gets all picks that aren't in Free or Pro
  // Prioritize Kalshi bets at the top
  const elite = sorted.filter(p =>
    !free.some(f => f.gameId === p.gameId) &&
    !pro.some(pr => pr.gameId === p.gameId)
  );

  // Sort Elite by quality (best first), but prioritize Kalshi bets
  elite.sort((a, b) => {
    // Kalshi bets get priority boost
    const kalshiBoostA = a.isKalshi ? 50 : 0;
    const kalshiBoostB = b.isKalshi ? 50 : 0;
    const scoreA = (a.edgePct * 2.5) + a.confidencePct + kalshiBoostA;
    const scoreB = (b.edgePct * 2.5) + b.confidencePct + kalshiBoostB;
    return scoreB - scoreA;
  });

  return { free, pro, elite };
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

    const baseUrl = process.env.PROGNO_BASE_URL;

    let enginePicks: EnginePick[] = [];
    let source: 'progno' | 'unavailable' = 'unavailable';

    if (baseUrl) {
      try {
        // Use Progno Cevict Flex engine (same as main picks/today)
        const resp = await fetch(
          `${baseUrl.replace(/\/+$/, '')}/api/picks/today`,
          { cache: 'no-store' }
        );

        if (resp.ok) {
          const json = await resp.json();
          const rawPicks = json?.picks;
          if (Array.isArray(rawPicks) && rawPicks.length > 0) {
            // Map Progno Cevict Flex pick shape to EnginePick
            enginePicks = rawPicks.map((p: any): EnginePick => ({
              gameId: p.game_id ?? p.gameId,
              game: p.game ?? `${p.away_team ?? ''} @ ${p.home_team ?? ''}`,
              sport: (p.sport ?? p.league ?? 'NFL').toUpperCase(),
              pick: p.pick ?? '',
              confidencePct: typeof p.confidence === 'number' ? p.confidence : 0,
              edgePct: typeof p.value_bet_edge === 'number' ? Math.round(p.value_bet_edge) : 0,
              kickoff: p.game_time ?? null,
              keyFactors: Array.isArray(p.reasoning) ? p.reasoning.slice(0, 5) : (p.analysis ? [p.analysis] : []),
              rationale: typeof p.analysis === 'string' ? p.analysis : (Array.isArray(p.reasoning) ? p.reasoning.join(' ') : ''),
              simulationResults: p.mc_win_probability != null ? { winRate: p.mc_win_probability, iterations: p.mc_iterations ?? 0 } : undefined,
              predictedScore: p.mc_predicted_score ?? undefined,
              riskLevel: (p.confidence >= 75 ? 'low' : p.confidence >= 60 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
              stake: p.value_bet_kelly != null ? p.value_bet_kelly : undefined,
              isKalshi: false,
              kalshiMarket: undefined,
            }));
            source = 'progno';
          }
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



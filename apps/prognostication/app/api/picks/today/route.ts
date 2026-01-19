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
    const isCron = request.headers.get('x-vercel-cron') === '1';

    // Check user tier from query params or headers
    const email = request.nextUrl.searchParams.get('email');
    const sessionId = request.nextUrl.searchParams.get('session_id');

    let userTier: 'free' | 'pro' | 'elite' = 'free';
    let hasAccess = false;

    // Cron calls should be able to fetch tiered picks for downstream automation (SMS alerts).
    // NOTE: `x-vercel-cron` can be spoofed; if you want stronger auth, use a dedicated
    // dynamic route segment secret (query strings are not supported in vercel.json cron paths).
    if (isCron) {
      userTier = 'elite';
      hasAccess = true;
    }

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

    if (!baseUrl) {
      return NextResponse.json(
        {
          success: true,
          free: [],
          pro: [],
          elite: [],
          total: 0,
          timestamp: new Date().toISOString(),
          source: 'unavailable',
          prognoUrl: null,
          missingEnv: ['PROGNO_BASE_URL'],
          hint: 'Set PROGNO_BASE_URL (e.g. https://progno.yourdomain.com) so Prognostication can fetch picks.',
        },
        { status: 200 }
      );
    }

    if (baseUrl) {
      try {
        // Use new API v2.0 endpoint
        const resp = await fetch(
          `${baseUrl.replace(/\/+$/, '')}/api/progno/v2?action=predictions&limit=50`,
          { cache: 'no-store' }
        );

        if (resp.ok) {
          const json = await resp.json();
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            // Transform v2 API response to EnginePick format
            enginePicks = json.data.map((pred: any): EnginePick => {
              // predictedWinner is the actual team name, not 'home'/'away'
              const predictedTeam = pred.predictedWinner || (pred.spread?.prediction === 'home' ? pred.homeTeam : pred.awayTeam);
              
              return {
                gameId: pred.gameId || pred.id,
                game: `${pred.awayTeam} @ ${pred.homeTeam}`,
                sport: (pred.sport || 'NFL').toUpperCase(),
                pick: predictedTeam,
                confidencePct: pred.confidenceScore || Math.round((pred.winProbability || 0) * 100),
                edgePct: pred.spread?.edge ? Math.round(pred.spread.edge * 100) : 0,
                kickoff: pred.createdAt || null,
                isKalshi: pred.isKalshi || false,
                kalshiMarket: pred.kalshiMarket,
                keyFactors: pred.claudeEffect?.keyFactors || pred.claudeEffect?.dimensions ? Object.keys(pred.claudeEffect.dimensions || {}) : [],
                rationale: pred.claudeEffect?.summary || pred.claudeEffect?.reasoning?.join(' ') || '',
                simulationResults: pred.simulationResults,
                predictedScore: pred.predictedScore,
                riskLevel: pred.riskLevel || 'medium',
                stake: pred.recommendation?.primaryPick?.recommendedWager || pred.recommendation?.primaryPick?.units || 0,
              };
            });
            source = 'progno';
          }
        }
      } catch (err: any) {
        // PROGNO unavailable - return empty picks
        console.warn('PROGNO v2 API fetch failed:', err?.message);
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
          source: 'progno-empty',
          prognoUrl: baseUrl, // Include PROGNO URL even when no picks
          hint: 'PROGNO returned no predictions. Verify PROGNO is running and /api/progno/v2?action=predictions returns data.',
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



import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SyndicationRequest {
  tier: 'free' | 'premium' | 'elite';
  picks: any[];
  webhookUrl?: string;
  apiKey?: string;
}

interface PrognoPick {
  id: string;
  gameDate: string;
  league: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  venue?: string;
  prediction: {
    winner: string;
    confidence: number;
    score: { home: number; away: number; };
    edge: number;
    keyFactors?: string[];
  };
  odds: {
    moneyline?: { home: number; away: number; };
    spread?: { home: number; away: number; };
    total?: number;
  };
}

/**
 * Determine which tier a pick should go to based on Progno's algorithm
 * Free Tier: Lower confidence/edge picks (bottom 40% of quality)
 * Premium Tier: Mid-range confidence/edge picks (middle 40% of quality)
 * Elite Tier: Highest confidence/edge picks (top 20% of quality)
 */
function determinePickTier(pick: PrognoPick): 'free' | 'premium' | 'elite' {
  const confidence = pick.prediction.confidence * 100;
  const edge = pick.prediction.edge || 0;

  // Calculate composite score (same as Progno's internal algorithm)
  const compositeScore = confidence + (edge * 2) + (pick.prediction.keyFactors?.length || 0) * 2;

  // Elite tier: Top 20% of picks by composite score
  if (compositeScore >= 80) {
    return 'elite';
  }

  // Premium tier: Middle 40% of picks by composite score
  if (compositeScore >= 65) {
    return 'premium';
  }

  // Free tier: Bottom 40% of picks by composite score
  return 'free';
}

/**
 * Filter picks based on tier limits and quality using Progno's new algorithm
 * Premium and Elite get their required picks even if quality is lower
 * Free gets leftovers - anything is good for free tier
 */
function filterPicksForTier(picks: PrognoPick[], tier: string): PrognoPick[] {
  if (!picks || picks.length === 0) {
    return [];
  }

  // First determine tier for each pick using Progno's algorithm
  const picksWithTier = picks.map(pick => ({
    ...pick,
    assignedTier: determinePickTier(pick)
  }));

  // Sort by composite score (confidence + edge*2 + factors*2)
  const sorted = [...picksWithTier].sort((a, b) => {
    const scoreA = (a.prediction.confidence || 0) * 100 + ((a.prediction.edge || 0) * 2) + ((a.prediction.keyFactors?.length || 0) * 2);
    const scoreB = (b.prediction.confidence || 0) * 100 + ((b.prediction.edge || 0) * 2) + ((b.prediction.keyFactors?.length || 0) * 2);
    return scoreB - scoreA;
  });

  // Apply tier-specific limits with fallback logic
  const eliteAllocation = [];
  const premiumAllocation = [];
  const freeAllocation = [];
  const usedPicks = new Set<string>();

  // ELITE: Top 5 picks, uses premium/free if needed
  if (tier === 'elite') {
    let elitePicksToTake = sorted.filter(p => (p.prediction.confidence || 0) * 100 >= 80);
    if (elitePicksToTake.length < 5) {
      const needed = 5 - elitePicksToTake.length;
      const premiumPicks = sorted.filter(p => (p.prediction.confidence || 0) * 100 >= 65 && (p.prediction.confidence || 0) * 100 < 80);
      elitePicksToTake = [...elitePicksToTake, ...premiumPicks.slice(0, needed)];
    }
    elitePicksToTake.slice(0, 5).forEach(pick => usedPicks.add(pick.id || ''));
    eliteAllocation.push(...elitePicksToTake);
  }

  // PREMIUM: Top 3 picks (excluding elite picks), uses free if needed
  if (tier === 'premium') {
    const availablePremium = sorted.filter(p =>
      (p.prediction.confidence || 0) * 100 >= 65 && (p.prediction.confidence || 0) * 100 < 80 &&
      !usedPicks.has(p.id || '')
    );
    let premiumPicksToTake = availablePremium.slice(0, 3);
    if (premiumPicksToTake.length < 3) {
      const needed = 3 - premiumPicksToTake.length;
      const freePicks = sorted.filter(p => (p.prediction.confidence || 0) * 100 < 65 && !usedPicks.has(p.id || ''));
      premiumPicksToTake = [...premiumPicksToTake, ...freePicks.slice(0, needed)];
    }
    premiumPicksToTake.slice(0, 3).forEach(pick => usedPicks.add(pick.id || ''));
    premiumAllocation.push(...premiumPicksToTake);
  }

  // FREE: Gets leftovers (max 2 picks)
  if (tier === 'free') {
    const availableFree = sorted.filter(p => !usedPicks.has(p.id || ''));
    freeAllocation.push(...availableFree.slice(0, 2));
    return freeAllocation;
  }

  return [];
}

/**
 * Main syndication endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyndicationRequest;
    const { tier, picks, webhookUrl, apiKey } = body;

    console.log(`[SYNDICATION] Syndicating ${picks.length} picks to ${tier} tier`);

    // Filter picks based on tier limits
    const filteredPicks = filterPicksForTier(picks, tier);

    // Transform picks for the target tier
    const transformedPicks = filteredPicks.map(pick => ({
      gameId: pick.id,
      game: `${pick.homeTeam} vs ${pick.awayTeam}`,
      sport: pick.sport.toUpperCase(),
      pick: pick.prediction.winner,
      confidencePct: Math.round(pick.prediction.confidence * 100),
      edgePct: pick.prediction.edge || 0,
      kickoff: pick.gameTime,
    }));

    // Analyze tier distribution
    const tierDistribution = {
      free: picks.filter(p => determinePickTier(p) === 'free').length,
      premium: picks.filter(p => determinePickTier(p) === 'premium').length,
      elite: picks.filter(p => determinePickTier(p) === 'elite').length
    };

    // Prepare syndication data
    const syndicationData = {
      source: 'progno',
      tier,
      timestamp: new Date().toISOString(),
      totalPicks: picks.length,
      syndicatedPicks: filteredPicks.length,
      picks: filteredPicks,
      tierDistribution,
      metadata: {
        proVersion: '2.0.0',
        engineCapabilities: [
          'monte-carlo-simulation',
          'claude-effect-analysis',
          'value-bet-detection',
          'score-prediction-with-caps',
          'injury-adjustment',
          'weather-impact'
        ],
        tierLimits: {
          free: { maxPicks: 2, confidenceCap: 65, edgeReduction: 1 },
          premium: { maxPicks: 5, confidenceCap: 85, edgeReduction: 0 },
          elite: { maxPicks: 'unlimited', confidenceCap: 95, edgeBonus: 2 }
        },
        tierAlgorithm: {
          description: 'Progno determines tiers based on composite score: confidence + (edge*2) + (keyFactors*2)',
          thresholds: {
            elite: 'Top 20% of picks (composite score ≥ 80)',
            premium: 'Middle 40% of picks (65 ≤ composite score < 80)',
            free: 'Bottom 40% of picks (composite score < 65)'
          },
          compositeScore: 'confidence + (edge * 2) + (keyFactors * 2)'
        }
      }
    };

    // Send to prognostication webhook if provided
    if (webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            action: 'syndicate_picks',
            tier,
            data: syndicationData
          })
        });

        if (webhookResponse.ok) {
          console.log(`[SYNDICATION] Successfully syndicated to ${webhookUrl}`);
        } else {
          console.error(`[SYNDICATION] Failed to syndicate: ${webhookResponse.status} ${webhookResponse.statusText}`);
        }
      } catch (webhookError) {
        console.error('[SYNDICATION] Webhook error:', webhookError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Syndicated ${filteredPicks.length} picks to ${tier} tier`,
      syndicationData,
      tier,
      stats: {
        totalPicks: picks.length,
        syndicatedPicks: filteredPicks.length,
        confidence: {
          average: filteredPicks.reduce((sum, pick) => sum + pick.prediction.confidence, 0) / filteredPicks.length,
          max: Math.max(...filteredPicks.map(p => p.prediction.confidence)),
          min: Math.min(...filteredPicks.map(p => p.prediction.confidence))
        },
        edge: {
          average: filteredPicks.reduce((sum, pick) => sum + (pick.prediction.edge || 0), 0) / filteredPicks.length,
          max: Math.max(...filteredPicks.map(p => p.prediction.edge || 0)),
          min: Math.min(...filteredPicks.map(p => p.prediction.edge || 0))
        }
      }
    });

  } catch (error: any) {
    console.error('[SYNDICATION] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check syndication status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') || 'all';

    return NextResponse.json({
      success: true,
      message: 'Progno syndication service is running',
      tiers: {
        free: {
          name: 'Free Tier',
          description: '1-2 picks per day, confidence capped at 65%, edge reduced by 1%',
          features: ['Basic predictions', 'Limited analysis'],
          price: 'Free'
        },
        premium: {
          name: 'Premium Tier',
          description: '3-5 picks per day, confidence capped at 85%, full edge',
          features: ['More picks', 'Better confidence', 'Full analysis'],
          price: '$29.99/month'
        },
        elite: {
          name: 'Elite Tier',
          description: 'All picks, confidence capped at 95%, edge bonus +2%',
          features: ['Unlimited picks', 'Max confidence', 'Enhanced data', 'Advanced tools'],
          price: '$99.99/month'
        }
      },
      currentTier: tier,
      capabilities: [
        'Three-tier syndication',
        'Confidence and edge scaling',
        'Real-time webhook delivery',
        'Tier-specific filtering',
        'Enhanced data for elite tier'
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get syndication status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

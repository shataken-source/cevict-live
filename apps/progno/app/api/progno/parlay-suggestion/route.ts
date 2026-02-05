import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ParlayRequest {
  numberOfLegs?: number; // 2-5 legs
  minConfidence?: number; // Minimum confidence threshold (0-100)
  minEdge?: number; // Minimum edge threshold
  weights?: {
    weather: number;
    injuries: number;
    turnoverPercentage: number;
    homeFieldAdvantage: number;
    recentForm: number;
    h2hHistory: number;
    restDays: number;
    lineMovement: number;
  };
}

/**
 * Generate parlay suggestions from live Progno predictions
 * Uses real picks from daily-card API
 */
export async function POST(request: NextRequest) {
  try {
    const body: ParlayRequest = await request.json();
    const { numberOfLegs = 3, minConfidence = 65, minEdge = 0 } = body;

    // Validate number of legs
    if (numberOfLegs < 2 || numberOfLegs > 5) {
      return NextResponse.json({
        success: false,
        error: 'Number of legs must be between 2 and 5',
        legs: [],
        totalConfidence: 0,
        potentialPayout: 0,
      }, { status: 400 });
    }

    // Fetch live picks from Progno API v2.0
    const prognoUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3010';
    let picks: any[] = [];

    try {
      const response = await fetch(`${prognoUrl}/api/progno/v2?action=predictions&limit=50`, {
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          // Transform v2 API response to legacy format
          picks = data.data.map((pred: any) => ({
            gameId: pred.gameId || pred.id,
            game: `${pred.awayTeam} @ ${pred.homeTeam}`,
            pick: pred.predictedWinner === 'home' ? pred.homeTeam : pred.awayTeam,
            confidencePct: pred.confidenceScore || Math.round(pred.winProbability * 100),
            edgePct: pred.spread?.edge ? Math.round(pred.spread.edge * 100) : 0,
            sport: pred.sport || 'NFL',
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch picks from Progno v2 API:', error);
    }

    // If no picks available, return empty suggestion
    if (picks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No picks available from Progno engine',
        legs: [],
        totalConfidence: 0,
        potentialPayout: 0,
      });
    }

    // Select top picks with highest confidence and edge for parlay
    const sortedPicks = picks
      .filter(p => p.confidencePct >= minConfidence && p.edgePct >= minEdge) // Use provided thresholds
      .sort((a, b) => {
        // Sort by quality score (edge weighted more heavily)
        const scoreA = (a.edgePct * 2.5) + a.confidencePct;
        const scoreB = (b.edgePct * 2.5) + b.confidencePct;
        return scoreB - scoreA;
      })
      .slice(0, numberOfLegs); // Top N picks based on requested legs

    if (sortedPicks.length < numberOfLegs) {
      return NextResponse.json({
        success: false,
        error: `Not enough high-quality picks for ${numberOfLegs}-leg parlay. Found ${sortedPicks.length} picks.`,
        legs: [],
        totalConfidence: 0,
        potentialPayout: 0,
      });
    }

    // Build parlay legs from real picks
    const legs = sortedPicks.map(pick => ({
      game: pick.game,
      pick: pick.pick,
      confidence: pick.confidencePct / 100,
      gameId: pick.gameId,
      sport: pick.sport,
    }));

    // Calculate total confidence (product of individual confidences)
    const totalConfidence = legs.reduce((acc, leg) => acc * leg.confidence, 1);

    // Calculate potential payout based on number of legs
    const payoutMultipliers: Record<number, number> = {
      2: 2.6,
      3: 6.0,
      4: 12.0,
      5: 24.0,
    };
    const potentialPayout = payoutMultipliers[legs.length] || 1.0;

    const suggestion = {
      success: true,
      legs,
      totalConfidence,
      potentialPayout,
      source: 'progno-live',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(suggestion);
  } catch (error: any) {
    console.error('Parlay suggestion error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get parlay suggestion' },
      { status: 500 }
    );
  }
}


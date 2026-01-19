import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface TeaserRequest {
  numberOfLegs?: number; // 2-4 legs
  points?: number; // Teaser points (4, 6, 6.5, 7, 10, etc.)
  minConfidence?: number; // Minimum confidence threshold (0-100)
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
 * Generate teaser suggestions from live Progno predictions
 * Uses real picks from daily-card API and adjusts spreads/totals
 */
export async function POST(request: NextRequest) {
  try {
    const body: TeaserRequest = await request.json();
    const { points = 6, numberOfLegs = 2, minConfidence = 60 } = body; // Defaults

    // Validate number of legs
    if (numberOfLegs < 2 || numberOfLegs > 4) {
      return NextResponse.json({
        success: false,
        error: 'Number of legs must be between 2 and 4 for teasers',
        legs: [],
        totalConfidence: 0,
        points,
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
        points,
      });
    }

    // Select picks that work well for teasers (spreads and totals)
    // Teasers work best with favorites getting more points or totals going down
    const teaserPicks = picks
      .filter(p => {
        // Prefer picks with spreads or totals
        const hasSpread = p.pick.includes('-') || p.pick.includes('+');
        const hasTotal = p.pick.toLowerCase().includes('over') || p.pick.toLowerCase().includes('under');
        return (hasSpread || hasTotal) && p.confidencePct >= minConfidence;
      })
      .sort((a, b) => {
        // Sort by confidence (higher is better for teasers)
        return b.confidencePct - a.confidencePct;
      })
      .slice(0, numberOfLegs); // Top N picks based on requested legs

    if (teaserPicks.length < numberOfLegs) {
      return NextResponse.json({
        success: false,
        error: `Not enough suitable picks for ${numberOfLegs}-leg teaser. Found ${teaserPicks.length} picks.`,
        legs: [],
        totalConfidence: 0,
        points,
      });
    }

    // Build teaser legs with adjusted spreads/totals
    const legs = teaserPicks.map(pick => {
      let adjustedSpread = 0;
      let originalSpread = 0;

      // Extract spread from pick (e.g., "Team A -3.5" -> -3.5)
      const spreadMatch = pick.pick.match(/([+-]?\d+\.?\d*)/);
      if (spreadMatch) {
        originalSpread = parseFloat(spreadMatch[1]);
        // For favorites (negative spread), add points (make it easier)
        // For underdogs (positive spread), subtract points (make it easier)
        adjustedSpread = originalSpread < 0
          ? originalSpread + points  // Favorite gets more points
          : originalSpread - points; // Underdog needs fewer points
      }

      // For totals, subtract points (make over/under easier)
      const isTotal = pick.pick.toLowerCase().includes('over') || pick.pick.toLowerCase().includes('under');
      if (isTotal && spreadMatch) {
        adjustedSpread = originalSpread - points;
      }

      return {
        game: pick.game,
        pick: pick.pick,
        adjustedSpread,
        confidence: pick.confidencePct / 100,
        gameId: pick.gameId,
        sport: pick.sport,
      };
    });

    // Calculate total confidence (product of individual confidences)
    // Teasers have higher confidence due to adjusted lines
    const baseConfidence = legs.reduce((acc, leg) => acc * leg.confidence, 1);
    const totalConfidence = Math.min(0.95, baseConfidence * 1.15); // Boost confidence for teaser

    const suggestion = {
      success: true,
      legs,
      totalConfidence,
      points,
      source: 'progno-live',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(suggestion);
  } catch (error: any) {
    console.error('Teaser suggestion error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get teaser suggestion' },
      { status: 500 }
    );
  }
}


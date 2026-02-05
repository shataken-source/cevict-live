/**
 * Narrative Calculate API - Route handler for /api/narrative/calculate
 * Calculate narrative momentum for a matchup
 */

import { NextRequest, NextResponse } from 'next/server';
import { NarrativeDetector } from '../../../lib/narrative/detector';
import { NarrativeMomentumCalculator } from '../../../lib/narrative/momentum-calculator';

/**
 * POST /api/narrative/calculate
 * Calculate narrative momentum for a team matchup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, teamName, opponentId, opponentName, gameId, context } = body;

    if (!teamId || !opponentId || !gameId) {
      return NextResponse.json(
        { success: false, error: 'teamId, opponentId, and gameId required' },
        { status: 400 }
      );
    }

    // Parse game date
    const gameDate = context?.gameDate
      ? new Date(context.gameDate)
      : new Date();

    // Initialize detector
    const detector = new NarrativeDetector();

    // Detect narratives
    const narratives = await detector.detectNarratives(
      teamId,
      opponentId,
      gameDate,
      {
        schedule: context?.schedule,
        roster: context?.roster,
        stats: context?.stats,
        news: context?.news,
        social: context?.social,
      }
    );

    // Calculate momentum
    const calculator = new NarrativeMomentumCalculator();
    const result = await calculator.calculate(
      teamId,
      opponentId,
      gameId,
      narratives
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Narrative API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}


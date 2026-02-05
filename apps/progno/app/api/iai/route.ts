/**
 * Information Asymmetry Index (IAI) API Endpoints
 * POST /api/iai/calculate - Calculate IAI for a game
 */

import { NextRequest, NextResponse } from 'next/server';
import { IAIScoringEngine } from '../../lib/iai/scoring-engine';

/**
 * POST /api/iai/calculate
 * Calculate Information Asymmetry Index
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, context } = body;

    if (!gameId || !context) {
      return NextResponse.json(
        { success: false, error: 'gameId and context required' },
        { status: 400 }
      );
    }

    // Validate required context fields
    if (context.openingLine === undefined ||
        context.currentLine === undefined ||
        context.isHomeFavorite === undefined ||
        context.publicTicketPct === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required context fields (openingLine, currentLine, isHomeFavorite, publicTicketPct)' },
        { status: 400 }
      );
    }

    // Initialize scoring engine
    const engine = new IAIScoringEngine();

    // Calculate IAI
    const result = await engine.calculate({
      openingLine: context.openingLine,
      currentLine: context.currentLine,
      isHomeFavorite: context.isHomeFavorite,
      sport: context.sport || 'NFL',
      publicTicketPct: context.publicTicketPct,
      bettingSplits: context.bettingSplits,
      recentMovements: context.recentMovements,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[IAI API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}


/**
 * CSI Calculate API - Route handler for /api/csi/calculate
 * Calculate Chaos Sensitivity Index for a game
 */

import { NextRequest, NextResponse } from 'next/server';
import { CSICalculator } from '@/lib/csi/calculator';

/**
 * POST /api/csi/calculate
 * Calculate Chaos Sensitivity Index
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

    // Validate required context
    if (!context.sport) {
      return NextResponse.json(
        { success: false, error: 'context.sport required' },
        { status: 400 }
      );
    }

    // Initialize calculator
    const calculator = new CSICalculator();

    // Calculate CSI
    const result = calculator.calculate(context);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[CSI API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}


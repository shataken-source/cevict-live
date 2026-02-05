/**
 * Temporal Relevance Decay (TRD) API Endpoints
 * POST /api/temporal/decay - Apply temporal decay to events
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalDecayCalculator } from '../../lib/temporal/decay';

/**
 * POST /api/temporal/decay
 * Apply temporal decay to events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, sport } = body;

    if (!events || !Array.isArray(events) || !sport) {
      return NextResponse.json(
        { success: false, error: 'events (array) and sport required' },
        { status: 400 }
      );
    }

    // Calculate decay
    const calculator = new TemporalDecayCalculator();
    const result = calculator.calculate(events, sport);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Temporal API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}


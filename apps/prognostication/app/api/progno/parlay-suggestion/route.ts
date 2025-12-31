import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ParlayRequest {
  weights: {
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

export async function POST(request: NextRequest) {
  try {
    const body: ParlayRequest = await request.json();
    const { weights } = body;

    // Forward to Progno API
    const prognoUrl = process.env.PROGNO_BASE_URL;
    if (!prognoUrl) {
      return NextResponse.json(
        { success: false, error: 'Progno API not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${prognoUrl.replace(/\/+$/, '')}/api/progno/parlay-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Progno parlay suggestion failed');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, suggestion: data });
  } catch (error: any) {
    console.error('Parlay suggestion error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get parlay suggestion' },
      { status: 500 }
    );
  }
}


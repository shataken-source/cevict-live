import { NextResponse } from 'next/server';

/**
 * Fetch revenue and subscriber stats from Prognostication
 */
export async function GET() {
  try {
    // Try to fetch from local dev server first, then production
    const devUrl = 'http://localhost:3005';
    const prodUrl = process.env.PROGNOSTICATION_URL || 'https://prognostication.vercel.app';

    let response: Response | null = null;

    // Try dev first
    try {
      response = await fetch(`${devUrl}/api/stats/revenue`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      // Dev not available, try production
      try {
        response = await fetch(`${prodUrl}/api/stats/revenue`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
      } catch (prodErr) {
        return NextResponse.json(
          {
            success: false,
            error: 'Prognostication API not available',
            revenue: { mrr: 0, arr: 0 },
            subscribers: {
              total: 0,
              pro: { total: 0, weekly: 0, monthly: 0 },
              elite: { total: 0, weekly: 0, monthly: 0 },
            },
          },
          { status: 200 } // Return 200 with zero values so UI doesn't break
        );
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch stats',
          revenue: { mrr: 0, arr: 0 },
          subscribers: {
            total: 0,
            pro: { total: 0, weekly: 0, monthly: 0 },
            elite: { total: 0, weekly: 0, monthly: 0 },
          },
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching prognostication stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch stats',
        revenue: { mrr: 0, arr: 0 },
        subscribers: {
          total: 0,
          pro: { total: 0, weekly: 0, monthly: 0 },
          elite: { total: 0, weekly: 0, monthly: 0 },
        },
      },
      { status: 200 }
    );
  }
}


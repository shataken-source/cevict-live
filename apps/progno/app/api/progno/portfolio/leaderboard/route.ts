/**
 * PickPortfolio API - Leaderboard
 * GET /api/progno/portfolio/leaderboard
 * Returns public portfolios sorted by ROI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicPortfolios } from '@/app/lib/pick-portfolio';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const portfolios = await getPublicPortfolios(limit);

    return NextResponse.json({
      success: true,
      data: portfolios,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

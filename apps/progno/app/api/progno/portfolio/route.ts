/**
 * PickPortfolio API - Portfolio Management
 * POST /api/progno/portfolio - Create portfolio
 * GET /api/progno/portfolio?userId=... - Get user's portfolios
 * GET /api/progno/portfolio/[id] - Get specific portfolio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPortfolio, getUserPortfolios } from '@/app/lib/pick-portfolio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, startingBankroll, strategyDescription, isPublic } = body;

    if (!userId || !name || !startingBankroll) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, name, startingBankroll',
      }, { status: 400 });
    }

    const portfolio = await createPortfolio({
      userId,
      name,
      startingBankroll,
      strategyDescription,
      isPublic,
    });

    if (!portfolio) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create portfolio',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing userId parameter',
      }, { status: 400 });
    }

    const portfolios = await getUserPortfolios(userId);

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

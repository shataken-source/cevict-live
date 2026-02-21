/**
 * PickPortfolio API - Add & Settle Picks
 * POST /api/progno/portfolio/picks - Add pick
 * PATCH /api/progno/portfolio/picks - Settle pick
 * GET /api/progno/portfolio/picks?portfolioId=... - Get picks
 */

import { NextRequest, NextResponse } from 'next/server';
import { addPickToPortfolio, settlePick, getPortfolioPicks } from '@/app/lib/pick-portfolio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      portfolioId,
      gameId,
      gameTitle,
      league,
      pickType,
      pickSide,
      pickValue,
      odds,
      stake,
      predictedProbability,
      edge,
    } = body;

    if (!portfolioId || !gameId || !gameTitle || !league || !pickType || !pickSide) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    const pick = await addPickToPortfolio({
      portfolioId,
      gameId,
      gameTitle,
      league,
      pickType,
      pickSide,
      pickValue,
      odds,
      stake,
      predictedProbability,
      edge,
    });

    if (!pick) {
      return NextResponse.json({
        success: false,
        error: 'Failed to add pick',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: pick,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { pickId, status, pnl } = body;

    if (!pickId || !status || pnl === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: pickId, status, pnl',
      }, { status: 400 });
    }

    const success = await settlePick({ pickId, status, pnl });

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to settle pick',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pick settled successfully',
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
    const portfolioId = searchParams.get('portfolioId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!portfolioId) {
      return NextResponse.json({
        success: false,
        error: 'Missing portfolioId parameter',
      }, { status: 400 });
    }

    const picks = await getPortfolioPicks(portfolioId, limit);

    return NextResponse.json({
      success: true,
      data: picks,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

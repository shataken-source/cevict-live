/**
 * GET /api/progno/portfolio/[id] - Get single portfolio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio } from '@/lib/pick-portfolio';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing portfolio id' }, { status: 400 });
    }

    const portfolio = await getPortfolio(id);
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
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

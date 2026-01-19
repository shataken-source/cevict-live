/**
 * Travel Recommendation API Endpoint
 * Combines weather + holidays + location for PROGNO predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTravelRecommendation } from '../../../public-apis-integration';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const country = searchParams.get('country') || 'US';

    if (!location || !startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['location', 'startDate', 'endDate'],
          optional: ['country']
        },
        { status: 400 }
      );
    }

    const recommendation = await getTravelRecommendation(
      location,
      new Date(startDate),
      new Date(endDate),
      country
    );

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Failed to generate recommendation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendation
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, startDate, endDate, country = 'US' } = body;

    if (!location || !startDate || !endDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['location', 'startDate', 'endDate'],
          optional: ['country']
        },
        { status: 400 }
      );
    }

    const recommendation = await getTravelRecommendation(
      location,
      new Date(startDate),
      new Date(endDate),
      country
    );

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Failed to generate recommendation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendation
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


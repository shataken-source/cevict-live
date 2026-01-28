/**
 * Get Unified Reviews API
 * Simple endpoint to fetch reviews for a property/vessel/captain
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reviewType = searchParams.get('review_type') as any;
    const wtvPropertyId = searchParams.get('wtv_property_id');
    const gccVesselId = searchParams.get('gcc_vessel_id');
    const gccCaptainId = searchParams.get('gcc_captain_id');
    const status = searchParams.get('status') as 'approved' | 'pending' | 'all' | null;

    if (!reviewType) {
      return NextResponse.json(
        { error: 'review_type query parameter required' },
        { status: 400 }
      );
    }

    // Get reviews
    const reviews = await getReviewsForEntity(reviewType, {
      wtv_property_id: wtvPropertyId || undefined,
      gcc_vessel_id: gccVesselId || undefined,
      gcc_captain_id: gccCaptainId || undefined,
      status: status || 'approved',
    });

    // Get average rating and count
    const avgRating = await getAverageRating(reviewType, {
      wtv_property_id: wtvPropertyId || undefined,
      gcc_vessel_id: gccVesselId || undefined,
      gcc_captain_id: gccCaptainId || undefined,
    });

    const count = await getReviewCount(reviewType, {
      wtv_property_id: wtvPropertyId || undefined,
      gcc_vessel_id: gccVesselId || undefined,
      gcc_captain_id: gccCaptainId || undefined,
    });

    return NextResponse.json({
      success: true,
      reviews,
      average_rating: avgRating,
      review_count: count,
    });
  } catch (error: any) {
    console.error('Error fetching unified reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unified reviews', details: error.message },
      { status: 500 }
    );
  }
}

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get reviews (inline function)
    let query = supabaseAdmin
      .from('unified_reviews')
      .select('*')
      .eq('review_type', reviewType);

    if (wtvPropertyId) {
      query = query.eq('wtv_property_id', wtvPropertyId);
    }
    if (gccVesselId) {
      query = query.eq('gcc_vessel_id', gccVesselId);
    }
    if (gccCaptainId) {
      query = query.eq('gcc_captain_id', gccCaptainId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: reviews, error: reviewsError } = await query.order('created_at', { ascending: false });

    // Get average rating using SQL function
    const { data: avgRating, error: avgError } = await supabaseAdmin.rpc('get_average_rating', {
      p_review_type: reviewType,
      p_wtv_property_id: wtvPropertyId || null,
      p_gcc_vessel_id: gccVesselId || null,
      p_gcc_captain_id: gccCaptainId || null,
    });

    // Get review count using SQL function
    const { data: count, error: countError } = await supabaseAdmin.rpc('get_review_count', {
      p_review_type: reviewType,
      p_wtv_property_id: wtvPropertyId || null,
      p_gcc_vessel_id: gccVesselId || null,
      p_gcc_captain_id: gccCaptainId || null,
    });

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      average_rating: avgRating || 0,
      review_count: count || 0,
    });
  } catch (error: any) {
    console.error('Error fetching unified reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unified reviews', details: error.message },
      { status: 500 }
    );
  }
}

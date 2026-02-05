/**
 * Create Unified Review API
 * Simple endpoint to create cross-platform reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reviewData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    if (!reviewData || !reviewData.review_type || !reviewData.rating) {
      return NextResponse.json(
        { error: 'reviewData with review_type and rating required' },
        { status: 400 }
      );
    }

    // Verify user exists in shared_users (using admin client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sharedUser } = await supabaseAdmin
      .from('shared_users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!sharedUser) {
      // Auto-create shared user if doesn't exist
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        await supabaseAdmin
          .from('shared_users')
          .insert({
            id: userId,
            email: authUser.user.email,
            gcc_active: true,
            last_gcc_activity: new Date().toISOString(),
          });
      } else {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    // Create unified review directly (inline function to avoid import issues)
    const reviewPayload: any = {
      user_id: userId,
      review_type: reviewData.review_type,
      rating: reviewData.rating,
      platform: reviewData.platform || 'gcc',
      status: 'pending',
      photos: [],
    };

    // Add optional fields
    if (reviewData.title) reviewPayload.title = reviewData.title;
    if (reviewData.content) reviewPayload.content = reviewData.content;
    if (reviewData.wtv_property_id) reviewPayload.wtv_property_id = reviewData.wtv_property_id;
    if (reviewData.wtv_booking_id) reviewPayload.wtv_booking_id = reviewData.wtv_booking_id;
    if (reviewData.gcc_vessel_id) reviewPayload.gcc_vessel_id = reviewData.gcc_vessel_id;
    if (reviewData.gcc_booking_id) reviewPayload.gcc_booking_id = reviewData.gcc_booking_id;
    if (reviewData.gcc_captain_id) reviewPayload.gcc_captain_id = reviewData.gcc_captain_id;
    if (reviewData.unified_booking_id) reviewPayload.unified_booking_id = reviewData.unified_booking_id;
    if (reviewData.communication_rating) reviewPayload.communication_rating = reviewData.communication_rating;
    if (reviewData.value_rating) reviewPayload.value_rating = reviewData.value_rating;
    if (reviewData.cleanliness_rating) reviewPayload.cleanliness_rating = reviewData.cleanliness_rating;
    if (reviewData.location_rating) reviewPayload.location_rating = reviewData.location_rating;
    if (reviewData.experience_rating) reviewPayload.experience_rating = reviewData.experience_rating;
    if (reviewData.photos) reviewPayload.photos = reviewData.photos;

    const { data: review, error: reviewError } = await supabaseAdmin
      .from('unified_reviews')
      .insert(reviewPayload)
      .select()
      .single();

    if (reviewError || !review) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json(
        { error: 'Failed to create unified review', details: reviewError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review,
      message: 'Unified review created successfully',
    });
  } catch (error: any) {
    console.error('Error creating unified review:', error);
    return NextResponse.json(
      { error: 'Failed to create unified review', details: error.message },
      { status: 500 }
    );
  }
}

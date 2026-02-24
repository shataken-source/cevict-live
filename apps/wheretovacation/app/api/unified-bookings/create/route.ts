/**
 * Create Unified Booking API
 * Requires authenticated user; userId is taken from session, not request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUnifiedBooking } from '@/lib/unified-bookings';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Sign in required' },
        { status: 401 }
      );
    }
    const userId = user.id;

    const body = await request.json();
    const { bookingData } = body;

    if (!bookingData || !bookingData.booking_type) {
      return NextResponse.json(
        { error: 'bookingData with booking_type required' },
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
            wtv_active: true,
            last_wtv_activity: new Date().toISOString(),
          });
      } else {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    // Create unified booking
    const booking = await createUnifiedBooking(userId, bookingData);

    if (!booking) {
      return NextResponse.json(
        { error: 'Failed to create unified booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
      message: 'Unified booking created successfully',
    });
  } catch (error: any) {
    console.error('Error creating unified booking:', error);
    return NextResponse.json(
      { error: 'Failed to create unified booking', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * API endpoint to create bookings from Finn concierge
 * Processes booking flow completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...bookingData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    // Process booking creation
    // This would typically create a booking in the database
    console.log('Booking created via Finn:', { userId, bookingData });

    // In production, insert into bookings table:
    // const supabase = getSupabaseAdminClient();
    // if (supabase) {
    //   const { data, error } = await supabase.from('bookings').insert({
    //     user_id: userId,
    //     ...bookingData,
    //     status: 'pending',
    //     created_at: new Date().toISOString(),
    //   });
    // }

    return NextResponse.json({ 
      success: true, 
      message: 'Booking request received. We will contact you shortly to confirm details.',
      bookingId: `temp-${Date.now()}` // Temporary ID
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

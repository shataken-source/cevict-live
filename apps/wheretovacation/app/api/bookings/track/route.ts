/**
 * API endpoint to track bookings for anniversary detection
 * Used by Finn concierge to learn about user booking patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, bookingDate, serviceType, specialOccasion } = await request.json();

    if (!userId || !bookingDate) {
      return NextResponse.json(
        { error: 'userId and bookingDate required' },
        { status: 400 }
      );
    }

    // Store booking tracking data (for anniversary detection)
    // This would typically go to a bookings_tracking table
    console.log('Booking tracked:', { userId, bookingDate, serviceType, specialOccasion });

    // In production, insert into database:
    // const supabase = getSupabaseAdminClient();
    // if (supabase) {
    //   await supabase.from('bookings_tracking').insert({
    //     user_id: userId,
    //     booking_date: bookingDate,
    //     service_type: serviceType,
    //     special_occasion: specialOccasion,
    //   });
    // }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking booking:', error);
    return NextResponse.json(
      { error: 'Failed to track booking' },
      { status: 500 }
    );
  }
}

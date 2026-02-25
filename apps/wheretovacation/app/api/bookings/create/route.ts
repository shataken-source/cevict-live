/**
 * API endpoint to create bookings from Finn concierge
 * Processes booking flow completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getServerUser } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accommodation_id, check_in, check_out, guests, special_requests } = body;

    if (!accommodation_id || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'accommodation_id, check_in, and check_out are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      accommodation_id,
      check_in,
      check_out,
      guests: Number(guests) || 1,
      special_requests: special_requests || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select('id').single();

    if (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking request received. We will contact you shortly to confirm details.',
      bookingId: data.id,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

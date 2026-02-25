/**
 * API endpoint to create bookings from Finn concierge
 * Processes booking flow completion
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { captain_id, trip_type, trip_date, start_time, number_of_guests, special_requests } = req.body;

    if (!captain_id || !trip_date) {
      return res.status(400).json({ error: 'captain_id and trip_date are required' });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      captain_id,
      trip_type: trip_type || 'charter',
      trip_date,
      start_time: start_time || null,
      number_of_guests: Number(number_of_guests) || 1,
      special_requests: special_requests || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select('id').single();

    if (error) {
      console.error('Error creating booking:', error);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking request received. We will contact you shortly to confirm details.',
      bookingId: data.id,
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}

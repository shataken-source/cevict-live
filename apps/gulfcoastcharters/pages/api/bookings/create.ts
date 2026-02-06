/**
 * API endpoint to create bookings from Finn concierge
 * Processes booking flow completion
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, ...bookingData } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Process booking creation
    // This would typically create a booking in the database
    console.log('Booking created via Finn:', { userId, bookingData });

    // In production, insert into bookings table:
    const supabase = getSupabaseAdmin();
    // await supabase.from('bookings').insert({
    //   user_id: userId,
    //   ...bookingData,
    //   status: 'pending',
    //   created_at: new Date().toISOString(),
    // });

    return res.status(200).json({ 
      success: true, 
      message: 'Booking request received. We will contact you shortly to confirm details.',
      bookingId: `temp-${Date.now()}` // Temporary ID
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}

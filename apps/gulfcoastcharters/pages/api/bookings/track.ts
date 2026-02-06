/**
 * API endpoint to track bookings for anniversary detection
 * Used by Finn concierge to learn about user booking patterns
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
    const { userId, bookingDate, serviceType, specialOccasion } = req.body;

    if (!userId || !bookingDate) {
      return res.status(400).json({ error: 'userId and bookingDate required' });
    }

    // Store booking tracking data (for anniversary detection)
    // This would typically go to a bookings_tracking table
    // For now, we'll just log it
    console.log('Booking tracked:', { userId, bookingDate, serviceType, specialOccasion });

    // In production, insert into database:
    const supabase = getSupabaseAdmin();
    // await supabase.from('bookings_tracking').insert({
    //   user_id: userId,
    //   booking_date: bookingDate,
    //   service_type: serviceType,
    //   special_occasion: specialOccasion,
    // });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error tracking booking:', error);
    return res.status(500).json({ error: 'Failed to track booking' });
  }
}

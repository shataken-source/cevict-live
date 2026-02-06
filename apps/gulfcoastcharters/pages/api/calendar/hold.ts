/**
 * API endpoint for booking holds
 * POST /api/calendar/hold (create hold)
 * DELETE /api/calendar/hold/:holdId (release hold)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();

    if (req.method === 'POST') {
      const { availabilityId, bookingData } = req.body;

      if (!availabilityId) {
        return res.status(400).json({ error: 'Missing availabilityId' });
      }

      // Check if availability is still available
      const { data: availability, error: availError } = await supabase
        .from('calendar_availability')
        .select('*')
        .eq('availability_id', availabilityId)
        .single();

      if (availError || !availability) {
        return res.status(404).json({ error: 'Availability not found' });
      }

      if (availability.status !== 'available') {
        return res.status(400).json({ error: 'Time slot is no longer available' });
      }

      // Create hold (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { data: hold, error: holdError } = await supabase
        .from('booking_holds')
        .insert({
          user_id: user.id,
          availability_id: availabilityId,
          expires_at: expiresAt.toISOString(),
          booking_data: bookingData || {}
        })
        .select()
        .single();

      if (holdError) {
        console.error('Error creating hold:', holdError);
        return res.status(500).json({ error: 'Failed to create hold' });
      }

      // Update availability status to 'hold'
      await supabase
        .from('calendar_availability')
        .update({ status: 'hold' })
        .eq('availability_id', availabilityId);

      return res.status(200).json({ success: true, hold });
    }

    if (req.method === 'DELETE') {
      const { holdId } = req.query;

      if (!holdId) {
        return res.status(400).json({ error: 'Missing holdId' });
      }

      // Get hold to verify ownership
      const { data: hold, error: holdError } = await supabase
        .from('booking_holds')
        .select('*, calendar_availability!inner(availability_id)')
        .eq('hold_id', holdId)
        .single();

      if (holdError || !hold) {
        return res.status(404).json({ error: 'Hold not found' });
      }

      if (hold.user_id !== user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Delete hold
      await supabase
        .from('booking_holds')
        .delete()
        .eq('hold_id', holdId);

      // Update availability back to available
      await supabase
        .from('calendar_availability')
        .update({ status: 'available' })
        .eq('availability_id', hold.availability_id);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in booking hold:', error);
    return res.status(500).json({ error: error.message });
  }
}

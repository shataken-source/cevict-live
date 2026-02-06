/**
 * API endpoint for waitlist
 * POST /api/calendar/waitlist (join waitlist)
 * GET /api/calendar/waitlist?captainId=xxx&date=xxx (get waitlist)
 * DELETE /api/calendar/waitlist/:waitlistId (remove from waitlist)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';
import { requireRole } from '../_lib/rbac';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'POST') {
      const { user } = await getAuthedUser(req, res);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { captainId, desiredDate, tripType, timeSlotPreference } = req.body;

      if (!captainId || !desiredDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get current position (count existing waitlist entries for this date)
      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('captain_id', captainId)
        .eq('desired_date', desiredDate)
        .eq('status', 'waiting');

      const position = (count || 0) + 1;

      // Set expiration (60 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      const { data: waitlistEntry, error } = await supabase
        .from('waitlist')
        .insert({
          user_id: user.id,
          captain_id: captainId,
          desired_date: desiredDate,
          trip_type: tripType,
          time_slot_preference: timeSlotPreference,
          position,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error joining waitlist:', error);
        return res.status(500).json({ error: 'Failed to join waitlist' });
      }

      return res.status(200).json({ success: true, waitlistEntry });
    }

    if (req.method === 'GET') {
      const { captainId, date } = req.query;

      if (!captainId || !date) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const { data: waitlist, error } = await supabase
        .from('waitlist')
        .select('*, users!inner(id, name, email)')
        .eq('captain_id', captainId)
        .eq('desired_date', date)
        .eq('status', 'waiting')
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching waitlist:', error);
        return res.status(500).json({ error: 'Failed to fetch waitlist' });
      }

      return res.status(200).json({ waitlist: waitlist || [] });
    }

    if (req.method === 'DELETE') {
      const { user } = await getAuthedUser(req, res);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { waitlistId } = req.query;

      if (!waitlistId) {
        return res.status(400).json({ error: 'Missing waitlistId' });
      }

      // Verify ownership
      const { data: entry, error: entryError } = await supabase
        .from('waitlist')
        .select('*')
        .eq('waitlist_id', waitlistId)
        .single();

      if (entryError || !entry) {
        return res.status(404).json({ error: 'Waitlist entry not found' });
      }

      if (entry.user_id !== user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await supabase
        .from('waitlist')
        .update({ status: 'cancelled' })
        .eq('waitlist_id', waitlistId);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in waitlist:', error);
    return res.status(500).json({ error: error.message });
  }
}

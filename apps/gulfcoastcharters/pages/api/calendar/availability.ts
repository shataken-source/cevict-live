/**
 * API endpoint for calendar availability
 * GET /api/calendar/availability?captainId=xxx&startDate=xxx&endDate=xxx
 * POST /api/calendar/availability (create/update availability)
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

    if (req.method === 'GET') {
      const { captainId, startDate, endDate } = req.query;

      if (!captainId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const { data: availability, error } = await supabase
        .from('calendar_availability')
        .select('*')
        .eq('captain_id', captainId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({ error: 'Failed to fetch availability' });
      }

      return res.status(200).json({ availability: availability || [] });
    }

    if (req.method === 'POST') {
      const authed = await requireRole(req, res, ['captain', 'admin']);
      if (!authed) return;

      const { availability } = req.body;

      if (!availability || !Array.isArray(availability)) {
        return res.status(400).json({ error: 'Invalid availability data' });
      }

      // Upsert availability records
      const { data, error } = await supabase
        .from('calendar_availability')
        .upsert(availability, { onConflict: 'captain_id,date,time_slot,start_time,end_time' })
        .select();

      if (error) {
        console.error('Error updating availability:', error);
        return res.status(500).json({ error: 'Failed to update availability' });
      }

      return res.status(200).json({ success: true, availability: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in calendar availability:', error);
    return res.status(500).json({ error: error.message });
  }
}

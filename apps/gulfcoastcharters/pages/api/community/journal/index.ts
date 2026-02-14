/**
 * GET /api/community/journal - List journal entries for current user (or ?userId= for own)
 * POST /api/community/journal - Create journal entry. Body: { tripDate, locationName?, notes?, ... }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { userId = user.id, limit = '50' } = req.query;
      const targetUserId = (userId as string) === 'me' ? user.id : (userId as string);

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('fishing_journal_entries')
        .select('entry_id, user_id, trip_date, trip_start_time, trip_end_time, location_name, location_gps, weather_data, notes, total_fish_caught, total_hours, created_at')
        .eq('user_id', targetUserId)
        .order('trip_date', { ascending: false })
        .limit(Math.min(Number(limit) || 50, 100));

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ entries: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { trip_date, trip_start_time, trip_end_time, location_name, location_gps, weather_data, notes, total_fish_caught, total_hours } = body;
      if (!trip_date) return res.status(400).json({ error: 'trip_date required (YYYY-MM-DD)' });

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('fishing_journal_entries')
        .insert({
          user_id: user.id,
          trip_date,
          trip_start_time: trip_start_time || null,
          trip_end_time: trip_end_time || null,
          location_name: location_name || null,
          location_gps: location_gps || null,
          weather_data: weather_data || null,
          notes: notes || null,
          total_fish_caught: total_fish_caught ?? 0,
          total_hours: total_hours ?? null,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ entry: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

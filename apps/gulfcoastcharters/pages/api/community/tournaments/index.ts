/**
 * GET /api/community/tournaments - List tournaments
 * Query: ?status=registration_open|active|completed
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { status } = req.query;

    let query = supabase
      .from('tournaments')
      .select('tournament_id, title, tournament_type, description, target_species, status, registration_start, registration_end, tournament_start, tournament_end, entry_fee, prize_structure, rules, created_at')
      .order('tournament_start', { ascending: false });

    if (typeof status === 'string' && status) {
      query = query.eq('status', status);
    }

    const { data: tournaments, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ tournaments: tournaments ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

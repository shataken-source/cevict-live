/**
 * GET /api/community/tournaments/leaderboard?tournamentId=uuid - Get tournament leaderboard
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

  const { tournamentId } = req.query;
  if (!tournamentId || typeof tournamentId !== 'string') {
    return res.status(400).json({ error: 'tournamentId required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entries, error } = await supabase
      .from('tournament_entries')
      .select('entry_id, user_id, total_score, final_rank, registered_at')
      .eq('tournament_id', tournamentId)
      .order('total_score', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leaderboard: entries ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

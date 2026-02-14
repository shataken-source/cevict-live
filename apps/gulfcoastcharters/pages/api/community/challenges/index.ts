/**
 * GET /api/community/challenges - List active daily challenges
 * POST /api/community/challenges/complete - Mark a challenge complete (use /api/community/challenges/complete.ts)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { type, limit = '20' } = req.query;

    let query = supabase
      .from('daily_challenges')
      .select('challenge_id, challenge_type, title, description, points_reward, action_required, target_count, reset_frequency, starts_at, ends_at, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 20, 50));

    if (typeof type === 'string' && type) {
      query = query.eq('challenge_type', type);
    }

    const { data: challenges, error } = await query;

    if (error) {
      console.error('Challenges list error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ challenges: challenges ?? [] });
  } catch (error: any) {
    console.error('Error listing challenges:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

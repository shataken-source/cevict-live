/**
 * GET /api/community/buddies - List buddy matches for current user
 * Query: ?status=pending|accepted
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
    const { user } = await getAuthedUser(req, res);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { status } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('buddy_matches')
      .select('match_id, user_id, matched_user_id, match_score, match_reasons, status, created_at')
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`);

    if (typeof status === 'string' && status) {
      query = query.eq('status', status);
    }

    const { data: matches, error } = await query.order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ matches: matches ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

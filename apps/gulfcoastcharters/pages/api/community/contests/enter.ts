/**
 * POST /api/community/contests/enter - Submit an entry to a contest (link existing feed post)
 * Body: { contestId: string, feedId: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { contestId, feedId } = body;
    if (!contestId || !feedId) return res.status(400).json({ error: 'contestId and feedId required' });

    const supabase = getSupabaseAdmin();
    const { data: contest } = await supabase.from('photo_contests').select('contest_id, status, submission_start, submission_end').eq('contest_id', contestId).single();
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    if (contest.status !== 'open') return res.status(400).json({ error: 'Contest not open for submissions' });

    const { data, error } = await supabase
      .from('contest_entries')
      .insert({ contest_id: contestId, user_id: user.id, feed_id: feedId })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ entry: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

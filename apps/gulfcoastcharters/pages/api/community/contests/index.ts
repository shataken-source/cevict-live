/**
 * GET /api/community/contests - List photo contests
 * Query: ?status=open|voting|closed
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
      .from('photo_contests')
      .select('contest_id, title, category, description, status, submission_start, submission_end, voting_start, voting_end, winners_announced_at, created_at')
      .order('submission_start', { ascending: false });

    if (typeof status === 'string' && status) {
      query = query.eq('status', status);
    }

    const { data: contests, error } = await query;

    if (error) {
      console.error('Contests list error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ contests: contests ?? [] });
  } catch (error: any) {
    console.error('Error listing contests:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

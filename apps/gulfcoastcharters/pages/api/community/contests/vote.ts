/**
 * POST /api/community/contests/vote - Vote for a contest entry
 * Body: { contestId: string, entryId: string }
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
    const { contestId, entryId } = body;
    if (!contestId || !entryId) return res.status(400).json({ error: 'contestId and entryId required' });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('contest_votes')
      .upsert(
        { contest_id: contestId, entry_id: entryId, user_id: user.id },
        { onConflict: 'contest_id,entry_id,user_id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ vote: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

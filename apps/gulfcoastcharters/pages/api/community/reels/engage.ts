/**
 * POST /api/community/reels/engage - Like a reel
 * Body: { reelId: string }
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
    const { reelId } = body;
    if (!reelId) return res.status(400).json({ error: 'reelId required' });

    const supabase = getSupabaseAdmin();
    const { data: reelEngagement } = await supabase.from('reel_engagement').select('engagement_id').eq('reel_id', reelId).eq('user_id', user.id).maybeSingle();
    if (reelEngagement) return res.status(200).json({ success: true, alreadyLiked: true });

    const { error } = await supabase.from('reel_engagement').insert({ reel_id: reelId, user_id: user.id });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

/**
 * POST /api/community/feed/engage - Like, hot, helpful, or save on a feed post
 * Body: { feedId: string, engagementType: 'like' | 'hot' | 'helpful' | 'save' }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

const validTypes = ['like', 'hot', 'helpful', 'save'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { feedId, engagementType } = body;
    if (!feedId || !engagementType || !validTypes.includes(engagementType)) {
      return res.status(400).json({ error: 'feedId and engagementType (like|hot|helpful|save) required' });
    }

    const supabase = getSupabaseAdmin();

    const { error: insertError } = await supabase
      .from('feed_engagement')
      .upsert(
        { feed_id: feedId, user_id: user.id, engagement_type: engagementType },
        { onConflict: 'feed_id,user_id,engagement_type' }
      );

    if (insertError) {
      console.error('Feed engage error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ success: true, engagementType });
  } catch (error: any) {
    console.error('Error engaging feed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * POST /api/community/buddies/rate - Rate a fishing buddy after a trip
 * Body: { ratedUserId: string, rating: number (1-5), comment? }
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
    const { ratedUserId, rating, comment } = body;
    if (!ratedUserId || rating == null) return res.status(400).json({ error: 'ratedUserId and rating (1-5) required' });
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('buddy_ratings')
      .upsert(
        { rater_id: user.id, rated_user_id: ratedUserId, rating: r, comment: comment || null },
        { onConflict: 'rater_id,rated_user_id,trip_id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rating: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

/**
 * GET /api/community/rewards - List rewards catalog (active)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('reward_id, title, description, reward_type, points_cost, value, image_url, available_quantity, redemption_limit_per_user')
      .eq('active', true)
      .order('points_cost');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rewards: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

/**
 * POST /api/community/rewards/redeem - Redeem a reward with points
 * Body: { rewardId: string } - points deducted per catalog; redemption_code generated
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rewardId = body.rewardId;
    if (!rewardId) return res.status(400).json({ error: 'rewardId required' });

    const supabase = getSupabaseAdmin();
    const { data: reward } = await supabase.from('rewards_catalog').select('reward_id, points_cost, available_quantity, redemption_limit_per_user').eq('reward_id', rewardId).eq('active', true).single();
    if (!reward) return res.status(404).json({ error: 'Reward not found or inactive' });

    const code = 'GCC-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const { data, error } = await supabase
      .from('rewards_redemptions')
      .insert({
        reward_id: rewardId,
        user_id: user.id,
        points_spent: reward.points_cost,
        redemption_code: code,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ redemption: data, redemptionCode: code });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

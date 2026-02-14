/**
 * GET /api/user/media-tier
 * Returns current user's media tier and limits (free / pro / captain) for PWA media strategy.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser } from '../_lib/supabase';
import { getSupabaseAdmin } from '../_lib/supabase';
import { MEDIA_LIMITS, getMediaTierFromCaptainSubscription, type MediaTier } from '@/lib/media-tiers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { user } = await getAuthedUser(req, res);
  if (!user) {
    return res.status(200).json({ tier: 'free', limits: MEDIA_LIMITS.free });
  }
  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from('captain_subscriptions')
    .select('plan_type, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const tier: MediaTier = getMediaTierFromCaptainSubscription(sub?.plan_type ?? null, sub?.status ?? null);
  return res.status(200).json({ tier, limits: MEDIA_LIMITS[tier] });
}

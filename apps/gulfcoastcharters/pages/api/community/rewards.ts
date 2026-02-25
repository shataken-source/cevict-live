/**
 * Rewards Store API
 * GET  /api/community/rewards                         — browse rewards catalog
 *   ?type=charter_credit|gear_merchandise|...          — filter by type
 * GET  /api/community/rewards?action=history           — user's redemption history
 * POST /api/community/rewards { action: 'redeem', rewardId } — redeem a reward
 * POST /api/community/rewards { action: 'cancel', redemptionId } — cancel pending redemption
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET: catalog or history ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'catalog').toLowerCase();

      // ── Redemption history (requires auth) ──
      if (action === 'history') {
        const { user, error: authError } = await getAuthedUser(req, res);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
        const offset = (page - 1) * limit;

        const { data: redemptions, error } = await admin
          .from('rewards_redemptions')
          .select('redemption_id, reward_id, points_spent, redemption_code, status, fulfilled_at, created_at, rewards_catalog(title, description, reward_type, image_url, value)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) return res.status(500).json({ error: error.message });

        return res.status(200).json({
          success: true,
          redemptions: redemptions || [],
          page,
          limit,
          hasMore: (redemptions || []).length === limit,
        });
      }

      // ── Browse catalog (public) ──
      const rewardType = String(req.query.type || '').trim();

      let query = admin
        .from('rewards_catalog')
        .select('reward_id, title, description, reward_type, points_cost, value, image_url, available_quantity, redemption_limit_per_user')
        .eq('active', true)
        .order('points_cost', { ascending: true });

      if (rewardType) {
        query = query.eq('reward_type', rewardType);
      }

      const { data: rewards, error: catalogError } = await query;
      if (catalogError) return res.status(500).json({ error: catalogError.message });

      // If authenticated, check how many times user has redeemed each
      let userRedemptionCounts = new Map<string, number>();
      let userPoints = 0;
      let catalogUser: any = null;
      try { const result = await getAuthedUser(req, res); catalogUser = result.user; } catch { /* not logged in */ }
      if (catalogUser) {
        const rewardIds = (rewards || []).map(r => r.reward_id);
        if (rewardIds.length > 0) {
          const { data: redemptions } = await admin
            .from('rewards_redemptions')
            .select('reward_id')
            .eq('user_id', catalogUser.id)
            .in('reward_id', rewardIds)
            .neq('status', 'cancelled');

          for (const r of (redemptions || [])) {
            userRedemptionCounts.set(r.reward_id, (userRedemptionCounts.get(r.reward_id) || 0) + 1);
          }
        }

        const { data: su } = await admin.from('shared_users').select('total_points').eq('id', catalogUser.id).maybeSingle();
        userPoints = su?.total_points || 0;
      }

      const enrichedRewards = (rewards || []).map(reward => {
        const userRedeemed = userRedemptionCounts.get(reward.reward_id) || 0;
        const canRedeem = catalogUser
          ? userPoints >= reward.points_cost
          && (reward.redemption_limit_per_user === null || userRedeemed < reward.redemption_limit_per_user)
          && (reward.available_quantity === null || reward.available_quantity > 0)
          : false;

        return {
          ...reward,
          canRedeem,
          userRedeemed,
          affordable: catalogUser ? userPoints >= reward.points_cost : null,
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      return res.status(200).json({
        success: true,
        rewards: enrichedRewards,
        userPoints: catalogUser ? userPoints : null,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: redeem or cancel ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Redeem ──
      if (action === 'redeem') {
        const { rewardId } = body;
        if (!rewardId) return res.status(400).json({ error: 'rewardId required' });

        // Get reward
        const { data: reward } = await admin
          .from('rewards_catalog')
          .select('*')
          .eq('reward_id', rewardId)
          .eq('active', true)
          .single();

        if (!reward) return res.status(404).json({ error: 'Reward not found or inactive' });

        // Check available quantity
        if (reward.available_quantity !== null && reward.available_quantity <= 0) {
          return res.status(400).json({ error: 'This reward is sold out' });
        }

        // Check per-user limit
        if (reward.redemption_limit_per_user !== null) {
          const { count } = await admin
            .from('rewards_redemptions')
            .select('redemption_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('reward_id', rewardId)
            .neq('status', 'cancelled');

          if ((count || 0) >= reward.redemption_limit_per_user) {
            return res.status(400).json({ error: `You've already redeemed this reward the maximum number of times (${reward.redemption_limit_per_user})` });
          }
        }

        // Check points balance
        const { data: su } = await admin
          .from('shared_users')
          .select('total_points')
          .eq('id', user.id)
          .maybeSingle();

        const currentPoints = su?.total_points || 0;
        if (currentPoints < reward.points_cost) {
          return res.status(400).json({
            error: 'Insufficient points',
            required: reward.points_cost,
            current: currentPoints,
          });
        }

        // Deduct points
        const { error: pointsError } = await admin
          .from('shared_users')
          .update({ total_points: currentPoints - reward.points_cost })
          .eq('id', user.id);

        if (pointsError) return res.status(500).json({ error: 'Failed to deduct points' });

        // Generate redemption code
        const redemptionCode = `GCC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // Create redemption record
        const { data: redemption, error: redeemError } = await admin
          .from('rewards_redemptions')
          .insert({
            reward_id: rewardId,
            user_id: user.id,
            points_spent: reward.points_cost,
            redemption_code: redemptionCode,
            status: 'pending',
          })
          .select()
          .single();

        if (redeemError) {
          // Refund points
          await admin.from('shared_users').update({ total_points: currentPoints }).eq('id', user.id);
          return res.status(500).json({ error: redeemError.message });
        }

        // Decrement available quantity if tracked
        if (reward.available_quantity !== null) {
          await admin
            .from('rewards_catalog')
            .update({ available_quantity: reward.available_quantity - 1 })
            .eq('reward_id', rewardId);
        }

        // Log loyalty transaction
        try {
          await admin.from('loyalty_transactions').insert({
            user_id: user.id,
            points: -reward.points_cost,
            type: 'spent',
            description: `Reward redeemed: ${reward.title}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          redemption,
          redemptionCode,
          remainingPoints: currentPoints - reward.points_cost,
          message: `Redeemed "${reward.title}" for ${reward.points_cost} points! Your code: ${redemptionCode}`,
        });
      }

      // ── Cancel pending redemption ──
      if (action === 'cancel') {
        const { redemptionId } = body;
        if (!redemptionId) return res.status(400).json({ error: 'redemptionId required' });

        // Get redemption
        const { data: redemption } = await admin
          .from('rewards_redemptions')
          .select('redemption_id, reward_id, points_spent, status')
          .eq('redemption_id', redemptionId)
          .eq('user_id', user.id)
          .single();

        if (!redemption) return res.status(404).json({ error: 'Redemption not found' });
        if (redemption.status !== 'pending') {
          return res.status(400).json({ error: `Cannot cancel a ${redemption.status} redemption` });
        }

        // Cancel and refund
        await admin
          .from('rewards_redemptions')
          .update({ status: 'cancelled' })
          .eq('redemption_id', redemptionId);

        // Refund points
        const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
        if (su) {
          await admin.from('shared_users').update({ total_points: (su.total_points || 0) + redemption.points_spent }).eq('id', user.id);
        }

        // Restore available quantity
        const { data: reward } = await admin
          .from('rewards_catalog')
          .select('available_quantity')
          .eq('reward_id', redemption.reward_id)
          .single();

        if (reward && reward.available_quantity !== null) {
          await admin
            .from('rewards_catalog')
            .update({ available_quantity: reward.available_quantity + 1 })
            .eq('reward_id', redemption.reward_id);
        }

        // Log refund
        try {
          await admin.from('loyalty_transactions').insert({
            user_id: user.id,
            points: redemption.points_spent,
            type: 'refund',
            description: `Reward cancellation refund`,
          });
        } catch { /* best-effort */ }

        return res.status(200).json({
          success: true,
          message: `Redemption cancelled. ${redemption.points_spent} points refunded.`,
          pointsRefunded: redemption.points_spent,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: redeem, cancel' });
    } catch (e: any) {
      console.error('[Rewards] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Community Leaderboard API
 * GET /api/community/leaderboard
 *   ?period=week|month|all   (default: week)
 *   ?limit=20                (default 20, max 50)
 *   ?type=points|streaks|catches  (default: points)
 *
 * Returns ranked users with points, rank badge, and streak info.
 * Drives competitive community engagement — users check back to see rankings.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';

const RANKS: { name: string; minPoints: number; color: string; icon: string }[] = [
  { name: 'Platinum', minPoints: 7000, color: '#7C3AED', icon: '👑' },
  { name: 'Gold', minPoints: 3000, color: '#F59E0B', icon: '🥇' },
  { name: 'Silver', minPoints: 1000, color: '#9CA3AF', icon: '🥈' },
  { name: 'Bronze', minPoints: 0, color: '#CD7F32', icon: '🥉' },
];

function getUserRank(points: number) {
  for (const rank of RANKS) {
    if (points >= rank.minPoints) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  const period = String(req.query.period || 'week').toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const type = String(req.query.type || 'points').toLowerCase();

  try {
    // ── Points leaderboard ──
    if (type === 'points') {
      let dateFilter: string | null = null;
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        dateFilter = weekAgo.toISOString();
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 86400000);
        dateFilter = monthAgo.toISOString();
      }

      if (dateFilter) {
        // Period-based: sum loyalty_transactions for the period
        // Use raw query via RPC or aggregate in JS
        const { data: transactions } = await admin
          .from('loyalty_transactions')
          .select('user_id, points')
          .eq('type', 'earned')
          .gte('created_at', dateFilter)
          .limit(10000);

        if (!transactions || transactions.length === 0) {
          return res.status(200).json({
            success: true,
            leaderboard: [],
            period,
            type,
            message: 'No activity this period yet. Be the first to earn points!',
          });
        }

        // Aggregate by user
        const pointsByUser = new Map<string, number>();
        for (const t of transactions) {
          pointsByUser.set(t.user_id, (pointsByUser.get(t.user_id) || 0) + (t.points || 0));
        }

        // Sort and take top N
        const sorted = Array.from(pointsByUser.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit);

        // Get user details
        const userIds = sorted.map(s => s[0]);
        let userMap = new Map<string, any>();
        if (userIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url, total_points')
            .in('id', userIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const leaderboard = sorted.map(([userId, periodPoints], index) => {
          const user = userMap.get(userId);
          const totalPoints = user?.total_points || periodPoints;
          const rank = getUserRank(totalPoints);
          return {
            position: index + 1,
            userId,
            displayName: user?.display_name || `Angler ${userId.slice(0, 6)}`,
            avatarUrl: user?.avatar_url || null,
            periodPoints,
            totalPoints,
            rank: rank.name,
            rankColor: rank.color,
            rankIcon: rank.icon,
          };
        });

        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({ success: true, leaderboard, period, type });
      }

      // All-time: use shared_users total_points
      const { data: topUsers, error } = await admin
        .from('shared_users')
        .select('id, display_name, avatar_url, total_points')
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) return res.status(500).json({ error: error.message });

      const leaderboard = (topUsers || []).map((u: any, index: number) => {
        const rank = getUserRank(u.total_points || 0);
        return {
          position: index + 1,
          userId: u.id,
          displayName: u.display_name || `Angler ${u.id.slice(0, 6)}`,
          avatarUrl: u.avatar_url || null,
          periodPoints: u.total_points || 0,
          totalPoints: u.total_points || 0,
          rank: rank.name,
          rankColor: rank.color,
          rankIcon: rank.icon,
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ success: true, leaderboard, period: 'all', type });
    }

    // ── Streaks leaderboard ──
    if (type === 'streaks') {
      const { data: topStreaks } = await admin
        .from('daily_check_ins')
        .select('user_id, streak_count, check_in_date')
        .order('streak_count', { ascending: false })
        .limit(limit * 3); // fetch extra to deduplicate

      if (!topStreaks || topStreaks.length === 0) {
        return res.status(200).json({ success: true, leaderboard: [], period: 'all', type: 'streaks' });
      }

      // Deduplicate: keep highest streak per user
      const bestStreaks = new Map<string, { streak: number; date: string }>();
      for (const s of topStreaks) {
        const existing = bestStreaks.get(s.user_id);
        if (!existing || s.streak_count > existing.streak) {
          bestStreaks.set(s.user_id, { streak: s.streak_count, date: s.check_in_date });
        }
      }

      const sorted = Array.from(bestStreaks.entries())
        .sort((a, b) => b[1].streak - a[1].streak)
        .slice(0, limit);

      const userIds = sorted.map(s => s[0]);
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await admin
          .from('shared_users')
          .select('id, display_name, avatar_url')
          .in('id', userIds);
        userMap = new Map((users || []).map(u => [u.id, u]));
      }

      const leaderboard = sorted.map(([userId, data], index) => {
        const user = userMap.get(userId);
        return {
          position: index + 1,
          userId,
          displayName: user?.display_name || `Angler ${userId.slice(0, 6)}`,
          avatarUrl: user?.avatar_url || null,
          streak: data.streak,
          lastCheckIn: data.date,
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ success: true, leaderboard, period: 'all', type: 'streaks' });
    }

    // ── Catches leaderboard ──
    if (type === 'catches') {
      let dateFilter: string | null = null;
      if (period === 'week') dateFilter = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      else if (period === 'month') dateFilter = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      let query = admin
        .from('catch_submissions')
        .select('user_id, species, weight_lbs, photo_url, location, submitted_date')
        .order('weight_lbs', { ascending: false, nullsFirst: false })
        .limit(limit * 2);

      if (dateFilter) query = query.gte('submitted_date', dateFilter);

      const { data: catches } = await query;

      if (!catches || catches.length === 0) {
        return res.status(200).json({ success: true, leaderboard: [], period, type: 'catches' });
      }

      // Deduplicate: keep biggest catch per user
      const bestCatches = new Map<string, any>();
      for (const c of catches) {
        const existing = bestCatches.get(c.user_id);
        if (!existing || (c.weight_lbs || 0) > (existing.weight_lbs || 0)) {
          bestCatches.set(c.user_id, c);
        }
      }

      const sorted = Array.from(bestCatches.entries())
        .sort((a, b) => (b[1].weight_lbs || 0) - (a[1].weight_lbs || 0))
        .slice(0, limit);

      const userIds = sorted.map(s => s[0]);
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await admin
          .from('shared_users')
          .select('id, display_name, avatar_url')
          .in('id', userIds);
        userMap = new Map((users || []).map(u => [u.id, u]));
      }

      const leaderboard = sorted.map(([userId, data], index) => {
        const user = userMap.get(userId);
        return {
          position: index + 1,
          userId,
          displayName: user?.display_name || `Angler ${userId.slice(0, 6)}`,
          avatarUrl: user?.avatar_url || null,
          species: data.species,
          weightLbs: data.weight_lbs,
          photoUrl: data.photo_url,
          location: data.location,
          date: data.submitted_date,
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ success: true, leaderboard, period, type: 'catches' });
    }

    return res.status(400).json({ error: 'Invalid type. Use: points, streaks, catches' });
  } catch (e: any) {
    console.error('[Leaderboard] Error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

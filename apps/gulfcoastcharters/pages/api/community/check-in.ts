/**
 * Daily Check-In API
 * POST /api/community/check-in              — perform daily check-in
 * GET  /api/community/check-in              — get streak info
 * GET  /api/community/check-in?action=history&limit=30 — recent check-ins
 *
 * Streak milestones with bonus points:
 *   3 days  → +25 pts
 *   7 days  → +75 pts
 *   14 days → +150 pts
 *   30 days → +500 pts
 *   60 days → +1000 pts
 *   100 days → +2500 pts
 *   365 days → +10000 pts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const STREAK_MILESTONES: Record<number, { bonus: number; label: string }> = {
  3:   { bonus: 25,    label: '3-Day Streak 🔥' },
  7:   { bonus: 75,    label: 'Weekly Warrior 🔥🔥' },
  14:  { bonus: 150,   label: '2-Week Champion 🔥🔥🔥' },
  30:  { bonus: 500,   label: 'Monthly Master 🏆' },
  60:  { bonus: 1000,  label: '60-Day Legend 🏆🏆' },
  100: { bonus: 2500,  label: 'Century Club 💎' },
  365: { bonus: 10000, label: 'Year-Long Dedication 👑' },
};

const BASE_POINTS = 5;
const STREAK_MULTIPLIER = 2; // bonus = min(streak * 2, 50)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ── GET: streak info or history ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'status').toLowerCase();

      if (action === 'history') {
        const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
        const { data } = await admin
          .from('daily_check_ins')
          .select('check_in_date, streak_count, points_earned, bonus_type, bonus_points')
          .eq('user_id', userId)
          .order('check_in_date', { ascending: false })
          .limit(limit);

        return res.status(200).json({ success: true, history: data || [] });
      }

      // Default: current streak status
      const { data: todayCheckin } = await admin
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      // Get latest check-in for streak
      const { data: latestCheckin } = await admin
        .from('daily_check_ins')
        .select('check_in_date, streak_count')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get longest streak ever
      const { data: longestStreak } = await admin
        .from('daily_check_ins')
        .select('streak_count')
        .eq('user_id', userId)
        .order('streak_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate current streak
      let currentStreak = 0;
      if (latestCheckin) {
        const lastDate = new Date(latestCheckin.check_in_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

        if (diffDays === 0) {
          currentStreak = latestCheckin.streak_count;
        } else if (diffDays === 1) {
          currentStreak = latestCheckin.streak_count; // will increment on check-in
        } else {
          currentStreak = 0; // streak broken
        }
      }

      // Next milestone
      let nextMilestone: { days: number; bonus: number; label: string } | null = null;
      for (const [days, info] of Object.entries(STREAK_MILESTONES)) {
        if (Number(days) > currentStreak) {
          nextMilestone = { days: Number(days), ...info };
          break;
        }
      }

      return res.status(200).json({
        success: true,
        checkedInToday: !!todayCheckin,
        currentStreak,
        longestStreak: longestStreak?.streak_count || 0,
        nextMilestone,
        todayCheckin,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: daily check-in ──
  if (req.method === 'POST') {
    try {
      // Check if already checked in today
      const { data: existing } = await admin
        .from('daily_check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({
          success: true,
          alreadyCheckedIn: true,
          message: 'You already checked in today!',
        });
      }

      // Get yesterday's check-in for streak calculation
      const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().slice(0, 10);
      const { data: yesterdayCheckin } = await admin
        .from('daily_check_ins')
        .select('streak_count')
        .eq('user_id', userId)
        .eq('check_in_date', yesterday)
        .maybeSingle();

      const newStreak = yesterdayCheckin ? yesterdayCheckin.streak_count + 1 : 1;

      // Calculate points
      const streakBonus = Math.min(newStreak * STREAK_MULTIPLIER, 50);
      let basePoints = BASE_POINTS + streakBonus;

      // Check for milestone
      const milestone = STREAK_MILESTONES[newStreak];
      let bonusType: string | null = null;
      let bonusPoints = 0;
      if (milestone) {
        bonusType = `milestone_${newStreak}`;
        bonusPoints = milestone.bonus;
      }

      const totalPoints = basePoints + bonusPoints;

      // Insert check-in
      const { data: checkin, error: insertError } = await admin
        .from('daily_check_ins')
        .insert({
          user_id: userId,
          check_in_date: today,
          streak_count: newStreak,
          points_earned: basePoints,
          bonus_type: bonusType,
          bonus_points: bonusPoints,
        })
        .select()
        .single();

      if (insertError) return res.status(500).json({ error: insertError.message });

      // Award points to shared_users
      try {
        const { data: sharedUser } = await admin
          .from('shared_users')
          .select('total_points')
          .eq('id', userId)
          .maybeSingle();

        if (sharedUser) {
          await admin
            .from('shared_users')
            .update({ total_points: (sharedUser.total_points || 0) + totalPoints })
            .eq('id', userId);
        }
      } catch {
        // Points award is best-effort
      }

      // Award loyalty transaction
      try {
        await admin.from('loyalty_transactions').insert({
          user_id: userId,
          points: totalPoints,
          type: 'earned',
          description: `Daily check-in (Day ${newStreak})${milestone ? ` + ${milestone.label}` : ''}`,
        });
      } catch {
        // best-effort
      }

      return res.status(201).json({
        success: true,
        streak: newStreak,
        pointsEarned: basePoints,
        milestone: milestone ? { ...milestone, bonusPoints } : null,
        totalPointsEarned: totalPoints,
        message: milestone
          ? `🎉 ${milestone.label}! Day ${newStreak} streak! +${totalPoints} points!`
          : `Day ${newStreak} streak! +${totalPoints} points`,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

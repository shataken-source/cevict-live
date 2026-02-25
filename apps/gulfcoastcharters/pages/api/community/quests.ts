/**
 * Quest System API
 * GET  /api/community/quests                 — list active quests with user progress
 * POST /api/community/quests { action: 'progress', questId, increment } — update progress
 * POST /api/community/quests { action: 'claim', questId }              — claim reward
 *
 * Quests reset daily (for daily quests) and weekly (for weekly quests).
 * Points are awarded when the user claims a completed quest.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

function getResetDate(questType: string): string {
  const now = new Date();
  if (questType === 'daily') {
    return now.toISOString().slice(0, 10);
  }
  if (questType === 'weekly') {
    // Monday of current week
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diff);
    return monday.toISOString().slice(0, 10);
  }
  if (questType === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return now.toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET: list quests with progress ──
  if (req.method === 'GET') {
    try {
      const questType = String(req.query.type || '').toLowerCase();

      let questQuery = admin
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .order('quest_type')
        .order('points_reward', { ascending: false });

      if (questType && ['daily', 'weekly', 'monthly', 'special'].includes(questType)) {
        questQuery = questQuery.eq('quest_type', questType);
      }

      const { data: quests, error: questErr } = await questQuery;
      if (questErr) return res.status(500).json({ error: questErr.message });

      // Get user's progress for current periods
      const dailyReset = getResetDate('daily');
      const weeklyReset = getResetDate('weekly');
      const monthlyReset = getResetDate('monthly');

      const { data: progressData } = await admin
        .from('quest_progress')
        .select('quest_id, current_count, completed, points_claimed, reset_date')
        .eq('user_id', userId)
        .in('reset_date', [dailyReset, weeklyReset, monthlyReset]);

      const progressMap = new Map(
        (progressData || []).map(p => [`${p.quest_id}_${p.reset_date}`, p])
      );

      const questsWithProgress = (quests || []).map((q: any) => {
        const resetDate = getResetDate(q.quest_type);
        const progress = progressMap.get(`${q.id}_${resetDate}`);
        return {
          ...q,
          progress: {
            currentCount: progress?.current_count || 0,
            targetCount: q.target_count,
            completed: progress?.completed || false,
            claimed: progress?.points_claimed || false,
            percent: Math.min(100, Math.round(((progress?.current_count || 0) / q.target_count) * 100)),
          },
          resetDate,
        };
      });

      const dailyQuests = questsWithProgress.filter((q: any) => q.quest_type === 'daily');
      const weeklyQuests = questsWithProgress.filter((q: any) => q.quest_type === 'weekly');
      const otherQuests = questsWithProgress.filter((q: any) => !['daily', 'weekly'].includes(q.quest_type));

      return res.status(200).json({
        success: true,
        daily: dailyQuests,
        weekly: weeklyQuests,
        other: otherQuests,
        stats: {
          dailyCompleted: dailyQuests.filter((q: any) => q.progress.completed).length,
          dailyTotal: dailyQuests.length,
          weeklyCompleted: weeklyQuests.filter((q: any) => q.progress.completed).length,
          weeklyTotal: weeklyQuests.length,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: update progress or claim ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, questId } = body;

      if (!questId) return res.status(400).json({ error: 'questId required' });

      // Get quest
      const { data: quest } = await admin
        .from('quests')
        .select('*')
        .eq('id', questId)
        .eq('is_active', true)
        .single();

      if (!quest) return res.status(404).json({ error: 'Quest not found' });

      const resetDate = getResetDate(quest.quest_type);

      // ── Update progress ──
      if (action === 'progress') {
        const increment = Math.max(1, Math.min(Number(body.increment) || 1, 10));

        // Get or create progress record
        const { data: existing } = await admin
          .from('quest_progress')
          .select('id, current_count, completed')
          .eq('user_id', userId)
          .eq('quest_id', questId)
          .eq('reset_date', resetDate)
          .maybeSingle();

        if (existing?.completed) {
          return res.status(200).json({ success: true, alreadyCompleted: true });
        }

        const newCount = (existing?.current_count || 0) + increment;
        const isCompleted = newCount >= quest.target_count;
        const now = new Date().toISOString();

        if (existing) {
          await admin
            .from('quest_progress')
            .update({
              current_count: Math.min(newCount, quest.target_count),
              completed: isCompleted,
              completed_at: isCompleted ? now : null,
              updated_at: now,
            })
            .eq('id', existing.id);
        } else {
          await admin
            .from('quest_progress')
            .insert({
              user_id: userId,
              quest_id: questId,
              current_count: Math.min(newCount, quest.target_count),
              completed: isCompleted,
              completed_at: isCompleted ? now : null,
              reset_date: resetDate,
            });
        }

        return res.status(200).json({
          success: true,
          currentCount: Math.min(newCount, quest.target_count),
          targetCount: quest.target_count,
          completed: isCompleted,
          message: isCompleted ? `Quest completed: ${quest.title}! Claim your ${quest.points_reward} point reward!` : null,
        });
      }

      // ── Claim reward ──
      if (action === 'claim') {
        const { data: progress } = await admin
          .from('quest_progress')
          .select('id, completed, points_claimed')
          .eq('user_id', userId)
          .eq('quest_id', questId)
          .eq('reset_date', resetDate)
          .maybeSingle();

        if (!progress) return res.status(400).json({ error: 'No progress for this quest' });
        if (!progress.completed) return res.status(400).json({ error: 'Quest not completed yet' });
        if (progress.points_claimed) return res.status(200).json({ success: true, alreadyClaimed: true });

        // Mark as claimed
        await admin
          .from('quest_progress')
          .update({ points_claimed: true })
          .eq('id', progress.id);

        // Award points
        const points = quest.points_reward;
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + points }).eq('id', userId);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: userId, points, type: 'earned',
            description: `Quest completed: ${quest.title}`,
          });
        } catch { /* best-effort */ }

        return res.status(200).json({
          success: true,
          pointsEarned: points,
          message: `Claimed ${points} points for: ${quest.title}`,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: progress, claim' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

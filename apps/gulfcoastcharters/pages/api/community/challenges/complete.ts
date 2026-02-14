/**
 * POST /api/community/challenges/complete - Mark a challenge as complete for the current user
 * Body: { challengeId: string }
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
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { challengeId } = body;
    if (!challengeId) {
      return res.status(400).json({ error: 'challengeId is required' });
    }

    const supabase = getSupabaseAdmin();

    const { data: challenge, error: challengeError } = await supabase
      .from('daily_challenges')
      .select('challenge_id, points_reward')
      .eq('challenge_id', challengeId)
      .eq('active', true)
      .single();

    if (challengeError || !challenge) {
      return res.status(404).json({ error: 'Challenge not found or inactive' });
    }

    const { data: existing } = await supabase
      .from('challenge_completions')
      .select('completion_id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .gte('completed_at', new Date().toISOString().slice(0, 10))
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ completed: true, message: 'Already completed today', points: challenge.points_reward });
    }

    const { data: completion, error: insertError } = await supabase
      .from('challenge_completions')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        points_earned: challenge.points_reward,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Challenge complete insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ completed: true, completion, points: challenge.points_reward });
  } catch (error: any) {
    console.error('Error completing challenge:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

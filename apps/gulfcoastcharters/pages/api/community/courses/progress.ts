/**
 * POST /api/community/courses/progress - Update course progress
 * Body: { courseId: string, completionPercentage?: number, completed?: boolean }
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
    const { courseId, completionPercentage, completed } = body;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (completionPercentage != null) update.completion_percentage = completionPercentage;
    if (completed === true) {
      update.completed = true;
      update.completed_at = new Date().toISOString();
      update.completion_percentage = 100;
    }

    const { data, error } = await supabase
      .from('course_progress')
      .update(update)
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ progress: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

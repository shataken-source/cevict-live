/**
 * POST /api/community/courses/enroll - Enroll in a course
 * Body: { courseId: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
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
    const courseId = body.courseId;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('course_progress')
      .upsert(
        { course_id: courseId, user_id: user.id, started_at: new Date().toISOString() },
        { onConflict: 'course_id,user_id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ progress: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

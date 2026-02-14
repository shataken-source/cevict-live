/**
 * GET /api/community/courses - List learning courses
 * Query: ?category=&level=
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { category, level } = req.query;

    let query = supabase
      .from('learning_courses')
      .select('course_id, title, description, category, course_level, instructor_id, price, free_for_pro, video_urls, created_at')
      .order('created_at', { ascending: false });

    if (typeof category === 'string' && category) query = query.eq('category', category);
    if (typeof level === 'string' && level) query = query.eq('course_level', level);

    const { data: courses, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ courses: courses ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

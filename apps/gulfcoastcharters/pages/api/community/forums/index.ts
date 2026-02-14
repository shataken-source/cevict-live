/**
 * GET /api/community/forums - List forum categories
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('forum_categories')
      .select('category_id, name, description, category_type, parent_category_id, display_order')
      .order('display_order')
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ categories: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

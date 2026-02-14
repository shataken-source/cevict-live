/**
 * GET /api/community/forums/threads?categoryId=uuid - List threads in a category
 * POST /api/community/forums/threads - Create thread. Body: { categoryId, title, content }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { categoryId } = req.query;
    if (!categoryId || typeof categoryId !== 'string') return res.status(400).json({ error: 'categoryId required' });
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('forum_threads')
        .select('thread_id, category_id, user_id, title, content, pinned, locked, views_count, replies_count, last_reply_at, created_at')
        .eq('category_id', categoryId)
        .order('pinned', { ascending: false })
        .order('last_reply_at', { ascending: false, nullsFirst: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ threads: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { categoryId, title, content } = body;
      if (!categoryId || !title || !content) return res.status(400).json({ error: 'categoryId, title, content required' });

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('forum_threads')
        .insert({ category_id: categoryId, user_id: user.id, title, content })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ thread: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/community/forums/posts?threadId=uuid - List posts (replies) in a thread
 * POST /api/community/forums/posts - Reply to thread. Body: { threadId, content }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { threadId } = req.query;
    if (!threadId || typeof threadId !== 'string') return res.status(400).json({ error: 'threadId required' });
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('forum_posts')
        .select('post_id, thread_id, user_id, content, is_best_answer, helpful_votes, created_at')
        .eq('thread_id', threadId)
        .order('created_at');

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ posts: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { threadId, content } = body;
      if (!threadId || !content) return res.status(400).json({ error: 'threadId and content required' });

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({ thread_id: threadId, user_id: user.id, content })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await supabase
        .from('forum_threads')
        .update({ last_reply_at: new Date().toISOString() })
        .eq('thread_id', threadId);

      return res.status(201).json({ post: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/community/feed/comments?feedId=uuid - List comments for a feed post
 * POST /api/community/feed/comments - Add comment (body: { feedId, content })
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { feedId } = req.query;
    if (!feedId || typeof feedId !== 'string') {
      return res.status(400).json({ error: 'feedId required' });
    }
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('feed_comments')
        .select('comment_id, feed_id, user_id, content, helpful_votes, created_at')
        .eq('feed_id', feedId)
        .order('created_at', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ comments: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { feedId, content } = body;
      if (!feedId || !content) return res.status(400).json({ error: 'feedId and content required' });

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('feed_comments')
        .insert({ feed_id: feedId, user_id: user.id, content: String(content).trim() })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ comment: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

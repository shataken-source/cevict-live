/**
 * GET /api/community/reels - List video reels
 * POST /api/community/reels - Create reel (body: { videoUrl, title?, description?, category?, thumbnailUrl?, durationSeconds? })
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const supabase = getSupabaseAdmin();
      const { category, limit = '20' } = req.query;
      let query = supabase
        .from('video_reels')
        .select('reel_id, user_id, video_url, thumbnail_url, title, description, category, duration_seconds, views_count, likes_count, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(limit) || 20, 50));
      if (typeof category === 'string' && category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ reels: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { videoUrl, title, description, category, thumbnailUrl, durationSeconds } = body;
      if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('video_reels')
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          title: title || null,
          description: description || null,
          category: category || null,
          duration_seconds: durationSeconds ?? null,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ reel: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/community/stories - List active stories (not expired)
 * POST /api/community/stories - Create story (body: { mediaType, mediaUrl, caption?, expiresAt })
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
      const { data, error } = await supabase
        .from('stories')
        .select('story_id, user_id, media_type, media_url, caption, expires_at, views_count, created_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ stories: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { mediaType, mediaUrl, caption, locationData, weatherData } = body;
      if (!mediaType || !mediaUrl) return res.status(400).json({ error: 'mediaType and mediaUrl required' });
      if (mediaType !== 'photo' && mediaType !== 'video') return res.status(400).json({ error: 'mediaType must be photo or video' });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_type: mediaType,
          media_url: mediaUrl,
          caption: caption || null,
          location_data: locationData || null,
          weather_data: weatherData || null,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ story: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/community/feed - List activity feed posts (paginated)
 * Query: ?limit=20&offset=0&contentType=catch_post
 * POST /api/community/feed - Create a feed post (authenticated)
 * Body: { contentType, title?, content?, mediaUrls?: string[], locationData?, metadata? }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

const validContentTypes = [
  'catch_post', 'trip_report', 'question', 'pro_tip', 'badge_unlock', 'milestone', 'charter_review', 'gear_recommendation',
  'trip_moment', 'dolphin_watch', 'sunset_cruise', 'party_trip', 'kayak_trip', 'honeymoon_charter',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const supabase = getSupabaseAdmin();
      const { limit = '20', offset = '0', contentType, userId } = req.query;

      let query = supabase
        .from('activity_feed')
        .select(`
          feed_id,
          user_id,
          content_type,
          title,
          content,
          media_urls,
          location_data,
          metadata,
          likes_count,
          hot_reactions_count,
          helpful_votes_count,
          comments_count,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20) - 1);

      if (typeof contentType === 'string' && validContentTypes.includes(contentType)) {
        query = query.eq('content_type', contentType);
      }
      if (typeof userId === 'string' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error('Feed list error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ feed: posts ?? [] });
    } catch (error: any) {
      console.error('Error listing feed:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user } = await getAuthedUser(req, res);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { contentType, title, content, mediaUrls, locationData, metadata } = body;
      if (!contentType || !validContentTypes.includes(contentType)) {
        return res.status(400).json({ error: 'contentType is required and must be one of: ' + validContentTypes.join(', ') });
      }

      const supabase = getSupabaseAdmin();
      const { data: post, error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: user.id,
          content_type: contentType,
          title: title || null,
          content: content || null,
          media_urls: mediaUrls || [],
          location_data: locationData || null,
          metadata: metadata || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Feed post insert error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ post });
    } catch (error: any) {
      console.error('Error creating feed post:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

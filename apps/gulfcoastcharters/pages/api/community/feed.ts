/**
 * Activity Feed API ("The Stream")
 * GET  /api/community/feed                           — paginated feed (newest first)
 *   ?page=1&limit=20&type=catch_post|trip_report|...  — filter by content type
 *   ?userId=...                                       — single user's posts
 * POST /api/community/feed { action: 'post', contentType, title, content, mediaUrls, locationData, metadata }
 * POST /api/community/feed { action: 'engage', feedId, engagementType: 'like'|'hot'|'helpful'|'save' }
 * POST /api/community/feed { action: 'comment', feedId, content }
 * POST /api/community/feed { action: 'delete', feedId }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const VALID_CONTENT_TYPES = [
  'catch_post', 'trip_report', 'question', 'pro_tip',
  'badge_unlock', 'milestone', 'charter_review', 'gear_recommendation',
];
const VALID_ENGAGEMENT_TYPES = ['like', 'hot', 'helpful', 'save'];
const POINTS_FOR_POST = 10;
const POINTS_FOR_COMMENT = 3;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET: paginated feed ──
  if (req.method === 'GET') {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      const offset = (page - 1) * limit;
      const contentType = String(req.query.type || '').trim();
      const userId = String(req.query.userId || '').trim();

      let query = admin
        .from('activity_feed')
        .select('feed_id, user_id, content_type, title, content, media_urls, location_data, metadata, likes_count, hot_reactions_count, helpful_votes_count, comments_count, shares_count, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (contentType && VALID_CONTENT_TYPES.includes(contentType)) {
        query = query.eq('content_type', contentType);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: posts, error, count } = await query;
      if (error) return res.status(500).json({ error: error.message });

      // Get user details for all post authors
      const authorIds = [...new Set((posts || []).map(p => p.user_id))];
      let userMap = new Map<string, any>();
      if (authorIds.length > 0) {
        const { data: users } = await admin
          .from('shared_users')
          .select('id, display_name, avatar_url')
          .in('id', authorIds);
        userMap = new Map((users || []).map(u => [u.id, u]));
      }

      // If authenticated, get user's engagements for these posts
      let userEngagements = new Map<string, string[]>();
      let feedUser: any = null;
      try { const result = await getAuthedUser(req, res); feedUser = result.user; } catch { /* not logged in */ }
      if (feedUser && posts && posts.length > 0) {
        const feedIds = posts.map(p => p.feed_id);
        const { data: engagements } = await admin
          .from('feed_engagement')
          .select('feed_id, engagement_type')
          .eq('user_id', feedUser.id)
          .in('feed_id', feedIds);

        for (const e of (engagements || [])) {
          if (!userEngagements.has(e.feed_id)) userEngagements.set(e.feed_id, []);
          userEngagements.get(e.feed_id)!.push(e.engagement_type);
        }
      }

      const enrichedPosts = (posts || []).map(post => {
        const author = userMap.get(post.user_id);
        return {
          ...post,
          author: {
            id: post.user_id,
            displayName: author?.display_name || `Angler ${post.user_id.slice(0, 6)}`,
            avatarUrl: author?.avatar_url || null,
          },
          userEngagements: userEngagements.get(post.feed_id) || [],
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({
        success: true,
        posts: enrichedPosts,
        page,
        limit,
        hasMore: (posts || []).length === limit,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: create post, engage, comment, delete ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Create a post ──
      if (action === 'post') {
        const { contentType, title, content, mediaUrls, locationData, metadata } = body;

        if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
          return res.status(400).json({
            error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(', ')}`,
          });
        }
        if (!content && (!mediaUrls || mediaUrls.length === 0)) {
          return res.status(400).json({ error: 'Content text or media is required' });
        }

        const { data: post, error: postError } = await admin
          .from('activity_feed')
          .insert({
            user_id: user.id,
            content_type: contentType,
            title: title ? String(title).slice(0, 200) : null,
            content: content ? String(content).slice(0, 5000) : null,
            media_urls: Array.isArray(mediaUrls) ? mediaUrls.slice(0, 10) : null,
            location_data: locationData || null,
            metadata: metadata || null,
          })
          .select()
          .single();

        if (postError) return res.status(500).json({ error: postError.message });

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_POST }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_POST, type: 'earned',
            description: `Feed post: ${contentType}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          post,
          pointsEarned: POINTS_FOR_POST,
        });
      }

      // ── Engage (like/hot/helpful/save) ──
      if (action === 'engage') {
        const { feedId, engagementType } = body;
        if (!feedId) return res.status(400).json({ error: 'feedId required' });
        if (!engagementType || !VALID_ENGAGEMENT_TYPES.includes(engagementType)) {
          return res.status(400).json({ error: `engagementType must be: ${VALID_ENGAGEMENT_TYPES.join(', ')}` });
        }

        // Toggle: if already engaged, remove it
        const { data: existing } = await admin
          .from('feed_engagement')
          .select('engagement_id')
          .eq('feed_id', feedId)
          .eq('user_id', user.id)
          .eq('engagement_type', engagementType)
          .maybeSingle();

        if (existing) {
          await admin.from('feed_engagement').delete().eq('engagement_id', existing.engagement_id);
        } else {
          await admin.from('feed_engagement').insert({
            feed_id: feedId,
            user_id: user.id,
            engagement_type: engagementType,
          });
        }

        // Update count on the post
        const countColumn = engagementType === 'like' ? 'likes_count'
          : engagementType === 'hot' ? 'hot_reactions_count'
            : engagementType === 'helpful' ? 'helpful_votes_count'
              : null;

        if (countColumn) {
          const { count } = await admin
            .from('feed_engagement')
            .select('engagement_id', { count: 'exact', head: true })
            .eq('feed_id', feedId)
            .eq('engagement_type', engagementType);

          await admin.from('activity_feed').update({ [countColumn]: count || 0 }).eq('feed_id', feedId);
        }

        return res.status(200).json({
          success: true,
          toggled: !existing,
          engagementType,
        });
      }

      // ── Comment ──
      if (action === 'comment') {
        const { feedId, content } = body;
        if (!feedId) return res.status(400).json({ error: 'feedId required' });
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          return res.status(400).json({ error: 'Comment content required' });
        }

        const { data: comment, error: commentError } = await admin
          .from('feed_comments')
          .insert({
            feed_id: feedId,
            user_id: user.id,
            content: content.trim().slice(0, 2000),
          })
          .select()
          .single();

        if (commentError) return res.status(500).json({ error: commentError.message });

        // Update comment count
        const { count } = await admin
          .from('feed_comments')
          .select('comment_id', { count: 'exact', head: true })
          .eq('feed_id', feedId);

        await admin.from('activity_feed').update({ comments_count: count || 0 }).eq('feed_id', feedId);

        // Award points for commenting
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_COMMENT }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_COMMENT, type: 'earned',
            description: 'Feed comment',
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          comment,
          pointsEarned: POINTS_FOR_COMMENT,
        });
      }

      // ── Delete own post ──
      if (action === 'delete') {
        const { feedId } = body;
        if (!feedId) return res.status(400).json({ error: 'feedId required' });

        const { error: delError } = await admin
          .from('activity_feed')
          .delete()
          .eq('feed_id', feedId)
          .eq('user_id', user.id);

        if (delError) return res.status(500).json({ error: delError.message });
        return res.status(200).json({ success: true, message: 'Post deleted' });
      }

      return res.status(400).json({ error: 'Invalid action. Use: post, engage, comment, delete' });
    } catch (e: any) {
      console.error('[Feed] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

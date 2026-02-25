/**
 * Community Forums API
 * GET  /api/community/forums                              — list forum categories
 * GET  /api/community/forums?categoryId=...               — threads in a category
 * GET  /api/community/forums?threadId=...                 — thread detail with posts
 * POST /api/community/forums { action: 'createThread', categoryId, title, content }
 * POST /api/community/forums { action: 'reply', threadId, content }
 * POST /api/community/forums { action: 'votePost', postId }  — helpful vote toggle
 * POST /api/community/forums { action: 'markBestAnswer', postId, threadId }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const POINTS_FOR_THREAD = 10;
const POINTS_FOR_REPLY = 5;
const POINTS_FOR_BEST_ANSWER = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const categoryId = String(req.query.categoryId || '').trim();
      const threadId = String(req.query.threadId || '').trim();

      // ── Thread detail with posts ──
      if (threadId) {
        const { data: thread, error: threadErr } = await admin
          .from('forum_threads')
          .select('thread_id, category_id, user_id, title, content, pinned, locked, views_count, replies_count, last_reply_at, created_at')
          .eq('thread_id', threadId)
          .single();

        if (threadErr || !thread) return res.status(404).json({ error: 'Thread not found' });

        // Increment view count (fire-and-forget)
        await admin
          .from('forum_threads')
          .update({ views_count: (thread.views_count || 0) + 1 })
          .eq('thread_id', threadId);

        // Get posts
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
        const offset = (page - 1) * limit;

        const { data: posts } = await admin
          .from('forum_posts')
          .select('post_id, thread_id, user_id, content, is_best_answer, helpful_votes, created_at, updated_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        // Get user info for thread author + post authors
        const allUserIds = new Set([thread.user_id, ...(posts || []).map(p => p.user_id)]);
        let userMap = new Map<string, any>();
        if (allUserIds.size > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url, total_points')
            .in('id', [...allUserIds]);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const enrichUser = (id: string) => {
          const u = userMap.get(id);
          return {
            userId: id,
            displayName: u?.display_name || `Angler ${id.slice(0, 6)}`,
            avatarUrl: u?.avatar_url || null,
            points: u?.total_points || 0,
          };
        };

        // Check current user's votes
        let userVotes = new Set<string>();
        let forumUser: any = null;
        try { const result = await getAuthedUser(req, res); forumUser = result.user; } catch { /* not logged in */ }
        if (forumUser && posts && posts.length > 0) {
          const postIds = posts.map(p => p.post_id);
          const { data: votes } = await admin
            .from('forum_post_votes')
            .select('post_id')
            .eq('user_id', forumUser.id)
            .in('post_id', postIds);
          userVotes = new Set((votes || []).map(v => v.post_id));
        }

        return res.status(200).json({
          success: true,
          thread: {
            ...thread,
            author: enrichUser(thread.user_id),
          },
          posts: (posts || []).map(p => ({
            ...p,
            author: enrichUser(p.user_id),
            userVoted: userVotes.has(p.post_id),
          })),
          page,
          limit,
          hasMore: (posts || []).length === limit,
        });
      }

      // ── Threads in a category ──
      if (categoryId) {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
        const offset = (page - 1) * limit;

        // Pinned threads first, then by last_reply_at
        const { data: threads } = await admin
          .from('forum_threads')
          .select('thread_id, category_id, user_id, title, content, pinned, locked, views_count, replies_count, last_reply_at, created_at')
          .eq('category_id', categoryId)
          .order('pinned', { ascending: false })
          .order('last_reply_at', { ascending: false, nullsFirst: false })
          .range(offset, offset + limit - 1);

        // Get user info
        const authorIds = [...new Set((threads || []).map(t => t.user_id))];
        let userMap = new Map<string, any>();
        if (authorIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', authorIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const enrichedThreads = (threads || []).map(t => ({
          ...t,
          author: {
            userId: t.user_id,
            displayName: userMap.get(t.user_id)?.display_name || `Angler ${t.user_id.slice(0, 6)}`,
            avatarUrl: userMap.get(t.user_id)?.avatar_url || null,
          },
          preview: t.content ? t.content.slice(0, 200) + (t.content.length > 200 ? '...' : '') : null,
        }));

        return res.status(200).json({
          success: true,
          threads: enrichedThreads,
          categoryId,
          page,
          limit,
          hasMore: (threads || []).length === limit,
        });
      }

      // ── List categories ──
      const { data: categories, error: catError } = await admin
        .from('forum_categories')
        .select('category_id, name, description, category_type, parent_category_id, display_order')
        .order('display_order');

      if (catError) return res.status(500).json({ error: catError.message });

      // Get thread counts per category
      const catIds = (categories || []).map(c => c.category_id);
      let threadCounts = new Map<string, number>();
      if (catIds.length > 0) {
        for (const catId of catIds) {
          const { count } = await admin
            .from('forum_threads')
            .select('thread_id', { count: 'exact', head: true })
            .eq('category_id', catId);
          threadCounts.set(catId, count || 0);
        }
      }

      const enrichedCategories = (categories || []).map(c => ({
        ...c,
        threadCount: threadCounts.get(c.category_id) || 0,
      }));

      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json({ success: true, categories: enrichedCategories });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Create thread ──
      if (action === 'createThread') {
        const { categoryId, title, content } = body;
        if (!categoryId) return res.status(400).json({ error: 'categoryId required' });
        if (!title || title.trim().length < 5) return res.status(400).json({ error: 'Title must be at least 5 characters' });
        if (!content || content.trim().length < 10) return res.status(400).json({ error: 'Content must be at least 10 characters' });

        // Verify category exists
        const { data: cat } = await admin
          .from('forum_categories')
          .select('category_id')
          .eq('category_id', categoryId)
          .single();
        if (!cat) return res.status(404).json({ error: 'Category not found' });

        const { data: thread, error: threadError } = await admin
          .from('forum_threads')
          .insert({
            category_id: categoryId,
            user_id: user.id,
            title: title.trim().slice(0, 300),
            content: content.trim().slice(0, 10000),
          })
          .select()
          .single();

        if (threadError) return res.status(500).json({ error: threadError.message });

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_THREAD }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_THREAD, type: 'earned',
            description: `Forum thread: ${title.slice(0, 50)}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          thread,
          pointsEarned: POINTS_FOR_THREAD,
        });
      }

      // ── Reply to thread ──
      if (action === 'reply') {
        const { threadId, content } = body;
        if (!threadId) return res.status(400).json({ error: 'threadId required' });
        if (!content || content.trim().length < 3) return res.status(400).json({ error: 'Reply must be at least 3 characters' });

        // Check thread exists and not locked
        const { data: thread } = await admin
          .from('forum_threads')
          .select('thread_id, locked, replies_count')
          .eq('thread_id', threadId)
          .single();

        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.locked) return res.status(403).json({ error: 'Thread is locked' });

        const { data: post, error: postError } = await admin
          .from('forum_posts')
          .insert({
            thread_id: threadId,
            user_id: user.id,
            content: content.trim().slice(0, 10000),
          })
          .select()
          .single();

        if (postError) return res.status(500).json({ error: postError.message });

        // Update thread reply count and last_reply_at
        await admin
          .from('forum_threads')
          .update({
            replies_count: (thread.replies_count || 0) + 1,
            last_reply_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('thread_id', threadId);

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_REPLY }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_REPLY, type: 'earned',
            description: 'Forum reply',
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          post,
          pointsEarned: POINTS_FOR_REPLY,
        });
      }

      // ── Vote post as helpful (toggle) ──
      if (action === 'votePost') {
        const { postId } = body;
        if (!postId) return res.status(400).json({ error: 'postId required' });

        const { data: existing } = await admin
          .from('forum_post_votes')
          .select('vote_id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await admin.from('forum_post_votes').delete().eq('vote_id', existing.vote_id);
        } else {
          await admin.from('forum_post_votes').insert({ post_id: postId, user_id: user.id });
        }

        // Update count
        const { count } = await admin
          .from('forum_post_votes')
          .select('vote_id', { count: 'exact', head: true })
          .eq('post_id', postId);

        await admin.from('forum_posts').update({ helpful_votes: count || 0 }).eq('post_id', postId);

        return res.status(200).json({ success: true, voted: !existing, helpfulVotes: count || 0 });
      }

      // ── Mark best answer (thread author only) ──
      if (action === 'markBestAnswer') {
        const { postId, threadId } = body;
        if (!postId || !threadId) return res.status(400).json({ error: 'postId and threadId required' });

        // Verify user is thread author
        const { data: thread } = await admin
          .from('forum_threads')
          .select('user_id')
          .eq('thread_id', threadId)
          .single();

        if (!thread || thread.user_id !== user.id) {
          return res.status(403).json({ error: 'Only the thread author can mark best answer' });
        }

        // Clear any existing best answer for this thread
        await admin
          .from('forum_posts')
          .update({ is_best_answer: false })
          .eq('thread_id', threadId)
          .eq('is_best_answer', true);

        // Set new best answer
        const { data: post } = await admin
          .from('forum_posts')
          .update({ is_best_answer: true })
          .eq('post_id', postId)
          .eq('thread_id', threadId)
          .select('user_id')
          .single();

        if (!post) return res.status(404).json({ error: 'Post not found in this thread' });

        // Award bonus points to the post author
        if (post.user_id !== user.id) {
          try {
            const { data: su } = await admin.from('shared_users').select('total_points').eq('id', post.user_id).maybeSingle();
            if (su) {
              await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_BEST_ANSWER }).eq('id', post.user_id);
            }
            await admin.from('loyalty_transactions').insert({
              user_id: post.user_id, points: POINTS_FOR_BEST_ANSWER, type: 'earned',
              description: 'Best answer award',
            });
          } catch { /* best-effort */ }
        }

        return res.status(200).json({ success: true, message: 'Best answer marked', pointsAwarded: POINTS_FOR_BEST_ANSWER });
      }

      return res.status(400).json({ error: 'Invalid action. Use: createThread, reply, votePost, markBestAnswer' });
    } catch (e: any) {
      console.error('[Forums] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

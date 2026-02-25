/**
 * Connection Management API (Friends & Following)
 * GET  /api/community/connections                         — list user's connections
 *   ?type=friend|following                                — filter by type
 *   ?status=pending|accepted                              — filter by status
 * GET  /api/community/connections?action=suggestions&limit=10 — suggested users to connect with
 * POST /api/community/connections { action: 'request', targetUserId }  — send friend request
 * POST /api/community/connections { action: 'follow', targetUserId }   — follow a user
 * POST /api/community/connections { action: 'accept', connectionId }   — accept friend request
 * POST /api/community/connections { action: 'reject', connectionId }   — reject/remove connection
 * POST /api/community/connections { action: 'block', targetUserId }    — block a user
 * POST /api/community/connections { action: 'unfollow', targetUserId } — unfollow
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET: list connections or suggestions ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'list').toLowerCase();

      // ── Suggestions ──
      if (action === 'suggestions') {
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);

        // Get users this person is already connected to
        const { data: existingConns } = await admin
          .from('user_connections')
          .select('connected_user_id')
          .eq('user_id', userId);

        const { data: existingConnsReverse } = await admin
          .from('user_connections')
          .select('user_id')
          .eq('connected_user_id', userId);

        const connectedIds = new Set([
          userId,
          ...(existingConns || []).map(c => c.connected_user_id),
          ...(existingConnsReverse || []).map(c => c.user_id),
        ]);

        // Suggest active users not already connected
        const { data: candidates } = await admin
          .from('shared_users')
          .select('id, display_name, avatar_url, total_points')
          .neq('id', userId)
          .order('total_points', { ascending: false })
          .limit(limit * 3);

        const suggestions = (candidates || [])
          .filter(c => !connectedIds.has(c.id))
          .slice(0, limit)
          .map(c => ({
            userId: c.id,
            displayName: c.display_name || `Angler ${c.id.slice(0, 6)}`,
            avatarUrl: c.avatar_url,
            points: c.total_points || 0,
          }));

        return res.status(200).json({ success: true, suggestions });
      }

      // ── List connections ──
      const connType = String(req.query.type || '').toLowerCase();
      const connStatus = String(req.query.status || '').toLowerCase();

      // Outgoing connections (user initiated)
      let outQuery = admin
        .from('user_connections')
        .select('connection_id, connected_user_id, connection_type, status, created_at')
        .eq('user_id', userId);

      if (connType && ['friend', 'following'].includes(connType)) {
        outQuery = outQuery.eq('connection_type', connType);
      }
      if (connStatus && ['pending', 'accepted', 'blocked'].includes(connStatus)) {
        outQuery = outQuery.eq('status', connStatus);
      }

      const { data: outgoing } = await outQuery;

      // Incoming connections (others initiated toward user)
      let inQuery = admin
        .from('user_connections')
        .select('connection_id, user_id, connection_type, status, created_at')
        .eq('connected_user_id', userId);

      if (connType && ['friend', 'following'].includes(connType)) {
        inQuery = inQuery.eq('connection_type', connType);
      }
      if (connStatus && ['pending', 'accepted', 'blocked'].includes(connStatus)) {
        inQuery = inQuery.eq('status', connStatus);
      }

      const { data: incoming } = await inQuery;

      // Gather all related user IDs
      const relatedIds = new Set([
        ...(outgoing || []).map(c => c.connected_user_id),
        ...(incoming || []).map(c => c.user_id),
      ]);

      let userMap = new Map<string, any>();
      if (relatedIds.size > 0) {
        const { data: users } = await admin
          .from('shared_users')
          .select('id, display_name, avatar_url, total_points')
          .in('id', [...relatedIds]);
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

      const friends = [
        ...(outgoing || [])
          .filter(c => c.connection_type === 'friend' && c.status === 'accepted')
          .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.connected_user_id), since: c.created_at })),
        ...(incoming || [])
          .filter(c => c.connection_type === 'friend' && c.status === 'accepted')
          .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.user_id), since: c.created_at })),
      ];

      const following = (outgoing || [])
        .filter(c => c.connection_type === 'following' && c.status === 'accepted')
        .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.connected_user_id), since: c.created_at }));

      const followers = (incoming || [])
        .filter(c => c.connection_type === 'following' && c.status === 'accepted')
        .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.user_id), since: c.created_at }));

      const pendingReceived = (incoming || [])
        .filter(c => c.connection_type === 'friend' && c.status === 'pending')
        .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.user_id), since: c.created_at }));

      const pendingSent = (outgoing || [])
        .filter(c => c.connection_type === 'friend' && c.status === 'pending')
        .map(c => ({ connectionId: c.connection_id, user: enrichUser(c.connected_user_id), since: c.created_at }));

      return res.status(200).json({
        success: true,
        friends,
        following,
        followers,
        pendingReceived,
        pendingSent,
        stats: {
          friendsCount: friends.length,
          followingCount: following.length,
          followersCount: followers.length,
          pendingCount: pendingReceived.length,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: manage connections ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, targetUserId, connectionId } = body;

      // ── Send friend request ──
      if (action === 'request') {
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Cannot friend yourself' });

        // Check for existing connection in either direction
        const { data: existing } = await admin
          .from('user_connections')
          .select('connection_id, status')
          .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`)
          .eq('connection_type', 'friend')
          .maybeSingle();

        if (existing) {
          if (existing.status === 'accepted') return res.status(200).json({ success: true, alreadyFriends: true });
          if (existing.status === 'pending') return res.status(200).json({ success: true, alreadyPending: true });
          if (existing.status === 'blocked') return res.status(400).json({ error: 'Cannot send request to this user' });
        }

        const { data: conn, error: connError } = await admin
          .from('user_connections')
          .insert({
            user_id: userId,
            connected_user_id: targetUserId,
            connection_type: 'friend',
            status: 'pending',
          })
          .select()
          .single();

        if (connError) return res.status(500).json({ error: connError.message });
        return res.status(201).json({ success: true, connection: conn, message: 'Friend request sent!' });
      }

      // ── Follow ──
      if (action === 'follow') {
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Cannot follow yourself' });

        // Check existing
        const { data: existing } = await admin
          .from('user_connections')
          .select('connection_id')
          .eq('user_id', userId)
          .eq('connected_user_id', targetUserId)
          .eq('connection_type', 'following')
          .maybeSingle();

        if (existing) return res.status(200).json({ success: true, alreadyFollowing: true });

        const { error: followError } = await admin
          .from('user_connections')
          .insert({
            user_id: userId,
            connected_user_id: targetUserId,
            connection_type: 'following',
            status: 'accepted',
          });

        if (followError) return res.status(500).json({ error: followError.message });
        return res.status(201).json({ success: true, message: 'Now following!' });
      }

      // ── Accept friend request ──
      if (action === 'accept') {
        if (!connectionId) return res.status(400).json({ error: 'connectionId required' });

        const { error } = await admin
          .from('user_connections')
          .update({ status: 'accepted' })
          .eq('connection_id', connectionId)
          .eq('connected_user_id', userId)
          .eq('status', 'pending');

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Friend request accepted!' });
      }

      // ── Reject / Remove ──
      if (action === 'reject' || action === 'remove') {
        if (!connectionId) return res.status(400).json({ error: 'connectionId required' });

        // User can remove connections where they are either party
        const { error } = await admin
          .from('user_connections')
          .delete()
          .eq('connection_id', connectionId)
          .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Connection removed' });
      }

      // ── Block ──
      if (action === 'block') {
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

        // Remove any existing friend/follow connections
        await admin
          .from('user_connections')
          .delete()
          .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`);

        // Create block
        const { error } = await admin
          .from('user_connections')
          .insert({
            user_id: userId,
            connected_user_id: targetUserId,
            connection_type: 'friend',
            status: 'blocked',
          });

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'User blocked' });
      }

      // ── Unfollow ──
      if (action === 'unfollow') {
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

        const { error } = await admin
          .from('user_connections')
          .delete()
          .eq('user_id', userId)
          .eq('connected_user_id', targetUserId)
          .eq('connection_type', 'following');

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Unfollowed' });
      }

      return res.status(400).json({ error: 'Invalid action. Use: request, follow, accept, reject, remove, block, unfollow' });
    } catch (e: any) {
      console.error('[Connections] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

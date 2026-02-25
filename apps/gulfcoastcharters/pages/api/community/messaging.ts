/**
 * Enhanced Messaging API (Direct + Group Chats)
 * GET  /api/community/messaging                                — list user's conversations
 * GET  /api/community/messaging?conversationId=...             — messages in a conversation
 * POST /api/community/messaging { action: 'sendDirect', targetUserId, content, messageType }
 * POST /api/community/messaging { action: 'createGroup', name, memberIds }
 * POST /api/community/messaging { action: 'send', conversationId, content, messageType, mediaUrl, locationData }
 * POST /api/community/messaging { action: 'markRead', conversationId }
 * POST /api/community/messaging { action: 'addMember', conversationId, userId }
 * POST /api/community/messaging { action: 'leaveGroup', conversationId }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const conversationId = String(req.query.conversationId || '').trim();

      // ── Messages in a conversation ──
      if (conversationId) {
        // Verify user is a participant
        const { data: participant } = await admin
          .from('conversation_participants')
          .select('participant_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!participant) return res.status(403).json({ error: 'Not a participant in this conversation' });

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        const offset = (page - 1) * limit;

        const { data: messages } = await admin
          .from('messages')
          .select('message_id, conversation_id, sender_id, message_type, content, media_url, location_data, read_by, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Reverse so oldest first for display
        const orderedMessages = (messages || []).reverse();

        // Get sender info
        const senderIds = [...new Set(orderedMessages.map(m => m.sender_id))];
        let userMap = new Map<string, any>();
        if (senderIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', senderIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const enrichedMessages = orderedMessages.map(m => {
          const sender = userMap.get(m.sender_id);
          return {
            ...m,
            sender: {
              userId: m.sender_id,
              displayName: sender?.display_name || `Angler ${m.sender_id.slice(0, 6)}`,
              avatarUrl: sender?.avatar_url || null,
            },
            isOwn: m.sender_id === userId,
          };
        });

        // Get conversation details
        const { data: convo } = await admin
          .from('conversations')
          .select('conversation_id, conversation_type, name, created_at')
          .eq('conversation_id', conversationId)
          .single();

        // Get participants
        const { data: participants } = await admin
          .from('conversation_participants')
          .select('user_id, role, last_read_at, joined_at')
          .eq('conversation_id', conversationId);

        const participantIds = (participants || []).map(p => p.user_id);
        let participantMap = new Map<string, any>();
        if (participantIds.length > 0) {
          const { data: pUsers } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', participantIds);
          participantMap = new Map((pUsers || []).map(u => [u.id, u]));
        }

        const enrichedParticipants = (participants || []).map(p => {
          const u = participantMap.get(p.user_id);
          return {
            ...p,
            displayName: u?.display_name || `Angler ${p.user_id.slice(0, 6)}`,
            avatarUrl: u?.avatar_url || null,
          };
        });

        return res.status(200).json({
          success: true,
          conversation: { ...convo, participants: enrichedParticipants },
          messages: enrichedMessages,
          page,
          limit,
          hasMore: (messages || []).length === limit,
        });
      }

      // ── List conversations ──
      const { data: participantRecords } = await admin
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

      if (!participantRecords || participantRecords.length === 0) {
        return res.status(200).json({ success: true, conversations: [] });
      }

      const convoIds = participantRecords.map(p => p.conversation_id);
      const lastReadMap = new Map(participantRecords.map(p => [p.conversation_id, p.last_read_at]));

      const { data: conversations } = await admin
        .from('conversations')
        .select('conversation_id, conversation_type, name, created_at, updated_at')
        .in('conversation_id', convoIds)
        .order('updated_at', { ascending: false });

      // For each conversation, get the latest message and participant info
      const enrichedConvos = await Promise.all((conversations || []).map(async (convo) => {
        // Latest message
        const { data: lastMsg } = await admin
          .from('messages')
          .select('content, message_type, sender_id, created_at')
          .eq('conversation_id', convo.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Participants
        const { data: members } = await admin
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convo.conversation_id);

        const memberIds = (members || []).map(m => m.user_id).filter(id => id !== userId);
        let otherUsers: any[] = [];
        if (memberIds.length > 0) {
          const { data } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', memberIds);
          otherUsers = data || [];
        }

        // Unread count
        const lastRead = lastReadMap.get(convo.conversation_id);
        let unreadCount = 0;
        if (lastRead) {
          const { count } = await admin
            .from('messages')
            .select('message_id', { count: 'exact', head: true })
            .eq('conversation_id', convo.conversation_id)
            .gt('created_at', lastRead)
            .neq('sender_id', userId);
          unreadCount = count || 0;
        }

        // Display name for direct chats
        let displayName = convo.name;
        if (convo.conversation_type === 'direct' && !displayName && otherUsers.length > 0) {
          displayName = otherUsers[0].display_name || `Angler ${otherUsers[0].id.slice(0, 6)}`;
        }

        return {
          conversationId: convo.conversation_id,
          type: convo.conversation_type,
          name: displayName || 'Group Chat',
          participants: otherUsers.map(u => ({
            userId: u.id,
            displayName: u.display_name || `Angler ${u.id.slice(0, 6)}`,
            avatarUrl: u.avatar_url,
          })),
          lastMessage: lastMsg ? {
            content: lastMsg.content?.slice(0, 100) || `[${lastMsg.message_type}]`,
            senderId: lastMsg.sender_id,
            createdAt: lastMsg.created_at,
          } : null,
          unreadCount,
          updatedAt: convo.updated_at,
        };
      }));

      return res.status(200).json({ success: true, conversations: enrichedConvos });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Send direct message (creates conversation if needed) ──
      if (action === 'sendDirect') {
        const { targetUserId, content, messageType } = body;
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Cannot message yourself' });
        if (!content && messageType === 'text') return res.status(400).json({ error: 'content required for text messages' });

        // Check for existing direct conversation
        const { data: myConvos } = await admin
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        const { data: theirConvos } = await admin
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId);

        const myConvoIds = new Set((myConvos || []).map(c => c.conversation_id));
        const theirConvoIds = (theirConvos || []).map(c => c.conversation_id);
        const sharedConvoIds = theirConvoIds.filter(id => myConvoIds.has(id));

        let conversationId: string | null = null;

        // Check if any shared conversation is a direct chat
        for (const cid of sharedConvoIds) {
          const { data: convo } = await admin
            .from('conversations')
            .select('conversation_id, conversation_type')
            .eq('conversation_id', cid)
            .eq('conversation_type', 'direct')
            .maybeSingle();
          if (convo) {
            conversationId = convo.conversation_id;
            break;
          }
        }

        // Create new direct conversation if none exists
        if (!conversationId) {
          const { data: newConvo, error: convoError } = await admin
            .from('conversations')
            .insert({
              conversation_type: 'direct',
              created_by: userId,
            })
            .select()
            .single();

          if (convoError) return res.status(500).json({ error: convoError.message });
          conversationId = newConvo.conversation_id;

          // Add both participants
          await admin.from('conversation_participants').insert([
            { conversation_id: conversationId, user_id: userId, role: 'member' },
            { conversation_id: conversationId, user_id: targetUserId, role: 'member' },
          ]);
        }

        // Send the message
        const { data: message, error: msgError } = await admin
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            message_type: messageType || 'text',
            content: content ? String(content).slice(0, 5000) : null,
          })
          .select()
          .single();

        if (msgError) return res.status(500).json({ error: msgError.message });

        // Update conversation timestamp
        await admin
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('conversation_id', conversationId);

        return res.status(201).json({
          success: true,
          message,
          conversationId,
        });
      }

      // ── Create group chat ──
      if (action === 'createGroup') {
        const { name, memberIds } = body;
        if (!name) return res.status(400).json({ error: 'Group name required' });
        if (!Array.isArray(memberIds) || memberIds.length === 0) {
          return res.status(400).json({ error: 'At least one member required' });
        }

        const { data: convo, error: convoError } = await admin
          .from('conversations')
          .insert({
            conversation_type: 'group',
            name: String(name).slice(0, 100),
            created_by: userId,
          })
          .select()
          .single();

        if (convoError) return res.status(500).json({ error: convoError.message });

        // Add creator as admin + all members
        const participants = [
          { conversation_id: convo.conversation_id, user_id: userId, role: 'admin' },
          ...memberIds.slice(0, 50).map((id: string) => ({
            conversation_id: convo.conversation_id,
            user_id: id,
            role: 'member',
          })),
        ];

        await admin.from('conversation_participants').insert(participants);

        return res.status(201).json({
          success: true,
          conversation: convo,
          memberCount: participants.length,
        });
      }

      // ── Send message to existing conversation ──
      if (action === 'send') {
        const { conversationId, content, messageType, mediaUrl, locationData } = body;
        if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

        // Verify participant
        const { data: participant } = await admin
          .from('conversation_participants')
          .select('participant_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!participant) return res.status(403).json({ error: 'Not a participant' });

        const msgType = messageType || 'text';
        if (msgType === 'text' && (!content || content.trim().length === 0)) {
          return res.status(400).json({ error: 'content required for text messages' });
        }

        const { data: message, error: msgError } = await admin
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            message_type: msgType,
            content: content ? String(content).slice(0, 5000) : null,
            media_url: mediaUrl || null,
            location_data: locationData || null,
          })
          .select()
          .single();

        if (msgError) return res.status(500).json({ error: msgError.message });

        // Update conversation timestamp
        await admin
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('conversation_id', conversationId);

        return res.status(201).json({ success: true, message });
      }

      // ── Mark conversation as read ──
      if (action === 'markRead') {
        const { conversationId } = body;
        if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

        await admin
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);

        return res.status(200).json({ success: true });
      }

      // ── Add member to group ──
      if (action === 'addMember') {
        const { conversationId, targetUserId: newMemberId } = body;
        if (!conversationId || !newMemberId) return res.status(400).json({ error: 'conversationId and targetUserId required' });

        // Verify user is admin of the group
        const { data: adminCheck } = await admin
          .from('conversation_participants')
          .select('role')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!adminCheck || adminCheck.role !== 'admin') {
          return res.status(403).json({ error: 'Only group admins can add members' });
        }

        // Check if already a member
        const { data: existing } = await admin
          .from('conversation_participants')
          .select('participant_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', newMemberId)
          .maybeSingle();

        if (existing) return res.status(200).json({ success: true, alreadyMember: true });

        await admin.from('conversation_participants').insert({
          conversation_id: conversationId,
          user_id: newMemberId,
          role: 'member',
        });

        return res.status(201).json({ success: true, message: 'Member added' });
      }

      // ── Leave group ──
      if (action === 'leaveGroup') {
        const { conversationId } = body;
        if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

        await admin
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);

        return res.status(200).json({ success: true, message: 'Left the group' });
      }

      return res.status(400).json({ error: 'Invalid action. Use: sendDirect, createGroup, send, markRead, addMember, leaveGroup' });
    } catch (e: any) {
      console.error('[Messaging] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * POST /api/community/connections/request - Send friend request
 * Body: { connectedUserId: string, connectionType: 'friend' | 'following' }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { connectedUserId, connectionType = 'friend' } = body;
    if (!connectedUserId) {
      return res.status(400).json({ error: 'connectedUserId is required' });
    }
    if (connectionType !== 'friend' && connectionType !== 'following') {
      return res.status(400).json({ error: 'connectionType must be friend or following' });
    }
    if (connectedUserId === user.id) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    const supabase = getSupabaseAdmin();
    const status = connectionType === 'friend' ? 'pending' : 'accepted';

    const { data, error } = await supabase
      .from('user_connections')
      .upsert(
        {
          user_id: user.id,
          connected_user_id: connectedUserId,
          connection_type: connectionType,
          status,
        },
        { onConflict: 'user_id,connected_user_id,connection_type' }
      )
      .select()
      .single();

    if (error) {
      console.error('Connection request error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ connection: data });
  } catch (error: any) {
    console.error('Error creating connection:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

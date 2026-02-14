/**
 * POST /api/community/connections/accept - Accept a pending friend request
 * Body: { connectionId: string } or { connectedUserId: string }
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
    const { connectionId, connectedUserId } = body;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('user_connections')
      .update({ status: 'accepted' })
      .eq('connection_type', 'friend')
      .eq('status', 'pending');

    if (connectionId) {
      query = query.eq('connection_id', connectionId).eq('connected_user_id', user.id);
    } else if (connectedUserId) {
      query = query.eq('user_id', connectedUserId).eq('connected_user_id', user.id);
    } else {
      return res.status(400).json({ error: 'connectionId or connectedUserId required' });
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error('Connection accept error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ connection: data });
  } catch (error: any) {
    console.error('Error accepting connection:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

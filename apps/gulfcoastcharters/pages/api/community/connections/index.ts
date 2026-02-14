/**
 * GET /api/community/connections - List current user's connections (friends/following)
 * Query: ?type=friend|following
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('user_connections')
      .select('connection_id, connected_user_id, connection_type, status, created_at')
      .eq('user_id', user.id);

    if (typeof type === 'string' && (type === 'friend' || type === 'following')) {
      query = query.eq('connection_type', type);
    }

    const { data: connections, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Connections list error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ connections: connections ?? [] });
  } catch (error: any) {
    console.error('Error listing connections:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * API endpoint to list rain checks
 * GET /api/rain-checks/list?type=customer|captain
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';

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

    const supabase = getSupabaseAdmin();
    const { type = 'customer' } = req.query;

    let query = supabase.from('rain_checks').select('*');

    if (type === 'customer') {
      query = query.eq('customer_id', user.id).or('transferred_to_user_id.eq.' + user.id);
    } else if (type === 'captain') {
      // Get captain ID
      const { data: captain } = await supabase
        .from('captains')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (captain) {
        query = query.eq('captain_id', captain.id);
      } else {
        return res.status(200).json({ rainChecks: [] });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    const { data: rainChecks, error } = await query
      .order('issued_date', { ascending: false });

    if (error) {
      console.error('Error fetching rain checks:', error);
      return res.status(500).json({ error: 'Failed to fetch rain checks' });
    }

    return res.status(200).json({ rainChecks: rainChecks || [] });
  } catch (error: any) {
    console.error('Error listing rain checks:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/tips/list
 * Returns tips for the authenticated user (as customer).
 * Query: ?bookingId=uuid (optional) - filter by booking
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
    const { bookingId } = req.query;

    let query = supabase
      .from('tips')
      .select('tip_id, booking_id, amount, percentage, platform_fee, net_amount, customer_message, status, stripe_transaction_id, created_at, updated_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (typeof bookingId === 'string' && bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data: tips, error } = await query;

    if (error) {
      console.error('Tips list error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ tips: tips ?? [] });
  } catch (error: any) {
    console.error('Error listing tips:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

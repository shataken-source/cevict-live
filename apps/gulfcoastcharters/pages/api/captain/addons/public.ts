/**
 * Public Captain Add-ons (for booking flow)
 * GET /api/captain/addons/public?captainId=uuid - List active add-ons for a captain (no auth required)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const captainId = req.query.captainId;
  if (!captainId || typeof captainId !== 'string') return res.status(400).json({ error: 'captainId required' });

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('captain_addons')
      .select('id, name, description, price, category')
      .eq('captain_id', captainId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, addons: data ?? [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

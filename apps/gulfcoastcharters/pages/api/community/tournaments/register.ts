/**
 * POST /api/community/tournaments/register - Register for a tournament
 * Body: { tournamentId: string }
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
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { tournamentId } = body;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

    const supabase = getSupabaseAdmin();
    const { data: tournament } = await supabase.from('tournaments').select('tournament_id, status, entry_fee').eq('tournament_id', tournamentId).single();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.status !== 'registration_open') return res.status(400).json({ error: 'Registration not open' });

    const { data, error } = await supabase
      .from('tournament_entries')
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        entry_fee_paid: tournament.entry_fee ?? 0,
        payment_status: (tournament.entry_fee ?? 0) > 0 ? 'pending' : 'free',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ entry: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

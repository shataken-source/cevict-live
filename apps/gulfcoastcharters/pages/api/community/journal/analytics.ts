/**
 * GET /api/community/journal/analytics - Personal fishing stats for current user
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
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseAdmin();
    const { data: entries } = await supabase
      .from('fishing_journal_entries')
      .select('entry_id, trip_date, total_fish_caught, total_hours')
      .eq('user_id', user.id);

    const totalTrips = entries?.length ?? 0;
    const totalFish = entries?.reduce((s, e) => s + (e.total_fish_caught ?? 0), 0) ?? 0;
    const totalHours = entries?.reduce((s, e) => s + (e.total_hours ?? 0), 0) ?? 0;

    const { data: catches } = await supabase
      .from('journal_catches')
      .select('species, size, weight, personal_record')
      .in('entry_id', entries?.map((e) => e.entry_id) ?? []);

    const bySpecies: Record<string, number> = {};
    catches?.forEach((c) => {
      if (c.species) bySpecies[c.species] = (bySpecies[c.species] ?? 0) + 1;
    });

    return res.status(200).json({
      totalTrips,
      totalFish,
      totalHours,
      personalRecords: catches?.filter((c) => c.personal_record).length ?? 0,
      bySpecies,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

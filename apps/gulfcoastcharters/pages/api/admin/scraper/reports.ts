import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['admin']);
  if (!ok) return;

  const admin = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('scraper_failure_reports')
      .select('*')
      .order('run_timestamp', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ reports: data || [] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';
import { requireRole } from '../../_lib/rbac';

/**
 * GET /api/admin/sms-campaigns
 * Returns SMS campaigns list. If sms_campaigns table doesn't exist, returns [] so the page doesn't 404.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authed = await requireRole(req, res, ['admin']);
  if (!authed) return;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('sms_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const msg = (error as any)?.message ?? '';
      if (msg.includes('does not exist') || msg.includes('PGRST') || (error as any)?.code === 'PGRST205') {
        return res.status(200).json({ campaigns: [] });
      }
      throw error;
    }

    return res.status(200).json({ campaigns: data || [] });
  } catch (error: any) {
    console.warn('SMS campaigns fetch failed (returning empty):', error?.message ?? error);
    return res.status(200).json({ campaigns: [] });
  }
}

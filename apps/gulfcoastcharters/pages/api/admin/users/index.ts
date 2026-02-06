import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';
import { requireRole } from '../../_lib/rbac';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authed = await requireRole(req, res, ['admin']);
    if (!authed) return;

    const supabase = getSupabaseAdmin();
    // Select only columns that exist in common schemas (id, email, created_at; avoid name/role which may not exist)
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = (rows || []).map((r: any) => ({
      id: r.id,
      email: r.email ?? '',
      name: r.full_name ?? r.email ?? 'N/A',
      role: r.is_admin === true ? 'admin' : (r.role ?? r.user_type ?? 'user'),
      created_at: r.created_at,
    }));

    return res.status(200).json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: error.message });
  }
}

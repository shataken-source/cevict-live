import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../_lib/rbac';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

type Body = {
  provider?: string;
  sharePublic?: boolean;
  isActive?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['captain', 'admin']);
  if (!ok) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body || {}) as Body;
  const provider = String(body.provider || 'browser').trim() || 'browser';
  const sharePublic = Boolean(body.sharePublic);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  const { user } = await getAuthedUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (profileErr) return res.status(500).json({ error: profileErr.message });
  if (!profile?.id) return res.status(404).json({ error: 'Profile not found' });

  const now = new Date().toISOString();
  const { error } = await admin
    .from('captain_gps_connections')
    .upsert(
      {
        captain_id: profile.id,
        provider,
        is_active: isActive,
        share_public: sharePublic,
        last_connected: now,
        updated_at: now,
      },
      { onConflict: 'captain_id,provider' }
    );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}


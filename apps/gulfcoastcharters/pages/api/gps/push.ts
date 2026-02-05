import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../_lib/rbac';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

type Body = {
  provider?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number | null;
  speedMps?: number | null;
  headingDeg?: number | null;
  capturedAt?: string;
};

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['captain', 'admin']);
  if (!ok) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body || {}) as Body;
  const lat = toNum(body.latitude);
  const lon = toNum(body.longitude);
  if (lat === null || lon === null) return res.status(400).json({ error: 'Missing latitude/longitude' });

  const provider = String(body.provider || 'browser').trim() || 'browser';

  const { user } = await getAuthedUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (profileErr) return res.status(500).json({ error: profileErr.message });
  if (!profile?.id) return res.status(404).json({ error: 'Profile not found' });

  // Only allow push if sharing is active for that provider.
  const { data: conn, error: connErr } = await admin
    .from('captain_gps_connections')
    .select('is_active, share_public')
    .eq('captain_id', profile.id)
    .eq('provider', provider)
    .maybeSingle();
  if (connErr) return res.status(500).json({ error: connErr.message });
  if (!conn?.is_active) return res.status(409).json({ error: 'GPS not active for this provider' });

  const capturedAt = body.capturedAt ? new Date(body.capturedAt).toISOString() : new Date().toISOString();

  const { error } = await admin.from('captain_location_updates').insert({
    captain_id: profile.id,
    latitude: lat,
    longitude: lon,
    accuracy_m: toNum(body.accuracyM),
    speed_mps: toNum(body.speedMps),
    heading_deg: toNum(body.headingDeg),
    provider,
    captured_at: capturedAt,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}


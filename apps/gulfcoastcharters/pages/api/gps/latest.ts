import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const captainId = String(req.query.captainId || '').trim();
  if (!captainId) return res.status(400).json({ error: 'Missing captainId' });

  const admin = getSupabaseAdmin();

  // Only show if the captain has public sharing enabled.
  const { data: conn, error: connErr } = await admin
    .from('captain_gps_connections')
    .select('share_public,is_active,provider,update_interval_seconds')
    .eq('captain_id', captainId)
    .eq('provider', 'browser')
    .maybeSingle();
  if (connErr) return res.status(500).json({ error: connErr.message });
  if (!conn?.is_active || !conn?.share_public) return res.status(404).json({ error: 'Not sharing' });

  const { data, error } = await admin
    .from('captain_location_updates')
    .select('latitude,longitude,accuracy_m,speed_mps,heading_deg,provider,captured_at')
    .eq('captain_id', captainId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No location yet' });

  return res.status(200).json({
    captainId,
    provider: data.provider,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracyM: data.accuracy_m === null ? null : Number(data.accuracy_m),
    speedMps: data.speed_mps === null ? null : Number(data.speed_mps),
    headingDeg: data.heading_deg === null ? null : Number(data.heading_deg),
    capturedAt: data.captured_at,
    updateIntervalSeconds: conn.update_interval_seconds ?? 5,
  });
}


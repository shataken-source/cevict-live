/**
 * Captain weather alerts — same shape as captain-weather-alerts Edge Function.
 * GET/POST: captain_id?, location?, latitude?, longitude?
 * Resolves point: coords → geocode(location) → captain_profiles.home_port for captain_id.
 * Returns { alert: { severity, event, start_date, end_date } } or { alert: null }.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from './_lib/supabase';

const USER_AGENT = 'gulfcoastcharters (captain-weather; contact: support@gulfcoastcharters.com)';

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickBadgeSeverity(props: { severity?: string; event?: string }): string {
  const s = String(props?.severity || '').trim().toLowerCase();
  const ev = String(props?.event || '').toLowerCase();
  if (ev.includes('warning')) return 'warning';
  if (ev.includes('watch')) return 'watch';
  if (s === 'extreme') return 'extreme';
  if (s === 'severe') return 'severe';
  if (s === 'moderate') return 'moderate';
  return 'advisory';
}

function severityOrder(sev: string): number {
  const s = sev.toLowerCase();
  if (s === 'extreme') return 4;
  if (s === 'severe' || s === 'warning') return 3;
  if (s === 'watch' || s === 'moderate') return 2;
  return 1;
}

async function geocodeLocation(q: string): Promise<{ lat: number; lon: number } | null> {
  const query = q.trim();
  if (!query) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  const lat = toNum(first?.lat);
  const lon = toNum(first?.lon);
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

async function fetchAlerts(lat: number, lon: number): Promise<Array<{ severity?: string; event?: string; effective?: string; expires?: string }>> {
  const res = await fetch(
    `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
    { headers: { Accept: 'application/geo+json', 'User-Agent': USER_AGENT } }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  return features.map((f) => f?.properties || {}).filter(Boolean);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.method === 'POST' && req.body ? req.body : {};
    const q = req.method === 'GET' ? (req.query || {}) : body;
    const captainId = String(q?.captain_id ?? q?.captainId ?? '').trim();
    const location = String(q?.location ?? '').trim();
    const latIn = toNum(q?.latitude);
    const lonIn = toNum(q?.longitude);

    let point: { lat: number; lon: number } | null =
      latIn !== null && lonIn !== null ? { lat: latIn, lon: lonIn } : null;

    if (!point && location) {
      try {
        point = await geocodeLocation(location);
      } catch (e) {
        console.warn('Geocode failed for', location, e);
      }
    }

    if (!point && captainId) {
      try {
        const admin = getSupabaseAdmin();
        const { data } = await admin
          .from('captain_profiles')
          .select('home_port')
          .eq('id', captainId)
          .maybeSingle();
        const homePort = String((data as any)?.home_port ?? '').trim();
        if (homePort) point = await geocodeLocation(homePort);
      } catch {
        // no Supabase or table missing
      }
    }

    if (!point) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ alert: null });
    }

    let props: Array<{ severity?: string; event?: string; effective?: string; expires?: string }>;
    try {
      props = await fetchAlerts(point.lat, point.lon);
    } catch (e) {
      console.warn('fetchAlerts failed:', e);
      props = [];
    }

    if (!props.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ alert: null });
    }

    const best = props
      .map((p) => ({ p, sev: pickBadgeSeverity(p), score: severityOrder(pickBadgeSeverity(p)) }))
      .sort((a, b) => b.score - a.score)[0];

    const p = best.p;
    const alert = {
      severity: best.sev,
      event: String(p?.event ?? ''),
      start_date: String(p?.effective ?? p?.onset ?? ''),
      end_date: String(p?.expires ?? p?.ends ?? ''),
    };

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({ alert });
  } catch (e: any) {
    console.error('Captain weather API error:', e);
    return res.status(500).json({ error: String(e?.message ?? 'Internal server error') });
  }
}

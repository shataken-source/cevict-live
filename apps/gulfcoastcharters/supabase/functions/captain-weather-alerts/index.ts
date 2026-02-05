/**
 * captain-weather-alerts (Supabase Edge Function)
 *
 * Minimal implementation to support:
 * - CaptainWeatherBadge.tsx (action: check_captain_weather)
 * - CaptainAlertPreferences.tsx / AlertHistoryPanel.tsx (stub actions to avoid UI breakage)
 *
 * Uses:
 * - Geocoding via OpenStreetMap Nominatim when only a location string is provided (no API key)
 * - Alerts via api.weather.gov for the resolved point
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function severityFromWeatherGov(props: any): string {
  const s = String(props?.severity || '').trim();
  if (s) return s.toLowerCase();
  const ev = String(props?.event || '').toLowerCase();
  if (ev.includes('extreme')) return 'extreme';
  if (ev.includes('warning')) return 'severe';
  if (ev.includes('watch')) return 'watch';
  return 'advisory';
}

function pickBadgeSeverity(props: any): string {
  // Normalize to the set expected by CaptainWeatherBadge.tsx
  const base = severityFromWeatherGov(props);
  const event = String(props?.event || '').toLowerCase();
  if (event.includes('warning')) return 'warning';
  if (event.includes('watch')) return 'watch';
  if (base === 'extreme') return 'extreme';
  if (base === 'severe') return 'severe';
  if (base === 'moderate') return 'moderate';
  return 'advisory';
}

async function geocodeLocation(q: string): Promise<{ lat: number; lon: number } | null> {
  const query = q.trim();
  if (!query) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'gulfcoastcharters (captain-weather-alerts; contact: support@gulfcoastcharters.com)',
    },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  const lat = toNum(first?.lat);
  const lon = toNum(first?.lon);
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

async function fetchAlerts(lat: number, lon: number) {
  const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
    headers: {
      Accept: 'application/geo+json',
      'User-Agent': 'gulfcoastcharters (captain-weather-alerts; contact: support@gulfcoastcharters.com)',
    },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  return features.map((f) => f?.properties || {}).filter(Boolean);
}

function getAdminClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const key = serviceRole || anon;
  return createClient(url, key, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');

  // --- Stubs for settings/history UI (no mock data) ---
  if (action === 'getPreferences') return json({ preferences: [] });
  if (action === 'savePreference') return json({ ok: true });
  if (action === 'deletePreference') return json({ ok: true });
  if (action === 'getAlertHistory') return json({ history: [] });

  if (action !== 'check_captain_weather') {
    return json({ error: 'Invalid action' }, { status: 400 });
  }

  const captainId = String(body?.captain_id || body?.captainId || '').trim();
  const inputLocation = String(body?.location || '').trim();
  const latIn = toNum(body?.latitude);
  const lonIn = toNum(body?.longitude);

  // Resolve point: prefer provided coords → else geocode location → else try captain profile home_port
  let point: { lat: number; lon: number } | null =
    latIn !== null && lonIn !== null ? { lat: latIn, lon: lonIn } : null;

  if (!point && inputLocation) {
    point = await geocodeLocation(inputLocation);
  }

  if (!point && captainId) {
    // Best-effort: find a textual home_port and geocode it.
    const admin = getAdminClient(req);
    const { data } = await admin.from('captain_profiles').select('home_port').eq('id', captainId).maybeSingle();
    const homePort = String((data as any)?.home_port || '').trim();
    if (homePort) point = await geocodeLocation(homePort);
  }

  if (!point) {
    return json({ alert: null });
  }

  try {
    const props = await fetchAlerts(point.lat, point.lon);
    if (!props.length) return json({ alert: null });

    // Prefer the most severe-ish by ordering
    const order = (sev: string) => {
      const s = sev.toLowerCase();
      if (s === 'extreme') return 4;
      if (s === 'severe') return 3;
      if (s === 'warning') return 3;
      if (s === 'watch' || s === 'moderate') return 2;
      return 1;
    };

    const best = props
      .map((p) => ({
        p,
        sev: pickBadgeSeverity(p),
        score: order(pickBadgeSeverity(p)),
      }))
      .sort((a, b) => b.score - a.score)[0];

    const p = best.p;
    const alert = {
      severity: best.sev,
      event: String(p?.event || ''),
      start_date: String(p?.effective || p?.onset || ''),
      end_date: String(p?.expires || p?.ends || ''),
    };

    return json(
      { alert },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
    );
  } catch (e: any) {
    return json({ error: 'Internal error', details: String(e?.message || e) }, { status: 500 });
  }
});


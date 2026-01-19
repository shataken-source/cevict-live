/**
 * weather-alerts (Supabase Edge Function)
 *
 * Returns active NWS alerts for a given point using api.weather.gov.
 * Called by `src/components/WeatherAlertSystem.tsx`.
 *
 * Input:
 *  { action: "list", latitude: number, longitude: number }
 *
 * Output:
 *  { alerts: Array<{ id, severity, event, description, expires }> }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
  if (s) return s;
  const ev = String(props?.event || '').toLowerCase();
  if (ev.includes('extreme')) return 'Extreme';
  if (ev.includes('warning')) return 'Severe';
  if (ev.includes('watch')) return 'Moderate';
  return 'Minor';
}

async function fetchAlerts(lat: number, lon: number) {
  const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
    headers: {
      Accept: 'application/geo+json',
      // weather.gov requires an identifying User-Agent
      'User-Agent': 'gulfcoastcharters (weather-alerts; contact: support@gulfcoastcharters.com)',
    },
  });
  if (!res.ok) {
    return { alerts: [], status: res.status };
  }
  const data = await res.json().catch(() => null);
  const features: any[] = Array.isArray(data?.features) ? data.features : [];

  const alerts = features.slice(0, 12).map((f) => {
    const p = f?.properties || {};
    const id = String(p?.id || f?.id || '');
    const severity = severityFromWeatherGov(p);
    const event = String(p?.event || '');
    const description = String(p?.headline || p?.description || '').slice(0, 2000);
    const expires = String(p?.expires || p?.ends || '');
    return { id, severity, event, description, expires };
  });

  return { alerts, status: 200 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');

  if (action !== 'list') {
    return json({ error: 'Invalid action' }, { status: 400 });
  }

  const lat = toNum(body?.latitude);
  const lon = toNum(body?.longitude);

  if (lat === null || lon === null) {
    // No coordinates provided → no alerts (do not invent a location).
    return json({ alerts: [] }, { status: 200 });
  }

  try {
    const result = await fetchAlerts(lat, lon);
    return json(
      { alerts: result.alerts },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
      }
    );
  } catch (e: any) {
    return json({ error: 'Internal error', details: String(e?.message || e) }, { status: 500 });
  }
});


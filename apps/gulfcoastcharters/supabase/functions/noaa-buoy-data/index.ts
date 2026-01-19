/**
 * noaa-buoy-data (Supabase Edge Function)
 *
 * Implements NOAA buoy listing + live observations.
 * - list: returns a curated set of Gulf Coast buoys with lat/lon from NOAA active stations feed
 * - get: returns current observation (converted to ft/mph/°F/mi) + active alerts from api.weather.gov
 *
 * Called by:
 * - src/components/BuoyMap.tsx  (action: 'list')
 * - src/components/BuoyDataDisplay.tsx (action: 'get')
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

function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim();
  if (!s || s === 'MM') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mToFt(m: number) {
  return m * 3.28084;
}
function msToMph(ms: number) {
  return ms * 2.23694;
}
function cToF(c: number) {
  return (c * 9) / 5 + 32;
}
function nmiToMi(nmi: number) {
  return nmi * 1.15078;
}

type Buoy = { id: string; name: string; location: string; lat: number; lon: number };

const CURATED_BUOYS: Array<{ id: string; location: string }> = [
  { id: '42001', location: 'Mid Gulf (Central Gulf of Mexico)' },
  { id: '42002', location: 'West Gulf (West Gulf of Mexico)' },
  { id: '42003', location: 'East Gulf (East Gulf of Mexico)' },
  { id: '42012', location: 'Orange Beach, AL' },
  { id: '42019', location: 'Freeport, TX' },
  { id: '42020', location: 'Corpus Christi, TX' },
  { id: '42035', location: 'Galveston, TX' },
  { id: '42036', location: 'West Tampa, FL' },
  { id: '42039', location: 'Pensacola, FL' },
  { id: '42040', location: 'Luke Offshore, LA' },
];

async function fetchActiveStations(): Promise<Map<string, { lat: number; lon: number; name: string }>> {
  // XML format: <station id="42039" lat="..." lon="..." name="..." ... />
  const res = await fetch('https://www.ndbc.noaa.gov/activestations.xml', {
    headers: { Accept: 'application/xml' },
  });
  if (!res.ok) throw new Error(`Failed to fetch active stations: ${res.status}`);
  const xml = await res.text();

  const out = new Map<string, { lat: number; lon: number; name: string }>();
  const re = /<station\b[^>]*\bid="([^"]+)"[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*\bname="([^"]*)"[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const id = m[1];
    const lat = Number(m[2]);
    const lon = Number(m[3]);
    const name = m[4] || id;
    if (Number.isFinite(lat) && Number.isFinite(lon)) out.set(id, { lat, lon, name });
  }
  return out;
}

function parseRealtimeTxt(text: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) throw new Error('Unexpected buoy data format');

  const header = lines[0].replace(/^#\s*/, '').split(/\s+/);
  const data = lines[2].split(/\s+/);
  const map = new Map<string, string>();
  for (let i = 0; i < Math.min(header.length, data.length); i++) {
    map.set(header[i], data[i]);
  }

  // Timestamp fields are in the header as YY MM DD hh mm (sometimes #YY)
  const yy = map.get('YY') || map.get('#YY');
  const mm = map.get('MM');
  const dd = map.get('DD');
  const hh = map.get('hh');
  const min = map.get('mm');
  const iso =
    yy && mm && dd && hh && min
      ? new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min))).toISOString()
      : new Date().toISOString();

  // Common NDBC columns:
  // WDIR (deg), WSPD (m/s), GST (m/s), WVHT (m), DPD (s), VIS (nmi), WTMP (degC)
  const wvhtM = toNum(map.get('WVHT'));
  const dpdS = toNum(map.get('DPD'));
  const wspdMs = toNum(map.get('WSPD'));
  const wdirDeg = toNum(map.get('WDIR'));
  const wtmpC = toNum(map.get('WTMP'));
  const visNmi = toNum(map.get('VIS'));

  return {
    timestamp: iso,
    waveHeightFt: wvhtM === null ? null : mToFt(wvhtM),
    wavePeriodS: dpdS,
    windSpeedMph: wspdMs === null ? null : msToMph(wspdMs),
    windDirectionDeg: wdirDeg,
    waterTempF: wtmpC === null ? null : cToF(wtmpC),
    visibilityMi: visNmi === null ? null : nmiToMi(visNmi),
  };
}

function severityFromWeatherGov(props: any): string {
  const s = String(props?.severity || '').trim();
  if (s) return s;
  // Fallback: infer from event name keywords
  const ev = String(props?.event || '').toLowerCase();
  if (ev.includes('extreme')) return 'Extreme';
  if (ev.includes('hurricane') || ev.includes('tornado') || ev.includes('severe')) return 'Severe';
  if (ev.includes('warning')) return 'Severe';
  if (ev.includes('watch')) return 'Moderate';
  return 'Minor';
}

async function fetchAlerts(lat: number, lon: number) {
  // weather.gov requires a User-Agent identifying your app
  const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
    headers: {
      Accept: 'application/geo+json',
      'User-Agent': 'gulfcoastcharters (noaa-buoy-data; contact: support@gulfcoastcharters.com)',
    },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  return features.slice(0, 12).map((f) => {
    const p = f?.properties || {};
    return {
      id: String(p?.id || f?.id || ''),
      severity: severityFromWeatherGov(p),
      event: String(p?.event || ''),
      headline: String(p?.headline || ''),
      description: String(p?.description || ''),
      effective: p?.effective || null,
      expires: p?.expires || null,
      instruction: p?.instruction || null,
      areaDesc: p?.areaDesc || null,
      senderName: p?.senderName || null,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || 'get');

  try {
    if (action === 'list') {
      const stations = await fetchActiveStations();
      const buoys: Record<string, Buoy> = {};
      for (const b of CURATED_BUOYS) {
        const s = stations.get(b.id);
        if (!s) continue;
        buoys[b.id] = { id: b.id, name: s.name || b.id, location: b.location, lat: s.lat, lon: s.lon };
      }
      return json(
        { buoys },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
      );
    }

    // default: get station data
    const stationId = String(body?.stationId || body?.buoyId || body?.id || '').trim();
    if (!stationId) return json({ error: 'Missing stationId' }, { status: 400 });

    const stations = await fetchActiveStations();
    const meta = stations.get(stationId) || null;

    const realtimeRes = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, {
      headers: { Accept: 'text/plain' },
    });
    if (!realtimeRes.ok) {
      return json(
        { error: 'Failed to fetch buoy data', status: realtimeRes.status },
        { status: 502 }
      );
    }
    const text = await realtimeRes.text();
    const obs = parseRealtimeTxt(text);

    const lat = meta?.lat ?? toNum(String(body?.lat ?? '')) ?? null;
    const lon = meta?.lon ?? toNum(String(body?.lon ?? '')) ?? null;
    const alerts = lat !== null && lon !== null ? await fetchAlerts(lat, lon) : [];

    return json(
      {
        stationId,
        station: meta?.name || stationId,
        lat,
        lon,
        observation: {
          timestamp: obs.timestamp,
          waveHeightFt: obs.waveHeightFt === null ? null : Math.round(obs.waveHeightFt * 10) / 10,
          wavePeriodS: obs.wavePeriodS,
          windSpeedMph: obs.windSpeedMph === null ? null : Math.round(obs.windSpeedMph * 10) / 10,
          windDirectionDeg: obs.windDirectionDeg,
          waterTempF: obs.waterTempF === null ? null : Math.round(obs.waterTempF),
          visibilityMi: obs.visibilityMi === null ? null : Math.round(obs.visibilityMi * 10) / 10,
        },
        alerts,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
    );
  } catch (e: any) {
    return json({ error: 'Internal error', details: String(e?.message || e) }, { status: 500 });
  }
});


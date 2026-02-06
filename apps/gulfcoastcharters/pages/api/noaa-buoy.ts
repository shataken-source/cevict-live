/**
 * NOAA Buoy Data API
 * GET /api/noaa-buoy?action=list | action=get&stationId=42039
 * Fetches Gulf Coast buoy list and real-time observations (NDBC + weather.gov marine alerts).
 * Works without Supabase Edge Function.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const USER_AGENT = 'gulfcoastcharters (noaa-buoy; contact: support@gulfcoastcharters.com)';

/** Gulf Coast buoys + C-MAN stations. IDs must match NDBC activestations.xml. */
const CURATED_BUOYS: Array<{ id: string; location: string }> = [
  // Deep-water moored buoys
  { id: '42001', location: 'Mid-Gulf (180 nm S of Mississippi River mouth)' },
  { id: '42002', location: 'West Gulf (250 nm E of Brownsville, TX)' },
  { id: '42003', location: 'East Gulf (170 nm W of Naples, FL)' },
  { id: '42007', location: 'Mississippi Sound (S of Biloxi)' },
  { id: '42012', location: 'Orange Beach, AL (44 nm SE of Mobile)' },
  { id: '42019', location: 'Freeport, TX (60 nm S of Freeport)' },
  { id: '42020', location: 'Corpus Christi / Pt. Mansfield, TX (50 nm E of Port Mansfield)' },
  { id: '42035', location: 'Galveston, TX (22 nm E of Galveston)' },
  { id: '42036', location: 'West Tampa, FL' },
  { id: '42039', location: 'Pensacola / Panama City (115 nm SSE of Pensacola)' },
  { id: '42040', location: 'South Pass / Mobile South (63 nm S of Dauphin Island)' },
  // C-MAN coastal stations
  { id: 'DPIA1', location: 'Dauphin Island, AL (C-MAN)' },
  { id: 'GDIL1', location: 'Grand Isle, LA (C-MAN)' },
  { id: 'PTAT2', location: 'Port Aransas, TX (C-MAN)' },
  { id: 'BURL1', location: 'Southwest Pass, LA (C-MAN)' },
  { id: 'PNCL1', location: 'Pensacola, FL (C-MAN)' },
];

/** Parse numeric value; NDBC Realtime uses "MM" for missing. Historical uses 999/99. See https://www.ndbc.noaa.gov/measdes.shtml */
function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === 'MM') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const mToFt = (m: number) => m * 3.28084;
const msToMph = (ms: number) => ms * 2.23694;
const cToF = (c: number) => (c * 9) / 5 + 32;
const nmiToMi = (nmi: number) => nmi * 1.15078;

async function fetchActiveStations(): Promise<Map<string, { lat: number; lon: number; name: string }>> {
  const res = await fetch('https://www.ndbc.noaa.gov/activestations.xml', {
    headers: { Accept: 'application/xml' },
  });
  if (!res.ok) throw new Error(`NDBC activestations: ${res.status}`);
  const xml = await res.text();
  const out = new Map<string, { lat: number; lon: number; name: string }>();
  const re = /<station\b[^>]*\bid="([^"]+)"[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*\bname="([^"]*)"[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const id = m[1];
    const lat = Number(m[2]);
    const lon = Number(m[3]);
    const name = (m[4] || id).trim();
    if (Number.isFinite(lat) && Number.isFinite(lon)) out.set(id, { lat, lon, name });
  }
  return out;
}

/** Parse NDBC Standard Meteorological Data (realtime2 .txt). Headers: WDIR WSPD GST WVHT DPD etc. Units: WSPD m/s, WVHT m, PRES hPa. See https://www.ndbc.noaa.gov/measdes.shtml */
function parseRealtimeTxt(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error('Unexpected buoy data format');
  const header = lines[0].replace(/^#\s*/, '').split(/\s+/);
  const data = lines[2].split(/\s+/);
  const map = new Map<string, string>();
  for (let i = 0; i < Math.min(header.length, data.length); i++) {
    map.set(header[i], data[i]);
  }
  const yy = map.get('YY') || map.get('#YY');
  const mm = map.get('MM');
  const dd = map.get('DD');
  const hh = map.get('hh');
  const min = map.get('mm');
  const iso =
    yy && mm && dd && hh && min
      ? new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min))).toISOString()
      : new Date().toISOString();

  const wvhtM = toNum(map.get('WVHT'));
  const dpdS = toNum(map.get('DPD'));
  const wspdMs = toNum(map.get('WSPD'));
  const gstMs = toNum(map.get('GST'));
  const presHpa = toNum(map.get('PRES'));
  const wdirDeg = toNum(map.get('WDIR'));
  const wtmpC = toNum(map.get('WTMP'));
  const visNmi = toNum(map.get('VIS'));

  return {
    timestamp: iso,
    waveHeightFt: wvhtM === null ? null : Math.round(mToFt(wvhtM) * 10) / 10,
    wavePeriodS: dpdS,
    windSpeedMph: wspdMs === null ? null : Math.round(msToMph(wspdMs) * 10) / 10,
    windGustMph: gstMs === null ? null : Math.round(msToMph(gstMs) * 10) / 10,
    pressureHpa: presHpa,
    windDirectionDeg: wdirDeg,
    waterTempF: wtmpC === null ? null : Math.round(cToF(wtmpC)),
    visibilityMi: visNmi === null ? null : Math.round(nmiToMi(visNmi) * 10) / 10,
  };
}

/** ERDDAP fallback when NDBC realtime2 fails. Returns same shape or null. */
async function fetchFromERDDAP(stationId: string): Promise<{
  timestamp: string;
  waveHeightFt: number | null;
  wavePeriodS: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  pressureHpa: number | null;
  windDirectionDeg: number | null;
  waterTempF: number | null;
  visibilityMi: number | null;
} | null> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', 'T');
  const url = `https://coastwatch.pfeg.noaa.gov/erddap/tabledap/cwwcNDBCMet.json?station,latitude,longitude,time,wspd,wdir,wvht,dpd,wtmp&station=%22${encodeURIComponent(stationId)}%22&time>=${twoDaysAgo}Z&orderBy("time")`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    const table = json?.table;
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    const cols = Array.isArray(table?.columnNames) ? table.columnNames : [];
    if (rows.length === 0 || cols.length === 0) return null;
    const last = rows[rows.length - 1] as any[];
    const idx = (k: string) => cols.indexOf(k);
    const timeIdx = idx('time');
    const wspdIdx = idx('wspd');
    const wdirIdx = idx('wdir');
    const wvhtIdx = idx('wvht');
    const dpdIdx = idx('dpd');
    const wtmpIdx = idx('wtmp');
    const wspdMs = wspdIdx >= 0 && last[wspdIdx] != null ? Number(last[wspdIdx]) : null;
    const wvhtM = wvhtIdx >= 0 && last[wvhtIdx] != null ? Number(last[wvhtIdx]) : null;
    const wtmpC = wtmpIdx >= 0 && last[wtmpIdx] != null ? Number(last[wtmpIdx]) : null;
    return {
      timestamp: timeIdx >= 0 && last[timeIdx] != null ? String(last[timeIdx]) : new Date().toISOString(),
      waveHeightFt: wvhtM != null && Number.isFinite(wvhtM) ? Math.round(mToFt(wvhtM) * 10) / 10 : null,
      wavePeriodS: dpdIdx >= 0 && last[dpdIdx] != null ? Number(last[dpdIdx]) : null,
      windSpeedMph: wspdMs != null && Number.isFinite(wspdMs) ? Math.round(msToMph(wspdMs) * 10) / 10 : null,
      windGustMph: null,
      pressureHpa: null,
      windDirectionDeg: wdirIdx >= 0 && last[wdirIdx] != null ? Number(last[wdirIdx]) : null,
      waterTempF: wtmpC != null && Number.isFinite(wtmpC) ? Math.round(cToF(wtmpC)) : null,
      visibilityMi: null,
    };
  } catch {
    return null;
  }
}

function severityFromProps(props: { severity?: string; event?: string }): string {
  const s = String(props?.severity || '').trim();
  if (s) return s;
  const ev = String(props?.event || '').toLowerCase();
  if (ev.includes('extreme')) return 'Extreme';
  if (ev.includes('hurricane') || ev.includes('tornado') || ev.includes('severe')) return 'Severe';
  if (ev.includes('warning')) return 'Severe';
  if (ev.includes('watch')) return 'Moderate';
  return 'Minor';
}

async function fetchMarineAlerts(lat: number, lon: number) {
  const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
    headers: { Accept: 'application/geo+json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  return features.slice(0, 12).map((f: any) => {
    const p = f?.properties || {};
    return {
      id: String(p?.id || f?.id || ''),
      severity: severityFromProps(p),
      event: String(p?.event || ''),
      headline: String(p?.headline || ''),
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const query = req.query || {};
    const action = String(query.action || 'get').toLowerCase();
    const stationId = String(query.stationId || query.buoyId || '').trim();

    if (action === 'list') {
      let stationMap: Map<string, { lat: number; lon: number; name: string }>;
      try {
        stationMap = await fetchActiveStations();
      } catch (e) {
        console.warn('NOAA activestations fetch failed, using fallback list:', e);
        stationMap = new Map();
      }
      const buoys: Record<string, { id: string; name: string; location: string; lat: number; lon: number }> = {};
      for (const b of CURATED_BUOYS) {
        const s = stationMap.get(b.id);
        buoys[b.id] = {
          id: b.id,
          name: s?.name || b.id,
          location: b.location,
          lat: s?.lat ?? 0,
          lon: s?.lon ?? 0,
        };
      }
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ buoys });
    }

    if (action !== 'get' || !stationId) {
      return res.status(400).json({ error: 'Missing stationId for action=get' });
    }

    let stationMap: Map<string, { lat: number; lon: number; name: string }>;
    try {
      stationMap = await fetchActiveStations();
    } catch (e) {
      console.warn('NOAA activestations fetch failed:', e);
      stationMap = new Map();
    }
    const meta = stationMap.get(stationId) || null;

    const realtimeRes = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, {
      headers: { Accept: 'text/plain' },
    });

    let unavailable = false;
    let obs: {
      timestamp: string;
      waveHeightFt: number | null;
      wavePeriodS: number | null;
      windSpeedMph: number | null;
      windGustMph: number | null;
      pressureHpa: number | null;
      windDirectionDeg: number | null;
      waterTempF: number | null;
      visibilityMi: number | null;
    };
    const emptyObs = () => ({
      timestamp: new Date().toISOString(),
      waveHeightFt: null,
      wavePeriodS: null,
      windSpeedMph: null,
      windGustMph: null,
      pressureHpa: null,
      windDirectionDeg: null,
      waterTempF: null,
      visibilityMi: null,
    });
    if (!realtimeRes.ok) {
      unavailable = true;
      obs = emptyObs();
    } else {
      try {
        const text = await realtimeRes.text();
        obs = parseRealtimeTxt(text);
      } catch (e) {
        console.warn('Parse buoy data failed for', stationId, e);
        unavailable = true;
        obs = emptyObs();
      }
    }

    // If NDBC failed, try CoastWatch ERDDAP (JSON) as fallback
    if (unavailable) {
      const erddapObs = await fetchFromERDDAP(stationId);
      if (erddapObs) {
        obs = erddapObs;
        unavailable = false;
      }
    }

    const lat = meta?.lat ?? null;
    const lon = meta?.lon ?? null;
    let alerts: any[] = [];
    if (lat !== null && lon !== null) {
      try {
        alerts = await fetchMarineAlerts(lat, lon);
      } catch {
        // ignore
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      stationId,
      station: meta?.name || stationId,
      lat,
      lon,
      observation: {
        timestamp: obs.timestamp,
        waveHeightFt: obs.waveHeightFt,
        wavePeriodS: obs.wavePeriodS,
        windSpeedMph: obs.windSpeedMph,
        windGustMph: obs.windGustMph ?? null,
        pressureHpa: obs.pressureHpa ?? null,
        windDirectionDeg: obs.windDirectionDeg,
        waterTempF: obs.waterTempF,
        visibilityMi: obs.visibilityMi,
      },
      alerts,
      unavailable,
    });
  } catch (e: any) {
    console.error('NOAA buoy API error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}

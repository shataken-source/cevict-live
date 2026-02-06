/**
 * Tide predictions API — no Edge Function.
 * GET/POST: latitude, longitude, date (YYYY-MM-DD, optional), stationId (optional override).
 * Returns NOAA CO-OPS predictions shape: { stationId, date, predictions: [ { type, t, v } ] }.
 * See https://api.tidesandcurrents.noaa.gov/api/prod/
 */

import type { NextApiRequest, NextApiResponse } from 'next';

/** Gulf Coast NOAA CO-OPS tide stations: id, lat, lon (approx). */
const GULF_TIDE_STATIONS: Array<{ id: string; lat: number; lon: number }> = [
  { id: '8729840', lat: 30.403, lon: -87.211 },   // Pensacola
  { id: '8729511', lat: 30.393, lon: -86.495 },   // Destin
  { id: '8729108', lat: 29.733, lon: -84.983 },   // Panama City
  { id: '8737048', lat: 30.652, lon: -88.075 },  // Mobile
  { id: '8735180', lat: 30.250, lon: -88.075 },  // Dauphin Island
  { id: '8725110', lat: 26.132, lon: -81.807 },  // Naples
  { id: '8770613', lat: 29.310, lon: -94.793 },  // Galveston
  { id: '8774770', lat: 27.580, lon: -97.213 },  // Port Aransas
  { id: '8768094', lat: 29.357, lon: -94.725 },  // Lake Charles / Sabine
];

function nearestStation(lat: number, lon: number): string {
  let best = GULF_TIDE_STATIONS[0];
  let bestD = 1e9;
  for (const s of GULF_TIDE_STATIONS) {
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const q = req.method === 'GET' ? req.query : req.body || {};
    const lat = q.latitude != null ? Number(q.latitude) : NaN;
    const lon = q.longitude != null ? Number(q.longitude) : NaN;
    const stationIdParam = typeof q.stationId === 'string' ? q.stationId.trim() : '';
    let dateParam = typeof q.date === 'string' ? q.date.trim() : '';

    let stationId = stationIdParam || '';
    if (!stationId && Number.isFinite(lat) && Number.isFinite(lon)) {
      stationId = nearestStation(lat, lon);
    }
    if (!stationId) {
      return res.status(400).json({ error: 'Provide stationId or latitude and longitude' });
    }

    let dateStr: string;
    if (dateParam) {
      const d = new Date(dateParam);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid date' });
      }
      dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    } else {
      dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }

    const noaaUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=${dateStr}&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
    const noaaRes = await fetch(noaaUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!noaaRes.ok) {
      return res.status(502).json({ error: 'Tide service unavailable', stationId, date: dateStr });
    }
    const json = await noaaRes.json().catch(() => null);
    const predictions = Array.isArray(json?.predictions) ? json.predictions : [];

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      stationId,
      date: dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8),
      predictions: predictions.map((p: any) => ({
        type: p.type === 'H' ? 'H' : 'L',
        t: p.t,
        v: parseFloat(p.v),
      })),
    });
  } catch (e: any) {
    console.error('Tides API error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}

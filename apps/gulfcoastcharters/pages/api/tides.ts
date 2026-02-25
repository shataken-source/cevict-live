/**
 * Tides & Fishing Forecast API
 * GET /api/tides?stationId=8729840&days=3          — tide predictions (hi/lo)
 * GET /api/tides?action=forecast&lat=30.2&lon=-87.5 — best-days-to-fish algorithm
 *
 * Data sources:
 *   Tides  → NOAA CO-OPS Tides & Currents API (free, no key)
 *   Moon   → simple astronomical calculation
 *   Buoy   → reuses /api/noaa-buoy internally
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ── Gulf Coast tide stations (NOAA CO-OPS) ──────────────────────────────────
const TIDE_STATIONS: Record<string, { name: string; lat: number; lon: number }> = {
  '8729840': { name: 'Pensacola, FL', lat: 30.4044, lon: -87.2108 },
  '8729108': { name: 'Panama City, FL', lat: 30.1525, lon: -85.6672 },
  '8726520': { name: 'St. Petersburg, FL', lat: 27.7606, lon: -82.6267 },
  '8726607': { name: 'Old Port Tampa, FL', lat: 27.8578, lon: -82.5528 },
  '8735180': { name: 'Dauphin Island, AL', lat: 30.2503, lon: -88.075 },
  '8737048': { name: 'Mobile State Docks, AL', lat: 30.7083, lon: -88.04 },
  '8741533': { name: 'Pascagoula, MS', lat: 30.3456, lon: -88.5631 },
  '8747437': { name: 'Bay Waveland Yacht Club, MS', lat: 30.3253, lon: -89.3256 },
  '8761724': { name: 'Grand Isle, LA', lat: 29.2633, lon: -89.9572 },
  '8768094': { name: 'Calcasieu Pass, LA', lat: 29.7683, lon: -93.3433 },
  '8770570': { name: 'Sabine Pass, TX', lat: 29.7283, lon: -93.87 },
  '8771450': { name: 'Galveston Pier 21, TX', lat: 29.31, lon: -94.7933 },
  '8775870': { name: 'Bob Hall Pier, Corpus Christi, TX', lat: 27.5808, lon: -97.2167 },
  '8779770': { name: 'Port Isabel, TX', lat: 26.0617, lon: -97.215 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Haversine distance in miles */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find closest tide station to given lat/lon */
function closestStation(lat: number, lon: number): { id: string; name: string; dist: number } {
  let best = { id: '', name: '', dist: Infinity };
  for (const [id, s] of Object.entries(TIDE_STATIONS)) {
    const d = haversine(lat, lon, s.lat, s.lon);
    if (d < best.dist) best = { id, name: s.name, dist: d };
  }
  return best;
}

// ── Moon phase (simple algorithm) ────────────────────────────────────────────
/** Returns 0-1 illumination fraction and phase name */
function moonPhase(date: Date): { illumination: number; phase: string; name: string } {
  // Synodic month = 29.53059 days. Known new moon: Jan 6, 2000 18:14 UTC
  const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
  const synodic = 29.53059;
  const daysSince = (date.getTime() - knownNew) / 86400000;
  const cycle = ((daysSince % synodic) + synodic) % synodic; // 0..29.53
  const fraction = cycle / synodic; // 0..1
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * fraction));

  let name: string;
  if (fraction < 0.0339) name = 'New Moon';
  else if (fraction < 0.216) name = 'Waxing Crescent';
  else if (fraction < 0.284) name = 'First Quarter';
  else if (fraction < 0.466) name = 'Waxing Gibbous';
  else if (fraction < 0.534) name = 'Full Moon';
  else if (fraction < 0.716) name = 'Waning Gibbous';
  else if (fraction < 0.784) name = 'Last Quarter';
  else if (fraction < 0.966) name = 'Waning Crescent';
  else name = 'New Moon';

  return { illumination: Math.round(illumination * 100) / 100, phase: fraction.toFixed(2), name };
}

// ── Solunar prime times (simplified) ─────────────────────────────────────────
/** Returns major/minor feeding periods based on moon transit */
function solunarPeriods(date: Date, lon: number): { major: string[]; minor: string[] } {
  // Approximate moon transit using longitude offset
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const baseMoonrise = ((dayOfYear * 50.47 + lon * 4) % 1440 + 1440) % 1440; // minutes past midnight
  const moonTransit = (baseMoonrise + 360) % 1440; // approximate overhead

  const fmt = (mins: number) => {
    const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
    const m = Math.round(((mins % 1440) + 1440) % 1440 % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Major periods: moon overhead & underfoot (±1hr)
  const overhead = moonTransit;
  const underfoot = (moonTransit + 720) % 1440;
  // Minor periods: moonrise & moonset (±30min)
  const rise = baseMoonrise;
  const set = (baseMoonrise + 720) % 1440;

  return {
    major: [`${fmt(overhead - 60)}–${fmt(overhead + 60)}`, `${fmt(underfoot - 60)}–${fmt(underfoot + 60)}`],
    minor: [`${fmt(rise - 30)}–${fmt(rise + 30)}`, `${fmt(set - 30)}–${fmt(set + 30)}`],
  };
}

// ── Fishing score algorithm ──────────────────────────────────────────────────
/**
 * Combines multiple factors into a 0-100 "fishing quality" score.
 * Higher = better fishing conditions.
 *
 * Factors and weights:
 *   Barometric pressure trend (30%) — stable/rising = good
 *   Moon phase / solunar (25%)      — new/full moon = best
 *   Tide movement (20%)             — moving tides = good
 *   Wind speed (15%)                — light wind = good
 *   Water temperature (10%)         — 68-82°F sweet spot
 */
function fishingScore(opts: {
  pressureHpa: number | null;
  moonIllumination: number;
  windSpeedMph: number | null;
  waterTempF: number | null;
  tideMoving: boolean;
}): { score: number; rating: string; factors: Record<string, number> } {
  const factors: Record<string, number> = {};

  // Barometric pressure (ideal: 1013-1020 hPa stable/rising)
  if (opts.pressureHpa != null) {
    const p = opts.pressureHpa;
    if (p >= 1013 && p <= 1025) factors.pressure = 100;
    else if (p >= 1005 && p < 1013) factors.pressure = 70;
    else if (p > 1025 && p <= 1035) factors.pressure = 60;
    else factors.pressure = 30;
  } else {
    factors.pressure = 50; // unknown
  }

  // Moon phase (new=0, full=0.5 are best; quarters worst)
  const moonDist = Math.min(opts.moonIllumination, 1 - opts.moonIllumination) * 2; // 0=new/full, 1=quarter
  factors.moon = Math.round(100 * (1 - moonDist * 0.6));

  // Wind (ideal: 5-12 mph)
  if (opts.windSpeedMph != null) {
    const w = opts.windSpeedMph;
    if (w >= 5 && w <= 12) factors.wind = 100;
    else if (w < 5) factors.wind = 70;
    else if (w <= 20) factors.wind = 50;
    else factors.wind = 20;
  } else {
    factors.wind = 50;
  }

  // Water temp (ideal: 68-82°F for Gulf Coast)
  if (opts.waterTempF != null) {
    const t = opts.waterTempF;
    if (t >= 68 && t <= 82) factors.waterTemp = 100;
    else if (t >= 60 && t < 68) factors.waterTemp = 70;
    else if (t > 82 && t <= 88) factors.waterTemp = 65;
    else factors.waterTemp = 30;
  } else {
    factors.waterTemp = 50;
  }

  // Tide movement
  factors.tide = opts.tideMoving ? 90 : 40;

  // Weighted score
  const score = Math.round(
    factors.pressure * 0.3 +
    factors.moon * 0.25 +
    factors.tide * 0.2 +
    factors.wind * 0.15 +
    factors.waterTemp * 0.1
  );

  let rating: string;
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Good';
  else if (score >= 55) rating = 'Fair';
  else if (score >= 40) rating = 'Poor';
  else rating = 'Bad';

  return { score, rating, factors };
}

// ── NOAA CO-OPS tide fetch ───────────────────────────────────────────────────
interface TidePrediction {
  time: string;
  height: number;
  type: 'High' | 'Low';
}

async function fetchTidePredictions(stationId: string, days: number): Promise<TidePrediction[]> {
  const begin = new Date();
  const end = new Date(begin.getTime() + days * 86400000);
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${yyyymmdd(begin)}&end_date=${yyyymmdd(end)}&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`NOAA CO-OPS: ${res.status}`);
  const json = await res.json();
  const preds = Array.isArray(json?.predictions) ? json.predictions : [];
  return preds.map((p: any) => ({
    time: p.t,
    height: Math.round(parseFloat(p.v) * 10) / 10,
    type: p.type === 'H' ? 'High' as const : 'Low' as const,
  }));
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const action = String(req.query.action || 'tides').toLowerCase();

    // ── action=stations: list all tide stations ──
    if (action === 'stations') {
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
      return res.status(200).json({ stations: TIDE_STATIONS });
    }

    // ── action=tides: tide predictions for a station ──
    if (action === 'tides') {
      let stationId = String(req.query.stationId || '').trim();
      const days = Math.min(Math.max(Number(req.query.days) || 3, 1), 10);

      // If lat/lon provided instead of stationId, find closest
      if (!stationId && req.query.lat && req.query.lon) {
        const lat = Number(req.query.lat);
        const lon = Number(req.query.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const closest = closestStation(lat, lon);
          stationId = closest.id;
        }
      }

      if (!stationId) stationId = '8729840'; // default: Pensacola

      const predictions = await fetchTidePredictions(stationId, days);
      const station = TIDE_STATIONS[stationId];

      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).json({
        stationId,
        stationName: station?.name || stationId,
        lat: station?.lat ?? null,
        lon: station?.lon ?? null,
        days,
        predictions,
      });
    }

    // ── action=forecast: best days to fish ──
    if (action === 'forecast') {
      const lat = toNum(req.query.lat);
      const lon = toNum(req.query.lon);
      if (lat === null || lon === null) {
        return res.status(400).json({ error: 'lat and lon required for forecast' });
      }

      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 10);
      const station = closestStation(lat, lon);

      // Fetch tide predictions
      let tides: TidePrediction[] = [];
      try {
        tides = await fetchTidePredictions(station.id, days);
      } catch {
        // continue without tides
      }

      // Fetch buoy data for pressure/wind/water temp (closest buoy)
      let buoyObs: { pressureHpa: number | null; windSpeedMph: number | null; waterTempF: number | null } = {
        pressureHpa: null, windSpeedMph: null, waterTempF: null,
      };
      try {
        // Use internal fetch to our own noaa-buoy route
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost:3000';
        const buoyRes = await fetch(`${protocol}://${host}/api/noaa-buoy?action=get&stationId=42039`, {
          signal: AbortSignal.timeout(8000),
        });
        if (buoyRes.ok) {
          const bj = await buoyRes.json();
          buoyObs.pressureHpa = bj?.observation?.pressureHpa ?? null;
          buoyObs.windSpeedMph = bj?.observation?.windSpeedMph ?? null;
          buoyObs.waterTempF = bj?.observation?.waterTempF ?? null;
        }
      } catch {
        // continue without buoy data
      }

      // Build daily forecasts
      const dailyForecasts: any[] = [];
      const now = new Date();

      for (let d = 0; d < days; d++) {
        const date = new Date(now.getTime() + d * 86400000);
        const dateStr = date.toISOString().slice(0, 10);

        // Moon
        const moon = moonPhase(date);
        const solunar = solunarPeriods(date, lon);

        // Tides for this day
        const dayTides = tides.filter((t) => t.time.startsWith(dateStr));
        const tideMoving = dayTides.length >= 2; // at least 1 hi + 1 lo = moving water

        // Fishing score
        const fs = fishingScore({
          pressureHpa: buoyObs.pressureHpa,
          moonIllumination: moon.illumination,
          windSpeedMph: buoyObs.windSpeedMph,
          waterTempF: buoyObs.waterTempF,
          tideMoving,
        });

        dailyForecasts.push({
          date: dateStr,
          moon: { phase: moon.name, illumination: moon.illumination },
          solunar,
          tides: dayTides,
          fishingScore: fs.score,
          fishingRating: fs.rating,
          factors: fs.factors,
        });
      }

      // Find best day
      const bestDay = dailyForecasts.reduce((a, b) => (b.fishingScore > a.fishingScore ? b : a), dailyForecasts[0]);

      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
      return res.status(200).json({
        location: { lat, lon },
        tideStation: { id: station.id, name: station.name, distanceMiles: Math.round(station.dist * 10) / 10 },
        currentConditions: {
          pressureHpa: buoyObs.pressureHpa,
          windSpeedMph: buoyObs.windSpeedMph,
          waterTempF: buoyObs.waterTempF,
        },
        forecast: dailyForecasts,
        bestDay: bestDay ? { date: bestDay.date, score: bestDay.fishingScore, rating: bestDay.fishingRating } : null,
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use: stations, tides, forecast' });
  } catch (e: any) {
    console.error('Tides API error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}

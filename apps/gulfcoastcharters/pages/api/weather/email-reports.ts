/**
 * Weather email reports — cron endpoint.
 * GET/POST ?frequency=daily|weekly (default daily)
 * Reads weather_subscriptions (active, frequency), builds report from /api/weather/current + optional buoy,
 * sends via Resend. Secure with CRON_SECRET or skip if not set (for dev).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';
import { Resend } from 'resend';

const DEFAULT_LAT = 30.3;
const DEFAULT_LON = -87.5;
const GULF_LOCATION = 'Gulf Coast (Orange Beach area)';

function getBaseUrl(req: NextApiRequest): string {
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] ?? (host?.includes('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? req.query?.secret ?? '';
    if (auth !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const frequency = (req.method === 'GET' ? req.query.frequency : req.body?.frequency) ?? 'daily';
  const freq = String(frequency).toLowerCase() === 'weekly' ? 'weekly' : 'daily';

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return res.status(200).json({ sent: 0, error: 'RESEND_API_KEY not set' });
  }

  let subscriptions: Array<{ email: string; include_waves?: boolean; include_tides?: boolean; include_buoys?: boolean }> = [];
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('weather_subscriptions')
      .select('email, include_waves, include_tides, include_buoys')
      .eq('active', true)
      .eq('frequency', freq);
    if (!error && Array.isArray(data)) subscriptions = data;
  } catch {
    return res.status(200).json({ sent: 0, error: 'weather_subscriptions not available' });
  }

  if (subscriptions.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  const baseUrl = getBaseUrl(req);
  let weather: any = {};
  let buoySummary = '';

  try {
    const wxRes = await fetch(
      `${baseUrl}/api/weather/current?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&alerts=true`
    );
    if (wxRes.ok) weather = await wxRes.json();
  } catch (e) {
    console.error('Weather fetch error:', e);
  }

  const cur = weather?.current ?? {};
  const alerts = Array.isArray(weather?.alerts) ? weather.alerts : [];
  const forecast = Array.isArray(weather?.forecast) ? weather.forecast.slice(0, 5) : [];

  const includeBuoy = subscriptions.some((s) => s.include_buoys !== false);
  if (includeBuoy) {
    try {
      const buoyRes = await fetch(`${baseUrl}/api/noaa-buoy?action=list`);
      if (buoyRes.ok) {
        const buoyData = await buoyRes.json();
        const stations = Array.isArray(buoyData?.stations) ? buoyData.stations.slice(0, 3) : [];
        buoySummary = stations.length
          ? stations.map((s: any) => `${s.id || s.station_id}: ${s.name || s.id || ''}`).join('; ')
          : 'Buoy list unavailable.';
      }
    } catch {
      buoySummary = 'Buoy data temporarily unavailable.';
    }
  }

  const html = buildReportHtml({
    location: weather?.location ?? GULF_LOCATION,
    temp: cur.temperature ?? cur.temp ?? '—',
    conditions: cur.description ?? cur.condition ?? '—',
    windSpeed: cur.windSpeed ?? '—',
    windDirection: cur.windDirection ?? '—',
    humidity: cur.humidity ?? '—',
    visibility: cur.visibility ?? '—',
    forecast,
    alerts,
    buoySummary: includeBuoy ? buoySummary : null,
    includeWaves: subscriptions.some((s) => s.include_waves !== false),
    includeTides: subscriptions.some((s) => s.include_tides !== false),
  });

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>';
  const subject = `Marine Weather Report – ${GULF_LOCATION} (${freq})`;
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: sub.email,
        subject,
        html,
      });
      if (!error) sent++;
    } catch (e) {
      console.error('Resend error for', sub.email, e);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ sent, total: subscriptions.length });
}

function buildReportHtml(opts: {
  location: string;
  temp: number | string;
  conditions: string;
  windSpeed: number | string;
  windDirection: number | string;
  humidity: number | string;
  visibility: number | string;
  forecast: any[];
  alerts: any[];
  buoySummary: string | null;
  includeWaves: boolean;
  includeTides: boolean;
}): string {
  const fRows = opts.forecast
    .map(
      (f) =>
        `<tr><td>${f.date || f.time || '—'}</td><td>${f.tempHigh ?? f.temp ?? '—'}°</td><td>${f.windSpeed ?? '—'} mph</td><td>${f.condition ?? '—'}</td></tr>`
    )
    .join('');
  const alertRows =
    opts.alerts.length > 0
      ? opts.alerts
          .map(
            (a) =>
              `<div style="background:#fee;padding:10px;margin:8px 0;border-left:4px solid #c00;"><strong>${a.event ?? 'Alert'}</strong> (${a.severity ?? ''})<br/>${(a.description ?? a.headline ?? '').slice(0, 200)}</div>`
          )
          .join('')
      : '<p>No active alerts.</p>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#0369a1;">Marine Weather Report</h1>
  <p><strong>${opts.location}</strong></p>
  <div style="background:#f0f9ff;padding:16px;border-radius:8px;margin:16px 0;">
    <p style="font-size:24px;margin:0;"><strong>${opts.temp}°F</strong> – ${opts.conditions}</p>
    <p style="margin:8px 0 0 0;">Wind ${opts.windSpeed} mph, ${opts.windDirection}° · Humidity ${opts.humidity}% · Visibility ${opts.visibility} mi</p>
  </div>
  <h2 style="font-size:18px;">Next few days</h2>
  <table style="width:100%;border-collapse:collapse;"><thead><tr><th>Date</th><th>High</th><th>Wind</th><th>Conditions</th></tr></thead><tbody>${fRows || '<tr><td colspan="4">No forecast data</td></tr>'}</tbody></table>
  <h2 style="font-size:18px;">Active alerts</h2>
  ${alertRows}
  ${opts.buoySummary !== null ? `<h2 style="font-size:18px;">Buoy stations</h2><p>${opts.buoySummary}</p>` : ''}
  ${opts.includeTides ? '<p style="color:#666;font-size:14px;">Tide predictions: see <a href="https://tidesandcurrents.noaa.gov/">NOAA Tides & Currents</a> for your port.</p>' : ''}
  <p style="margin-top:24px;color:#666;font-size:14px;">You received this because you subscribed to Gulf Coast Charters weather reports. Unsubscribe or change preferences in your account.</p>
</body>
</html>
  `.trim();
}

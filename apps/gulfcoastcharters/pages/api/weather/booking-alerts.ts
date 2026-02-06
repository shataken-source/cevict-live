/**
 * Proactive booking weather alerts — cron endpoint.
 * GET/POST: fetches confirmed bookings in the next 24h, gets NOAA buoy data per booking (default Gulf station),
 * evaluates wind/wave/visibility thresholds, sends alert email via Resend to customer.
 * Optional: update booking last_weather_check / weather_alert_level / weather_conditions if columns exist.
 * Secure with CRON_SECRET (Bearer or ?secret=).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../_lib/supabase';
import { Resend } from 'resend';

const DEFAULT_STATION = '42012'; // Orange Beach, AL
const WIND_WARNING_MPH = 23; // ~20 kt
const WIND_DANGER_MPH = 32; // ~28 kt
const WAVE_WARNING_FT = 4;
const WAVE_DANGER_FT = 6;
const VIS_WARNING_MI = 2;

function getBaseUrl(req: NextApiRequest): string {
  const host = req.headers.host;
  const proto = req.headers['x-forwarded-proto'] ?? (host?.includes('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

type AlertLevel = 'safe' | 'caution' | 'warning' | 'danger';

function analyzeConditions(obs: {
  windSpeedMph?: number | null;
  waveHeightFt?: number | null;
  visibilityMi?: number | null;
}): { level: AlertLevel; conditions: string[] } {
  const conditions: string[] = [];
  let level: AlertLevel = 'safe';

  const wind = obs.windSpeedMph ?? 0;
  const waves = obs.waveHeightFt ?? 0;
  const vis = obs.visibilityMi ?? 10;

  if (wind >= WIND_DANGER_MPH) {
    conditions.push(`Dangerous winds: ${wind} mph`);
    level = 'danger';
  } else if (wind >= WIND_WARNING_MPH) {
    conditions.push(`Strong winds: ${wind} mph`);
    if (level !== 'danger') level = 'warning';
  }
  if (waves >= WAVE_DANGER_FT) {
    conditions.push(`Dangerous seas: ${waves} ft waves`);
    level = 'danger';
  } else if (waves >= WAVE_WARNING_FT) {
    conditions.push(`Rough seas: ${waves} ft waves`);
    if (level === 'safe') level = 'warning';
  }
  if (vis < VIS_WARNING_MI) {
    conditions.push(`Poor visibility: ${vis} mi`);
    if (level === 'safe') level = 'caution';
  }

  return { level, conditions };
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

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return res.status(200).json({ bookingsChecked: 0, alertsSent: 0, error: 'RESEND_API_KEY not set' });
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let bookings: Array<{ id: string; user_id: string; trip_date: string; captain_id?: string }> = [];
  let profileByUserId: Record<string, { email?: string; full_name?: string }> = {};

  try {
    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin
      .from('bookings')
      .select('id, user_id, trip_date, captain_id')
      .eq('status', 'confirmed')
      .gte('trip_date', now.toISOString())
      .lte('trip_date', tomorrow.toISOString());

    if (error || !Array.isArray(rows)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ bookingsChecked: 0, alertsSent: 0 });
    }
    bookings = rows;

    const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      if (Array.isArray(profiles)) {
        profiles.forEach((p: any) => {
          profileByUserId[p.id] = { email: p.email, full_name: p.full_name };
        });
      }
    }
  } catch (e) {
    console.error('Booking fetch error:', e);
    return res.status(200).json({ bookingsChecked: 0, alertsSent: 0 });
  }

  if (bookings.length === 0) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ bookingsChecked: 0, alertsSent: 0 });
  }

  const baseUrl = getBaseUrl(req);
  let buoyData: { observation?: { windSpeedMph?: number; waveHeightFt?: number; visibilityMi?: number } } = {};
  try {
    const buoyRes = await fetch(
      `${baseUrl}/api/noaa-buoy?action=get&stationId=${DEFAULT_STATION}`
    );
    if (buoyRes.ok) buoyData = await buoyRes.json();
  } catch (e) {
    console.error('Buoy fetch error:', e);
  }

  const obs = buoyData?.observation ?? {};
  const { level, conditions } = analyzeConditions(obs);
  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>';
  let alertsSent = 0;
  const appUrl = baseUrl.replace(/\/$/, '');

  for (const booking of bookings) {
    const profile = profileByUserId[booking.user_id];
    const email = profile?.email?.trim();
    if (!email || level === 'safe') continue;

    const firstName = profile?.full_name?.split(/\s+/)[0] || 'there';
    const tripDate = booking.trip_date
      ? new Date(booking.trip_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'your trip date';
    const subject =
      level === 'danger'
        ? `⚠️ Dangerous weather – charter on ${tripDate}`
        : `Weather alert – charter on ${tripDate}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#0369a1;">Weather Alert for Your Charter</h1>
  <p>Hi ${firstName},</p>
  <p>Current marine conditions may affect your charter on <strong>${tripDate}</strong>.</p>
  <div style="background:#fef3c7;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin:16px 0;">
    <p style="margin:0;"><strong>${level.toUpperCase()}</strong></p>
    <ul style="margin:8px 0 0 0;padding-left:20px;">
      ${conditions.map((c) => `<li>${c}</li>`).join('')}
    </ul>
  </div>
  <p>Please check with your captain and consider rescheduling if conditions are unsafe.</p>
  <p style="margin-top:24px;">
    <a href="${appUrl}/dashboard" style="display:inline-block;background:#0369a1;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">View my booking</a>
  </p>
  <p style="margin-top:24px;color:#666;font-size:14px;">This is an automated weather safety alert from Gulf Coast Charters. Data: NOAA buoy ${DEFAULT_STATION}.</p>
</body>
</html>
    `.trim();

    try {
      const { error } = await resend.emails.send({ from, to: email, subject, html });
      if (!error) alertsSent++;
    } catch (e) {
      console.error('Resend error for', email, e);
    }

    try {
      const admin = getSupabaseAdmin();
      await admin
        .from('bookings')
        .update({
          last_weather_check: new Date().toISOString(),
          weather_alert_level: level,
          weather_conditions: conditions.join('; '),
        } as any)
        .eq('id', booking.id);
    } catch {
      // Columns may not exist
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    bookingsChecked: bookings.length,
    alertsSent,
    alertLevel: level,
  });
}

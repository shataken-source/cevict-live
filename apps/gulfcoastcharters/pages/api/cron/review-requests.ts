/**
 * Automated review requests — cron endpoint.
 * Finds completed bookings (trip ended), sends "please review" at 4h / 24h / 3d / 7d via Resend.
 * Optional: CRON_SECRET (Bearer or ?secret=). Requires RESEND_API_KEY.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';
import { Resend } from 'resend';

const HOUR_4 = 4;
const HOUR_24 = 24;
const DAY_3 = 3 * 24;
const DAY_7 = 7 * 24;
const DAY_30 = 30 * 24;

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

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return res.status(200).json({ processed: 0, sent: 0, error: 'RESEND_API_KEY not set' });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const baseUrl = getBaseUrl(req);

    const { data: completedBookings, error: bookingsError } = await admin
      .from('bookings')
      .select('id, booking_id, user_id, captain_id, trip_date, end_time, duration, status')
      .in('status', ['completed', 'confirmed']);

    if (bookingsError || !Array.isArray(completedBookings)) {
      return res.status(200).json({ processed: 0, sent: 0, error: bookingsError?.message });
    }

    let processed = 0;
    let sent = 0;
    const profileById: Record<string, { email?: string; full_name?: string }> = {};
    const captainById: Record<string, { full_name?: string; business_name?: string }> = {};

    for (const booking of completedBookings) {
      let tripEndTime: Date | null = null;
      if (booking.end_time) {
        tripEndTime = new Date(booking.end_time);
      } else if (booking.trip_date) {
        const start = new Date(booking.trip_date);
        const durationHours = Number(booking.duration) || 4;
        tripEndTime = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
      }
      if (!tripEndTime || tripEndTime > now) continue;

      processed++;

      const timeSinceEnd = (now.getTime() - tripEndTime.getTime()) / (1000 * 60 * 60);
      const daysSinceEnd = timeSinceEnd / 24;

      const bookingPk = (booking as any).booking_id ?? booking.id;
      const { data: existingRow } = await admin
        .from('review_requests')
        .select('request_id, first_request_sent_at, first_reminder_sent_at, second_reminder_sent_at, final_reminder_sent_at')
        .eq('booking_id', bookingPk)
        .maybeSingle();

      let requestId: string;
      let rr: {
        first_request_sent_at: string | null;
        first_reminder_sent_at: string | null;
        second_reminder_sent_at: string | null;
        final_reminder_sent_at: string | null;
      };

      const expiresAt = new Date(tripEndTime.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (!existingRow) {
        const { data: inserted, error: insErr } = await admin
          .from('review_requests')
          .insert({
            booking_id: booking.id,
            customer_id: booking.user_id,
            captain_id: booking.captain_id,
            trip_end_time: tripEndTime.toISOString(),
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select('request_id')
          .single();
        if (insErr || !inserted) continue;
        requestId = inserted.request_id;
        rr = {
          first_request_sent_at: null,
          first_reminder_sent_at: null,
          second_reminder_sent_at: null,
          final_reminder_sent_at: null,
        };
      } else {
        requestId = existingRow.request_id;
        rr = existingRow;
      }
      let shouldSend = false;
      let emailType = '';
      let updateField = '';

      if (timeSinceEnd >= HOUR_4 && timeSinceEnd < HOUR_24 && !rr.first_request_sent_at) {
        shouldSend = true;
        emailType = 'first';
        updateField = 'first_request_sent_at';
      } else if (timeSinceEnd >= HOUR_24 && timeSinceEnd < DAY_3 && !rr.first_reminder_sent_at) {
        shouldSend = true;
        emailType = 'first_reminder';
        updateField = 'first_reminder_sent_at';
      } else if (daysSinceEnd >= 3 && daysSinceEnd < 7 && !rr.second_reminder_sent_at) {
        shouldSend = true;
        emailType = 'second_reminder';
        updateField = 'second_reminder_sent_at';
      } else if (daysSinceEnd >= 7 && daysSinceEnd < 30 && !rr.final_reminder_sent_at) {
        shouldSend = true;
        emailType = 'final_reminder';
        updateField = 'final_reminder_sent_at';
      }

      if (!shouldSend || !updateField) continue;

      let email = profileById[booking.user_id]?.email;
      if (!email && booking.user_id) {
        const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', booking.user_id).single();
        if (profile) {
          profileById[booking.user_id] = { email: profile.email, full_name: profile.full_name };
          email = profile.email;
        }
      }
      if (!email) continue;

      let captainName = captainById[booking.captain_id]?.full_name || captainById[booking.captain_id]?.business_name;
      if (!captainName && booking.captain_id) {
        const { data: cap } = await admin.from('captains').select('full_name, business_name').eq('id', booking.captain_id).single();
        if (cap) {
          captainById[booking.captain_id] = { full_name: cap.full_name, business_name: cap.business_name };
          captainName = cap.full_name || cap.business_name;
        }
      }
      captainName = captainName || 'your captain';

      const reviewUrl = `${baseUrl}/reviews?booking=${bookingPk}`;
      const subject =
        emailType === 'first'
          ? 'How was your charter? Leave a review'
          : 'Reminder: Share your charter experience';
      const html = `
        <p>Hi${profileById[booking.user_id]?.full_name ? ` ${String(profileById[booking.user_id].full_name).split(' ')[0]}` : ''},</p>
        <p>Thanks for fishing with ${captainName}. We'd love to hear how it went.</p>
        <p><a href="${reviewUrl}" style="background:#0369a1;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Leave a review</a></p>
        <p>Your feedback helps other anglers and our captains.</p>
        <p>— Gulf Coast Charters</p>
      `;

      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>';
      const { error: sendErr } = await resend.emails.send({ from, to: email, subject, html });
      if (sendErr) {
        console.error('Review request send error:', sendErr);
        continue;
      }

      await admin
        .from('review_requests')
        .update({
          [updateField]: now.toISOString(),
          status: emailType === 'first' ? 'sent' : 'reminded',
          updated_at: now.toISOString(),
        })
        .eq('request_id', requestId);
      sent++;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ processed, sent, timestamp: now.toISOString() });
  } catch (e: any) {
    console.error('Review requests cron error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}

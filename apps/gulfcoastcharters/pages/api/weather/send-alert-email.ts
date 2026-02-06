/**
 * Send weather alert email — no Edge Function.
 * POST body: { to, subject, html }. Uses Resend (RESEND_API_KEY, RESEND_FROM_EMAIL).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : 'Weather Alert';
    const html = typeof body.html === 'string' ? body.html : '';

    if (!to) {
      return res.status(400).json({ error: 'Missing "to" email' });
    }

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      console.warn('RESEND_API_KEY not set — alert email not sent');
      return res.status(200).json({ ok: false, error: 'Email not configured' });
    }

    const from = process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>';
    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: subject || 'Weather Alert for Your Trip',
      html: html || '<p>Weather alert: check your trip details.</p>',
    });

    if (error) {
      console.error('Resend send-alert-email error:', error);
      return res.status(500).json({ error: String(error.message) });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error('Send alert email error:', e);
    return res.status(500).json({ error: String(e?.message || 'Internal server error') });
  }
}

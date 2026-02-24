import type { NextApiRequest, NextApiResponse } from 'next';

// Conditionally import Resend - only if available
let Resend: any = null;
try {
  const resendModule = require('resend');
  Resend = resendModule.Resend || resendModule.default?.Resend;
} catch (e) {
  console.warn('Resend package not available');
}

const resend = Resend ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resend) {
    return res.status(503).json({ error: 'Email service not configured. Please install resend package.' });
  }

  try {
    const { to, subject, body } = req.body;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      text: body,
      replyTo: process.env.RESEND_REPLY_TO || 'shataken@gmail.com'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { requireRole } from './_lib/rbac';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authed = await requireRole(req, res, ['admin']);
    if (!authed) return;

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

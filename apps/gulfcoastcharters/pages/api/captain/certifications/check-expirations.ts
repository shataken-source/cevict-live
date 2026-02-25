/**
 * Certification Expiration Checker & Reminder Sender
 * POST /api/captain/certifications/check-expirations
 *
 * Designed to be called by a daily cron job (9 AM).
 * Scans captain_documents for upcoming expirations and sends:
 *   - Email reminders via Mailjet
 *   - SMS reminders via Sinch
 *   - At 90, 60, 30, 7, and 0 days before expiry
 *
 * Auth: requires CRON_SECRET header or admin auth.
 *
 * Also:
 * GET /api/captain/certifications/check-expirations?captainId=...
 *   — returns expiration status for a specific captain (captain-authed)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';

const REMINDER_DAYS = [90, 60, 30, 7, 0];

const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const SINCH_API_TOKEN = process.env.SINCH_API_TOKEN || '';
const SINCH_PHONE_NUMBER = process.env.SINCH_PHONE_NUMBER || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

interface ExpiringDoc {
  id: string;
  captain_id: string;
  type: string;
  name: string;
  expiry_date: string;
  last_reminder_sent_at: string | null;
  daysUntilExpiry: number;
  reminderTier: number; // which REMINDER_DAYS threshold
}

// ── Email via Mailjet ────────────────────────────────────────────────────────

async function sendReminderEmail(
  to: string,
  captainName: string,
  doc: ExpiringDoc
): Promise<boolean> {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.warn('[CertTracker] Mailjet not configured, skipping email');
    return false;
  }

  const isExpired = doc.daysUntilExpiry <= 0;
  const subject = isExpired
    ? `⚠️ EXPIRED: Your ${doc.name} has expired`
    : `⏰ Reminder: ${doc.name} expires in ${doc.daysUntilExpiry} days`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${isExpired ? '#dc2626' : doc.daysUntilExpiry <= 30 ? '#f59e0b' : '#3b82f6'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${isExpired ? '⚠️ Certification Expired' : '⏰ Certification Expiring Soon'}</h2>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p>Hi ${captainName},</p>
        <p>${isExpired
          ? `Your <strong>${doc.name}</strong> (${doc.type}) has expired as of ${doc.expiry_date}.`
          : `Your <strong>${doc.name}</strong> (${doc.type}) will expire on <strong>${doc.expiry_date}</strong> — that's <strong>${doc.daysUntilExpiry} days</strong> from now.`
        }</p>
        ${isExpired
          ? '<p style="color: #dc2626; font-weight: bold;">Please renew immediately to continue operating.</p>'
          : '<p>Please renew before the expiration date to avoid any interruption in your charter operations.</p>'
        }
        <p>You can upload your renewed document in the Captain Dashboard → Documents tab.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Gulf Coast Charters — Captain Certification Tracking<br/>
          This is an automated reminder. You'll receive reminders at 90, 60, 30, and 7 days before expiry.
        </p>
      </div>
    </div>
  `;

  try {
    const resp = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'noreply@gulfcoastcharters.com', Name: 'Gulf Coast Charters' },
          To: [{ Email: to, Name: captainName }],
          Subject: subject,
          HTMLPart: htmlBody,
        }],
      }),
    });

    if (!resp.ok) {
      console.error('[CertTracker] Mailjet error:', resp.status, await resp.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[CertTracker] Mailjet exception:', e.message);
    return false;
  }
}

// ── SMS via Sinch ────────────────────────────────────────────────────────────

async function sendReminderSMS(
  phone: string,
  captainName: string,
  doc: ExpiringDoc
): Promise<boolean> {
  if (!SINCH_API_TOKEN || !SINCH_PHONE_NUMBER) {
    console.warn('[CertTracker] Sinch not configured, skipping SMS');
    return false;
  }

  const isExpired = doc.daysUntilExpiry <= 0;
  const message = isExpired
    ? `⚠️ ${captainName}, your ${doc.name} has EXPIRED (${doc.expiry_date}). Renew ASAP via your Captain Dashboard. -GCC`
    : `⏰ ${captainName}, your ${doc.name} expires in ${doc.daysUntilExpiry} days (${doc.expiry_date}). Renew via Captain Dashboard. -GCC`;

  try {
    const resp = await fetch('https://sms.api.sinch.com/xms/v1/batches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SINCH_API_TOKEN}`,
      },
      body: JSON.stringify({
        from: SINCH_PHONE_NUMBER,
        to: [phone],
        body: message,
      }),
    });

    if (!resp.ok) {
      console.error('[CertTracker] Sinch error:', resp.status, await resp.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[CertTracker] Sinch exception:', e.message);
    return false;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET: captain checks their own cert status ──
  if (req.method === 'GET') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { data: docs } = await admin
        .from('captain_documents')
        .select('id, type, name, expiry_date, status, last_reminder_sent_at')
        .eq('captain_id', user.id)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results = (docs || []).map((doc: any) => {
        const expiry = new Date(doc.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

        let alertLevel: 'ok' | 'warning' | 'urgent' | 'expired';
        if (daysUntil <= 0) alertLevel = 'expired';
        else if (daysUntil <= 30) alertLevel = 'urgent';
        else if (daysUntil <= 90) alertLevel = 'warning';
        else alertLevel = 'ok';

        return {
          ...doc,
          daysUntilExpiry: daysUntil,
          alertLevel,
        };
      });

      const expiredCount = results.filter(r => r.alertLevel === 'expired').length;
      const urgentCount = results.filter(r => r.alertLevel === 'urgent').length;
      const warningCount = results.filter(r => r.alertLevel === 'warning').length;

      return res.status(200).json({
        success: true,
        certifications: results,
        summary: {
          total: results.length,
          expired: expiredCount,
          urgent: urgentCount,
          warning: warningCount,
          ok: results.length - expiredCount - urgentCount - warningCount,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: cron-triggered expiration check + send reminders ──
  if (req.method === 'POST') {
    // Auth: cron secret or admin
    const cronSecret = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
      // Fall back to admin auth
      const { user } = await getAuthedUser(req, res);
      if (!user) return res.status(401).json({ error: 'Unauthorized. Provide x-cron-secret header.' });
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all docs with expiry dates within 90 days (or already expired within last 30 days)
      const pastCutoff = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      const futureCutoff = new Date(today.getTime() + 91 * 86400000).toISOString().slice(0, 10);

      const { data: expiringDocs, error: queryError } = await admin
        .from('captain_documents')
        .select('id, captain_id, type, name, expiry_date, last_reminder_sent_at')
        .not('expiry_date', 'is', null)
        .gte('expiry_date', pastCutoff)
        .lte('expiry_date', futureCutoff)
        .order('expiry_date', { ascending: true });

      if (queryError) return res.status(500).json({ error: queryError.message });
      if (!expiringDocs || expiringDocs.length === 0) {
        return res.status(200).json({ success: true, message: 'No expiring certifications found', processed: 0 });
      }

      // Calculate days until expiry and determine if reminder is needed
      const docsToRemind: ExpiringDoc[] = [];

      for (const doc of expiringDocs) {
        const expiry = new Date(doc.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

        // Find which reminder tier this falls into
        let reminderTier = -1;
        for (const threshold of REMINDER_DAYS) {
          if (daysUntil <= threshold) {
            reminderTier = threshold;
            break;
          }
        }
        if (reminderTier === -1) continue; // Not yet in any reminder window

        // Check if we already sent a reminder for this tier (within last 24 hours)
        if (doc.last_reminder_sent_at) {
          const lastSent = new Date(doc.last_reminder_sent_at);
          const hoursSinceLast = (today.getTime() - lastSent.getTime()) / 3600000;
          if (hoursSinceLast < 20) continue; // Don't spam, wait at least 20 hours
        }

        docsToRemind.push({
          ...doc,
          daysUntilExpiry: daysUntil,
          reminderTier,
        });
      }

      if (docsToRemind.length === 0) {
        return res.status(200).json({ success: true, message: 'All reminders already sent for today', processed: 0 });
      }

      // Group by captain to fetch contact info once per captain
      const captainIds = [...new Set(docsToRemind.map(d => d.captain_id))];

      // Get captain contact info
      const { data: captainProfiles } = await admin
        .from('captain_profiles')
        .select('user_id, business_name, phone')
        .in('user_id', captainIds);

      const { data: authUsers } = await admin
        .from('shared_users')
        .select('id, display_name, email')
        .in('id', captainIds);

      const captainMap = new Map<string, { name: string; email: string; phone: string }>();
      for (const cid of captainIds) {
        const profile = (captainProfiles || []).find((p: any) => p.user_id === cid);
        const authUser = (authUsers || []).find((u: any) => u.id === cid);
        captainMap.set(cid, {
          name: profile?.business_name || authUser?.display_name || 'Captain',
          email: authUser?.email || '',
          phone: profile?.phone || '',
        });
      }

      // Send reminders
      const results: { docId: string; docName: string; captain: string; daysLeft: number; emailSent: boolean; smsSent: boolean }[] = [];

      for (const doc of docsToRemind) {
        const captain = captainMap.get(doc.captain_id);
        if (!captain) continue;

        let emailSent = false;
        let smsSent = false;

        if (captain.email) {
          emailSent = await sendReminderEmail(captain.email, captain.name, doc);
        }

        if (captain.phone) {
          smsSent = await sendReminderSMS(captain.phone, captain.name, doc);
        }

        // Update last_reminder_sent_at
        if (emailSent || smsSent) {
          await admin
            .from('captain_documents')
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq('id', doc.id);
        }

        results.push({
          docId: doc.id,
          docName: doc.name,
          captain: captain.name,
          daysLeft: doc.daysUntilExpiry,
          emailSent,
          smsSent,
        });
      }

      const emailsSent = results.filter(r => r.emailSent).length;
      const smsesSent = results.filter(r => r.smsSent).length;

      return res.status(200).json({
        success: true,
        processed: docsToRemind.length,
        emailsSent,
        smsesSent,
        results,
        message: `Processed ${docsToRemind.length} expiring certifications. Sent ${emailsSent} emails, ${smsesSent} SMS.`,
      });
    } catch (e: any) {
      console.error('[CertTracker] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}

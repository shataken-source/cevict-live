import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';
import { Resend } from 'resend';
import { autoPopulateAttractions } from '../../_lib/attractions-auto-populate';

async function notifyCaptainBoatAdded(boat: Record<string, any>, boatId: string) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn('[Save Boat] RESEND_API_KEY not set — skipping captain notification');
    return;
  }

  const captainEmail = String(boat.email || '').trim();
  const adminEmails = String(process.env.GCC_ADMIN_EMAILS || process.env.RESEND_REPLY_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  const recipients = [...(captainEmail.includes('@') ? [captainEmail] : []), ...adminEmails].filter(Boolean);
  if (!recipients.length) return;

  try {
    const resend = new Resend(resendKey);
    const boatName = boat.name || boat.business_name || 'Unknown Vessel';
    const sourceUrl = boat.source_url || 'N/A';
    const location = boat.location || boat.city || 'N/A';
    const phone = boat.phone || 'N/A';

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>',
      to: recipients,
      subject: `New Boat Scraped & Added: ${boatName}`,
      html: `
        <h2>New Boat Added to Gulf Coast Charters</h2>
        <p>A new charter boat has been discovered and added to our database.</p>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr><td style="padding:6px;font-weight:bold;">Name</td><td style="padding:6px;">${boatName}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Location</td><td style="padding:6px;">${location}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Phone</td><td style="padding:6px;">${phone}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Email</td><td style="padding:6px;">${captainEmail || 'N/A'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Source</td><td style="padding:6px;"><a href="${sourceUrl}">${sourceUrl}</a></td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Record ID</td><td style="padding:6px;">${boatId}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666;">This boat was automatically discovered by the GCC scraper. Please review and approve it in the admin dashboard.</p>
      `,
      reply_to: process.env.RESEND_REPLY_TO || 'shataken@gmail.com',
    });
    console.log(`[Save Boat] Captain notification sent to: ${recipients.join(', ')}`);
  } catch (err: any) {
    console.error('[Save Boat] Failed to send captain notification:', err?.message || err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['admin']);
  if (!ok) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { boat } = req.body;
  if (!boat || typeof boat !== 'object') {
    return res.status(400).json({ error: 'Boat data is required' });
  }

  const admin = getSupabaseAdmin();

  try {
    // Check if boat already exists by source_url
    let existing = null;
    if (boat.source_url) {
      const { data: urlMatch } = await admin
        .from('scraped_boats')
        .select('id, times_seen')
        .eq('source_url', boat.source_url)
        .maybeSingle();
      if (urlMatch) existing = urlMatch;
    }

    // If no URL match, try name/phone/email
    // Sanitize values for PostgREST .or() filter syntax — strip chars that break filter parsing
    if (!existing) {
      const sanitize = (s: string) => s.replace(/[.,()\\]/g, '');
      const keyName = sanitize(String(boat.name || '').trim().toLowerCase());
      const keyPhone = String(boat.phone || '').replace(/\D/g, '');
      const keyEmail = sanitize(String(boat.email || '').trim().toLowerCase());

      const conditions: string[] = [];
      if (keyName && keyName.length > 3) {
        conditions.push(`name.ilike.%${keyName}%`);
      }
      if (keyPhone && keyPhone.length === 10) {
        conditions.push(`phone.ilike.%${keyPhone}%`);
      }
      if (keyEmail && keyEmail.includes('@')) {
        conditions.push(`email.eq.${keyEmail}`);
      }

      if (conditions.length > 0) {
        const { data: matches } = await admin
          .from('scraped_boats')
          .select('id, times_seen')
          .or(conditions.join(','));
        if (matches && matches.length > 0) {
          existing = matches[0];
        }
      }
    }

    if (existing) {
      // Update existing boat
      const { error: updateError } = await admin
        .from('scraped_boats')
        .update({
          ...boat,
          times_seen: (existing.times_seen || 0) + 1,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        action: 'updated',
        id: existing.id
      });
    } else {
      // Insert new boat
      const { data, error: insertError } = await admin
        .from('scraped_boats')
        .insert({
          ...boat,
          times_seen: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Send captain/admin notification for newly discovered boats (best-effort, non-blocking)
      notifyCaptainBoatAdded(boat, data.id).catch(() => { });

      // Auto-populate local attractions for this boat's location (best-effort, non-blocking)
      const boatLocation = boat.location || boat.city || '';
      if (boatLocation) {
        autoPopulateAttractions(admin, {
          location: boatLocation,
          sourceBoatId: data.id,
          lat: boat.latitude ? Number(boat.latitude) : undefined,
          lon: boat.longitude ? Number(boat.longitude) : undefined,
        }).catch((err: any) => {
          console.error('[Save Boat] Attractions auto-populate failed:', err?.message || err);
        });
      }

      return res.status(200).json({
        success: true,
        action: 'created',
        id: data.id
      });
    }
  } catch (e: any) {
    console.error('[Save Boat] Error:', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';

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
    if (!existing) {
      const keyName = String(boat.name || '').trim().toLowerCase();
      const keyPhone = String(boat.phone || '').replace(/\D/g, '');
      const keyEmail = String(boat.email || '').trim().toLowerCase();

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

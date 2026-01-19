import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';

function normalizeStatus(v: unknown): 'pending' | 'under_review' | 'approved' | 'rejected' | null {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'pending' || s === 'under_review' || s === 'approved' || s === 'rejected') return s;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authed = await requireRole(req, res, ['admin']);
  if (!authed) return;

  const admin = getSupabaseAdmin();

  if (req.method === 'GET') {
    const status = normalizeStatus(req.query.status);
    let q = admin
      .from('captain_applications')
      .select(
        [
          'id',
          'captain_id',
          'full_name',
          'email',
          'phone',
          'location',
          'uscg_license',
          'years_experience',
          'specialties',
          'bio',
          'insurance_provider',
          'insurance_coverage',
          'insurance_policy_number',
          'status',
          'admin_notes',
          'reviewed_by',
          'reviewed_at',
          'created_at',
          'updated_at',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ applications: data || [] });
  }

  if (req.method === 'POST') {
    const { user } = await getAuthedUser(req, res);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const applicationId = String(req.body?.applicationId || '').trim();
    const status = normalizeStatus(req.body?.status);
    const adminNotes = req.body?.adminNotes ? String(req.body.adminNotes).trim() : null;

    if (!applicationId) return res.status(400).json({ error: 'Missing applicationId' });
    if (!status) return res.status(400).json({ error: 'Missing/invalid status' });
    if (!['under_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be under_review|approved|rejected' });
    }

    const { data: app, error: appErr } = await admin
      .from('captain_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr) return res.status(500).json({ error: appErr.message });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const { error: updErr } = await admin
      .from('captain_applications')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId);
    if (updErr) return res.status(500).json({ error: updErr.message });

    if (status === 'approved') {
      // Promote profile role to captain (RBAC uses profiles.role).
      await admin.from('profiles').update({ role: 'captain' }).eq('id', app.captain_id);

      // Create/ensure captain profile row used by the listing feed.
      const captainProfile = {
        user_id: app.captain_id,
        specialties: Array.isArray(app.specialties) ? app.specialties : [],
        half_day_rate: null,
        full_day_rate: null,
        rating: 0,
        total_reviews: 0,
      };

      // Upsert by user_id if unique constraint exists; otherwise insert best-effort.
      const { error: upsertErr } = await admin
        .from('captain_profiles')
        .upsert(captainProfile as any, { onConflict: 'user_id' });
      if (upsertErr) {
        // If upsert fails due to schema mismatch, fall back to insert with minimal fields.
        await admin.from('captain_profiles').insert({ user_id: app.captain_id });
      }
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}


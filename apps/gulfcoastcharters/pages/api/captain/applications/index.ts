import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getSupabaseServer } from '../../_lib/supabase';

type CaptainApplicationInput = {
  full_name: string;
  phone?: string;
  location?: string;
  uscg_license?: string;
  years_experience?: number;
  specialties?: string[];
  bio?: string;
  insurance_provider?: string;
  insurance_coverage?: string;
  insurance_policy_number?: string;
};

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || '').trim()).filter(Boolean);
}

function normalizeBody(body: any): CaptainApplicationInput {
  return {
    full_name: String(body?.full_name || '').trim(),
    phone: body?.phone ? String(body.phone).trim() : undefined,
    location: body?.location ? String(body.location).trim() : undefined,
    uscg_license: body?.uscg_license ? String(body.uscg_license).trim() : undefined,
    years_experience:
      typeof body?.years_experience === 'number'
        ? body.years_experience
        : body?.years_experience
          ? Number(body.years_experience)
          : undefined,
    specialties: toStringArray(body?.specialties),
    bio: body?.bio ? String(body.bio).trim() : undefined,
    insurance_provider: body?.insurance_provider ? String(body.insurance_provider).trim() : undefined,
    insurance_coverage: body?.insurance_coverage ? String(body.insurance_coverage).trim() : undefined,
    insurance_policy_number: body?.insurance_policy_number ? String(body.insurance_policy_number).trim() : undefined,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServer(req, res);
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const admin = getSupabaseAdmin();
    const { data: application, error } = await admin
      .from('captain_applications')
      .select('*')
      .eq('captain_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ application: application || null });
  }

  if (req.method === 'POST') {
    const input = normalizeBody(req.body);
    if (!input.full_name) return res.status(400).json({ error: 'Missing full_name' });

    // Ensure profiles row exists (common Supabase setup: profile inserted via trigger, but this is a safe fallback).
    const admin = getSupabaseAdmin();
    const { data: prof } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
    if (!prof) {
      const { error: insErr } = await admin.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: input.full_name,
        role: 'user',
      });
      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    // Avoid duplicate active applications.
    const { data: existing, error: exErr } = await admin
      .from('captain_applications')
      .select('id,status')
      .eq('captain_id', user.id)
      .in('status', ['pending', 'under_review', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (exErr) return res.status(500).json({ error: exErr.message });
    if ((existing || []).length > 0) {
      return res.status(409).json({ error: 'Application already exists', application: existing?.[0] });
    }

    const payload = {
      captain_id: user.id,
      full_name: input.full_name,
      email: user.email,
      phone: input.phone || null,
      location: input.location || null,
      uscg_license: input.uscg_license || null,
      years_experience: Number.isFinite(Number(input.years_experience)) ? Number(input.years_experience) : null,
      specialties: input.specialties || [],
      bio: input.bio || null,
      insurance_provider: input.insurance_provider || null,
      insurance_coverage: input.insurance_coverage || null,
      insurance_policy_number: input.insurance_policy_number || null,
      status: 'pending',
    };

    const { data: created, error: createErr } = await admin
      .from('captain_applications')
      .insert(payload)
      .select('*')
      .single();

    if (createErr) return res.status(500).json({ error: createErr.message });
    return res.status(201).json({ application: created });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}


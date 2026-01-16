import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ActivateBody = {
  preRegisteredId?: string;
  owner_email?: string;
  owner_phone?: string;
  date_lost?: string; // optional ISO/date string
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  location_detail?: string;
  notes?: string;
};

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function norm(s: string | null | undefined) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function digits(s: string | null | undefined) {
  return (s || '').replace(/\D/g, '');
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return toDatabaseNotConfiguredResponse();

    const body = (await request.json().catch(() => ({}))) as ActivateBody;
    const preId = (body.preRegisteredId || '').trim();
    if (!preId) return NextResponse.json({ success: false, error: 'preRegisteredId is required' }, { status: 400 });

    if (!body.owner_email && !body.owner_phone) {
      return NextResponse.json({ success: false, error: 'Provide owner_email or owner_phone' }, { status: 400 });
    }

    const { data: pre, error } = await supabase.from('pre_registered_pets').select('*').eq('id', preId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!pre) return NextResponse.json({ success: false, error: 'Pre-registered pet not found' }, { status: 404 });

    const emailOk = body.owner_email ? norm(pre.owner_email) === norm(body.owner_email) : false;
    const phoneOk = body.owner_phone ? digits(pre.owner_phone) === digits(body.owner_phone) : false;
    if (!emailOk && !phoneOk) {
      return NextResponse.json({ success: false, error: 'Owner verification failed' }, { status: 403 });
    }

    // If already activated, return the existing link
    if (pre.lost_pet_id) {
      return NextResponse.json({ success: true, lostPetId: pre.lost_pet_id, alreadyActive: true });
    }

    const nowIso = new Date().toISOString();
    const dateLost = (body.date_lost || '').trim() || nowIso;
    const locationState = (body.location_state || pre.location_state || '').trim();
    if (!locationState) {
      return NextResponse.json({ success: false, error: 'location_state is required (or must be set on pre-registration)' }, { status: 400 });
    }
    const locationCity = (body.location_city || pre.location_city || '').trim() || 'Unknown';

    const descriptionParts: string[] = [];
    if (pre.description) descriptionParts.push(String(pre.description));
    if (body.notes) descriptionParts.push(`Notes: ${String(body.notes)}`);
    const description = descriptionParts.length ? descriptionParts.join('\n') : null;

    // Create a public lost report in lost_pets (so it shows up in search/share flows)
    const lostPayload = {
      pet_name: pre.pet_name || null,
      pet_type: pre.pet_type || 'dog',
      breed: pre.breed || 'Unknown',
      color: pre.color || 'Unknown',
      size: pre.size || null,
      age: pre.age || null,
      gender: pre.gender || null,
      description,
      date_lost: dateLost,
      // Some deployments enforce NOT NULL on location_city; default safely.
      location_city: locationCity,
      location_state: locationState.toUpperCase(),
      location_zip: body.location_zip || pre.location_zip || null,
      location_detail: body.location_detail || null,
      photo_url: pre.photo_url || null,
      status: 'lost',
      owner_name: pre.owner_name || null,
      owner_email: pre.owner_email || null,
      owner_phone: pre.owner_phone || null,
      shelter_id: null,
      source_platform: 'pre_registration',
      source_url: null,
      source_post_id: `pre_registered:${pre.id}`,
      shelter_name: null,
    };

    const { data: inserted, error: insErr } = await supabase.from('lost_pets').insert(lostPayload).select('id').limit(1);
    if (insErr) throw new Error(insErr.message);
    const lostPetId = Array.isArray(inserted) && inserted.length ? inserted[0].id : null;
    if (!lostPetId) throw new Error('Failed to create lost pet record');

    await supabase
      .from('pre_registered_pets')
      .update({ lost_pet_id: lostPetId, activated_missing_at: nowIso, updated_at: nowIso })
      .eq('id', pre.id);

    // Kick off matching (best-effort)
    try {
      await postJson(`${request.nextUrl.origin}/api/petreunion/auto-match`, { petId: lostPetId, minScore: 0.3, maxResults: 10, sendNotifications: false });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, lostPetId });
  } catch (error: any) {
    return toServiceUnavailableResponse(error) || NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}


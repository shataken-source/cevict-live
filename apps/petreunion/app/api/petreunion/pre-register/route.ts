import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
import { validatePetPhotoInput } from '@/lib/photo-validation';

function looksLikeSupabaseUrl(v: string | undefined) {
  if (!v) return false;
  const s = String(v).trim();
  return /^https:\/\/.+\.supabase\.co\/?$/.test(s);
}

const supabaseUrl =
  (looksLikeSupabaseUrl(process.env.SUPABASE_URL) ? process.env.SUPABASE_URL : undefined) ||
  (looksLikeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
// Pre-registration contains PII; require service role key on server routes.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type PreRegisterBody = {
  // honeypot (bots fill it)
  website?: string;

  pet_name?: string;
  pet_type?: 'dog' | 'cat';
  breed?: string;
  color?: string;
  size?: string;
  age?: string;
  gender?: string;
  description?: string;
  photo_url?: string;

  location_city?: string;
  location_state?: string;
  location_zip?: string;

  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
};

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function norm(s: string | null | undefined) {
  return (s || '').toLowerCase().trim();
}

function tokenize(text: string | null | undefined) {
  if (!text) return new Set<string>();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function simpleMatchScore(pre: any, found: any) {
  // 0..1 (cheap heuristic, fast enough for a small candidate set)
  let score = 0;
  const reasons: string[] = [];

  // hard gate: type match
  const typeA = norm(pre.pet_type);
  const typeB = norm(found.pet_type);
  if (typeA && typeB && typeA !== typeB) return { score: 0, reasons: ['Type mismatch'] };

  if (pre.location_state && found.location_state && String(pre.location_state).toUpperCase() === String(found.location_state).toUpperCase()) {
    score += 0.3;
    reasons.push('State match');
  }

  if (pre.location_city && found.location_city && norm(pre.location_city) === norm(found.location_city)) {
    score += 0.2;
    reasons.push('City match');
  }

  if (pre.breed && found.breed && (norm(pre.breed) === norm(found.breed) || norm(pre.breed).includes(norm(found.breed)) || norm(found.breed).includes(norm(pre.breed)))) {
    score += 0.2;
    reasons.push('Breed match');
  }

  if (pre.color && found.color && (norm(pre.color) === norm(found.color) || norm(pre.color).includes(norm(found.color)) || norm(found.color).includes(norm(pre.color)))) {
    score += 0.15;
    reasons.push('Color match');
  }

  const A = tokenize(pre.description);
  const B = tokenize(found.description);
  let overlap = 0;
  A.forEach((t) => {
    if (B.has(t)) overlap += 1;
  });
  if (overlap > 0) {
    score += Math.min(0.15, overlap * 0.03);
    reasons.push('Description overlap');
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return toDatabaseNotConfiguredResponse();

    const body = (await request.json().catch(() => ({}))) as PreRegisterBody;

    // Honeypot: if it's filled, drop silently to reduce spam value
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    const pet_type = body.pet_type;
    const breed = (body.breed || '').trim() || 'Unknown';
    const color = (body.color || '').trim() || 'Unknown';
    const location_state = (body.location_state || '').trim();
    const owner_email = (body.owner_email || '').trim() || null;
    const owner_phone = (body.owner_phone || '').trim() || null;

    if (!pet_type || (pet_type !== 'dog' && pet_type !== 'cat')) {
      return NextResponse.json({ success: false, error: 'pet_type must be dog or cat' }, { status: 400 });
    }
    if (!location_state) {
      return NextResponse.json({ success: false, error: 'location_state is required' }, { status: 400 });
    }
    if (!owner_email && !owner_phone) {
      return NextResponse.json({ success: false, error: 'Provide owner_email or owner_phone' }, { status: 400 });
    }

    const now = new Date();
    const priceYear = 19.95;

    let photoUrl = body.photo_url?.trim() || null;
    let photoWarning: string | null = null;
    if (photoUrl) {
      const validation = await validatePetPhotoInput({ photo_url: photoUrl });
      if (!validation.ok) {
        if (validation.mode === 'strict') {
          return NextResponse.json({ success: false, error: 'Photo rejected', details: validation.reason, validation }, { status: 400 });
        }
        // soft mode: drop photo but accept pre-registration
        photoUrl = null;
        photoWarning = `Photo not saved: ${validation.reason}`;
      }
    }

    const payload = {
      // Soft gate: pre-register is free; paid monitoring can be activated later.
      subscription_status: 'inactive',
      subscription_price_usd: priceYear,
      // Keep started_at NOT NULL compatible with existing DB schema; status controls whether monitoring is active.
      subscription_started_at: now.toISOString(),
      subscription_expires_at: null,

      pet_name: (body.pet_name || '').trim() || null,
      pet_type,
      breed,
      color,
      size: body.size?.trim() || null,
      age: body.age?.trim() || null,
      gender: body.gender?.trim() || null,
      description: body.description?.trim() || null,
      photo_url: photoUrl,

      location_city: body.location_city?.trim() || null,
      location_state: location_state.toUpperCase(),
      location_zip: body.location_zip?.trim() || null,

      owner_name: (body.owner_name || '').trim() || null,
      owner_email,
      owner_phone,
    };

    const { data: rows, error } = await supabase.from('pre_registered_pets').insert(payload).select('id,subscription_expires_at').limit(1);
    if (error) throw new Error(error.message);
    const created = Array.isArray(rows) && rows.length ? rows[0] : null;

    // Soft gate: only run proactive matching when monitoring is active.
    // (Activation will set subscription_status='active' + expires date in a future endpoint.)
    if (payload.subscription_status === 'active') {
      try {
        const { data: foundPets, error: fErr } = await supabase
          .from('lost_pets')
          .select('id,pet_name,pet_type,breed,color,size,status,location_city,location_state,description,photo_url')
          .eq('status', 'found')
          .eq('pet_type', pet_type)
          .eq('location_state', location_state.toUpperCase())
          .order('created_at', { ascending: false })
          .limit(200);
        if (fErr) throw new Error(fErr.message);

        const matches: any[] = [];
        for (const f of foundPets || []) {
          const { score, reasons } = simpleMatchScore(payload, f);
          if (score >= 0.35) {
            matches.push({
              pre_registered_pet_id: created?.id,
              found_pet_id: f.id,
              match_score: score,
              score_breakdown: { heuristic: score },
              match_reasons: reasons,
              status: 'pending',
            });
          }
        }
        if (matches.length) {
          await supabase.from('pre_registered_pet_matches').upsert(matches, { onConflict: 'pre_registered_pet_id,found_pet_id' });
        }
      } catch {
        // ignore (table may not exist yet)
      }
    }

    return NextResponse.json({ success: true, preRegistered: created, ...(photoWarning ? { photoWarning } : {}) });
  } catch (error: any) {
    return toServiceUnavailableResponse(error) || NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}


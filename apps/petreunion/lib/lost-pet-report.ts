import { validatePetPhotoInput } from '@/lib/photo-validation';
import { parseLocationInput } from '@/lib/location-parser';

export type LostPetReportInput = {
  pet_name?: string | null;
  species?: string;
  pet_type?: 'dog' | 'cat';
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  age?: string | null;
  gender?: string | null;
  description?: string | null;
  date_lost?: string | null;
  last_seen_date?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_zip?: string | null;
  location_detail?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  photo_url?: string | null;
};

export type LostPetReportResult =
  | { ok: true; pet: any; photoWarning?: string }
  | { ok: false; status: number; error: string; details?: string };

function normalizePetType(body: LostPetReportInput): 'dog' | 'cat' | null {
  if (body.pet_type === 'dog' || body.pet_type === 'cat') return body.pet_type;
  const species = (body.species || '').toLowerCase().trim();
  if (species === 'dog') return 'dog';
  if (species === 'cat') return 'cat';
  return null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits || null;
}

function normalizeDateLost(s: string | null | undefined): string | null {
  const t = (s || '').trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dt = new Date(t);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  return t;
}

function normalizeState(s: string | null | undefined): string | null {
  const t = (s || '').trim();
  if (!t) return null;
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
  return null;
}

export async function createLostPetReport(params: {
  supabaseUrl: string | undefined;
  supabaseKey: string | undefined;
  body: LostPetReportInput;
}): Promise<LostPetReportResult> {
  const { supabaseUrl, supabaseKey, body } = params;
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, status: 500, error: 'Database not configured' };
  }

  const petType = normalizePetType(body);
  const color = (body.color || '').trim();
  const dateLost = normalizeDateLost(body.date_lost || body.last_seen_date);

  // Location: accept either structured fields or a single free-text field.
  const rawLocation = (body.location_detail || body.location_city || '').trim();
  const parsed = rawLocation ? parseLocationInput(rawLocation) : null;
  const locationCity = (body.location_city || parsed?.city || '').trim();
  const locationState = normalizeState(body.location_state || parsed?.state || null);
  const locationZip = (body.location_zip || parsed?.zip || null) ? String(body.location_zip || parsed?.zip).trim() : null;
  const locationDetail = (body.location_detail || parsed?.detail || null) ? String(body.location_detail || parsed?.detail).trim() : null;

  if (!petType || !color || !dateLost || !locationCity) {
    return {
      ok: false,
      status: 400,
      error: 'Missing required fields',
      details: JSON.stringify(
        {
          required: ['pet_type (or species=dog/cat)', 'color', 'date_lost', 'location_city (or location_detail)'],
        },
        null,
        2
      ),
    };
  }

  const petName = (body.pet_name || '').trim() || null;
  const ownerName = (body.owner_name || '').trim() || null;
  const ownerEmail = (body.owner_email || '').trim() || null;
  const ownerPhone = normalizePhone(body.owner_phone);
  const breed = (body.breed || '').trim() || 'Unknown';

  // Photo: validate + soft-drop if needed.
  let photoUrl = body.photo_url || null;
  let photoWarning: string | null = null;
  if (photoUrl) {
    const validation = await validatePetPhotoInput({ photo_url: photoUrl });
    if (!validation.ok) {
      if (validation.mode === 'strict') {
        return { ok: false, status: 400, error: 'Photo rejected', details: validation.reason };
      }
      photoUrl = null;
      photoWarning = `Photo not saved: ${validation.reason}`;
    }
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets`;
  const payload = {
    pet_name: petName,
    pet_type: petType,
    breed,
    color,
    size: body.size || null,
    age: body.age || null,
    gender: body.gender || null,
    description: (body.description || '').trim() || null,
    date_lost: dateLost,
    location_city: locationCity,
    location_state: locationState,
    location_zip: locationZip,
    location_detail: locationDetail,
    photo_url: photoUrl,
    status: 'lost',
    owner_name: ownerName,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    shelter_id: null,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    return { ok: false, status: 500, error: 'Failed to submit report', details };
  }

  const rows = (await res.json().catch(() => [])) as any[];
  const newPet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!newPet?.id) {
    return { ok: false, status: 500, error: 'Failed to submit report', details: 'No pet returned from database' };
  }

  return { ok: true, pet: newPet, ...(photoWarning ? { photoWarning } : {}) };
}


import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type PetType = 'dog' | 'cat';

type ReportLostPetBody = {
  pet_name?: string;
  species?: string;
  pet_type?: PetType;
  breed?: string;
  color?: string;
  size?: string;
  age?: string;
  gender?: string;
  description?: string;

  date_lost?: string;
  last_seen_date?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  location_detail?: string;

  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;

  photo_url?: string;
};

function normalizePetType(body: ReportLostPetBody): PetType | null {
  if (body.pet_type === 'dog' || body.pet_type === 'cat') return body.pet_type;

  const species = (body.species || '').toLowerCase().trim();
  if (species === 'dog') return 'dog';
  if (species === 'cat') return 'cat';

  return null;
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return toDatabaseNotConfiguredResponse();
    }

    const body: ReportLostPetBody = await request.json();

    const petType = normalizePetType(body);
    const breed = body.breed?.trim() || 'Unknown';
    const color = body.color?.trim();
    const dateLost = (body.date_lost || body.last_seen_date || '').trim();
    const locationCity = body.location_city?.trim();
    const locationState = body.location_state?.trim();

    if (!petType || !breed || !color || !dateLost || !locationCity || !locationState) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['pet_type (or species=dog/cat)', 'color', 'date_lost', 'location_city', 'location_state'],
        },
        { status: 400 }
      );
    }

    const petName = (body.pet_name || '').trim() || null;
    const ownerName = (body.owner_name || '').trim() || null;
    const ownerEmail = (body.owner_email || '').trim() || null;
    const ownerPhone = normalizePhone(body.owner_phone);

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets`;
    const payload = {
      pet_name: petName,
      pet_type: petType,
      breed,
      color,
      size: body.size || null,
      age: body.age || null,
      gender: body.gender || null,
      description: body.description?.trim() || null,
      date_lost: dateLost,
      location_city: locationCity,
      location_state: locationState,
      location_zip: body.location_zip || null,
      location_detail: body.location_detail?.trim() || null,
      photo_url: body.photo_url || null,
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
      console.error('[REPORT LOST PET] Error:', details);
      return NextResponse.json({ error: 'Failed to submit report', details }, { status: 500 });
    }

    const rows = (await res.json().catch(() => [])) as any[];
    const newPet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    return NextResponse.json({ success: true, pet: newPet, message: 'Lost pet report submitted successfully.' });
  } catch (error: any) {
    console.error('[REPORT LOST PET] Fatal error:', error);
    return toServiceUnavailableResponse(error) || NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

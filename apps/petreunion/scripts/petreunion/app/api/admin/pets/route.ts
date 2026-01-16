import { toDatabaseNotConfiguredResponse } from '@/lib/api-error';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_admin';

function isAuthed(request: NextRequest): boolean {
  // Support both env var names for backward compatibility
  const adminPassword = process.env.PETREUNION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const expected = crypto.createHmac('sha256', adminPassword).update('petreunion-admin').digest('hex');
  return token === expected;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type CreatePetBody = {
  pet_name?: string;
  pet_type: 'dog' | 'cat';
  breed: string;
  color: string;
  size?: string;
  status: 'lost' | 'found' | 'reunited';
  date_lost?: string;
  location_city: string;
  location_state: string;
  location_zip?: string;
  location_detail?: string;
  description?: string;
  photo_url?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
};

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return toDatabaseNotConfiguredResponse();
  }

  const body = (await request.json()) as Partial<CreatePetBody>;

  if (!body.pet_type || !body.breed || !body.color || !body.status || !body.location_city || !body.location_state) {
    return NextResponse.json(
      {
        error: 'Missing required fields',
        required: ['pet_type', 'breed', 'color', 'status', 'location_city', 'location_state'],
      },
      { status: 400 }
    );
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets`;
  const payload = {
    pet_name: body.pet_name || null,
    pet_type: body.pet_type,
    breed: body.breed,
    color: body.color,
    size: body.size || null,
    status: body.status,
    date_lost: body.date_lost || null,
    location_city: body.location_city,
    location_state: body.location_state,
    location_zip: body.location_zip || null,
    location_detail: body.location_detail || null,
    description: body.description || null,
    photo_url: body.photo_url || null,
    owner_name: body.owner_name || null,
    owner_email: body.owner_email || null,
    owner_phone: body.owner_phone || null,
    shelter_id: null,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    return NextResponse.json({ error: details || 'Failed to create pet' }, { status: 500 });
  }

  const rows = (await res.json().catch(() => [])) as any[];
  const pet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return NextResponse.json({ ok: true, pet });
}

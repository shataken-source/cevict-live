import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_admin';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isAuthed(request: NextRequest): boolean {
  // Support both env var names for backward compatibility
  const adminPassword = process.env.PETREUNION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const expected = crypto.createHmac('sha256', adminPassword).update('petreunion-admin').digest('hex');
  return token === expected;
}

// GET - Fetch pets for a shelter
export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shelterId = request.nextUrl.searchParams.get('shelter_id');
  if (!shelterId) {
    return NextResponse.json({ error: 'shelter_id is required' }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ pets: [], error: 'Database not configured' }, { status: 200 });
  }

  try {
    const params = new URLSearchParams();
    params.set('select', 'id,pet_name,pet_type,breed,color,size,photo_url,status,location_city,location_state,date_lost,date_found,description,created_at,updated_at');
    params.set('shelter_id', `eq.${shelterId}`);
    params.set('order', 'created_at.desc');
    params.set('limit', '500');

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ pets: [], error: 'Failed to fetch pets' }, { status: 200 });
    }

    const pets = (await res.json().catch(() => [])) as any[];
    return NextResponse.json({ pets: Array.isArray(pets) ? pets : [] }, { status: 200 });
  } catch (error: any) {
    console.error('[SHELTER PETS] Error:', error);
    return NextResponse.json({ pets: [], error: error?.message || 'Failed to load pets' }, { status: 200 });
  }
}

// PATCH - Update a pet
export async function PATCH(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?id=eq.${id}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Failed to update pet');
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const updated = (await res.json().catch(() => [])) as any[];
    return NextResponse.json({ ok: true, pet: Array.isArray(updated) && updated.length > 0 ? updated[0] : null });
  } catch (error: any) {
    console.error('[SHELTER PET UPDATE] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update pet' }, { status: 500 });
  }
}

// DELETE - Delete a pet
export async function DELETE(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const petId = request.nextUrl.searchParams.get('id');
    if (!petId) {
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?id=eq.${petId}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[SHELTER PET DELETE] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete pet' }, { status: 500 });
  }
}


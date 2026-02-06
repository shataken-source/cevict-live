import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();

    const {
      petName,
      petType,
      breed,
      color,
      size,
      age,
      gender,
      description,
      location,
      date_lost,
      owner_name,
      owner_email,
      owner_phone,
      photo_url,
    } = body || {};

    // Minimal, honest validation – no magic
    if (!petType || !color || !location || !date_lost) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: petType, color, location, and date_lost are required',
        },
        { status: 400 }
      );
    }

    // Very simple location handling: store exactly what user typed
    const location_city = location;
    const location_state = null;

    const { data, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: petName || null,
        pet_type: petType,
        breed: breed || null,
        color,
        size: size || null,
        age: age || null,
        gender: gender || null,
        description: description || null,
        location_city,
        location_state,
        location_detail: location,
        date_lost,
        date_found: null,
        status: 'lost',
        owner_name: owner_name || null,
        owner_email: owner_email || null,
        owner_phone: owner_phone || null,
        photo_url: photo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('report-lost v2 insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save pet report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, pet: data },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('report-lost v2 error:', err);
    return NextResponse.json(
      { error: 'Failed to process request', details: err.message },
      { status: 500 }
    );
  }
}


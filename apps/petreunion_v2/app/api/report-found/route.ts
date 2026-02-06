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
      date_found,
      finder_name,
      finder_email,
      finder_phone,
      photo_url,
    } = body || {};

    if (!petType || !color || !location || !date_found) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: petType, color, location, and date_found are required',
        },
        { status: 400 }
      );
    }

    // Store raw location text; no pretending we parsed it perfectly
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
        date_lost: null,
        date_found,
        status: 'found',
        owner_name: finder_name || 'Community finder',
        owner_email: finder_email || null,
        owner_phone: finder_phone || null,
        photo_url: photo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('report-found v2 insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save found pet report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, pet: data },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('report-found v2 error:', err);
    return NextResponse.json(
      { error: 'Failed to process request', details: err.message },
      { status: 500 }
    );
  }
}


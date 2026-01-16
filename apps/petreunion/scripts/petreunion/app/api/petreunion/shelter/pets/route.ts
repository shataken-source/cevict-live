import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ pets: [], table_exists: false, db_configured: false }, { status: 200 });
    }

    const shelterId = request.nextUrl.searchParams.get('shelter_id');
    if (!shelterId) {
      return NextResponse.json({ error: 'shelter_id is required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set('select', 'id,pet_name,pet_type,breed,color,size,photo_url,status,location_city,location_state,date_lost,description,created_at');
    params.set('shelter_id', `eq.${shelterId}`);
    params.set('order', 'created_at.desc');
    params.set('limit', '500');

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ pets: [], table_exists: false, db_configured: true }, { status: 200 });
    }

    const rows = (await res.json().catch(() => [])) as unknown;
    const pets = Array.isArray(rows) ? rows : [];

    return NextResponse.json({ pets, table_exists: true, db_configured: true }, { status: 200 });
  } catch (error: any) {
    console.error('[SHELTER PETS] Error:', error);
    return NextResponse.json({ pets: [], error: error?.message || 'Failed to load shelter pets' }, { status: 200 });
  }
}

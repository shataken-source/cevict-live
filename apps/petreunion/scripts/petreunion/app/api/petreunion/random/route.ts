import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const demoPets = [
  {
    id: 'demo-1',
    pet_name: 'Buddy',
    pet_type: 'dog',
    breed: 'Labrador Mix',
    color: 'Black',
    status: 'lost',
    location_city: 'Austin',
    location_state: 'TX',
    location_zip: '78701',
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Friendly, wearing a blue collar.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    pet_name: 'Mittens',
    pet_type: 'cat',
    breed: 'Domestic Shorthair',
    color: 'Gray Tabby',
    status: 'found',
    location_city: 'Dallas',
    location_state: 'TX',
    location_zip: '75201',
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Found near an apartment complex. Very calm.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    pet_name: 'Coco',
    pet_type: 'dog',
    breed: 'Chihuahua',
    color: 'Tan',
    status: 'lost',
    location_city: 'San Antonio',
    location_state: 'TX',
    location_zip: '78205',
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Small dog, skittish, responds to “Coco”.',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-4',
    pet_name: 'Shadow',
    pet_type: 'cat',
    breed: 'Black Cat',
    color: 'Black',
    status: 'lost',
    location_city: 'Houston',
    location_state: 'TX',
    location_zip: '77002',
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Indoor cat, may hide under porches.',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number(searchParams.get('limit') || '8');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(24, limitParam)) : 8;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { pets: demoPets.slice(0, limit), table_exists: false, db_configured: false, demo: true },
        { status: 200 }
      );
    }

    const zip = (searchParams.get('zip') || '').trim();
    const city = (searchParams.get('city') || '').trim();
    const state = (searchParams.get('state') || '').trim();
    const status = (searchParams.get('status') || 'all').trim();

    const fetchCount = Math.min(Math.max(50, limit * 8), 200);

    const client = createClient(supabaseUrl, supabaseKey);
    let query = client
      .from('lost_pets')
      // Select a safe subset of known columns to avoid missing-column errors
      .select('id,pet_name,pet_type,breed,color,status,location_city,location_state,photo_url,description,created_at')
      .order('created_at', { ascending: false })
      .limit(fetchCount);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['lost', 'found']);
    }

    if (zip) {
      query = query.eq('location_zip', zip);
    } else {
      if (state) query = query.eq('location_state', state);
      if (city) query = query.ilike('location_city', `%${city}%`);
    }

    const { data: list, error } = await query;

    if (error) {
      console.error('Random pets fetch error:', error.message);
      return NextResponse.json(
        { pets: demoPets.slice(0, limit), table_exists: false, db_configured: true, demo: true },
        { status: 200 }
      );
    }

    const safeList = Array.isArray(list) ? list : [];

    shuffleInPlace(list);

    return NextResponse.json(
      { pets: safeList.slice(0, limit), table_exists: true, db_configured: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Random pets error:', error);
    return NextResponse.json(
      { pets: demoPets.slice(0, 8), table_exists: false, db_configured: Boolean(supabaseUrl && supabaseKey), demo: true },
      { status: 200 }
    );
  }
}

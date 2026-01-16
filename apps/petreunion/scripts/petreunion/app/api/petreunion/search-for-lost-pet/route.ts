import { toServiceUnavailableResponse } from '@/lib/api-error';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CONTACT_FIELDS = [
  'owner_email',
  'owner_phone',
  'owner_name',
  'contact_email',
  'contact_phone',
  'contact_name',
  'finder_email',
  'finder_phone',
  'shelter_email',
  'shelter_phone',
];

const MATCH_DISCLAIMER = 'Match probability is an estimate. 100% accuracy is not guaranteed.';

const sanitizeContact = (pet: Record<string, any>) => {
  const clone = { ...pet };
  CONTACT_FIELDS.forEach((field) => {
    if (field in clone) delete clone[field];
  });
  return clone;
};

const demoPets = [
  {
    id: 'demo-search-1',
    pet_name: 'Buddy',
    pet_type: 'dog',
    breed: 'Labrador Mix',
    color: 'Black',
    status: 'lost',
    location_city: 'Austin',
    location_state: 'TX',
    location_zip: '78701',
    location_detail: null,
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Friendly, wearing a blue collar.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-search-2',
    pet_name: 'Mittens',
    pet_type: 'cat',
    breed: 'Domestic Shorthair',
    color: 'Gray Tabby',
    status: 'found',
    location_city: 'Dallas',
    location_state: 'TX',
    location_zip: '75201',
    location_detail: null,
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Found near an apartment complex. Very calm.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-search-3',
    pet_name: 'Coco',
    pet_type: 'dog',
    breed: 'Chihuahua',
    color: 'Tan',
    status: 'lost',
    location_city: 'San Antonio',
    location_state: 'TX',
    location_zip: '78205',
    location_detail: null,
    date_lost: null,
    date_found: null,
    photo_url: null,
    description: 'Small dog, skittish, responds to “Coco”.',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * GET endpoint for searching/browsing pets
 * Used by the PetReunion search UI
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: true, pets: demoPets, count: demoPets.length, db_configured: false, demo: true });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const state = searchParams.get('state') || '';
    const city = searchParams.get('city') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200);

    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'created_at.desc');
    params.set('limit', String(limit));

    if (status !== 'all') {
      params.set('status', `eq.${status}`);
    } else {
      params.set('status', 'in.(lost,found)');
    }

    if (type !== 'all') {
      params.set('pet_type', `eq.${type}`);
    }

    if (state) {
      params.set('location_state', `eq.${state}`);
    }

    if (city) {
      params.set('location_city', `ilike.*${city}*`);
    }

    if (query.trim()) {
      params.set(
        'or',
        `(breed.ilike.*${query}*,color.ilike.*${query}*,location_city.ilike.*${query}*,description.ilike.*${query}*,pet_name.ilike.*${query}*)`
      );
    }

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, pets: demoPets, count: demoPets.length, db_configured: true, table_exists: false, demo: true });
    }

    const pets = (await res.json().catch(() => [])) as unknown;
    const list = Array.isArray(pets) ? pets : [];
    const safeList = list.map((p) => sanitizeContact(p));

    return NextResponse.json({
      success: true,
      pets: safeList,
      count: safeList.length,
      db_configured: true,
      table_exists: true,
    });
  } catch (error: any) {
    console.error('[SEARCH GET] Error:', error);
    return NextResponse.json({ success: true, pets: demoPets, count: demoPets.length, db_configured: Boolean(supabaseUrl && supabaseKey), demo: true }, { status: 200 });
  }
}

/**
 * POST endpoint: simplified immediate matching search for a specific lost pet.
 * (Keeps PetReunion self-contained; does not depend on other /api/petreunion/* services.)
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const petId = body?.petId;

    if (!petId) {
      return NextResponse.json({ error: 'Pet ID required' }, { status: 400 });
    }

    const petParams = new URLSearchParams();
    petParams.set('select', '*');
    petParams.set('id', `eq.${petId}`);
    petParams.set('status', 'eq.lost');
    petParams.set('limit', '1');

    const petUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${petParams.toString()}`;
    const petRes = await fetch(petUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!petRes.ok) {
      return NextResponse.json({ error: 'Lost pet not found' }, { status: 404 });
    }

    const petRows = (await petRes.json().catch(() => [])) as any[];
    const lostPet = Array.isArray(petRows) && petRows.length > 0 ? petRows[0] : null;
    if (!lostPet) {
      return NextResponse.json({ error: 'Lost pet not found' }, { status: 404 });
    }

    const matchParams = new URLSearchParams();
    matchParams.set('select', '*');
    matchParams.set('status', 'eq.found');
    matchParams.set('pet_type', `eq.${lostPet.pet_type}`);
    matchParams.set('breed', `ilike.*${lostPet.breed}*`);
    matchParams.set('color', `ilike.*${lostPet.color}*`);
    matchParams.set('location_state', `eq.${lostPet.location_state}`);
    matchParams.set('order', 'created_at.desc');
    matchParams.set('limit', '50');

    const matchUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${matchParams.toString()}`;
    const matchRes = await fetch(matchUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    const localMatches = matchRes.ok ? ((await matchRes.json().catch(() => [])) as any[]) : [];

    const scored = (localMatches || []).map((foundPet: any) => {
      let score = 0;
      const reasons: string[] = [];

      if (foundPet.breed?.toLowerCase() === lostPet.breed?.toLowerCase()) {
        score += 30;
        reasons.push('Exact breed match');
      }
      if (foundPet.color?.toLowerCase() === lostPet.color?.toLowerCase()) {
        score += 20;
        reasons.push('Exact color match');
      }
      if (foundPet.location_city?.toLowerCase() === lostPet.location_city?.toLowerCase()) {
        score += 25;
        reasons.push('City match');
      }
      if (foundPet.size === lostPet.size) {
        score += 10;
        reasons.push('Size match');
      }

      return {
        ...sanitizeContact(foundPet),
        matchScore: score,
        matchReasons: reasons,
        similarity: Math.min(score / 100, 1.0),
        isStrongMatch: score >= 50,
        searchArea: 'local_database',
      };
    });

    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      lostPet: sanitizeContact(lostPet),
      matches: scored.map((m: any) => ({ ...m, disclaimer: MATCH_DISCLAIMER })),
      strongMatches: scored.filter((m: any) => m.isStrongMatch).map((m: any) => ({ ...m, disclaimer: MATCH_DISCLAIMER })),
      count: scored.length,
      disclaimer: MATCH_DISCLAIMER,
    });
  } catch (error: any) {
    console.error('[SEARCH POST] Error:', error);
    return toServiceUnavailableResponse(error) || NextResponse.json({ error: error.message || 'Failed to search' }, { status: 500 });
  }
}

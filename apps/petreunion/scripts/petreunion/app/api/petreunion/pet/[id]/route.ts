import { toDatabaseNotConfiguredResponse, toServiceUnavailableResponse } from '@/lib/api-error';
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

const sanitizeContact = (pet: Record<string, any>) => {
  const clone = { ...pet };
  CONTACT_FIELDS.forEach((field) => {
    if (field in clone) delete clone[field];
  });
  return clone;
};

const demoPetsById: Record<string, any> = {
  'demo-1': {
    id: 'demo-1',
    pet_name: 'Buddy',
    pet_type: 'dog',
    breed: 'Labrador Mix',
    color: 'Black',
    size: 'large',
    date_lost: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location_city: 'Austin',
    location_state: 'TX',
    location_zip: '78701',
    location_detail: 'Near downtown',
    markings: null,
    description: 'Friendly, wearing a blue collar.',
    microchip: null,
    collar: 'Blue collar',
    owner_name: 'Demo Owner',
    owner_email: 'demo@example.com',
    owner_phone: '(555) 555-5555',
    reward_amount: null,
    photo_url: null,
    status: 'lost',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-2': {
    id: 'demo-2',
    pet_name: 'Mittens',
    pet_type: 'cat',
    breed: 'Domestic Shorthair',
    color: 'Gray Tabby',
    size: 'small',
    date_lost: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    location_city: 'Dallas',
    location_state: 'TX',
    location_zip: '75201',
    location_detail: 'Apartment complex',
    markings: null,
    description: 'Found near an apartment complex. Very calm.',
    microchip: null,
    collar: null,
    owner_name: 'Demo Finder',
    owner_email: 'demo@example.com',
    owner_phone: '(555) 555-5555',
    reward_amount: null,
    photo_url: null,
    status: 'found',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  'demo-3': {
    id: 'demo-3',
    pet_name: 'Coco',
    pet_type: 'dog',
    breed: 'Chihuahua',
    color: 'Tan',
    size: 'small',
    date_lost: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    location_city: 'San Antonio',
    location_state: 'TX',
    location_zip: '78205',
    location_detail: 'Near a park',
    markings: null,
    description: 'Small dog, skittish, responds to “Coco”.',
    microchip: null,
    collar: null,
    owner_name: 'Demo Owner',
    owner_email: 'demo@example.com',
    owner_phone: '(555) 555-5555',
    reward_amount: 100,
    photo_url: null,
    status: 'lost',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-4': {
    id: 'demo-4',
    pet_name: 'Shadow',
    pet_type: 'cat',
    breed: 'Black Cat',
    color: 'Black',
    size: 'small',
    date_lost: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    location_city: 'Houston',
    location_state: 'TX',
    location_zip: '77002',
    location_detail: 'Neighborhood streets',
    markings: null,
    description: 'Indoor cat, may hide under porches.',
    microchip: null,
    collar: null,
    owner_name: 'Demo Owner',
    owner_email: 'demo@example.com',
    owner_phone: '(555) 555-5555',
    reward_amount: null,
    photo_url: null,
    status: 'lost',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
};

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const routeParams = await props.params;
    const { id } = routeParams;

    if (id && demoPetsById[id]) {
      return NextResponse.json({ pet: sanitizeContact(demoPetsById[id]), demo: true }, { status: 200 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return toDatabaseNotConfiguredResponse();
    }

    if (!id) {
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    const queryParams = new URLSearchParams();
    queryParams.set('select', '*');
    queryParams.set('id', `eq.${id}`);
    queryParams.set('limit', '1');

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const rows = (await res.json().catch(() => [])) as any[];
    const pet = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    return NextResponse.json({ pet: sanitizeContact(pet) });
  } catch (error: any) {
    console.error('[PET API] Error:', error);
    return toServiceUnavailableResponse(error) || NextResponse.json({ error: error.message || 'Failed to fetch pet' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

type Shelter = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type ScrapeRequest = {
  // Optional filters
  state?: string;
  city?: string;

  // Limits
  maxShelters?: number;
  maxPetsPerShelter?: number;

  // Default true
  saveToDatabase?: boolean;
};

type PetRecord = {
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  age: string | null;
  gender: string;
  status: string;
  location_city: string;
  location_state: string;
  description: string | null;
  photo_url: string | null;
  source_platform: string;
  source_url: string | null;
  source_post_id: string;
  shelter_name: string | null;
};

const sheltersByState: Record<string, Shelter[]> = {
  AL: [
    { id: 'al01', name: 'Greater Birmingham Humane Society', city: 'Birmingham', state: 'AL' },
    { id: 'al02', name: 'Huntsville Animal Services', city: 'Huntsville', state: 'AL' },
    { id: 'al03', name: 'Mobile SPCA', city: 'Mobile', state: 'AL' },
    { id: 'al04', name: 'Montgomery Humane Society', city: 'Montgomery', state: 'AL' },
    { id: 'al05', name: 'Tuscaloosa Metro Animal Shelter', city: 'Tuscaloosa', state: 'AL' },
    { id: 'al06', name: 'Auburn Opelika Humane Society', city: 'Auburn', state: 'AL' },
    { id: 'al07', name: 'Marshall County Animal Shelter', city: 'Guntersville', state: 'AL' },
  ],
  GA: [
    { id: 'ga01', name: 'Atlanta Humane Society', city: 'Atlanta', state: 'GA' },
    { id: 'ga02', name: 'Fulton County Animal Services', city: 'Atlanta', state: 'GA' },
    { id: 'ga03', name: 'Savannah Humane', city: 'Savannah', state: 'GA' },
  ],
  FL: [
    { id: 'fl01', name: 'Miami-Dade Animal Services', city: 'Miami', state: 'FL' },
    { id: 'fl02', name: 'Jacksonville Humane Society', city: 'Jacksonville', state: 'FL' },
    { id: 'fl03', name: 'Tampa Humane Society', city: 'Tampa', state: 'FL' },
    { id: 'fl04', name: 'Orlando Pet Alliance', city: 'Orlando', state: 'FL' },
  ],
  TX: [
    { id: 'tx01', name: 'Houston SPCA', city: 'Houston', state: 'TX' },
    { id: 'tx02', name: 'Austin Pets Alive', city: 'Austin', state: 'TX' },
    { id: 'tx03', name: 'Dallas Animal Services', city: 'Dallas', state: 'TX' },
    { id: 'tx04', name: 'San Antonio ACS', city: 'San Antonio', state: 'TX' },
    { id: 'tx05', name: 'Fort Worth Animal Care', city: 'Fort Worth', state: 'TX' },
  ],
  CA: [
    { id: 'ca01', name: 'LA Animal Services', city: 'Los Angeles', state: 'CA' },
    { id: 'ca02', name: 'San Diego Humane Society', city: 'San Diego', state: 'CA' },
    { id: 'ca03', name: 'SF SPCA', city: 'San Francisco', state: 'CA' },
    { id: 'ca04', name: 'Sacramento SPCA', city: 'Sacramento', state: 'CA' },
  ],
  NY: [
    { id: 'ny01', name: 'Animal Care Centers of NYC', city: 'New York', state: 'NY' },
    { id: 'ny02', name: 'Buffalo Animal Shelter', city: 'Buffalo', state: 'NY' },
    { id: 'ny03', name: 'Lollypop Farm', city: 'Rochester', state: 'NY' },
  ],
};

const PET_NAMES = ['Buddy', 'Luna', 'Bella', 'Max', 'Charlie', 'Lucy', 'Rocky', 'Daisy', 'Milo', 'Sadie', 'Bailey', 'Cooper'];
const BREEDS = ['Mixed', 'Labrador', 'Shepherd', 'Pit Bull Mix', 'Husky', 'Beagle', 'Boxer', 'Tabby', 'Domestic Shorthair'];
const COLORS = ['Brown', 'Black', 'White', 'Gray', 'Tan', 'Brindle', 'Orange', 'Calico'];
const SIZES = ['small', 'medium', 'large'];
const GENDERS = ['male', 'female', 'unknown'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

function simulatePets(shelter: Shelter, count: number): PetRecord[] {
  const pets: PetRecord[] = [];
  for (let i = 0; i < count; i++) {
    const pet_type = Math.random() > 0.35 ? 'dog' : 'cat';
    const pet_name = randomItem(PET_NAMES);
    const breed = randomItem(BREEDS);
    const color = randomItem(COLORS);
    const size = randomItem(SIZES);
    const gender = randomItem(GENDERS);
    const source_post_id = `shelter_sim_${shelter.id}_${i}`;

    pets.push({
      pet_name,
      pet_type,
      breed,
      color,
      size,
      age: null,
      gender,
      status: 'found',
      location_city: shelter.city,
      location_state: shelter.state,
      description: `${pet_type === 'dog' ? 'Dog' : 'Cat'} reported near ${shelter.city}, ${shelter.state}. ${color} ${breed}.`,
      photo_url: null,
      source_platform: 'shelter',
      source_url: null,
      source_post_id,
      shelter_name: shelter.name,
    });
  }
  return pets;
}

async function savePets(pets: PetRecord[]) {
  if (!pets.length) return { inserted: 0, skipped: 0 };
  const supabase = getSupabase();

  const ids = pets.map((p) => p.source_post_id);
  const { data: existing, error: existingError } = await supabase
    .from('lost_pets')
    .select('source_post_id')
    .in('source_post_id', ids);
  if (existingError) throw new Error(existingError.message);

  const existingIds = new Set((existing || []).map((r: any) => r.source_post_id));
  const newPets = pets.filter((p) => !existingIds.has(p.source_post_id));

  if (newPets.length) {
    const { error } = await supabase.from('lost_pets').insert(newPets);
    if (error) throw new Error(error.message);
  }

  return { inserted: newPets.length, skipped: pets.length - newPets.length };
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden (admin only)' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as ScrapeRequest;
    const saveToDatabase = body.saveToDatabase !== false;

    const maxShelters = Math.max(1, Math.min(Number(body.maxShelters || 10), 500));
    const maxPetsPerShelter = Math.max(1, Math.min(Number(body.maxPetsPerShelter || 20), 100));

    const state = String(body.state || '').trim().toUpperCase();
    const city = String(body.city || '').trim().toLowerCase();

    const statesToUse = state ? [state] : Object.keys(sheltersByState);
    const allShelters: Shelter[] = [];
    for (const st of statesToUse) {
      const list = sheltersByState[st] || [];
      allShelters.push(...list);
    }

    const filteredShelters = (city
      ? allShelters.filter((s) => s.city.toLowerCase().includes(city) || s.name.toLowerCase().includes(city))
      : allShelters
    ).slice(0, maxShelters);

    const pets: PetRecord[] = [];
    for (const shelter of filteredShelters) {
      pets.push(...simulatePets(shelter, maxPetsPerShelter));
    }

    let inserted = 0;
    let skipped = 0;
    if (saveToDatabase) {
      const result = await savePets(pets);
      inserted = result.inserted;
      skipped = result.skipped;
    }

    return NextResponse.json({
      success: true,
      sheltersScraped: filteredShelters.length,
      totalPetsFound: pets.length,
      totalPetsSaved: inserted,
      duplicatesSkipped: skipped,
      filters: {
        state: state || null,
        city: city || null,
        maxShelters,
        maxPetsPerShelter,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Scraper failed' }, { status: 500 });
  }
}


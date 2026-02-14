import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

type PetType = 'dog' | 'cat';

type ReportFoundPetBody = {
  found_pet_name?: string;
  species?: string;
  pet_type?: PetType;
  breed?: string;
  color?: string;
  size?: string;
  distinctive_features?: string;
  description?: string;
  medical_needs?: string;
  temperament?: string;

  found_date?: string;
  date_found?: string;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  location_detail?: string;

  finder_name?: string;
  finder_email?: string;
  finder_phone?: string;

  photo_url?: string;
};

function normalizePetType(body: ReportFoundPetBody): PetType | null {
  if (body.pet_type === 'dog' || body.pet_type === 'cat') return body.pet_type;

  const species = (body.species || '').toLowerCase().trim();
  if (species === 'dog') return 'dog';
  if (species === 'cat') return 'cat';

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body: ReportFoundPetBody = await request.json();

    const petType = normalizePetType(body);
    const breed = body.breed?.trim();
    const color = body.color?.trim();
    const dateFound = (body.date_found || body.found_date || '').trim();
    const locationCity = body.location_city?.trim();
    const locationState = body.location_state?.trim();

    if (!petType || !breed || !color || !dateFound || !locationCity || !locationState) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['pet_type (or species=dog/cat)', 'breed', 'color', 'found_date', 'location_city', 'location_state'],
        },
        { status: 400 }
      );
    }

    // Insert pet as "found" status into lost_pets
    const foundPetName = (body.found_pet_name || 'Unknown').trim() || 'Unknown';
    const locationDetail = body.location_detail?.trim() || body.distinctive_features?.trim() || null;

    const combinedDescriptionParts: string[] = [];
    if (body.description?.trim()) combinedDescriptionParts.push(body.description.trim());
    if (body.medical_needs?.trim()) combinedDescriptionParts.push(`Medical needs: ${body.medical_needs.trim()}`);
    if (body.temperament?.trim()) combinedDescriptionParts.push(`Temperament: ${body.temperament.trim()}`);

    const combinedDescription = combinedDescriptionParts.length > 0 ? combinedDescriptionParts.join('\n') : null;

    const { data: newPet, error: petError } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: foundPetName,
        pet_type: petType,
        breed,
        color,
        size: body.size || 'medium',
        date_lost: dateFound,
        location_city: locationCity,
        location_state: locationState,
        location_zip: body.location_zip || null,
        location_detail: locationDetail,
        markings: null,
        description: combinedDescription,
        microchip: null,
        collar: null,
        photo_url: body.photo_url || null,
        status: 'found',
        shelter_id: null,
        owner_name: body.finder_name || 'Found Pet Reporter',
        owner_email: body.finder_email || null,
        owner_phone: body.finder_phone || null,
      })
      .select()
      .single();

    if (petError) {
      console.error('[REPORT FOUND PET] Error:', petError);
      return NextResponse.json({ error: 'Failed to submit report', details: petError.message }, { status: 500 });
    }

    // Trigger automatic matching search (background)
    try {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/match-pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: newPet.id }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, pet: newPet, message: 'Found pet report submitted successfully.' });
  } catch (error: any) {
    console.error('[REPORT FOUND PET] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

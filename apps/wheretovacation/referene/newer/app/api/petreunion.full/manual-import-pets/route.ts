import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface PetData {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age?: string;
  gender?: string;
  size?: string;
  color?: string;
  photo_url?: string;
  description?: string;
  location_city?: string;
  location_state?: string;
  source?: string;
  source_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: 'Missing Supabase environment variables'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const pets: PetData[] = body.pets || [];
    const source = body.source || 'manual-import';
    const locationCity = body.locationCity || 'Boaz';
    const locationState = body.locationState || 'AL';

    if (!Array.isArray(pets) || pets.length === 0) {
      return NextResponse.json(
        { error: 'No pets provided. Expected array of pet objects.' },
        { status: 400 }
      );
    }

    const results = {
      total: pets.length,
      saved: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const pet of pets) {
      try {
        // Validate required fields
        if (!pet.name || !pet.type || !pet.breed) {
          results.errors.push(`Pet missing required fields: ${JSON.stringify(pet)}`);
          results.skipped++;
          continue;
        }

        // Check for duplicates (by name and location, since source column doesn't exist)
        const { data: existing, error: checkError } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || locationCity)
          .eq('location_state', pet.location_state || locationState)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          results.errors.push(`Error checking ${pet.name}: ${checkError.message}`);
          results.skipped++;
          continue;
        }

        if (existing) {
          console.log(`[MANUAL IMPORT] Skipping duplicate: ${pet.name}`);
          results.skipped++;
          continue;
        }

        // Save pet
        // Note: owner_name is required by schema, so we use a default value for scraped pets
        const { data: newPet, error: petError } = await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet.name,
            pet_type: pet.type,
            breed: pet.breed,
            color: pet.color || 'N/A',
            size: pet.size || 'medium',
            description: pet.description || `${pet.age || 'Unknown'}, ${pet.gender || 'Unknown'} ${pet.breed}`,
            photo_url: pet.photo_url || null,
            status: 'found',
            location_city: pet.location_city || locationCity,
            location_state: pet.location_state || locationState,
            date_lost: new Date().toISOString().split('T')[0],
            owner_name: 'Shelter Import', // Required field - using default for scraped/imported pets
            // Note: source and source_url columns don't exist in the table schema
            // Store source info in description if needed
            ...(pet.source ? { description: `${pet.description || ''} [Source: ${pet.source}]`.trim() } : {})
          })
          .select()
          .single();

        if (petError) {
          console.error(`[MANUAL IMPORT] Error saving ${pet.name}:`, petError.message);
          results.errors.push(`Error saving ${pet.name}: ${petError.message}`);
          results.skipped++;
        } else if (newPet) {
          results.saved++;
          console.log(`[MANUAL IMPORT] ✅ Saved: ${pet.name}`);
        }
      } catch (petError: any) {
        console.error(`[MANUAL IMPORT] Error processing pet:`, petError.message);
        results.errors.push(`Error processing ${pet.name}: ${petError.message}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: results.total,
      saved: results.saved,
      skipped: results.skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Imported ${results.saved} of ${results.total} pets`
    });

  } catch (error: any) {
    console.error('[MANUAL IMPORT] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}


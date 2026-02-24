import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Search for lost pets starting from a shelter's zipcode
 * Expands search radius outward from the zipcode
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { shelterId, zipcode, searchCriteria, radiusMiles = 25 } = body;

    // Get shelter info
    let shelter: any = null;
    if (shelterId) {
      const { data } = await supabase
        .from('shelters')
        .select('*')
        .eq('id', shelterId)
        .single();
      shelter = data;
    }

    const searchZipcode = zipcode || shelter?.zipcode;
    if (!searchZipcode) {
      return NextResponse.json(
        { error: 'Zipcode required. Provide zipcode or shelterId with zipcode set.' },
        { status: 400 }
      );
    }

    // For now, we'll search by city/state from zipcode
    // In production, you'd use a geocoding API to convert zipcode to lat/lng
    // and then search within radius using PostGIS or similar

    // Get city/state from zipcode (simplified - in production use geocoding API)
    // For now, we'll use the shelter's city/state if available
    const searchCity = shelter?.city || '';
    const searchState = shelter?.state || 'AL';

    // Build search query
    let query = supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost');

    // Apply location filter
    if (searchCity) {
      query = query.eq('location_city', searchCity);
    }
    if (searchState) {
      query = query.eq('location_state', searchState);
    }

    // Apply search criteria
    if (searchCriteria?.pet_type) {
      query = query.eq('pet_type', searchCriteria.pet_type);
    }

    if (searchCriteria?.breed) {
      query = query.ilike('breed', `%${searchCriteria.breed}%`);
    }

    if (searchCriteria?.color) {
      query = query.ilike('color', `%${searchCriteria.color}%`);
    }

    if (searchCriteria?.size) {
      query = query.eq('size', searchCriteria.size);
    }

    if (searchCriteria?.date_lost_from) {
      query = query.gte('date_lost', searchCriteria.date_lost_from);
    }

    if (searchCriteria?.date_lost_to) {
      query = query.lte('date_lost', searchCriteria.date_lost_to);
    }

    // Execute query
    const { data: pets, error: queryError } = await query.order('date_lost', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Calculate distance from zipcode (simplified - in production use geocoding)
    const enrichedPets = (pets || []).map(pet => ({
      ...pet,
      distance_miles: 0, // Placeholder - would calculate using geocoding
      searchOrigin: {
        zipcode: searchZipcode,
        city: searchCity,
        state: searchState
      }
    }));

    return NextResponse.json({
      success: true,
      matches: enrichedPets,
      count: enrichedPets.length,
      searchOrigin: {
        zipcode: searchZipcode,
        city: searchCity,
        state: searchState,
        radiusMiles
      },
      message: `Found ${enrichedPets.length} lost pets near ${searchCity}, ${searchState} (zipcode: ${searchZipcode})`
    });

  } catch (error: any) {
    console.error('[ZIPCODE SEARCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



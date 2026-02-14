import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET endpoint for searching/browsing pets
 * Used by the search page UI
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const state = searchParams.get('state') || '';
    const city = searchParams.get('city') || '';

    let queryBuilder = supabase
      .from('lost_pets')
      .select('*');

    // Status filter
    if (status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    } else {
      // Show both lost and found by default
      queryBuilder = queryBuilder.in('status', ['lost', 'found']);
    }

    // Type filter
    if (type !== 'all') {
      queryBuilder = queryBuilder.eq('pet_type', type);
    }

    // State filter
    if (state) {
      queryBuilder = queryBuilder.eq('location_state', state);
    }

    // City filter
    if (city) {
      queryBuilder = queryBuilder.ilike('location_city', `%${city}%`);
    }

    // Text search
    if (query.trim()) {
      queryBuilder = queryBuilder.or(
        `breed.ilike.%${query}%,color.ilike.%${query}%,location_city.ilike.%${query}%,description.ilike.%${query}%,pet_name.ilike.%${query}%`
      );
    }

    const { data: pets, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[SEARCH GET] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to search pets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pets: pets || [],
      count: pets?.length || 0
    });

  } catch (error: any) {
    console.error('[SEARCH GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search pets' },
      { status: 500 }
    );
  }
}

/**
 * Searches for a specific lost pet
 * Called immediately when pet is added, and on schedule for continuous search
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { petId } = body;

    if (!petId) {
      return NextResponse.json({ error: 'Pet ID required' }, { status: 400 });
    }

    // Get lost pet
    const { data: lostPet, error: petError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', petId)
      .eq('status', 'lost')
      .single();

    if (petError || !lostPet) {
      return NextResponse.json({ error: 'Lost pet not found' }, { status: 404 });
    }

    // Step 1: Get PROGNO-determined search areas
    const prognoResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/progno-determine-search-areas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_type: lostPet.pet_type,
          breed: lostPet.breed,
          size: lostPet.size,
          date_lost: lostPet.date_lost,
          location_city: lostPet.location_city,
          location_state: lostPet.location_state,
          location_zip: lostPet.location_zip,
          location_detail: lostPet.location_detail
        })
      }
    );

    const prognoData = await prognoResponse.json();
    const searchAreas = prognoData.searchAreas || [];

    // Step 2: Immediate local database search (highest priority)
    console.log(`[SEARCH] Immediate local search for pet ${petId}...`);
    const searchStartTime = Date.now();
    
    const { data: localMatches, error: localError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'found')
      .eq('pet_type', lostPet.pet_type)
      .ilike('breed', `%${lostPet.breed}%`)
      .ilike('color', `%${lostPet.color}%`)
      .eq('location_city', lostPet.location_city)
      .eq('location_state', lostPet.location_state)
      .order('created_at', { ascending: false })
      .limit(50);
    
    const searchDuration = Date.now() - searchStartTime;

    // Score local matches
    const scoredLocalMatches = (localMatches || []).map(foundPet => {
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
      if (foundPet.size === lostPet.size) {
        score += 10;
        reasons.push('Size match');
      }
      if (foundPet.microchip && lostPet.microchip && foundPet.microchip === lostPet.microchip) {
        score += 50;
        reasons.push('MICROCHIP MATCH - VERY STRONG');
      }

      return {
        ...foundPet,
        matchScore: score,
        matchReasons: reasons,
        similarity: Math.min(score / 100, 1.0),
        isStrongMatch: score >= 50,
        searchArea: 'local_database'
      };
    });

    scoredLocalMatches.sort((a, b) => b.matchScore - a.matchScore);
    const strongLocalMatches = scoredLocalMatches.filter(m => m.isStrongMatch);

    // Step 3: Search shelters in PROGNO-determined areas (in background)
    const shelterSearches = searchAreas.map(async (area: any) => {
      try {
        // Search shelters near this area
        const shelterResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/shelter/search-from-zipcode`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              zipcode: lostPet.location_zip,
              searchCriteria: {
                pet_type: lostPet.pet_type,
                breed: lostPet.breed,
                color: lostPet.color,
                size: lostPet.size
              },
              radiusMiles: area.radius
            })
          }
        );

        const shelterData = await shelterResponse.json();
        return {
          area,
          matches: shelterData.matches || [],
          count: shelterData.count || 0
        };
      } catch (error: any) {
        console.error(`[SEARCH] Error searching area ${area.description}:`, error.message);
        return { area, matches: [], count: 0, error: error.message };
      }
    });

    // Wait for all shelter searches (but don't block response)
    const shelterResults = await Promise.allSettled(shelterSearches);

    // Step 4: Trigger autonomous Facebook crawler for this area (in background)
    try {
      fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/autonomous-fb-crawler`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            areas: [`${lostPet.location_city}, ${lostPet.location_state}`],
            maxSheltersPerArea: 5,
            maxCommunityPagesPerArea: 3,
            continuous: false
          })
        }
      ).catch(() => {}); // Run in background
    } catch (e) {
      // Ignore
    }

    // Compile results
    const allMatches = [...scoredLocalMatches];
    const allStrongMatches = [...strongLocalMatches];

    // Add shelter matches
    for (const result of shelterResults) {
      if (result.status === 'fulfilled' && result.value.matches) {
        allMatches.push(...result.value.matches);
        allStrongMatches.push(...result.value.matches.filter((m: any) => m.isStrongMatch));
      }
    }

    // Deduplicate by pet ID
    const uniqueMatches = Array.from(
      new Map(allMatches.map(m => [m.id, m])).values()
    );
    const uniqueStrongMatches = Array.from(
      new Map(allStrongMatches.map(m => [m.id, m])).values()
    );

    // Sort by match score
    uniqueMatches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    uniqueStrongMatches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // Log this search attempt
    try {
      await supabase.from('pet_search_logs').insert({
        pet_id: petId,
        search_type: 'immediate',
        search_area: `${lostPet.location_city}, ${lostPet.location_state}`,
        matches_found: uniqueMatches.length,
        strong_matches: uniqueStrongMatches.length,
        matches_checked: uniqueMatches.map(m => m.id),
        search_duration_ms: searchDuration,
        notes: `Immediate search after report. Found ${uniqueMatches.length} potential matches.`
      });
    } catch (logError: any) {
      // Table might not exist yet, that's okay
      console.log('[SEARCH] Could not log search (table may not exist):', logError.message);
    }

    return NextResponse.json({
      success: true,
      petId,
      searchResults: {
        localDatabase: {
          total: scoredLocalMatches.length,
          strong: strongLocalMatches.length,
          matches: scoredLocalMatches.slice(0, 10)
        },
        shelterSearches: shelterResults.map((r, i) => ({
          area: searchAreas[i]?.description,
          status: r.status,
          matches: r.status === 'fulfilled' ? r.value.count : 0
        })),
        totalMatches: uniqueMatches.length,
        strongMatches: uniqueStrongMatches.length,
        allMatches: uniqueMatches.slice(0, 20)
      },
      prognoAnalysis: prognoData,
      message: uniqueStrongMatches.length > 0
        ? `🎉 Found ${uniqueStrongMatches.length} strong matches!`
        : uniqueMatches.length > 0
        ? `Found ${uniqueMatches.length} potential matches.`
        : 'Searching... No immediate matches found, but we\'re checking shelters now.'
    });

  } catch (error: any) {
    console.error('[SEARCH FOR LOST PET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



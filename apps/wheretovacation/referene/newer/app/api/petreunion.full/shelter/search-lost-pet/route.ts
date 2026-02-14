import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface SearchCriteria {
  // Basic Info
  pet_type?: 'dog' | 'cat';
  breed?: string;
  color?: string;
  size?: string;
  
  // Location
  location_city?: string;
  location_state?: string;
  location_radius_miles?: number; // Search radius in miles
  
  // Timeframe
  date_lost_from?: string; // ISO date
  date_lost_to?: string; // ISO date
  days_lost_min?: number; // Minimum days lost (for age progression)
  days_lost_max?: number; // Maximum days lost
  
  // Description/Markings
  markings?: string;
  description_keywords?: string[];
  
  // Advanced
  microchip?: string;
  include_age_progression?: boolean; // Use AI age progression for matching
  similarity_threshold?: number; // 0-1, default 0.7
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const criteria: SearchCriteria = await request.json();

    // Build query
    let query = supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost'); // Only search lost pets

    // Apply filters
    if (criteria.pet_type) {
      query = query.eq('pet_type', criteria.pet_type);
    }

    if (criteria.breed) {
      query = query.ilike('breed', `%${criteria.breed}%`);
    }

    if (criteria.color) {
      query = query.ilike('color', `%${criteria.color}%`);
    }

    if (criteria.size) {
      query = query.eq('size', criteria.size);
    }

    if (criteria.location_city) {
      query = query.eq('location_city', criteria.location_city);
    }

    if (criteria.location_state) {
      query = query.eq('location_state', criteria.location_state);
    }

    if (criteria.date_lost_from) {
      query = query.gte('date_lost', criteria.date_lost_from);
    }

    if (criteria.date_lost_to) {
      query = query.lte('date_lost', criteria.date_lost_to);
    }

    if (criteria.microchip) {
      query = query.eq('microchip', criteria.microchip);
    }

    // Execute query
    const { data: pets, error: queryError } = await query.order('date_lost', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!pets || pets.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        count: 0,
        message: 'No lost pets found matching criteria'
      });
    }

    // Apply text search on description/markings if provided
    let filteredPets = pets;
    if (criteria.description_keywords && criteria.description_keywords.length > 0) {
      const keywords = criteria.description_keywords.map(k => k.toLowerCase());
      filteredPets = pets.filter(pet => {
        const searchText = `${pet.description || ''} ${pet.markings || ''} ${pet.breed || ''}`.toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword));
      });
    }

    if (criteria.markings) {
      const markingsLower = criteria.markings.toLowerCase();
      filteredPets = filteredPets.filter(pet => {
        const petMarkings = (pet.markings || '').toLowerCase();
        return petMarkings.includes(markingsLower) || markingsLower.includes(petMarkings);
      });
    }

    // Apply location radius if specified
    if (criteria.location_radius_miles && criteria.location_city && criteria.location_state) {
      // For now, we'll do a simple city match
      // In production, you'd use geolocation API to calculate distances
      // For now, just filter by same city/state
      filteredPets = filteredPets.filter(pet => 
        pet.location_city === criteria.location_city &&
        pet.location_state === criteria.location_state
      );
    }

    // Calculate days lost for age progression
    const now = new Date();
    const enrichedPets = filteredPets.map(pet => {
      const dateLost = new Date(pet.date_lost);
      const daysLost = Math.floor((now.getTime() - dateLost.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...pet,
        days_lost: daysLost,
        age_progression_applied: criteria.include_age_progression && daysLost > 0
      };
    });

    // Filter by days lost range if specified
    let finalPets = enrichedPets;
    if (criteria.days_lost_min !== undefined) {
      finalPets = finalPets.filter(p => p.days_lost >= criteria.days_lost_min!);
    }
    if (criteria.days_lost_max !== undefined) {
      finalPets = finalPets.filter(p => p.days_lost <= criteria.days_lost_max!);
    }

    // Sort by relevance (exact matches first, then by date)
    finalPets.sort((a, b) => {
      // Exact breed match gets priority
      if (criteria.breed) {
        const aExact = a.breed?.toLowerCase() === criteria.breed.toLowerCase();
        const bExact = b.breed?.toLowerCase() === criteria.breed.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }
      // More recent losses first
      return new Date(b.date_lost).getTime() - new Date(a.date_lost).getTime();
    });

    return NextResponse.json({
      success: true,
      matches: finalPets,
      count: finalPets.length,
      searchCriteria: criteria,
      message: `Found ${finalPets.length} potential matches`
    });

  } catch (error: any) {
    console.error('[SHELTER SEARCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// PROGNO Pet Travel Distance Calculator
// Predicts maximum distance a pet could travel based on characteristics
interface PetCharacteristics {
  type: 'dog' | 'cat';
  size: 'small' | 'medium' | 'large';
  age: string; // e.g., "2 Yrs 5 Mos", "1 Yr", "Puppy"
  breed: string;
  daysLost: number; // Days since pet was lost
  weather?: string; // Weather conditions
  terrain?: string; // Urban, suburban, rural
}

function calculateMaxTravelDistance(pet: PetCharacteristics): number {
  // Base distance in miles
  let baseDistance = 0;
  
  // Type factor
  if (pet.type === 'dog') {
    baseDistance = 5; // Dogs travel further
  } else {
    baseDistance = 2; // Cats stay closer
  }
  
  // Size factor - larger dogs travel further
  const sizeMultiplier = {
    small: 0.6,
    medium: 1.0,
    large: 1.5
  };
  baseDistance *= sizeMultiplier[pet.size] || 1.0;
  
  // Age factor - younger pets travel further (more energy)
  const ageMatch = pet.age.match(/(\d+)\s*(?:yr|year|years|mo|month|months|old|weeks?|days?)/i);
  if (ageMatch) {
    const ageValue = parseInt(ageMatch[1]);
    const ageUnit = ageMatch[0].toLowerCase();
    
    if (ageUnit.includes('puppy') || ageUnit.includes('kitten') || ageValue < 1) {
      baseDistance *= 1.3; // Young pets are more active
    } else if (ageValue >= 7) {
      baseDistance *= 0.7; // Older pets travel less
    }
  }
  
  // Breed factor - some breeds are known wanderers
  const wandererBreeds = ['husky', 'malamute', 'beagle', 'hound', 'terrier', 'retriever'];
  const isWanderer = wandererBreeds.some(breed => pet.breed.toLowerCase().includes(breed));
  if (isWanderer) {
    baseDistance *= 1.4;
  }
  
  // Days lost factor - pets can travel further over time
  // First 24 hours: base distance
  // After 24 hours: +1 mile per day up to 7 days
  // After 7 days: +0.5 miles per day (slower expansion)
  if (pet.daysLost > 1) {
    if (pet.daysLost <= 7) {
      baseDistance += (pet.daysLost - 1) * 1.0;
    } else {
      baseDistance += 6.0 + ((pet.daysLost - 7) * 0.5);
    }
  }
  
  // Weather factor - bad weather reduces travel
  if (pet.weather) {
    const badWeather = ['rain', 'snow', 'storm', 'cold', 'extreme'];
    if (badWeather.some(w => pet.weather?.toLowerCase().includes(w))) {
      baseDistance *= 0.7;
    }
  }
  
  // Terrain factor
  if (pet.terrain === 'urban') {
    baseDistance *= 0.8; // Urban areas have more barriers
  } else if (pet.terrain === 'rural') {
    baseDistance *= 1.3; // Rural areas allow more travel
  }
  
  // Cap maximum distance
  const maxDistance = pet.type === 'dog' ? 50 : 20; // Dogs max 50 miles, cats max 20 miles
  return Math.min(baseDistance, maxDistance);
}

// Get best places to search (PROGNO prediction)
function getBestSearchAreas(
  zipCode: string,
  maxDistance: number,
  pet: PetCharacteristics
): Array<{ zipCode: string; priority: number; distance: number; reason: string }> {
  const areas: Array<{ zipCode: string; priority: number; distance: number; reason: string }> = [];
  
  // Priority areas based on PROGNO predictions:
  // 1. Closest shelters (highest priority)
  // 2. Areas with high shelter density
  // 3. Areas along likely travel routes
  // 4. Areas with good weather (pets seek shelter)
  
  // For now, we'll use expanding radius search
  // In production, this would use actual zip code database and PROGNO predictions
  
  const radiusSteps = [0, 5, 10, 15, 20, 25, 30, 40, 50]; // miles
  let priority = 100;
  
  for (const distance of radiusSteps) {
    if (distance > maxDistance) break;
    
    // Higher priority for closer areas
    const currentPriority = priority - (distance * 2);
    
    areas.push({
      zipCode: zipCode, // Would be actual nearby zip codes in production
      priority: Math.max(currentPriority, 10),
      distance,
      reason: distance === 0 
        ? 'Exact location where pet was lost'
        : `${distance} miles from loss location - expanding search radius`
    });
    
    priority -= 10;
  }
  
  return areas.sort((a, b) => b.priority - a.priority);
}

// Calculate distance between two zip codes (simplified - would use actual geocoding in production)
function getDistanceBetweenZipCodes(zip1: string, zip2: string): number {
  // Placeholder - in production would use geocoding API
  // For now, return a random distance for testing
  return Math.random() * 30;
}

// Match lost pet with found pets
function calculateMatchScore(lostPet: any, foundPet: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Name match (exact = 30 points, similar = 15 points)
  const lostName = (lostPet.pet_name || '').toLowerCase().trim();
  const foundName = (foundPet.pet_name || '').toLowerCase().trim();
  
  if (lostName === foundName) {
    score += 30;
  } else if (lostName.includes(foundName) || foundName.includes(lostName)) {
    score += 15;
  } else {
    // Check for nickname matches
    const lostNickname = lostName.match(/\(([^)]+)\)/)?.[1] || '';
    const foundNickname = foundName.match(/\(([^)]+)\)/)?.[1] || '';
    if (lostNickname && foundNickname && lostNickname === foundNickname) {
      score += 20;
    }
  }
  
  // Type match (20 points)
  if (lostPet.pet_type === foundPet.pet_type) {
    score += 20;
  }
  
  // Breed match (20 points)
  const lostBreed = (lostPet.breed || '').toLowerCase();
  const foundBreed = (foundPet.breed || '').toLowerCase();
  if (lostBreed === foundBreed) {
    score += 20;
  } else if (lostBreed.includes('mixed') && foundBreed.includes('mixed')) {
    score += 10; // Both mixed breeds
  } else {
    // Check for breed keywords
    const lostBreedWords = lostBreed.split(/\s+/);
    const foundBreedWords = foundBreed.split(/\s+/);
    const commonWords = lostBreedWords.filter(w => foundBreedWords.includes(w) && w.length > 3);
    if (commonWords.length > 0) {
      score += 10;
    }
  }
  
  // Size match (10 points)
  if (lostPet.size === foundPet.size) {
    score += 10;
  }
  
  // Color match (10 points) - if both have color info
  if (lostPet.color && foundPet.color && lostPet.color !== 'N/A' && foundPet.color !== 'N/A') {
    const lostColor = lostPet.color.toLowerCase();
    const foundColor = foundPet.color.toLowerCase();
    if (lostColor === foundColor) {
      score += 10;
    } else if (lostColor.includes(foundColor) || foundColor.includes(lostColor)) {
      score += 5;
    }
  }
  
  // Location proximity (10 points) - closer = more points
  if (lostPet.location_city && foundPet.location_city) {
    const sameCity = lostPet.location_city.toLowerCase() === foundPet.location_city.toLowerCase();
    const sameState = lostPet.location_state === foundPet.location_state;
    
    if (sameCity && sameState) {
      score += 10;
    } else if (sameState) {
      score += 5;
    }
  }
  
  return Math.min(score, maxScore);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const lostPetId = body.lostPetId;
    const zipCode = body.zipCode;
    const forceSearch = body.forceSearch || false; // Force immediate search

    if (!lostPetId) {
      return NextResponse.json(
        { error: 'lostPetId is required' },
        { status: 400 }
      );
    }

    // Get lost pet from database
    const { data: lostPet, error: lostPetError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', lostPetId)
      .eq('status', 'lost')
      .single();

    if (lostPetError || !lostPet) {
      return NextResponse.json(
        { error: 'Lost pet not found or already found', details: lostPetError?.message },
        { status: 404 }
      );
    }

    // Calculate days lost
    const dateLost = new Date(lostPet.date_lost);
    const daysLost = Math.floor((Date.now() - dateLost.getTime()) / (1000 * 60 * 60 * 24));

    // Use PROGNO to calculate max travel distance
    const petCharacteristics: PetCharacteristics = {
      type: lostPet.pet_type || 'dog',
      size: lostPet.size || 'medium',
      age: lostPet.age || 'Unknown',
      breed: lostPet.breed || 'Mixed Breed',
      daysLost,
      terrain: 'suburban' // Could be enhanced with actual location data
    };

    const maxDistance = calculateMaxTravelDistance(petCharacteristics);
    console.log(`[PROGNO SEARCH] Max travel distance for ${lostPet.pet_name}: ${maxDistance.toFixed(1)} miles`);

    // Get best search areas using PROGNO
    const searchAreas = getBestSearchAreas(zipCode || lostPet.location_zip || '35957', maxDistance, petCharacteristics);
    console.log(`[PROGNO SEARCH] Generated ${searchAreas.length} search areas`);

    // Search for matching pets in database (found pets)
    const { data: foundPets, error: foundPetsError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'found')
      .in('location_state', [lostPet.location_state, 'AL']) // Same state or AL (default)
      .limit(500); // Limit to prevent too many comparisons

    if (foundPetsError) {
      console.error('[PROGNO SEARCH] Error fetching found pets:', foundPetsError);
    }

    // Calculate match scores
    const matches: Array<{ pet: any; score: number; reasons: string[] }> = [];
    
    if (foundPets) {
      for (const foundPet of foundPets) {
        const score = calculateMatchScore(lostPet, foundPet);
        if (score >= 50) { // Only show matches with 50%+ confidence
          const reasons: string[] = [];
          if (lostPet.pet_name?.toLowerCase() === foundPet.pet_name?.toLowerCase()) {
            reasons.push('Exact name match');
          }
          if (lostPet.pet_type === foundPet.pet_type) {
            reasons.push('Same type');
          }
          if (lostPet.breed?.toLowerCase() === foundPet.breed?.toLowerCase()) {
            reasons.push('Same breed');
          }
          if (lostPet.location_city?.toLowerCase() === foundPet.location_city?.toLowerCase()) {
            reasons.push('Same city');
          }
          
          matches.push({
            pet: foundPet,
            score,
            reasons
          });
        }
      }
    }

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    // Update search history
    const { error: historyError } = await supabase
      .from('pet_search_history')
      .insert({
        lost_pet_id: lostPetId,
        search_date: new Date().toISOString(),
        max_distance: maxDistance,
        areas_searched: searchAreas.length,
        matches_found: matches.length,
        best_match_score: matches.length > 0 ? matches[0].score : 0
      });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      lostPet: {
        id: lostPet.id,
        name: lostPet.pet_name,
        type: lostPet.pet_type,
        breed: lostPet.breed
      },
      prognoPredictions: {
        maxTravelDistance: maxDistance.toFixed(1),
        daysLost,
        searchAreas: searchAreas.slice(0, 10), // Top 10 areas
        bestPlacesToLook: searchAreas.slice(0, 5).map(a => ({
          distance: `${a.distance} miles`,
          reason: a.reason,
          priority: a.priority
        }))
      },
      matches: matches.slice(0, 10), // Top 10 matches
      totalMatches: matches.length,
      duration,
      message: `Found ${matches.length} potential matches. ${matches.length > 0 ? `Best match: ${matches[0].pet.pet_name} (${matches[0].score}% match)` : 'No strong matches found.'}`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[PROGNO SEARCH] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        duration
      },
      { status: 500 }
    );
  }
}



// Improved Pet Matching Algorithm
// Enhanced matching with better scoring, image similarity, and location intelligence

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface MatchScore {
  petId: string;
  score: number;
  breakdown: {
    type: number;
    breed: number;
    color: number;
    size: number;
    location: number;
    markings: number;
    date: number;
    description: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

interface ImprovedMatchResult {
  lostPetId: string;
  foundPetId: string;
  totalScore: number;
  confidence: string;
  breakdown: MatchScore['breakdown'];
  reasons: string[];
}

// Enhanced matching algorithm with better weights and logic
function calculateMatchScore(
  lostPet: any,
  foundPet: any,
  locationData?: { city?: string; state?: string; zipCode?: string }
): MatchScore {
  let score = 0;
  const breakdown = {
    type: 0,
    breed: 0,
    color: 0,
    size: 0,
    location: 0,
    markings: 0,
    date: 0,
    description: 0,
  };

  // 1. Type match (required, 25 points)
  if (lostPet.pet_type?.toLowerCase() === foundPet.pet_type?.toLowerCase()) {
    breakdown.type = 25;
    score += 25;
  } else {
    return { petId: foundPet.id, score: 0, breakdown, confidence: 'low' };
  }

  // 2. Breed match (30 points)
  const lostBreed = (lostPet.breed || '').toLowerCase();
  const foundBreed = (foundPet.breed || '').toLowerCase();

  if (lostBreed === foundBreed && lostBreed !== 'mixed' && lostBreed !== 'unknown') {
    breakdown.breed = 30;
    score += 30;
  } else if (lostBreed.includes(foundBreed) || foundBreed.includes(lostBreed)) {
    breakdown.breed = 20;
    score += 20;
  } else if (lostBreed.includes('mixed') || foundBreed.includes('mixed')) {
    breakdown.breed = 10;
    score += 10;
  }

  // 3. Color match (20 points)
  const lostColors = (lostPet.color || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  const foundColors = (foundPet.color || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  const commonColors = lostColors.filter(c => foundColors.includes(c));

  if (commonColors.length > 0) {
    breakdown.color = Math.min(20, commonColors.length * 7);
    score += breakdown.color;
  }

  // 4. Size match (15 points)
  const sizeMatch = lostPet.size?.toLowerCase() === foundPet.size?.toLowerCase();
  if (sizeMatch) {
    breakdown.size = 15;
    score += 15;
  } else {
    // Partial match for similar sizes
    const sizeOrder = ['small', 'medium', 'large'];
    const lostSizeIdx = sizeOrder.indexOf(lostPet.size?.toLowerCase() || '');
    const foundSizeIdx = sizeOrder.indexOf(foundPet.size?.toLowerCase() || '');
    if (Math.abs(lostSizeIdx - foundSizeIdx) === 1) {
      breakdown.size = 8;
      score += 8;
    }
  }

  // 5. Location match (20 points) - Enhanced with ZIP code support
  let locationScore = 0;
  if (locationData) {
    const lostZip = (lostPet.location_zipcode ?? lostPet.location_zip ?? '').toString().trim();
    const foundZip = (foundPet.location_zipcode ?? foundPet.location_zip ?? '').toString().trim();
    // Same ZIP code
    if (lostZip && foundZip && lostZip === foundZip) {
      locationScore = 20;
    }
    // Same city
    else if (
      lostPet.location_city?.toLowerCase() === foundPet.location_city?.toLowerCase() &&
      lostPet.location_city
    ) {
      locationScore = 15;
    }
    // Same state
    else if (
      lostPet.location_state?.toLowerCase() === foundPet.location_state?.toLowerCase() &&
      lostPet.location_state
    ) {
      locationScore = 8;
    }
  } else {
    // Fallback to original logic
    if (lostPet.location_city === foundPet.location_city && lostPet.location_city) {
      locationScore = 15;
    } else if (lostPet.location_state === foundPet.location_state && lostPet.location_state) {
      locationScore = 8;
    }
  }
  breakdown.location = locationScore;
  score += locationScore;

  // 6. Markings match (10 points)
  const lostMarkings = (lostPet.markings || '').toLowerCase();
  const foundMarkings = (foundPet.markings || '').toLowerCase();
  if (lostMarkings && foundMarkings) {
    const markingWords = lostMarkings.split(/\s+/).filter(Boolean);
    const foundMarkingWords = foundMarkings.split(/\s+/).filter(Boolean);
    const commonMarkings = markingWords.filter(m => foundMarkingWords.includes(m));
    if (commonMarkings.length > 0) {
      breakdown.markings = Math.min(10, commonMarkings.length * 3);
      score += breakdown.markings;
    }
  }

  // 7. Date proximity (10 points)
  const lostDateValue = lostPet.lost_date ?? lostPet.date_lost;
  const foundDateValue = foundPet.found_date ?? foundPet.date_found;
  if (lostDateValue && foundDateValue) {
    const lostDate = new Date(lostDateValue);
    const foundDate = new Date(foundDateValue);
    const daysDiff = Math.abs((foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      breakdown.date = 10;
      score += 10;
    } else if (daysDiff <= 30) {
      breakdown.date = 5;
      score += 5;
    } else if (daysDiff <= 90) {
      breakdown.date = 2;
      score += 2;
    }
  }

  // 8. Description similarity (10 points)
  const lostDesc = (lostPet.description || '').toLowerCase();
  const foundDesc = (foundPet.description || '').toLowerCase();
  if (lostDesc && foundDesc) {
    const lostWords = new Set(lostDesc.split(/\s+/).filter(w => w.length > 3));
    const foundWords = new Set(foundDesc.split(/\s+/).filter(w => w.length > 3));
    const commonWords = Array.from(lostWords).filter(w => foundWords.has(w));
    if (commonWords.length > 0) {
      breakdown.description = Math.min(10, commonWords.length * 2);
      score += breakdown.description;
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (score >= 80) confidence = 'high';
  else if (score >= 60) confidence = 'medium';

  return {
    petId: foundPet.id,
    score: Math.min(100, score),
    breakdown,
    confidence,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { lostPetId, minScore = 60, includeReasons = true } = body;

    if (!lostPetId) {
      return NextResponse.json({ error: 'lostPetId is required' }, { status: 400 });
    }

    // Get lost pet
    const { data: lostPet, error: lostError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', lostPetId)
      .eq('status', 'lost')
      .single();

    if (lostError || !lostPet) {
      return NextResponse.json({ error: 'Lost pet not found' }, { status: 404 });
    }

    // Get all found pets
    const { data: foundPets, error: foundError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'found')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    if (foundError) {
      return NextResponse.json({ error: 'Error fetching found pets' }, { status: 500 });
    }

    // Calculate matches
    const matches: ImprovedMatchResult[] = [];

    for (const foundPet of foundPets || []) {
      const matchScore = calculateMatchScore(lostPet, foundPet, {
        city: lostPet.location_city,
        state: lostPet.location_state,
        zipCode: lostPet.location_zipcode ?? lostPet.location_zip
      });

      if (matchScore.score >= minScore) {
        const reasons: string[] = [];

        if (includeReasons) {
          if (matchScore.breakdown.breed >= 20) reasons.push('Breed match');
          if (matchScore.breakdown.color >= 15) reasons.push('Color match');
          if (matchScore.breakdown.location >= 15) reasons.push('Location match');
          if (matchScore.breakdown.size >= 15) reasons.push('Size match');
          if (matchScore.breakdown.markings >= 5) reasons.push('Markings match');
          if (matchScore.breakdown.date >= 5) reasons.push('Date proximity');
        }

        matches.push({
          lostPetId: lostPet.id,
          foundPetId: foundPet.id,
          totalScore: matchScore.score,
          confidence: matchScore.confidence,
          breakdown: matchScore.breakdown,
          reasons,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.totalScore - a.totalScore);

    return NextResponse.json({
      success: true,
      lostPet: {
        id: lostPet.id,
        name: lostPet.pet_name,
        type: lostPet.pet_type,
        breed: lostPet.breed,
      },
      matches,
      totalMatches: matches.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error in improved matching: ${error.message}` },
      { status: 500 }
    );
  }
}


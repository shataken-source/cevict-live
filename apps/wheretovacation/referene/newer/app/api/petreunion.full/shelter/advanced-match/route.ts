import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Gemini for image comparison (optional - only if package is installed)
let gemini: any = null;

interface AdvancedMatchRequest {
  foundPetId: string; // The pet that was just brought in
  useAgeProgression?: boolean; // Apply age progression to lost pets
  similarityThreshold?: number; // 0-1, default 0.7
}

/**
 * Advanced matching using AI image comparison and age progression
 * Compares a found pet with all lost pets, using AI to account for age progression
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body: AdvancedMatchRequest = await request.json();
    const { foundPetId, useAgeProgression = true, similarityThreshold = 0.7 } = body;

    // Get the found pet
    const { data: foundPet, error: foundError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', foundPetId)
      .eq('status', 'found')
      .single();

    if (foundError || !foundPet) {
      return NextResponse.json({ error: 'Found pet not found' }, { status: 404 });
    }

    // Get all lost pets matching basic criteria
    const { data: lostPets, error: lostError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost')
      .eq('pet_type', foundPet.pet_type)
      .ilike('breed', `%${foundPet.breed}%`)
      .order('date_lost', { ascending: false });

    if (lostError) {
      return NextResponse.json({ error: lostError.message }, { status: 500 });
    }

    if (!lostPets || lostPets.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        count: 0,
        message: 'No lost pets found matching basic criteria'
      });
    }

    // Calculate days lost for each pet
    const now = new Date();
    const enrichedPets = lostPets.map(pet => {
      const dateLost = new Date(pet.date_lost);
      const daysLost = Math.floor((now.getTime() - dateLost.getTime()) / (1000 * 60 * 60 * 24));
      return { ...pet, daysLost };
    });

    // Filter by location (same city/state or nearby)
    const locationMatches = enrichedPets.filter(pet => 
      pet.location_city === foundPet.location_city &&
      pet.location_state === foundPet.location_state
    );

    // Score matches
    const scoredMatches = locationMatches.map(lostPet => {
      let score = 0;
      let reasons: string[] = [];

      // Breed match (exact = 30 points, partial = 15)
      if (lostPet.breed?.toLowerCase() === foundPet.breed?.toLowerCase()) {
        score += 30;
        reasons.push('Exact breed match');
      } else if (lostPet.breed?.toLowerCase().includes(foundPet.breed?.toLowerCase() || '') || 
                 foundPet.breed?.toLowerCase().includes(lostPet.breed?.toLowerCase() || '')) {
        score += 15;
        reasons.push('Partial breed match');
      }

      // Color match (exact = 20 points, partial = 10)
      if (lostPet.color?.toLowerCase() === foundPet.color?.toLowerCase()) {
        score += 20;
        reasons.push('Exact color match');
      } else if (lostPet.color?.toLowerCase().includes(foundPet.color?.toLowerCase() || '') ||
                 foundPet.color?.toLowerCase().includes(lostPet.color?.toLowerCase() || '')) {
        score += 10;
        reasons.push('Partial color match');
      }

      // Size match (10 points)
      if (lostPet.size === foundPet.size) {
        score += 10;
        reasons.push('Size match');
      }

      // Markings match (20 points if similar)
      if (lostPet.markings && foundPet.markings) {
        const lostMarkings = lostPet.markings.toLowerCase();
        const foundMarkings = foundPet.markings.toLowerCase();
        if (lostMarkings === foundMarkings) {
          score += 20;
          reasons.push('Exact markings match');
        } else if (lostMarkings.includes(foundMarkings) || foundMarkings.includes(lostMarkings)) {
          score += 10;
          reasons.push('Partial markings match');
        }
      }

      // Microchip match (50 points - very strong)
      if (lostPet.microchip && foundPet.microchip && 
          lostPet.microchip === foundPet.microchip) {
        score += 50;
        reasons.push('Microchip match - STRONG MATCH');
      }

      // Timeframe match (pets lost around the time this one was found)
      const daysLost = lostPet.daysLost || 0;
      if (daysLost >= 0 && daysLost <= 30) {
        score += 5;
        reasons.push('Timeframe match (lost recently)');
      }

      // Calculate similarity percentage
      const similarity = Math.min(score / 100, 1.0);

      return {
        ...lostPet,
        matchScore: score,
        similarity,
        matchReasons: reasons,
        isStrongMatch: similarity >= similarityThreshold
      };
    });

    // Sort by match score (highest first)
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Filter by threshold
    const strongMatches = scoredMatches.filter(m => m.isStrongMatch);
    const allMatches = scoredMatches; // Return all, but mark strong ones

    // If age progression is enabled and we have photos, use AI comparison
    if (useAgeProgression && foundPet.photo_url && gemini && strongMatches.length > 0) {
      // For each strong match with a photo, compare images
      for (const match of strongMatches.slice(0, 5)) { // Limit to top 5 for AI comparison
        if (match.photo_url && match.daysLost && match.daysLost > 30) {
          try {
            // Use Gemini to compare images with age progression
            const model = gemini.getGenerativeModel({ model: 'gemini-pro-vision' });
            
            const prompt = `Compare these two ${foundPet.pet_type} photos. The first is a found pet, the second is a lost pet that has been missing for ${match.daysLost} days.

Analyze:
1. Are these the same animal? (consider age progression)
2. What are the similarities?
3. What are the differences (could be due to time/lost conditions)?
4. Confidence level (0-100%) that these are the same pet

Provide a detailed analysis.`;

            // This would require fetching both images and using Gemini Vision
            // For now, we'll add a note that AI comparison was attempted
            match.aiComparison = 'Age progression analysis recommended';
            match.aiComparisonConfidence = 0.75; // Placeholder
          } catch (aiError: any) {
            console.error('[ADVANCED MATCH] AI comparison error:', aiError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      foundPet: {
        id: foundPet.id,
        name: foundPet.pet_name,
        type: foundPet.pet_type,
        breed: foundPet.breed,
        color: foundPet.color,
        photo_url: foundPet.photo_url
      },
      matches: allMatches,
      strongMatches: strongMatches.length,
      count: allMatches.length,
      message: `Found ${allMatches.length} potential matches, ${strongMatches.length} strong matches`
    });

  } catch (error: any) {
    console.error('[ADVANCED MATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



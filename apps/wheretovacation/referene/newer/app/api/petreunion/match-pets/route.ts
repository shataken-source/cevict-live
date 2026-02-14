import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createError, handleDatabaseError, getSafeErrorResponse, ErrorCode, withErrorHandling } from '@/lib/errors/error-handler';
import { rateLimitMiddleware } from '@/lib/security/rate-limit';
import { validatePagination } from '@/lib/security/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface PetMatch {
  lostPetId: string;
  foundPetId: string;
  matchScore: number;
  reasons: string[];
}

// Calculate distance between two locations (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

// Calculate match score between lost and found pet
function calculateMatchScore(lostPet: any, foundPet: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Type match (required) - 20 points
  if (lostPet.pet_type === foundPet.pet_type) {
    score += 20;
    reasons.push(`Same type: ${lostPet.pet_type}`);
  } else {
    return { score: 0, reasons: ['Different pet types'] }; // No match if different types
  }
  
  // Breed match - 30 points
  const lostBreed = normalizeText(lostPet.breed || '');
  const foundBreed = normalizeText(foundPet.breed || '');
  
  if (lostBreed === foundBreed) {
    score += 30;
    reasons.push(`Exact breed match: ${lostPet.breed}`);
  } else if (lostBreed.includes(foundBreed) || foundBreed.includes(lostBreed)) {
    score += 20;
    reasons.push(`Partial breed match: ${lostPet.breed} / ${foundPet.breed}`);
  } else if (lostBreed.includes('mix') || foundBreed.includes('mix') || 
             lostBreed.includes('mixed') || foundBreed.includes('mixed')) {
    score += 10;
    reasons.push('Mixed breed - possible match');
  }
  
  // Color match - 20 points
  const lostColor = normalizeText(lostPet.color || '');
  const foundColor = normalizeText(foundPet.color || '');
  
  if (lostColor === foundColor && lostColor !== 'n/a' && lostColor !== 'unknown') {
    score += 20;
    reasons.push(`Color match: ${lostPet.color}`);
  } else if (lostColor && foundColor && 
             (lostColor.includes(foundColor) || foundColor.includes(lostColor))) {
    score += 10;
    reasons.push(`Partial color match: ${lostPet.color} / ${foundPet.color}`);
  }
  
  // Size match - 15 points
  if (lostPet.size === foundPet.size && lostPet.size) {
    score += 15;
    reasons.push(`Size match: ${lostPet.size}`);
  }
  
  // Location proximity - 15 points
  if (lostPet.location_city && foundPet.location_city) {
    const cityMatch = normalizeText(lostPet.location_city) === normalizeText(foundPet.location_city);
    const stateMatch = lostPet.location_state === foundPet.location_state;
    
    if (cityMatch && stateMatch) {
      score += 15;
      reasons.push(`Same city: ${lostPet.location_city}, ${lostPet.location_state}`);
    } else if (stateMatch) {
      score += 8;
      reasons.push(`Same state: ${lostPet.location_state}`);
    }
  }
  
  // Description keywords - 10 points
  const lostDesc = normalizeText(lostPet.description || '');
  const foundDesc = normalizeText(foundPet.description || '');
  
  const lostKeywords = lostDesc.split(/\s+/).filter(w => w.length > 3);
  const foundKeywords = foundDesc.split(/\s+/).filter(w => w.length > 3);
  const commonKeywords = lostKeywords.filter(k => foundKeywords.includes(k));
  
  if (commonKeywords.length > 0) {
    score += Math.min(commonKeywords.length * 2, 10);
    reasons.push(`Shared keywords: ${commonKeywords.slice(0, 3).join(', ')}`);
  }
  
  // Markings match - 10 points
  if (lostPet.markings && foundPet.markings) {
    const lostMarkings = normalizeText(lostPet.markings);
    const foundMarkings = normalizeText(foundPet.markings);
    
    if (lostMarkings === foundMarkings) {
      score += 10;
      reasons.push('Markings match');
    } else if (lostMarkings && foundMarkings && 
               (lostMarkings.includes(foundMarkings) || foundMarkings.includes(lostMarkings))) {
      score += 5;
      reasons.push('Partial markings match');
    }
  }
  
  // Date proximity - 5 points (if found within 30 days of lost)
  if (lostPet.date_lost && foundPet.date_found) {
    const lostDate = new Date(lostPet.date_lost);
    const foundDate = new Date(foundPet.date_found);
    const daysDiff = Math.abs((foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) {
      score += 5;
      reasons.push(`Found within 7 days of lost date`);
    } else if (daysDiff <= 30) {
      score += 3;
      reasons.push(`Found within 30 days of lost date`);
    }
  }
  
  return { score: Math.min(score, 100), reasons };
}

// Find matches between lost and found pets
async function findMatches(minScore: number = 60): Promise<PetMatch[]> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  // Get all lost pets
  const { data: lostPets, error: lostError } = await supabase
    .from('lost_pets')
    .select('*')
    .eq('status', 'lost');
  
  if (lostError) throw lostError;
  
  // Get all found pets
  const { data: foundPets, error: foundError } = await supabase
    .from('lost_pets')
    .select('*')
    .eq('status', 'found');
  
  if (foundError) throw foundError;
  
  if (!lostPets || !foundPets) {
    return [];
  }
  
  const matches: PetMatch[] = [];
  
  // Compare each lost pet with each found pet
  for (const lostPet of lostPets) {
    for (const foundPet of foundPets) {
      const { score, reasons } = calculateMatchScore(lostPet, foundPet);
      
      if (score >= minScore) {
        matches.push({
          lostPetId: lostPet.id,
          foundPetId: foundPet.id,
          matchScore: score,
          reasons
        });
      }
    }
  }
  
  // Sort by match score (highest first)
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  return matches;
}

// Save matches to database
async function saveMatches(matches: PetMatch[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const match of matches) {
    try {
      // Check if match already exists
      const { data: existing } = await supabase
        .from('pet_matches')
        .select('id')
        .eq('lost_pet_id', match.lostPetId)
        .eq('found_pet_id', match.foundPetId)
        .single();
      
      if (existing) {
        // Update existing match with new score
        const { error: updateError } = await supabase
          .from('pet_matches')
          .update({
            match_score: match.matchScore,
            match_reasons: match.reasons,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) {
          errors++;
        } else {
          saved++;
        }
      } else {
        // Create new match
        const { error: insertError } = await supabase
          .from('pet_matches')
          .insert({
            lost_pet_id: match.lostPetId,
            found_pet_id: match.foundPetId,
            match_score: match.matchScore,
            match_reasons: match.reasons,
            status: 'pending', // 'pending', 'contacted', 'reunited', 'not_match'
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`[MATCH] Error saving match:`, insertError.message);
          errors++;
        } else {
          saved++;
        }
      }
    } catch (error: any) {
      console.error(`[MATCH] Error processing match:`, error.message);
      errors++;
    }
  }
  
  return { saved, skipped, errors };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimit = rateLimitMiddleware({ windowMs: 60 * 1000, maxRequests: 10 });
  const { allowed, headers } = rateLimit(request);
  
  if (!allowed) {
    const error = createError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests. Please try again later.');
    return NextResponse.json(
      getSafeErrorResponse(error),
      { status: error.statusCode, headers: Object.fromEntries(headers) }
    );
  }
  
  if (!supabase) {
    const error = createError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Database not configured',
      undefined,
      503
    );
    return NextResponse.json(
      getSafeErrorResponse(error),
      { status: error.statusCode }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    
    // Validate and sanitize inputs
    const minScore = Math.max(0, Math.min(100, Math.floor(body.minScore) || 60));
    const shouldSave = body.saveMatches !== false;

    console.log(`[MATCH] Starting pet matching...`);
    console.log(`[MATCH] Minimum score: ${minScore}`);

    // Find matches
    const matches = await findMatches(minScore);
    console.log(`[MATCH] Found ${matches.length} potential matches`);

    // Save matches if requested
    let saveResult = { saved: 0, skipped: 0, errors: 0 };
    if (shouldSave && matches.length > 0) {
      console.log(`[MATCH] Saving matches to database...`);
      saveResult = await saveMatches(matches);
      console.log(`[MATCH] Saved ${saveResult.saved} matches, ${saveResult.errors} errors`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      matches: matches.slice(0, 20), // Return top 20 matches
      summary: {
        totalMatches: matches.length,
        saved: saveResult.saved,
        skipped: saveResult.skipped,
        errors: saveResult.errors,
        duration
      },
      message: `Found ${matches.length} potential matches, saved ${saveResult.saved} to database`
    }, {
      headers: Object.fromEntries(headers)
    });

  } catch (error: any) {
    // If it's already an AppError, use it
    if (error.code && error.statusCode) {
      return NextResponse.json(
        getSafeErrorResponse(error),
        { status: error.statusCode }
      );
    }
    
    // Handle database errors
    if (error.code && (error.code.startsWith('PGRST') || error.code.startsWith('42'))) {
      const dbError = handleDatabaseError(error);
      return NextResponse.json(
        getSafeErrorResponse(dbError),
        { status: dbError.statusCode }
      );
    }
    
    // Generic error
    const appError = createError(
      ErrorCode.INTERNAL_ERROR,
      'Matching failed',
      process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
    );
    
    return NextResponse.json(
      getSafeErrorResponse(appError),
      { status: appError.statusCode }
    );
  }
});

// GET endpoint for health check
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: matchCount } = await supabase
      .from('pet_matches')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      totalMatches: matchCount || 0,
      message: 'Pet matching system is ready'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


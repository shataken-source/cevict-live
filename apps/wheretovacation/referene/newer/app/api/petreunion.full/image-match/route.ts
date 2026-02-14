import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Google Vision API for image analysis
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_API_KEY;

interface ImageMatchRequest {
  image: string; // Base64 encoded image or URL
  pet_type?: 'dog' | 'cat';
  location_city?: string;
  location_state?: string;
  maxResults?: number;
}

interface PetMatch {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  photo_url: string | null;
  matchScore: number;
  matchReasons: string[];
  location_city: string;
  location_state: string;
  date_lost?: string;
  status: string;
}

/**
 * Extract visual features from pet image using Google Vision API
 * This analyzes the image for:
 * - Animal detection (dog/cat)
 * - Breed recognition
 * - Color detection
 * - Distinctive markings/features
 */
async function analyzePetImage(imageData: string): Promise<{
  animalType?: 'dog' | 'cat';
  breed?: string;
  colors?: string[];
  features?: string[];
  confidence?: number;
}> {
  if (!GOOGLE_VISION_API_KEY) {
    console.log('[IMAGE MATCH] No Google Vision API key, using basic matching');
    return {};
  }

  try {
    // Convert base64 to format Google Vision expects
    let imageContent: string;
    if (imageData.startsWith('data:')) {
      // Extract base64 from data URL
      imageContent = imageData.split(',')[1];
    } else if (imageData.startsWith('http')) {
      // For URLs, use imageUri
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageData } },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'IMAGE_PROPERTIES' }
            ]
          }]
        })
      });

      const result = await response.json();
      if (result.responses?.[0]?.labelAnnotations) {
        const labels = result.responses[0].labelAnnotations;
        const animalLabels = labels.filter((l: any) =>
          l.description.toLowerCase().includes('dog') ||
          l.description.toLowerCase().includes('cat') ||
          l.description.toLowerCase().includes('puppy') ||
          l.description.toLowerCase().includes('kitten')
        );

        if (animalLabels.length > 0) {
          const topLabel = animalLabels[0];
          return {
            animalType: topLabel.description.toLowerCase().includes('dog') ? 'dog' : 'cat',
            confidence: topLabel.score
          };
        }
      }
      return {};
    } else {
      imageContent = imageData;
    }

    // For base64 images
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageContent },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES' }
          ]
        }]
      })
    });

    const result = await response.json();

    if (result.responses?.[0]?.error) {
      console.error('[IMAGE MATCH] Vision API error:', result.responses[0].error);
      return {};
    }

    const labels = result.responses[0].labelAnnotations || [];
    const colors = result.responses[0].imagePropertiesAnnotation?.dominantColors?.colors || [];

    // Extract animal type
    const animalLabels = labels.filter((l: any) =>
      l.description.toLowerCase().includes('dog') ||
      l.description.toLowerCase().includes('cat') ||
      l.description.toLowerCase().includes('puppy') ||
      l.description.toLowerCase().includes('kitten')
    );

    // Extract breed hints
    const breedLabels = labels.filter((l: any) => {
      const desc = l.description.toLowerCase();
      return desc.includes('retriever') || desc.includes('shepherd') ||
        desc.includes('terrier') || desc.includes('bulldog') ||
        desc.includes('poodle') || desc.includes('beagle') ||
        desc.includes('husky') || desc.includes('labrador');
    });

    // Extract colors
    const detectedColors = colors
      .slice(0, 3)
      .map((c: any) => {
        const rgb = c.color;
        // Convert RGB to color name (simplified)
        if (rgb.red > 200 && rgb.green > 200 && rgb.blue > 200) return 'white';
        if (rgb.red < 50 && rgb.green < 50 && rgb.blue < 50) return 'black';
        if (rgb.red > rgb.green && rgb.red > rgb.blue) return 'brown';
        if (rgb.green > rgb.red && rgb.green > rgb.blue) return 'green';
        return null;
      })
      .filter(Boolean) as string[];

    return {
      animalType: animalLabels[0]?.description.toLowerCase().includes('dog') ? 'dog' :
        animalLabels[0]?.description.toLowerCase().includes('cat') ? 'cat' : undefined,
      breed: breedLabels[0]?.description,
      colors: detectedColors,
      confidence: animalLabels[0]?.score || 0
    };
  } catch (error: any) {
    console.error('[IMAGE MATCH] Error analyzing image:', error.message);
    return {};
  }
}

/**
 * Calculate visual similarity score between two pet images
 * Uses basic feature matching (can be enhanced with ML models)
 */
function calculateVisualSimilarity(
  image1Features: any,
  image2Features: any,
  pet1: any,
  pet2: any
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Animal type match (critical - must match)
  if (pet1.pet_type && pet2.pet_type && pet1.pet_type === pet2.pet_type) {
    score += 30;
    reasons.push(`Both are ${pet1.pet_type}s`);
  } else if (pet1.pet_type && pet2.pet_type) {
    // Type mismatch - significant penalty but don't exclude completely
    score -= 20;
  }

  // Breed match (very important)
  const breed1 = (pet1.breed || '').toLowerCase().trim();
  const breed2 = (pet2.breed || '').toLowerCase().trim();
  if (breed1 && breed2) {
    if (breed1 === breed2) {
      score += 25;
      reasons.push(`Same breed: ${pet2.breed}`);
    } else if (breed1.includes(breed2) || breed2.includes(breed1)) {
      score += 15;
      reasons.push(`Similar breed: ${pet1.breed} vs ${pet2.breed}`);
    } else {
      // Check for partial matches (e.g., "labrador" vs "lab")
      const breed1Words = breed1.split(/\s+/);
      const breed2Words = breed2.split(/\s+/);
      const commonWords = breed1Words.filter((w: string) =>
        breed2Words.some((w2: string) => w2.includes(w) || w.includes(w2)) && w.length > 3
      );
      if (commonWords.length > 0) {
        score += 10;
        reasons.push(`Breed keywords match: ${commonWords.join(', ')}`);
      }
    }
  }

  // Color match (important)
  const color1 = (pet1.color || '').toLowerCase().trim();
  const color2 = (pet2.color || '').toLowerCase().trim();
  if (color1 && color2 && color1 !== 'unknown' && color2 !== 'unknown') {
    if (color1 === color2) {
      score += 20;
      reasons.push(`Same color: ${pet2.color}`);
    } else if (color1.includes(color2) || color2.includes(color1)) {
      score += 10;
      reasons.push(`Similar color: ${pet1.color} vs ${pet2.color}`);
    } else {
      // Check for multi-color matches (e.g., "black and white" vs "white and black")
      const color1Words = color1.split(/\s+/);
      const color2Words = color2.split(/\s+/);
      const matchingColors = color1Words.filter((c: string) =>
        color2Words.includes(c) && c.length > 2
      );
      if (matchingColors.length > 0) {
        score += 8;
        reasons.push(`Color keywords match: ${matchingColors.join(', ')}`);
      }
    }
  }

  // Size match
  if (pet1.size && pet2.size && pet1.size === pet2.size) {
    score += 10;
    reasons.push(`Same size: ${pet2.size}`);
  }

  // Markings match (very distinctive)
  if (pet1.markings && pet2.markings) {
    const markings1 = pet1.markings.toLowerCase();
    const markings2 = pet2.markings.toLowerCase();
    // Simple keyword matching
    const commonWords = markings1.split(/\s+/).filter((w: string) =>
      markings2.includes(w) && w.length > 3
    );
    if (commonWords.length > 0) {
      score += 15;
      reasons.push(`Similar markings: ${commonWords.join(', ')}`);
    }
  }

  // Description match (distinctive features)
  if (pet1.description && pet2.description) {
    const desc1 = pet1.description.toLowerCase();
    const desc2 = pet2.description.toLowerCase();
    // Look for distinctive keywords (longer words are more distinctive)
    const desc1Words = desc1.split(/\s+/).filter((w: string) => w.length > 4);
    const desc2Words = desc2.split(/\s+/).filter((w: string) => w.length > 4);
    const commonDistinctive = desc1Words.filter((w: string) => desc2Words.includes(w));
    if (commonDistinctive.length > 0) {
      score += Math.min(commonDistinctive.length * 2, 12);
      reasons.push(`Description keywords match: ${commonDistinctive.slice(0, 3).join(', ')}`);
    }
  }

  // Location proximity (bonus - pets can travel)
  if (pet1.location_city && pet2.location_city &&
    pet1.location_city === pet2.location_city &&
    pet1.location_state === pet2.location_state) {
    score += 10;
    reasons.push(`Same location: ${pet2.location_city}, ${pet2.location_state}`);
  } else if (pet1.location_state && pet2.location_state &&
    pet1.location_state === pet2.location_state) {
    score += 5;
    reasons.push(`Same state: ${pet2.location_state}`);
  }

  // Image analysis features (if available)
  if (image1Features && image2Features) {
    if (image1Features.animalType === image2Features.animalType) {
      score += 5;
    }
    if (image1Features.colors && image2Features.colors) {
      const commonColors = image1Features.colors.filter((c: string) =>
        image2Features.colors.includes(c)
      );
      if (commonColors.length > 0) {
        score += 5;
        reasons.push(`Image colors match: ${commonColors.join(', ')}`);
      }
    }
  }

  return { score: Math.min(Math.max(score, 0), 100), reasons }; // Ensure score is 0-100
}

/**
 * POST /api/petreunion/image-match
 * Match a pet image against the database
 */
export async function POST(request: NextRequest) {
  try {
    const requestId = request.headers.get('x-request-id') || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (contentLength && Number.isFinite(contentLength) && contentLength > 2_500_000) {
      return NextResponse.json(
        { error: 'Request too large', requestId },
        { status: 413 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured', requestId },
        { status: 500 }
      );
    }

    const body: ImageMatchRequest = await request.json();
    const { image, pet_type, location_city, location_state, maxResults = 20 } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required', requestId },
        { status: 400 }
      );
    }

    if (typeof image === 'string' && image.startsWith('data:image') && image.length > 2_500_000) {
      return NextResponse.json(
        { error: 'Image too large', requestId },
        { status: 413 }
      );
    }

    console.log('[IMAGE MATCH] Starting image analysis...');

    // Analyze the uploaded image
    const imageFeatures = await analyzePetImage(image);

    // Build query to find potential matches
    // Match against BOTH lost and found pets (user might upload found pet to match against lost, or vice versa)
    let query = supabase
      .from('lost_pets')
      .select('*')
      .in('status', ['lost', 'found']); // Match against both lost and found pets

    // Filter by pet type if detected or provided
    const detectedType = imageFeatures.animalType || pet_type;
    if (detectedType) {
      query = query.eq('pet_type', detectedType);
    }

    // Filter by location if provided (but don't restrict too much - pets can travel)
    if (location_city) {
      query = query.ilike('location_city', `%${location_city}%`);
    }
    if (location_state) {
      query = query.eq('location_state', location_state);
    }

    // Get all potential matches
    const { data: allPets, error: queryError } = await query;

    if (queryError) {
      console.error('[IMAGE MATCH] Query error:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message, requestId },
        { status: 500 }
      );
    }

    if (!allPets || allPets.length === 0) {
      return NextResponse.json({
        requestId,
        matches: [],
        message: 'No pets found in database to match against',
        imageAnalysis: imageFeatures
      });
    }

    console.log(`[IMAGE MATCH] Found ${allPets.length} potential matches, analyzing...`);

    // Calculate similarity scores for each pet
    // Also consider age progression for pets lost for a while
    const now = new Date();
    const matches: PetMatch[] = await Promise.all(
      allPets
        .filter((pet: any) => pet.photo_url) // Only pets with photos
        .map(async (pet: any) => {
          // Calculate days lost (for age progression)
          let daysLost = 0;
          let ageProgressionDescription = '';

          if (pet.date_lost && pet.status === 'lost') {
            const dateLost = new Date(pet.date_lost);
            daysLost = Math.floor((now.getTime() - dateLost.getTime()) / (1000 * 60 * 60 * 24));

            // If pet has been lost for 30+ days, consider age progression
            if (daysLost >= 30) {
              try {
                // Get age progression description if available
                // Check if description already contains age progression info
                if (pet.description && pet.description.includes('[Age Progression')) {
                  const match = pet.description.match(/\[Age Progression after \d+ days: ([^\]]+)\]/);
                  if (match) {
                    ageProgressionDescription = match[1];
                  }
                } else {
                  // Could call age progression API here, but for performance, we'll use description
                  // In production, you might want to pre-compute age progressions
                  ageProgressionDescription = `Pet has been lost for ${daysLost} days (${Math.floor(daysLost / 30)} months). Appearance may have changed.`;
                }
              } catch (e) {
                // Age progression not critical, continue without it
              }
            }
          }

          // Extract all available pet data for matching
          const petData = {
            pet_type: pet.pet_type || '',
            breed: pet.breed || '',
            color: pet.color || '',
            size: pet.size || '',
            markings: pet.markings || '',
            description: pet.description || '',
            location_city: pet.location_city || '',
            location_state: pet.location_state || '',
            ageProgression: ageProgressionDescription
          };

          // Calculate similarity using ALL available data
          const similarity = calculateVisualSimilarity(
            imageFeatures,
            null, // Could analyze pet.photo_url here
            {
              pet_type: detectedType || '',
              breed: imageFeatures.breed || '',
              color: imageFeatures.colors?.[0] || '',
              size: '',
              markings: '',
              description: ''
            },
            petData
          );

          // Boost score if age progression matches description keywords
          if (ageProgressionDescription && imageFeatures.features) {
            const progressionKeywords = ageProgressionDescription.toLowerCase();
            const imageKeywords = imageFeatures.features.join(' ').toLowerCase();
            const commonKeywords = progressionKeywords.split(' ').filter((word: string) =>
              word.length > 4 && imageKeywords.includes(word)
            );
            if (commonKeywords.length > 0) {
              similarity.score += Math.min(commonKeywords.length * 5, 15);
              similarity.reasons.push(`Age progression matches: ${commonKeywords.slice(0, 2).join(', ')}`);
            }
          }

          // Boost score for description matches (distinctive features)
          if (pet.description && imageFeatures.features) {
            const descLower = pet.description.toLowerCase();
            const matchingFeatures = imageFeatures.features.filter((feature: string) =>
              descLower.includes(feature.toLowerCase())
            );
            if (matchingFeatures.length > 0) {
              similarity.score += Math.min(matchingFeatures.length * 3, 10);
              similarity.reasons.push(`Description matches: ${matchingFeatures.slice(0, 2).join(', ')}`);
            }
          }

          return {
            id: pet.id,
            pet_name: pet.pet_name,
            pet_type: pet.pet_type,
            breed: pet.breed,
            color: pet.color,
            photo_url: pet.photo_url,
            matchScore: Math.min(similarity.score, 100), // Cap at 100
            matchReasons: similarity.reasons,
            location_city: pet.location_city,
            location_state: pet.location_state,
            date_lost: pet.date_lost,
            status: pet.status,
            daysLost: daysLost > 0 ? daysLost : undefined
          };
        })
    );

    // Filter and sort matches
    const filteredMatches = matches
      .filter((match: PetMatch) => match.matchScore >= 30) // Only show matches with 30%+ similarity
      .sort((a: PetMatch, b: PetMatch) => b.matchScore - a.matchScore)
      .slice(0, maxResults);

    // Separate strong matches (70%+) from regular matches
    const strongMatches = filteredMatches.filter(m => m.matchScore >= 70);
    const regularMatches = filteredMatches.filter(m => m.matchScore < 70);

    console.log(`[IMAGE MATCH] Found ${filteredMatches.length} matches (${strongMatches.length} strong)`);

    return NextResponse.json({
      success: true,
      requestId,
      matches: filteredMatches,
      strongMatches: strongMatches,
      regularMatches: regularMatches,
      totalAnalyzed: allPets.length,
      imageAnalysis: imageFeatures,
      message: `Found ${filteredMatches.length} potential match${filteredMatches.length !== 1 ? 'es' : ''}`
    });

  } catch (error: any) {
    console.error('[IMAGE MATCH] Error:', error);
    return NextResponse.json(
      {
        error: 'Image matching failed',
        message: error.message,
        requestId: request.headers.get('x-request-id') || null,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



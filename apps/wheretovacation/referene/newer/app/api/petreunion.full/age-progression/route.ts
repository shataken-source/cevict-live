import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Gemini AI for age progression (optional - only if package is installed)
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const gemini = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export const runtime = 'nodejs';

interface AgeProgressionRequest {
  petId: string;
  photoUrl: string;
  daysLost: number; // How many days the pet has been lost
  petType: 'dog' | 'cat';
  breed?: string;
  originalAge?: string; // e.g., "2 years", "6 months"
  originalDescription?: string; // Original pet description
}

interface AgeProgressionUIRequest {
  imageUrl?: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  monthsSinceLoss: number;
  petType: 'dog' | 'cat';
  breed?: string;
  petName?: string;
}

function buildFallbackProgressions(params: {
  monthsSinceLoss: number;
  petType: 'dog' | 'cat';
  breed?: string;
}) {
  const { monthsSinceLoss, petType, breed } = params;
  const breedPart = breed ? ` ${breed}` : '';

  const nowChanges = [
    monthsSinceLoss >= 1
      ? 'Likely subtle coat and body condition changes'
      : 'Minimal visible changes',
    monthsSinceLoss >= 3
      ? 'Face may appear slightly more mature; coat texture may shift'
      : 'Small changes in posture or expression',
    monthsSinceLoss >= 6
      ? 'If young at the time, noticeable growth and proportional changes'
      : 'Stable size; possible seasonal coat differences'
  ];

  const futureChanges = [
    'More pronounced aging in facial features and coat (especially around muzzle)'
  ];

  const clampedMonths = Number.isFinite(monthsSinceLoss) ? Math.max(0, Math.floor(monthsSinceLoss)) : 0;
  const futureMonths = clampedMonths + 12;

  return [
    {
      months: 0,
      stage: 'Original photo',
      estimatedAge: 'Unknown',
      description: `Reference appearance for this ${petType}${breedPart}.`,
      changes: ['Baseline reference image'],
      imageUrl: null
    },
    {
      months: clampedMonths,
      stage: `Now (~${clampedMonths} month${clampedMonths === 1 ? '' : 's'} later)`,
      estimatedAge: 'Unknown (+time since loss)',
      description: `Estimated appearance changes for a ${petType}${breedPart} after ~${clampedMonths} month${clampedMonths === 1 ? '' : 's'}.`,
      changes: nowChanges,
      imageUrl: null
    },
    {
      months: futureMonths,
      stage: `1 year from now (~${futureMonths} months since loss)`,
      estimatedAge: 'Unknown (+additional time)',
      description: `Projected changes if additional time passes for this ${petType}${breedPart}.`,
      changes: futureChanges,
      imageUrl: null
    }
  ];
}

/**
 * Uses AI to age-progress a pet photo
 * This helps shelters match found pets with lost pets that have been missing for a while
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const isLegacyRequest = typeof body?.petId === 'string' || typeof body?.photoUrl === 'string' || typeof body?.daysLost === 'number';
    const isUIRequest = typeof body?.monthsSinceLoss === 'number' || typeof body?.imageUrl === 'string' || typeof body?.imageBase64 === 'string';

    if (!isLegacyRequest && !isUIRequest) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const legacy = body as Partial<AgeProgressionRequest>;
    const ui = body as Partial<AgeProgressionUIRequest>;

    const petType = (legacy.petType || ui.petType) as 'dog' | 'cat' | undefined;
    const breed = legacy.breed || ui.breed;
    const petId = legacy.petId;
    const photoUrl = legacy.photoUrl || ui.imageUrl || '';
    const daysLost = legacy.daysLost;
    const monthsSinceLoss = typeof ui.monthsSinceLoss === 'number'
      ? ui.monthsSinceLoss
      : (typeof daysLost === 'number' ? Math.floor(daysLost / 30) : undefined);
    const originalAge = legacy.originalAge;
    const originalDescription = legacy.originalDescription;

    if (!petType) {
      return NextResponse.json(
        { error: 'Missing required field: petType' },
        { status: 400 }
      );
    }

    if (!photoUrl && !ui.imageBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl/photoUrl or imageBase64' },
        { status: 400 }
      );
    }

    if (typeof monthsSinceLoss !== 'number' || !Number.isFinite(monthsSinceLoss)) {
      return NextResponse.json(
        { error: 'Missing required field: monthsSinceLoss (or daysLost for legacy callers)' },
        { status: 400 }
      );
    }

    // Calculate age progression
    const monthsLost = Math.max(0, Math.floor(monthsSinceLoss));
    const yearsLost = Math.floor(monthsLost / 12);
    const daysLostResolved = typeof daysLost === 'number' ? daysLost : monthsLost * 30;

    // Use Gemini Vision API to analyze and age-progress the image
    const progressions = buildFallbackProgressions({ monthsSinceLoss: monthsLost, petType, breed });

    const prompt = `You are a veterinary AI assistant. Analyze this ${petType} photo and create an age-progressed version.

Original pet info:
- Type: ${petType}
${breed ? `- Breed: ${breed}` : ''}
${originalAge ? `- Original age: ${originalAge}` : ''}
- Time lost: ${daysLostResolved} days (${monthsLost} months, ${yearsLost} years)

Please describe how this ${petType} would look after ${daysLostResolved} days:
1. Size changes (if young, would have grown)
2. Coat changes (color, length, pattern)
3. Facial features (muzzle, eyes, ears)
4. Body condition (weight, muscle)
5. Overall appearance

Provide a detailed description that can be used to match this pet with found pets. Focus on distinctive features that would still be recognizable.`;

    try {
      if (!gemini) {
        const fallbackDescription = `After ${daysLostResolved} days (${monthsLost} months), this ${petType}${breed ? ` ${breed}` : ''} would likely show:
- ${monthsLost > 6 ? 'Significant growth if young, or weight changes if older' : 'Minor changes in size and condition'}
- Possible coat changes (dirt, matting, or natural shedding)
- Facial features may appear more mature or weathered
- Body condition may vary depending on environment and care received`;

        return NextResponse.json({
          success: true,
          progressions,
          ageProgressionDescription: fallbackDescription,
          daysLost: daysLostResolved,
          monthsLost,
          yearsLost,
          fallback: true,
          message: 'Age progression analysis complete (using fallback method)'
        });
      }

      // For Gemini Vision, we need to fetch the image and convert it
      // For now, we'll use text-based analysis and return a description
      // In production, you'd use Gemini's vision capabilities with base64 image

      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });

      let inlineDataBase64: string;
      let inlineMimeType: string = (ui.imageMimeType || '').trim();

      if (ui.imageBase64) {
        inlineDataBase64 = ui.imageBase64;
        if (!inlineMimeType) {
          inlineMimeType = 'image/jpeg';
        }
      } else {
        const imageResponse = await fetch(photoUrl);
        const contentType = imageResponse.headers.get('content-type');
        const arrayBuffer = await imageResponse.arrayBuffer();
        inlineDataBase64 = Buffer.from(arrayBuffer).toString('base64');
        inlineMimeType = (contentType || '').split(';')[0].trim() || 'image/jpeg';
      }

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: inlineDataBase64,
            mimeType: inlineMimeType
          }
        }
      ]);

      const response = await result.response;
      const ageProgressionDescription = await response.text();

      // Store age progression in database (we'll add a column or use JSON)
      // For now, we'll update the pet's description with age progression info
      if (supabase && petId) {
        const { error: updateError } = await supabase
          .from('lost_pets')
          .update({
            description: `${originalDescription || ''}\n\n[Age Progression after ${daysLostResolved} days: ${ageProgressionDescription}]`.trim()
          })
          .eq('id', petId);

        if (updateError) {
          console.error('[AGE PROGRESSION] Error updating pet:', updateError);
        }
      }

      return NextResponse.json({
        success: true,
        progressions,
        ageProgressionDescription,
        daysLost: daysLostResolved,
        monthsLost,
        yearsLost,
        message: 'Age progression analysis complete'
      });

    } catch (geminiError: any) {
      console.error('[AGE PROGRESSION] Gemini error:', geminiError);

      // Fallback: Return a basic age progression description
      const fallbackDescription = `After ${daysLostResolved} days (${monthsLost} months), this ${petType}${breed ? ` ${breed}` : ''} would likely show:
- ${monthsLost > 6 ? 'Significant growth if young, or weight changes if older' : 'Minor changes in size and condition'}
- Possible coat changes (dirt, matting, or natural shedding)
- Facial features may appear more mature or weathered
- Body condition may vary depending on environment and care received`;

      return NextResponse.json({
        success: true,
        progressions,
        ageProgressionDescription: fallbackDescription,
        daysLost: daysLostResolved,
        monthsLost,
        yearsLost,
        fallback: true,
        message: 'Age progression analysis complete (using fallback method)'
      });
    }

  } catch (error: any) {
    console.error('[AGE PROGRESSION] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Batch age progression for multiple pets
 */
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { petIds } = body; // Array of pet IDs

    if (!Array.isArray(petIds) || petIds.length === 0) {
      return NextResponse.json({ error: 'petIds array required' }, { status: 400 });
    }

    // Get pets from database
    const { data: pets, error: petsError } = await supabase
      .from('lost_pets')
      .select('id, photo_url, date_lost, pet_type, breed, description')
      .in('id', petIds)
      .eq('status', 'lost');

    if (petsError) {
      return NextResponse.json({ error: petsError.message }, { status: 500 });
    }

    const now = new Date();
    const results: Array<{ petId: string; success: boolean; daysLost?: number; error?: string }> = [];

    for (const pet of pets) {
      if (!pet.photo_url) continue;

      const dateLost = new Date(pet.date_lost);
      const daysLost = Math.floor((now.getTime() - dateLost.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLost < 30) continue; // Only age-progress pets lost for 30+ days

      try {
        // Call age progression for this pet
        const progressionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/age-progression`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              petId: pet.id,
              photoUrl: pet.photo_url,
              daysLost,
              petType: pet.pet_type,
              breed: pet.breed,
              originalDescription: pet.description
            })
          }
        );

        const progressionData = await progressionResponse.json();
        results.push({
          petId: pet.id,
          success: progressionData.success,
          daysLost
        });
      } catch (e: any) {
        results.push({
          petId: pet.id,
          success: false,
          error: e.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      message: `Processed age progression for ${results.length} pets`
    });

  } catch (error: any) {
    console.error('[AGE PROGRESSION BATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

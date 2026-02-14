import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Gemini AI for age progression
let gemini: any = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (apiKey) {
    gemini = new GoogleGenerativeAI(apiKey);
  }
} catch (e) {
  console.log('[AGE PROGRESSION] Gemini not available');
}

interface AgeProgressionRequest {
  petId: string;
  photoUrl: string;
  daysLost: number; // How many days the pet has been lost
  petType: 'dog' | 'cat';
  breed?: string;
  originalAge?: string; // e.g., "2 years", "6 months"
}

/**
 * Uses AI to age-progress a pet photo
 * This helps shelters match found pets with lost pets that have been missing for a while
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!gemini) {
      return NextResponse.json(
        { error: 'AI age progression not available. Gemini API key required.' },
        { status: 500 }
      );
    }

    const body: AgeProgressionRequest = await request.json();
    const { petId, photoUrl, daysLost, petType, breed, originalAge } = body;

    if (!photoUrl || !daysLost) {
      return NextResponse.json(
        { error: 'Missing required fields: photoUrl, daysLost' },
        { status: 400 }
      );
    }

    // Calculate age progression
    const monthsLost = Math.floor(daysLost / 30);
    const yearsLost = Math.floor(daysLost / 365);

    // Use Gemini Vision API to analyze and age-progress the image
    const model = gemini.getGenerativeModel({ model: 'gemini-pro-vision' });

    const prompt = `You are a veterinary AI assistant. Analyze this ${petType} photo and create an age-progressed version.

Original pet info:
- Type: ${petType}
${breed ? `- Breed: ${breed}` : ''}
${originalAge ? `- Original age: ${originalAge}` : ''}
- Time lost: ${daysLost} days (${monthsLost} months, ${yearsLost} years)

Please describe how this ${petType} would look after ${daysLost} days:
1. Size changes (if young, would have grown)
2. Coat changes (color, length, pattern)
3. Facial features (muzzle, eyes, ears)
4. Body condition (weight, muscle)
5. Overall appearance

Provide a detailed description that can be used to match this pet with found pets. Focus on distinctive features that would still be recognizable.`;

    try {
      // For Gemini Vision, we need to fetch the image and convert it
      // For now, we'll use text-based analysis and return a description
      // In production, you'd use Gemini's vision capabilities with base64 image

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: await fetch(photoUrl).then(r => r.arrayBuffer()).then(b => Buffer.from(b).toString('base64')),
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const ageProgressionDescription = response.text();

      // Store age progression in database (we'll add a column or use JSON)
      // For now, we'll update the pet's description with age progression info
      const { error: updateError } = await supabase
        .from('lost_pets')
        .update({
          description: `${body.originalDescription || ''}\n\n[Age Progression after ${daysLost} days: ${ageProgressionDescription}]`.trim()
        })
        .eq('id', petId);

      if (updateError) {
        console.error('[AGE PROGRESSION] Error updating pet:', updateError);
      }

      return NextResponse.json({
        success: true,
        ageProgressionDescription,
        daysLost,
        monthsLost,
        yearsLost,
        message: 'Age progression analysis complete'
      });

    } catch (geminiError: any) {
      console.error('[AGE PROGRESSION] Gemini error:', geminiError);
      
      // Fallback: Return a basic age progression description
      const fallbackDescription = `After ${daysLost} days (${monthsLost} months), this ${petType}${breed ? ` ${breed}` : ''} would likely show:
- ${monthsLost > 6 ? 'Significant growth if young, or weight changes if older' : 'Minor changes in size and condition'}
- Possible coat changes (dirt, matting, or natural shedding)
- Facial features may appear more mature or weathered
- Body condition may vary depending on environment and care received`;

      return NextResponse.json({
        success: true,
        ageProgressionDescription: fallbackDescription,
        daysLost,
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
    const results = [];

    for (const pet of pets) {
      if (!pet.photo_url) continue;

      const dateLost = new Date(pet.date_lost);
      const daysLost = Math.floor((now.getTime() - dateLost.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLost < 30) continue; // Only age-progress pets lost for 30+ days

      try {
        // Call age progression for this pet
        const progressionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/age-progression`,
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

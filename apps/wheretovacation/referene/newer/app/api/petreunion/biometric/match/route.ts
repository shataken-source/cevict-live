import { NextRequest, NextResponse } from 'next/server';
import { 
  matchPetBiometrically,
  assessImageQuality,
  BiometricSearchResult 
} from '../../../../../lib/biometric-service';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/biometric/match
 * 
 * BIOMETRIC PET MATCHING
 * The "Digital DNA" forensic matching engine
 * 
 * Takes a nose-print or facial image and searches the database
 * for matching pets using AI-powered biometric analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract parameters
    const image = formData.get('image') as File;
    const petType = formData.get('petType') as string | null;
    const imageType = formData.get('imageType') as string || 'nose_print';
    const searcherId = formData.get('searcherId') as string | null;
    const searcherType = formData.get('searcherType') as string || 'user';
    const latitude = formData.get('latitude') as string | null;
    const longitude = formData.get('longitude') as string | null;
    const checkQualityFirst = formData.get('checkQuality') === 'true';

    // Validate
    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // Optional: Check image quality first
    if (checkQualityFirst) {
      const qualityAssessment = await assessImageQuality(
        imageBuffer, 
        imageType as 'nose_print' | 'facial'
      );

      if (!qualityAssessment.isUsable) {
        return NextResponse.json({
          success: false,
          error: 'Image quality too low for biometric matching',
          qualityScore: qualityAssessment.qualityScore,
          issues: qualityAssessment.issues,
          recommendations: qualityAssessment.recommendations
        }, { status: 400 });
      }
    }

    // Upload image to storage
    let imageUrl = '';
    if (supabase) {
      const fileName = `biometric-scans/${Date.now()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('petreunion')
        .upload(fileName, imageBuffer, {
          contentType: image.type || 'image/jpeg'
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('petreunion')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    // Perform biometric matching
    const result = await matchPetBiometrically(imageBuffer, {
      petType: petType as 'dog' | 'cat' | 'other' | undefined,
      searcherId: searcherId || undefined,
      searcherType: searcherType as 'officer' | 'user' | 'system',
      searchLocation: latitude && longitude 
        ? { lat: parseFloat(latitude), lon: parseFloat(longitude) }
        : undefined
    });

    // Build response
    const response: any = {
      success: result.success,
      processingTimeMs: result.processingTimeMs,
      imageUrl,
      imageQuality: result.imageQuality,
      extractedFeatures: result.extractedFeatures
    };

    if (result.success) {
      response.matchesFound = result.matches.length;
      response.hasVerifiedMatch = result.hasVerifiedMatch;

      // Include matches
      response.matches = result.matches.map(match => ({
        petId: match.petId,
        petSource: match.petSource,
        petName: match.petName,
        petType: match.petType,
        breed: match.breed,
        color: match.color,
        photoUrl: match.photoUrl,
        similarity: Math.round(match.similarity * 10000) / 100, // Convert to percentage
        confidenceScore: match.confidenceScore,
        lastSeenLocation: match.lastSeenLocation,
        daysLost: match.daysLost,
        biometricHash: match.biometricHash
      }));

      // Top match details
      if (result.topMatch) {
        response.topMatch = {
          petId: result.topMatch.petId,
          petSource: result.topMatch.petSource,
          petName: result.topMatch.petName,
          similarity: Math.round(result.topMatch.similarity * 10000) / 100,
          confidenceScore: result.topMatch.confidenceScore
        };

        // If verified match (>= 92%), include owner contact
        if (result.hasVerifiedMatch) {
          response.verifiedMatch = true;
          response.ownerContact = {
            ownerName: result.topMatch.ownerName,
            ownerPhone: result.topMatch.ownerPhone,
            emergencyPhone: result.topMatch.emergencyPhone
          };
          response.message = `✓ VERIFIED BIOMETRIC MATCH (${result.topMatch.confidenceScore}% confidence). Owner contact revealed.`;
        } else if (result.topMatch.confidenceScore >= 85) {
          response.highConfidenceMatch = true;
          response.ownerContact = {
            ownerName: result.topMatch.ownerName,
            ownerPhone: result.topMatch.ownerPhone,
            emergencyPhone: result.topMatch.emergencyPhone
          };
          response.message = `HIGH CONFIDENCE MATCH (${result.topMatch.confidenceScore}%). Pending verification.`;
        } else {
          response.message = `Best match: ${result.topMatch.confidenceScore}% confidence. Below verification threshold.`;
        }
      } else {
        response.message = 'No biometric matches found in the database.';
      }

      // Include search ID for tracking
      if (result.searchId) {
        response.searchId = result.searchId;
      }
    } else {
      response.error = 'Biometric extraction failed';
      response.message = 'Could not extract biometric features from the image. Please try with a clearer photo.';
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Biometric Match] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Biometric matching failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}


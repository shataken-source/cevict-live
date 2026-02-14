import { NextRequest, NextResponse } from 'next/server';
import { 
  extractBiometrics,
  storeBiometrics,
  assessImageQuality
} from '../../../../../lib/biometric-service';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/biometric/store
 * 
 * STORE BIOMETRIC DATA
 * Processes and stores biometric data (nose-print/facial) for a pet
 * Used when adding pets to the vault or reporting lost pets
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract parameters
    const image = formData.get('image') as File;
    const petId = parseInt(formData.get('petId') as string);
    const petSource = formData.get('petSource') as 'lost_pets' | 'pet_vault';
    const petType = formData.get('petType') as string || 'dog';
    const imageType = formData.get('imageType') as 'nose_print' | 'facial' || 'nose_print';

    // Validate
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    if (!petId || isNaN(petId)) {
      return NextResponse.json({ error: 'Valid petId is required' }, { status: 400 });
    }

    if (!petSource || !['lost_pets', 'pet_vault'].includes(petSource)) {
      return NextResponse.json({ error: 'petSource must be lost_pets or pet_vault' }, { status: 400 });
    }

    // Convert to buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // Assess quality
    const qualityAssessment = await assessImageQuality(imageBuffer, imageType);
    
    if (!qualityAssessment.isUsable) {
      return NextResponse.json({
        success: false,
        error: 'Image quality too low',
        qualityScore: qualityAssessment.qualityScore,
        issues: qualityAssessment.issues,
        recommendations: qualityAssessment.recommendations
      }, { status: 400 });
    }

    // Extract biometrics
    const biometrics = await extractBiometrics(
      imageBuffer,
      petType as 'dog' | 'cat' | 'other',
      imageType
    );

    if (!biometrics) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract biometric features',
        recommendations: [
          'Ensure the image is well-lit',
          'Make sure the nose/face is in focus',
          'Use a straight-on angle',
          'Avoid obstructions or blur'
        ]
      }, { status: 400 });
    }

    // Upload image to storage
    let imageUrl = '';
    if (supabase) {
      const fileName = `biometrics/${petSource}/${petId}/${imageType}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('petreunion')
        .upload(fileName, imageBuffer, {
          contentType: image.type || 'image/jpeg',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('petreunion')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    // Store biometrics
    const stored = await storeBiometrics(petId, petSource, imageUrl, biometrics, imageType);

    if (!stored) {
      return NextResponse.json({
        success: false,
        error: 'Failed to store biometric data'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `✓ Biometric ${imageType === 'nose_print' ? 'nose-print' : 'facial'} captured successfully`,
      biometricHash: biometrics.hash,
      confidence: biometrics.confidence,
      imageUrl,
      extractedLandmarks: biometrics.landmarks
    });

  } catch (error: any) {
    console.error('[Biometric Store] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Biometric storage failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/biometric/store
 * Check biometric status for a pet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = parseInt(searchParams.get('petId') || '');
    const petSource = searchParams.get('petSource') as 'lost_pets' | 'pet_vault';

    if (!petId || !petSource) {
      return NextResponse.json(
        { error: 'petId and petSource are required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data } = await supabase
      .from(petSource)
      .select('nose_print_url, nose_print_vector, facial_landmarks_url, facial_landmarks_vector, biometric_hash, biometric_confidence, biometric_verified, biometric_captured_at')
      .eq('id', petId)
      .single();

    if (!data) {
      return NextResponse.json({
        success: true,
        hasBiometrics: false
      });
    }

    return NextResponse.json({
      success: true,
      hasBiometrics: !!(data.nose_print_vector || data.facial_landmarks_vector),
      hasNosePrint: !!data.nose_print_vector,
      hasFacialLandmarks: !!data.facial_landmarks_vector,
      biometricHash: data.biometric_hash,
      confidence: data.biometric_confidence,
      isVerified: data.biometric_verified,
      capturedAt: data.biometric_captured_at,
      nosePrintUrl: data.nose_print_url,
      facialUrl: data.facial_landmarks_url
    });

  } catch (error: any) {
    console.error('[Biometric Store GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check biometric status' },
      { status: 500 }
    );
  }
}


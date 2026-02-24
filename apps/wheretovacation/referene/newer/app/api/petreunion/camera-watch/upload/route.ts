import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordCameraUpload } from '../../../../../lib/camera-watch-service';
import { processUpload } from '../../../../../lib/camera-ai-analyzer';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/camera-watch/upload
 * 
 * Secure upload endpoint for camera footage from neighbors.
 * Privacy-first: uploader remains anonymous by default.
 * 
 * Body (FormData):
 * - file: File (image or video)
 * - petId: number
 * - captureTimestamp?: string (ISO)
 * - captureLocation?: string (JSON: {lat, lon, text})
 * - anonymous?: boolean (default: true)
 * - consentToContact?: boolean (default: false)
 * - contactEmail?: string
 * - contactPhone?: string
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const petId = Number(formData.get('petId'));
    const captureTimestamp = formData.get('captureTimestamp') as string | null;
    const captureLocationStr = formData.get('captureLocation') as string | null;
    const anonymous = formData.get('anonymous') !== 'false'; // Default true
    const consentToContact = formData.get('consentToContact') === 'true';
    const contactEmail = formData.get('contactEmail') as string | null;
    const contactPhone = formData.get('contactPhone') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!petId) {
      return NextResponse.json(
        { error: 'petId is required' },
        { status: 400 }
      );
    }

    // Determine file type
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: 'File must be an image or video' },
        { status: 400 }
      );
    }

    // File size limit: 50MB for videos, 10MB for images
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${isVideo ? '50MB' : '10MB'}` },
        { status: 400 }
      );
    }

    // Verify pet exists and is still lost
    const { data: pet, error: petError } = await supabase
      .from('lost_pets')
      .select('id, pet_name, status')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }

    if (pet.status !== 'lost') {
      return NextResponse.json(
        { error: `This pet has already been ${pet.status}!` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const fileName = `camera-watch/${petId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pet-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[Camera Upload] Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pet-images')
      .getPublicUrl(fileName);

    // Parse capture location
    let captureLocation: { lat: number; lon: number; text?: string } | null = null;
    if (captureLocationStr) {
      try {
        captureLocation = JSON.parse(captureLocationStr);
      } catch (e) {
        console.warn('[Camera Upload] Could not parse capture location');
      }
    }

    // Record in database
    const upload = await recordCameraUpload({
      petId,
      uploadType: isVideo ? 'video' : 'image',
      storageUrl: publicUrl,
      fileSizeBytes: file.size,
      captureTimestamp: captureTimestamp ? new Date(captureTimestamp) : undefined,
      captureLocationLat: captureLocation?.lat,
      captureLocationLon: captureLocation?.lon,
      captureLocationText: captureLocation?.text,
      anonymous,
      consentToContact,
      contactEmail: consentToContact ? contactEmail || undefined : undefined,
      contactPhone: consentToContact ? contactPhone || undefined : undefined
    });

    if (!upload) {
      return NextResponse.json(
        { error: 'Failed to record upload' },
        { status: 500 }
      );
    }

    // Trigger AI analysis asynchronously (don't block response)
    processUpload(upload.id).then(result => {
      console.log(`[Camera Upload] AI Analysis complete for upload ${upload.id}:`, result);
    }).catch(err => {
      console.error(`[Camera Upload] AI Analysis failed for upload ${upload.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      storageUrl: publicUrl,
      message: 'Thank you! Your footage is being analyzed by our AI.',
      petName: pet.pet_name,
      anonymous,
      note: 'We respect your privacy. Your identity will remain anonymous unless you choose to share it.'
    });

  } catch (error: any) {
    console.error('[Camera Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/camera-watch/upload?petId=123
 * Get all uploads for a pet (for owner/admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json(
        { error: 'petId is required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: uploads, error } = await supabase
      .from('camera_uploads')
      .select(`
        id,
        upload_type,
        storage_url,
        thumbnail_url,
        capture_timestamp,
        capture_location_text,
        ai_analyzed,
        ai_match_confidence,
        ai_detected_pet_type,
        is_verified_match,
        pinned_on_map,
        uploader_anonymous,
        created_at
      `)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch uploads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      petId,
      uploads: uploads || [],
      count: uploads?.length || 0
    });

  } catch (error: any) {
    console.error('[Camera Upload] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get uploads' },
      { status: 500 }
    );
  }
}


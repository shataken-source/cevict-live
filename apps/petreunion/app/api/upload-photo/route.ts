import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';
import { validatePetPhotoInput } from '@/lib/photo-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Upload photo to Supabase Storage
 * Returns public URL for the uploaded photo
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // Get form data
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No photo file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer for validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate photo content (ensures it's actually a pet photo)
    const validation = await validatePetPhotoInput({
      photo_file: {
        buffer,
        mimeType: file.type,
      },
    });

    if (!validation.ok) {
      return NextResponse.json(
        { 
          error: 'Photo validation failed',
          reason: validation.reason,
          details: `The uploaded image does not appear to be a pet photo. ${validation.reason}`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `pet-photos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pet-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('pet-photos')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get photo URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photo_url: urlData.publicUrl,
      file_path: filePath,
    });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process photo upload',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

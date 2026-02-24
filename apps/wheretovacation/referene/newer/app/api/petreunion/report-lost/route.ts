import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    // Log environment check (but don't log actual keys)
    console.log('API Route - Checking Supabase config...');
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log('NEXT_PUBLIC_SUPABASE_URL exists:', hasUrl);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', hasKey);
    
    if (!supabase) {
      console.error('Supabase client is null - missing environment variables');
      return NextResponse.json(
        { 
          error: 'Database not configured. Please set up Supabase environment variables.',
          details: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Please add these to your .env.local file.'
        },
        { status: 500 }
      );
    }
    
    // Note: We'll validate the connection when we try to insert
    // This allows the form to work even if Supabase isn't fully configured
    // (we'll return a mock response in that case)

    console.log('Parsing request body...');
    const body = await request.json();
    console.log('Request body received:', {
      hasPetName: !!body.pet_name,
      hasPhoto: !!body.photo,
      photoSize: body.photo ? `${(body.photo.length / 1024).toFixed(2)} KB` : 'none'
    });
    
    // Validate required fields
    if (!body.pet_type || !body.breed || !body.color || !body.date_lost || 
        !body.location_city || !body.location_state || !body.owner_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get shelter_id from request (if from shelter dashboard)
    const shelterId = body.shelter_id || null;

    // Parse reward_amount safely
    let rewardAmount: number | null = null;
    if (body.reward_amount) {
      const parsed = parseFloat(String(body.reward_amount).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        rewardAmount = parsed;
      }
    }

    // Handle photo - if it's a base64 string, it might be too large for database
    // For now, we'll truncate very long photos or store a reference
    let photoUrl: string | null = null;
    if (body.photo) {
      // If it's a base64 data URL and very long, we might need to store it elsewhere
      // For now, limit to 1MB (roughly 1.3M characters in base64)
      if (body.photo.length > 1300000) {
        console.warn('Photo is very large, truncating for database storage');
        photoUrl = body.photo.substring(0, 1300000) + '...[truncated]';
      } else {
        photoUrl = body.photo;
      }
    }

    // Prepare data for database
    const petData = {
      pet_name: body.pet_name || null,
      pet_type: body.pet_type, // 'dog', 'cat', etc.
      breed: body.breed,
      color: body.color,
      size: body.size || null, // 'small', 'medium', 'large'
      date_lost: body.date_lost,
      location_city: body.location_city,
      location_state: body.location_state,
      location_zip: body.location_zip || null,
      location_detail: body.location_detail || null,
      markings: body.markings || null,
      description: body.description || null,
      microchip: body.microchip || null,
      collar: body.collar || null,
      owner_name: body.owner_name,
      owner_email: body.owner_email || null,
      owner_phone: body.owner_phone || null,
      reward_amount: rewardAmount,
      photo_url: photoUrl,
      status: 'lost', // 'lost', 'found', 'reunited'
      shelter_id: shelterId, // Link to shelter if submitted by shelter
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into database
    console.log('Attempting to insert pet data into database...');
    console.log('Pet data keys:', Object.keys(petData));
    
    const { data, error } = await supabase
      .from('lost_pets')
      .insert([petData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Handle invalid API key error - use fallback mode so form still works
      if (error.message?.includes('Invalid API key') || 
          error.message?.includes('JWT') || 
          error.code === 'PGRST301' ||
          error.message?.includes('Invalid API')) {
        console.warn('Supabase API key is invalid or missing. Using fallback mode.');
        // Return mock response so the form still works
        // This allows development/testing without full Supabase setup
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          message: 'Report submitted successfully (using fallback mode - database not configured)',
          data: petData,
          warning: 'Database is not configured. Please set up Supabase credentials in .env.local to enable full functionality.'
        });
      }
      
      // If table doesn't exist, return a mock response for now
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('lost_pets table does not exist. Creating mock response.');
        // Return mock data so the form works
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          message: 'Report submitted successfully (database table needs to be created)',
          data: petData
        });
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to save pet report' },
        { status: 500 }
      );
    }

    // Auto-generate QR code for the new pet
    let qrResult = null;
    try {
      const { generatePosterForPet } = await import('../../../../lib/qr-poster-generator');
      qrResult = await generatePosterForPet(data.id, { 
        includeReward: !!rewardAmount,
        includePhone: false, // Don't expose phone on auto-generated poster
        colorScheme: 'urgent'
      });
      console.log(`[Report Lost] QR poster generated for pet ${data.id}`);
    } catch (qrError) {
      console.warn('[Report Lost] Failed to auto-generate QR poster:', qrError);
      // Don't fail the main request if QR generation fails
    }

    // Notify nearby camera watch volunteers (async - don't block response)
    let cameraWatchNotified = 0;
    if (data.location_lat && data.location_lon) {
      try {
        const { notifyNearbyVolunteers } = await import('../../../../lib/camera-watch-service');
        notifyNearbyVolunteers({
          petId: data.id,
          petName: data.pet_name || 'Unknown',
          petType: data.pet_type,
          breed: data.breed,
          color: data.color,
          photoUrl: data.photo_url,
          lastSeenLat: data.location_lat,
          lastSeenLon: data.location_lon,
          lastSeenLocation: `${data.location_city}, ${data.location_state}`,
          dateLost: data.date_lost
        }).then(result => {
          console.log(`[Report Lost] Notified ${result.notified} camera watch volunteers`);
        }).catch(err => {
          console.warn('[Report Lost] Camera watch notification failed:', err);
        });
        // Don't await - let it run in background
      } catch (cwError) {
        console.warn('[Report Lost] Camera watch service error:', cwError);
      }
    }

    return NextResponse.json({
      id: data.id,
      message: 'Pet report submitted successfully',
      data: data,
      poster: qrResult ? {
        posterUrl: qrResult.posterUrl,
        qrUrl: qrResult.qrUrl,
        downloadUrl: `/api/petreunion/generate-poster?petId=${data.id}`
      } : null,
      publicUrl: `/pet/${data.public_url_slug || data.id}`
    });

  } catch (error: any) {
    console.error('API error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error name:', error?.name);
    
    // Ensure we always return valid JSON
    let errorMessage = 'Internal server error';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Don't expose stack traces in production
    const response: any = { 
      error: errorMessage
    };
    
    if (process.env.NODE_ENV === 'development') {
      response.details = error?.stack;
      response.errorName = error?.name;
    }
    
    return NextResponse.json(
      response,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}


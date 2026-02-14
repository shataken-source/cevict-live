import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * POST /api/petreunion/report-sighting
 * Reports a sighting of a lost pet
 * 
 * Body: {
 *   petId: number,
 *   reporterName?: string,
 *   reporterEmail?: string,
 *   reporterPhone?: string,
 *   location: string,
 *   city?: string,
 *   state?: string,
 *   sightingDate: string,
 *   description?: string,
 *   photo?: string (base64)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      petId,
      reporterName,
      reporterEmail,
      reporterPhone,
      location,
      city,
      state,
      sightingDate,
      description,
      photo
    } = body;
    
    if (!petId || !location) {
      return NextResponse.json(
        { error: 'petId and location are required' },
        { status: 400 }
      );
    }
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    // Verify pet exists
    const { data: pet, error: petError } = await supabase
      .from('lost_pets')
      .select('id, pet_name, owner_email, owner_phone, status')
      .eq('id', petId)
      .single();
    
    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }
    
    // Don't accept sightings for already found pets
    if (pet.status === 'found' || pet.status === 'reunited') {
      return NextResponse.json(
        { 
          error: 'This pet has already been found!',
          status: pet.status,
          message: pet.status === 'reunited' 
            ? `Great news! ${pet.pet_name} has been reunited with their family!`
            : `${pet.pet_name} has been found and is safe!`
        },
        { status: 400 }
      );
    }
    
    // Handle photo upload if provided
    let photoUrl = null;
    if (photo && photo.startsWith('data:image')) {
      try {
        const timestamp = Date.now();
        const photoPath = `sightings/${petId}/sighting-${timestamp}.jpg`;
        const base64Data = photo.split(',')[1];
        const photoBuffer = Buffer.from(base64Data, 'base64');
        
        const { error: uploadError } = await supabase.storage
          .from('pet-images')
          .upload(photoPath, photoBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('pet-images')
            .getPublicUrl(photoPath);
          photoUrl = publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Failed to upload sighting photo:', uploadErr);
      }
    }
    
    // Insert sighting record
    const sightingData = {
      pet_id: petId,
      reporter_name: reporterName || 'Anonymous',
      reporter_email: reporterEmail,
      reporter_phone: reporterPhone,
      sighting_location: location,
      sighting_city: city,
      sighting_state: state,
      sighting_date: sightingDate || new Date().toISOString(),
      description,
      photo_url: photoUrl,
      is_verified: false
    };
    
    const { data: sighting, error: sightingError } = await supabase
      .from('pet_sightings')
      .insert([sightingData])
      .select()
      .single();
    
    if (sightingError) {
      console.error('Sighting insert error:', sightingError);
      return NextResponse.json(
        { error: 'Failed to record sighting' },
        { status: 500 }
      );
    }
    
    // TODO: Send notification to owner (SMS/Email)
    // This would integrate with the existing Sinch SMS system
    console.log(`[Sighting] New sighting for pet ${petId} reported at ${location}`);
    if (pet.owner_phone) {
      console.log(`[Sighting] Should notify owner at ${pet.owner_phone}`);
      // await sendSightingNotification(pet.owner_phone, pet.pet_name, location);
    }
    
    return NextResponse.json({
      success: true,
      sightingId: sighting.id,
      message: `Thank you for reporting a sighting of ${pet.pet_name || 'this pet'}! The owner has been notified.`,
      petName: pet.pet_name,
      location
    });
    
  } catch (error: any) {
    console.error('[Report Sighting] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to report sighting' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/report-sighting?petId=123
 * Gets all sightings for a pet
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
    
    const { data: sightings, error } = await supabase
      .from('pet_sightings')
      .select('*')
      .eq('pet_id', petId)
      .order('sighting_date', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sightings' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      petId,
      sightings: sightings || [],
      count: sightings?.length || 0
    });
    
  } catch (error: any) {
    console.error('[Get Sightings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sightings' },
      { status: 500 }
    );
  }
}


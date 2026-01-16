import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fuzzifyLocation } from '../../../../lib/fuzzy-geolocation';

/**
 * Report Lost/Found Pet with Fuzzy Geolocation
 * 
 * Addresses Privacy Guardrails audit finding:
 * Uses fuzzy geolocation instead of precise GPS to protect user safety
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // 'lost' | 'found'
      photo,
      location,
      fuzzyLocation = true, // Default to fuzzy for privacy
      contact,
      petName,
      breed,
      color,
      size,
      description,
    } = body;

    if (!type || !contact) {
      return NextResponse.json(
        { error: 'Type and contact information required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process location with fuzzy geolocation
    let processedLocation = location;
    let fuzzyLocationData = null;

    if (location && typeof location === 'string' && location.includes(',')) {
      // Parse coordinates and fuzzify
      const [lat, lon] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        fuzzyLocationData = fuzzifyLocation(lat, lon, fuzzyLocation ? 'fuzzy' : 'precise');
        processedLocation = `${fuzzyLocationData.area} (within ${fuzzyLocationData.radius}m)`;
      }
    }

    // Insert pet report
    const { data, error } = await supabase
      .from('lost_pets')
      .insert([{
        pet_name: petName || 'Unknown',
        pet_type: 'dog', // Would be determined from form
        breed: breed || '',
        color: color || '',
        size: size || '',
        location_city: processedLocation.split(',')[0] || processedLocation,
        location_state: processedLocation.split(',')[1]?.trim() || '',
        status: type,
        description: description || '',
        owner_name: contact,
        owner_contact: contact,
        date_lost: new Date().toISOString().split('T')[0],
        // Store fuzzy location metadata
        fuzzy_location: fuzzyLocationData ? {
          latitude: fuzzyLocationData.latitude,
          longitude: fuzzyLocationData.longitude,
          radius: fuzzyLocationData.radius,
          privacyLevel: fuzzyLocationData.privacyLevel,
        } : null,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create report', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      petId: data.id,
      message: 'Report created successfully. Using fuzzy location for privacy.',
      fuzzyLocation: fuzzyLocationData,
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report', details: error.message },
      { status: 500 }
    );
  }
}


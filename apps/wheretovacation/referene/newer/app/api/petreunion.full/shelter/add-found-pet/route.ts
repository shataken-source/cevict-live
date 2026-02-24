import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface FoundPetData {
  // Pet Information
  pet_name?: string;
  pet_type: 'dog' | 'cat';
  breed: string;
  color: string;
  size?: string;
  
  // When/Where Found
  date_found: string; // ISO date string
  location_city: string;
  location_state: string;
  location_zip?: string;
  location_detail?: string; // Specific location where found
  
  // Description
  markings?: string;
  description?: string;
  microchip?: string;
  collar?: string;
  
  // Media
  photo_url?: string;
  
  // Shelter Info
  shelter_id?: string;
  intake_notes?: string; // Internal notes from shelter staff
  
  // Contact (person who found/brought in)
  found_by_name?: string;
  found_by_phone?: string;
  found_by_email?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body: FoundPetData = await request.json();

    // Validate required fields
    if (!body.pet_type || !body.breed || !body.color || !body.date_found || !body.location_city || !body.location_state) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['pet_type', 'breed', 'color', 'date_found', 'location_city', 'location_state']
        },
        { status: 400 }
      );
    }

    // Check for duplicates (same pet found recently in same area)
    const { data: existing } = await supabase
      .from('lost_pets')
      .select('id, pet_name, status')
      .eq('pet_type', body.pet_type)
      .eq('breed', body.breed)
      .eq('color', body.color)
      .eq('location_city', body.location_city)
      .eq('location_state', body.location_state)
      .eq('status', 'found')
      .gte('date_lost', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          existingPet: existing,
          message: 'Similar pet already in database. Please verify if this is the same pet.'
        },
        { status: 200 }
      );
    }

    // Insert pet as "found" status
    const { data: newPet, error: petError } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: body.pet_name || 'Unknown',
        pet_type: body.pet_type,
        breed: body.breed,
        color: body.color,
        size: body.size || 'medium',
        date_lost: body.date_found, // Using date_found as date_lost for found pets
        location_city: body.location_city,
        location_state: body.location_state,
        location_zip: body.location_zip,
        location_detail: body.location_detail,
        markings: body.markings,
        description: body.description || `Found ${body.pet_type}. ${body.intake_notes || ''}`,
        microchip: body.microchip,
        collar: body.collar,
        photo_url: body.photo_url || null,
        status: 'found',
        shelter_id: body.shelter_id || null,
        owner_name: body.found_by_name || 'Shelter Intake', // Required field
        owner_email: body.found_by_email,
        owner_phone: body.found_by_phone,
        // Store intake info in description if needed
        ...(body.intake_notes ? { description: `${body.description || ''}\n[Intake Notes: ${body.intake_notes}]`.trim() } : {})
      })
      .select()
      .single();

    if (petError) {
      console.error('[SHELTER ADD PET] Error:', petError);
      return NextResponse.json(
        { error: 'Failed to add pet', details: petError.message },
        { status: 500 }
      );
    }

    // Trigger automatic matching search
    // (This will run in background to find potential matches)
    try {
      // Call match-pets API in background (don't wait)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/match-pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: newPet.id })
      }).catch(() => {}); // Ignore errors in background call
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      pet: newPet,
      message: 'Pet added successfully. Automatic matching search initiated.'
    });

  } catch (error: any) {
    console.error('[SHELTER ADD PET] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



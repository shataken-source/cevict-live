import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Prevent build crash by checking environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase environment variables in shelter/add-pet endpoint');
}

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { 
          error: 'Database not configured. Please set up Supabase environment variables.',
          details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      pet_name,
      pet_type,
      breed,
      color,
      size,
      photo_url,
      location_city,
      location_state,
      age,
      gender,
      description,
      shelter_id,
      status = 'found'
    } = body;

    // Validate required fields
    if (!pet_name || !pet_type || !breed || !color || !size || !location_city || !location_state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!shelter_id) {
      return NextResponse.json(
        { error: 'Shelter ID is required' },
        { status: 400 }
      );
    }

    // Insert pet
    const { data: pet, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_name,
        pet_type,
        breed,
        color,
        size,
        photo_url: photo_url || null,
        location_city,
        location_state,
        description: description || `Available for adoption. ${age || 'Age unknown'}, ${gender || 'gender unknown'}.`,
        status,
        shelter_id,
        owner_name: 'Shelter',
        owner_email: null,
        date_lost: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding pet:', error);
      return NextResponse.json(
        { error: 'Failed to add pet', message: error.message },
        { status: 500 }
      );
    }

    // Check for matching alerts (async, don't wait)
    if (pet) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl}/functions/v1/check-pet-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({ petId: pet.id })
      }).catch(err => {
        console.error('Error checking alerts:', err);
      });
    }

    return NextResponse.json({
      success: true,
      pet: pet
    });

  } catch (error: any) {
    console.error('Error in add-pet API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}














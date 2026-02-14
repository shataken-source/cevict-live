import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Create a test pet
    const testPet = {
      pet_name: 'Test Scraper Pet',
      pet_type: 'dog',
      breed: 'Golden Retriever',
      color: 'Golden',
      size: 'large',
      description: 'This is a test pet added by the scraper system to verify it works!',
      photo_url: null,
      status: 'found',
      location_city: 'Birmingham',
      location_state: 'AL',
      date_found: new Date().toISOString().split('T')[0],
      owner_name: 'Test System',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('lost_pets')
      .insert(testPet)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to add pet', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test pet added successfully!',
      pet: data
    });

  } catch (error: any) {
    console.error('[TEST] Error:', error);
    return NextResponse.json(
      { error: 'Test failed', message: error.message },
      { status: 500 }
    );
  }
}













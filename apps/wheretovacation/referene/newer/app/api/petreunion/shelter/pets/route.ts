import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // Get shelter_id from query params
    const { searchParams } = new URL(request.url);
    const shelterId = searchParams.get('shelter_id');
    
    if (!shelterId) {
      return NextResponse.json(
        { error: 'Shelter ID is required' },
        { status: 400 }
      );
    }
    
    // Filter pets by shelter_id
    const { data: pets, error } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('shelter_id', shelterId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pets', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pets: pets || [],
      count: pets?.length || 0
    });

  } catch (error: any) {
    console.error('Error in shelter pets API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


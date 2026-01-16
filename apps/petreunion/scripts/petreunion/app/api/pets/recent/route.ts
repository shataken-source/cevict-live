import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Get recent lost and found pets for homepage
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '16');
    const status = searchParams.get('status'); // 'lost' or 'found' or null for all

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('lost_pets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pets', details: error.message },
        { status: 500 }
      );
    }

    // Format the data for display
    const formattedPets = (data || []).map((pet: any) => ({
      id: pet.id,
      name: pet.pet_name || 'Unknown',
      type: pet.pet_type || 'unknown',
      breed: pet.breed || 'Unknown',
      gender: pet.gender || 'Unknown',
      status: pet.status || 'lost',
      location: `${pet.location_city || ''}, ${pet.location_state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location Unknown',
      description: pet.description || '',
      photoUrl: pet.photo_url || null,
      dateLost: pet.date_lost || pet.created_at,
      createdAt: pet.created_at,
    }));

    return NextResponse.json({
      success: true,
      pets: formattedPets,
      count: formattedPets.length,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


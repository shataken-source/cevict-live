import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Database not configured', pets: [] },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const petType = searchParams.get('type') || 'all';
    const state = searchParams.get('state') || 'all';
    const city = searchParams.get('city') || '';

    // Build query
    let dbQuery = supabase.from('lost_pets').select('*');

    // Apply filters
    if (status !== 'all') {
      dbQuery = dbQuery.eq('status', status);
    }
    if (petType !== 'all') {
      dbQuery = dbQuery.eq('pet_type', petType);
    }
    if (state !== 'all') {
      dbQuery = dbQuery.eq('location_state', state);
    }
    if (city) {
      dbQuery = dbQuery.ilike('location_city', `%${city}%`);
    }

    // Apply search query
    if (query) {
      dbQuery = dbQuery.or(
        `pet_name.ilike.%${query}%,breed.ilike.%${query}%,color.ilike.%${query}%,description.ilike.%${query}%,location_city.ilike.%${query}%`
      );
    }

    // Order by most recent
    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      // Return empty array instead of error for graceful degradation
      return NextResponse.json({ success: true, pets: [] });
    }

    return NextResponse.json({ success: true, pets: data || [] });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed', pets: [] },
      { status: 500 }
    );
  }
}

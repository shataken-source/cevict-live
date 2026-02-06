import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { getSupabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const petType = searchParams.get('type') || 'all';
    const state = searchParams.get('state') || 'all';
    const city = searchParams.get('city') || '';

    // If there's a search query, use multiple queries and combine results
    // (Supabase .or() doesn't work well with ilike and wildcards)
    if (query) {
      // Fetch results from each field separately
      const queries = [
        supabase.from('lost_pets').select('*').ilike('pet_name', `%${query}%`),
        supabase.from('lost_pets').select('*').ilike('breed', `%${query}%`),
        supabase.from('lost_pets').select('*').ilike('color', `%${query}%`),
        supabase.from('lost_pets').select('*').ilike('description', `%${query}%`),
        supabase.from('lost_pets').select('*').ilike('location_city', `%${query}%`),
      ];

      const results = await Promise.all(queries);
      
      // Combine all results
      const allPets: any[] = [];
      for (const result of results) {
        if (result.data && !result.error) {
          allPets.push(...result.data);
        }
      }

      // Remove duplicates by id
      const uniquePets = Array.from(
        new Map(allPets.map(pet => [pet.id, pet])).values()
      );

      // Apply filters
      let filtered = uniquePets;
      if (status !== 'all') {
        filtered = filtered.filter(p => p.status === status);
      }
      if (petType !== 'all') {
        filtered = filtered.filter(p => p.pet_type === petType);
      }
      if (state !== 'all') {
        filtered = filtered.filter(p => p.location_state === state);
      }
      if (city) {
        filtered = filtered.filter(p => 
          p.location_city?.toLowerCase().includes(city.toLowerCase())
        );
      }

      // Sort by most recent and limit
      filtered.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      return NextResponse.json({ 
        success: true, 
        pets: filtered.slice(0, 50) 
      });
    }

    // No search query - use regular query with filters
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

    // Order by most recent
    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Database query failed',
        pets: [] 
      });
    }

    console.log(`No search query: Found ${data?.length || 0} pets`);
    return NextResponse.json({ success: true, pets: data || [] });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed', pets: [] },
      { status: 500 }
    );
  }
}

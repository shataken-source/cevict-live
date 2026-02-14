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

    // Single-query search: one OR across searchable fields (was 5 separate queries)
    if (query.trim()) {
      // Strip commas so .or() filter isn't broken (PostgREST uses comma to separate OR conditions)
      const safeQuery = query.trim().replace(/,/g, ' ');
      const pattern = `%${safeQuery}%`;
      let searchQuery = supabase
        .from('lost_pets')
        .select('*')
        .or(`pet_name.ilike.${pattern},breed.ilike.${pattern},color.ilike.${pattern},description.ilike.${pattern},location_city.ilike.${pattern}`);
      if (status !== 'all') searchQuery = searchQuery.eq('status', status);
      if (petType !== 'all') searchQuery = searchQuery.eq('pet_type', petType);
      if (state !== 'all') searchQuery = searchQuery.eq('location_state', state);
      if (city) searchQuery = searchQuery.ilike('location_city', `%${city}%`);
      searchQuery = searchQuery.order('created_at', { ascending: false }).limit(50);

      const { data: searchData, error: searchError } = await searchQuery;
      if (searchError) {
        return NextResponse.json(
          { success: false, error: searchError.message, pets: [] },
          { status: 500 }
        );
      }
      const list = searchData ?? [];
      // Dedupe by id (OR can return same row if multiple columns match)
      const unique = Array.from(new Map(list.map(p => [p.id, p])).values());
      return NextResponse.json({ success: true, pets: unique.slice(0, 50) });
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
      return NextResponse.json(
        { success: false, error: error.message || 'Database query failed', pets: [] },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, pets: data || [] });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Search failed', pets: [] },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = req.nextUrl.searchParams;

    const q = (searchParams.get('q') || '').trim();
    const status = searchParams.get('status') || 'all';
    const petType = searchParams.get('type') || 'all';

    let query = supabase.from('lost_pets').select('*');

    // NEVER show fake scraper data, even if still in DB
    query = query.neq('owner_name', 'Community');
    query = query.not('source_url', 'like', 'https://example.com/%');
    query = query.not('photo_url', 'like', 'https://images.dog.ceo/%');
    query = query.not('photo_url', 'like', 'https://cdn2.thecatapi.com/%');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (petType !== 'all') {
      query = query.eq('pet_type', petType);
    }

    if (q) {
      // Simple "OR" search across a few fields
      query = query.or(
        [
          `pet_name.ilike.%${q}%`,
          `breed.ilike.%${q}%`,
          `color.ilike.%${q}%`,
          `description.ilike.%${q}%`,
          `location_city.ilike.%${q}%`
        ].join(',')
      );
    }

    query = query.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await query;

    if (error) {
      console.error('search v2 error:', error);
      return NextResponse.json(
        { success: false, error: error.message, pets: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pets: data || [] });
  } catch (err: any) {
    console.error('search v2 exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Search failed', pets: [] },
      { status: 500 }
    );
  }
}


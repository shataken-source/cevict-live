import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Database not configured', laws: [] },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const query = searchParams.get('q') || '';

    // Build query
    let dbQuery = supabase.from('laws').select('*');

    // Apply filters
    if (state && state !== 'all') {
      dbQuery = dbQuery.eq('state_code', state.toUpperCase());
    }
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    // Apply search query
    if (query) {
      dbQuery = dbQuery.or(
        `summary.ilike.%${query}%,state_name.ilike.%${query}%,category.ilike.%${query}%`
      );
    }

    // Order by most recent
    dbQuery = dbQuery.order('last_updated_at', { ascending: false }).limit(100);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ success: true, laws: [] });
    }

    return NextResponse.json({ success: true, laws: data || [] });
  } catch (error: any) {
    console.error('Laws API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load laws', laws: [] },
      { status: 500 }
    );
  }
}

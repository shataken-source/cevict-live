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
        { success: false, error: 'Database not configured', products: [] },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Build query
    let dbQuery = supabase.from('products').select('*').eq('active', true);

    // Apply category filter
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    // Order by sponsor first, then by name
    dbQuery = dbQuery.order('sponsor', { ascending: false }).order('name', { ascending: true });

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ success: true, products: [] });
    }

    return NextResponse.json({ success: true, products: data || [] });
  } catch (error: any) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load products', products: [] },
      { status: 500 }
    );
  }
}

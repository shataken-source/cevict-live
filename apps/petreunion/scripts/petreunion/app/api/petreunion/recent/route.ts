import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ pets: [], table_exists: false, db_configured: false }, { status: 200 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number(searchParams.get('limit') || '8');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(24, limitParam)) : 8;
    const status = searchParams.get('status');

    const client = createClient(supabaseUrl, supabaseKey);
    let query = client
      .from('lost_pets')
      // Select a safe subset of known columns to avoid missing-column errors
      .select('id,pet_name,pet_type,breed,color,status,location_city,location_state,photo_url,description,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Recent pets fetch error:', error.message);
      return NextResponse.json({ pets: [], table_exists: false, db_configured: true }, { status: 200 });
    }

    return NextResponse.json(
      { pets: Array.isArray(data) ? data : [], table_exists: true, db_configured: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Recent pets error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load recent pets' }, { status: 500 });
  }
}

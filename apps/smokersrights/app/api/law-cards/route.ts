import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get('state')?.toUpperCase();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    let query = supabase
      .from('sr_law_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (state) {
      query = query.eq('state', state);
    }

    const { data, error } = await query.limit(state ? 10 : 50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ laws: data || [] });
  } catch (err) {
    console.error('Error fetching law cards:', err);
    return NextResponse.json({ error: 'Failed to fetch laws' }, { status: 500 });
  }
}

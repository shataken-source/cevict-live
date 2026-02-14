import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('shelters')
      .select('id, shelter_name, email, city, state, zipcode, shelter_url, shelter_type')
      .order('shelter_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to load shelters', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, shelters: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}

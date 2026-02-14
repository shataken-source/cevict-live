import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const params = await props.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message || 'Failed to fetch pet' }, { status: 500 });
    }

    return NextResponse.json({ pet: data });
  } catch (error: any) {
    console.error('[PET API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch pet' }, { status: 500 });
  }
}


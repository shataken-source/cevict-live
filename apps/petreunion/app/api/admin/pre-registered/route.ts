import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const limit = Math.max(1, Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50, 200));

    const { data, error } = await supabase
      .from('pre_registered_pets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, pets: data || [] });
  } catch (error: any) {
    // If table doesn't exist yet, keep admin UI usable.
    const msg = error?.message || 'Failed';
    if (msg.includes('relation') && msg.includes('does not exist')) {
      return NextResponse.json({ success: true, pets: [], tableMissing: true });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}


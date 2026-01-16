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
      .from('pre_registered_pet_matches')
      .select(
        `
        id,
        pre_registered_pet_id,
        found_pet_id,
        match_score,
        score_breakdown,
        match_reasons,
        status,
        notified,
        created_at,
        pre:pre_registered_pet_id ( id, pet_name, pet_type, breed, color, size, age, gender, location_city, location_state, photo_url, owner_name, owner_email, owner_phone, subscription_status, subscription_expires_at ),
        found:found_pet_id ( id, pet_name, pet_type, breed, color, size, status, location_city, location_state, photo_url, source_platform, source_url )
      `
      )
      .order('match_score', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, matches: data || [] });
  } catch (error: any) {
    const msg = error?.message || 'Failed';
    if (msg.includes('relation') && msg.includes('does not exist')) {
      return NextResponse.json({ success: true, matches: [], tableMissing: true });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}


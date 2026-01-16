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

    // Prefer a rich select (includes joined pets) but fall back to a minimal select if schema differs.
    // This endpoint must never 500 just because optional columns/relationships aren't present.
    const richSelect = `
      id,
      source_pet_id,
      matched_pet_id,
      match_score,
      score_breakdown,
      match_reasons,
      status,
      notified,
      created_at,
      source:source_pet_id ( id, pet_name, pet_type, breed, color, size, status, location_city, location_state, photo_url, source_platform, source_url ),
      matched:matched_pet_id ( id, pet_name, pet_type, breed, color, size, status, location_city, location_state, photo_url, source_platform, source_url )
    `;

    let data: any[] | null = null;
    let error: any = null;

    const rich = await supabase.from('lost_pet_matches').select(richSelect).order('match_score', { ascending: false }).limit(limit);
    data = rich.data as any[] | null;
    error = rich.error;

    if (error) {
      const minimalSelect = 'id, source_pet_id, matched_pet_id, match_score, match_reasons, status, notified, created_at';
      const minimal = await supabase
        .from('lost_pet_matches')
        .select(minimalSelect)
        .order('match_score', { ascending: false })
        .limit(limit);
      data = minimal.data as any[] | null;
      error = minimal.error;
    }

    if (error) {
      const msg = String(error.message || '');
      // Common when migration hasn't been run yet (or PostgREST schema cache hasn't reloaded)
      if (msg.includes("Could not find the table 'public.lost_pet_matches' in the schema cache")) {
        return NextResponse.json({ success: true, tableMissing: true, matches: [] });
      }
      throw new Error(msg || 'Failed to load matches');
    }

    return NextResponse.json({ success: true, matches: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load matches' }, { status: 500 });
  }
}


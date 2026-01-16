import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const sp = request.nextUrl.searchParams;

    const limit = Math.max(1, Math.min(parseInt(sp.get('limit') || '50', 10) || 50, 200));
    const fields = (sp.get('fields') || '').trim().toLowerCase();
    const status = (sp.get('status') || '').trim();
    const petType = (sp.get('pet_type') || '').trim();
    const state = (sp.get('location_state') || '').trim();

    let q = supabase
      .from('lost_pets')
      .select(
        fields === 'all'
          ? '*'
          : 'id, pet_name, pet_type, breed, color, size, status, location_city, location_state, date_lost, photo_url, description, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') q = q.eq('status', status);
    if (petType && petType !== 'all') q = q.eq('pet_type', petType);
    if (state && state !== 'all') q = q.eq('location_state', state.toUpperCase());

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, pets: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load pets' }, { status: 500 });
  }
}


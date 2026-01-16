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

    const [{ count: total, error: e0 }, { count: lost, error: e1 }, { count: found, error: e2 }, { count: reunited, error: e3 }] =
      await Promise.all([
        supabase.from('lost_pets').select('*', { count: 'exact', head: true }),
        supabase.from('lost_pets').select('*', { count: 'exact', head: true }).eq('status', 'lost'),
        supabase.from('lost_pets').select('*', { count: 'exact', head: true }).eq('status', 'found'),
        supabase.from('lost_pets').select('*', { count: 'exact', head: true }).eq('status', 'reunited'),
      ]);

    const err = e0 || e1 || e2 || e3;
    if (err) throw new Error((err as any).message || 'Failed to count');

    return NextResponse.json({
      success: true,
      total: total || 0,
      by_status: { lost: lost || 0, found: found || 0, reunited: reunited || 0 },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load stats' }, { status: 500 });
  }
}


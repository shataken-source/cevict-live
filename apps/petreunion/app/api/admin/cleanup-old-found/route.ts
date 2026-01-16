import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { days?: number };
    const days = Math.max(1, Math.min(Number(body.days ?? 90) || 90, 3650));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('lost_pets')
      .delete()
      .eq('status', 'found')
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, deleted: (data || []).length, cutoff: cutoffDate.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Cleanup failed' }, { status: 500 });
  }
}


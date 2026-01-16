import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = String(ctx.params.id || '');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = (await request.json().catch(() => ({}))) as { status?: string };
    const status = (body.status || '').trim();
    if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('lost_pets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,status')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, pet: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = String(ctx.params.id || '');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('lost_pets').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete' }, { status: 500 });
  }
}


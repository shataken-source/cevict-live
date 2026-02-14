import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

/** GET - Get current user's monitor account (status_page_slug). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('monitor_accounts')
      .select('status_page_slug')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching account:', error);
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
    }
    return NextResponse.json({ status_page_slug: data?.status_page_slug ?? '' });
  } catch (e: any) {
    return NextResponse.json({ status_page_slug: '' });
  }
}

/** POST - Set status page slug. Body: { status_page_slug: string } */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  let slug = typeof body.status_page_slug === 'string' ? body.status_page_slug.trim().replace(/[^a-z0-9-_]/gi, '').toLowerCase() : '';
  if (slug.length > 64) slug = slug.slice(0, 64);
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('monitor_accounts')
      .upsert({ user_id: userId, status_page_slug: slug || null }, { onConflict: 'user_id' });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 });
      console.error('Error upserting account:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
    return NextResponse.json({ status_page_slug: slug, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save' }, { status: 500 });
  }
}

/**
 * User special dates – birthdays & anniversaries (shared GCC + WTV, same Supabase)
 * GET: list upcoming occasions (?daysAhead=45)
 * POST: add one or more dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const daysAhead = Math.min(365, Math.max(0, Number(searchParams.get('daysAhead')) || 45));
  const { data, error } = await supabase
    .from('user_special_dates')
    .select('*')
    .eq('user_id', user.id)
    .order('occasion_date', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const today = new Date();
  const end = new Date();
  end.setDate(today.getDate() + daysAhead);
  const anniversaries: any[] = [];
  const birthdays: any[] = [];
  for (const row of data || []) {
    const d = new Date(row.occasion_date);
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear >= today && thisYear <= end) {
      const item = { type: row.type, date: thisYear, name: row.name, originalBookingDate: row.original_booking_date };
      if (row.type === 'anniversary') anniversaries.push(item);
      else birthdays.push(item);
    }
  }
  anniversaries.sort((a, b) => a.date.getTime() - b.date.getTime());
  birthdays.sort((a, b) => a.date.getTime() - b.date.getTime());
  return NextResponse.json({ anniversaries, birthdays });
}

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.dates) ? body.dates : body.anniversaries || body.birthdays || [];
  const type = (body.type as string) || 'anniversary';
  const toDateStr = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v.slice(0, 10);
    if (v && typeof v.toISOString === 'function') return v.toISOString().slice(0, 10);
    return null;
  };
  const toInsert = items
    .map((item: any) => ({
      user_id: user.id,
      type: item.type || type,
      occasion_date: toDateStr(item.date ?? item.occasion_date),
      name: item.name ?? null,
      original_booking_date: toDateStr(item.originalBookingDate ?? item.original_booking_date) ?? null,
    }))
    .filter((row: any) => row.occasion_date);
  if (toInsert.length === 0) {
    const occasion = toDateStr(body.occasion_date ?? body.date);
    if (occasion) toInsert.push({ user_id: user.id, type: body.type || 'anniversary', occasion_date: occasion, name: body.name ?? null, original_booking_date: toDateStr(body.original_booking_date) ?? null });
  }
  if (toInsert.length === 0) return NextResponse.json({ error: 'No dates to add' }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { data, error } = await supabase.from('user_special_dates').insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ added: data?.length ?? 0, data }, { status: 201 });
}

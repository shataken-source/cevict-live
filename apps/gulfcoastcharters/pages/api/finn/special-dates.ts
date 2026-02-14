/**
 * User special dates – birthdays & anniversaries (shared GCC + WTV, same Supabase)
 * GET: list upcoming occasions
 * POST: add one or more dates
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServer, getAuthedUser } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = user.id;

  if (req.method === 'GET') {
    const supabase = getSupabaseServer(req, res);
    const { data, error } = await supabase
      .from('user_special_dates')
      .select('*')
      .eq('user_id', userId)
      .order('occasion_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const daysAhead = Math.min(365, Math.max(0, Number(req.query.daysAhead) || 45));
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + daysAhead);
    const anniversaries: any[] = [];
    const birthdays: any[] = [];
    for (const row of data || []) {
      const d = new Date(row.occasion_date);
      const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (thisYear >= today && thisYear <= end) {
        const item = {
          type: row.type,
          date: thisYear,
          name: row.name,
          originalBookingDate: row.original_booking_date,
        };
        if (row.type === 'anniversary') anniversaries.push(item);
        else birthdays.push(item);
      }
    }
    anniversaries.sort((a, b) => a.date.getTime() - b.date.getTime());
    birthdays.sort((a, b) => a.date.getTime() - b.date.getTime());
    return res.status(200).json({ anniversaries, birthdays });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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
        user_id: userId,
        type: item.type || type,
        occasion_date: toDateStr(item.date ?? item.occasion_date),
        name: item.name ?? null,
        original_booking_date: toDateStr(item.originalBookingDate ?? item.original_booking_date) ?? null,
      }))
      .filter((row: any) => row.occasion_date);
    if (toInsert.length === 0) {
      const occasion = toDateStr(body.occasion_date ?? body.date);
      if (occasion) toInsert.push({ user_id: userId, type: body.type || 'anniversary', occasion_date: occasion, name: body.name ?? null, original_booking_date: toDateStr(body.original_booking_date) ?? null });
    }
    if (toInsert.length === 0) return res.status(400).json({ error: 'No dates to add' });
    const supabase = getSupabaseServer(req, res);
    const { data, error } = await supabase.from('user_special_dates').insert(toInsert).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ added: data?.length ?? 0, data });
  }

  return res.setHeader('Allow', 'GET, POST').status(405).end();
}

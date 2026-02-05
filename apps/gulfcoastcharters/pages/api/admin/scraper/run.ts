import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['admin']);
  if (!ok) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getSupabaseAdmin();

  // Load config (best-effort)
  const { data: config } = await admin
    .from('scraper_config')
    .select('sources,filters,max_boats_per_run')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  const sourcesObj = (config?.sources || {}) as Record<string, boolean>;
  const sources = Object.entries(sourcesObj)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([k]) => k);

  const states = ((config?.filters as any)?.states || []) as string[];
  const filterState = states?.[0] || null;
  const maxBoats = Number(config?.max_boats_per_run ?? 10);

  // Mark running (best-effort)
  await admin.from('scraper_status').update({ is_running: true, updated_at: new Date().toISOString() }).eq('id', 1);

  try {
    // Requires the Supabase Edge Function to be deployed:
    // supabase functions deploy enhanced-smart-scraper
    const { data, error } = await admin.functions.invoke('enhanced-smart-scraper', {
      body: {
        mode: 'manual',
        sources,
        filterState,
        maxBoats,
      },
    });

    if (error) return res.status(502).json({ error: error.message || 'Scraper function failed' });

    // Update status totals (best-effort)
    await admin
      .from('scraper_status')
      .update({
        is_running: false,
        last_run: new Date().toISOString(),
        total_boats_scraped: (data?.scrapedBoats?.length as number) ?? 0,
        new_boats_today: (data?.newBoats as number) ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    return res.status(200).json({ success: true, result: data });
  } catch (e: any) {
    await admin.from('scraper_status').update({ is_running: false, updated_at: new Date().toISOString() }).eq('id', 1);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}


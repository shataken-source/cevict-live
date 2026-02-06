import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['admin']);
  if (!ok) return;

  const admin = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('scraper_config')
      .select('id,sources,filters,schedule,max_boats_per_run,updated_at')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    // Default config with all available sources
    const defaultConfig = {
      sources: {
        thehulltruth: false,
        craigslist: true,
        google: true,
        web_search: true,
        known_sites: false,
        facebook: false,
        instagram: false,
      },
      filters: { states: ['AL', 'FL', 'MS', 'LA', 'TX'] },
      schedule: { enabled: false },
      max_boats_per_run: 10,
    };

    // Merge database config with defaults to ensure all sources are present
    const mergedConfig = data
      ? {
          ...defaultConfig,
          ...data,
          sources: {
            ...defaultConfig.sources,
            ...(data.sources || {}),
          },
        }
      : defaultConfig;

    return res.status(200).json({
      config: mergedConfig,
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const payload = {
      sources: body.sources ?? {},
      filters: body.filters ?? {},
      schedule: body.schedule ?? {},
      max_boats_per_run: Number(body.max_boats_per_run ?? 10),
      updated_at: new Date().toISOString(),
    };

    // Update first row (or insert if missing)
    const { data: existing } = await admin.from('scraper_config').select('id').order('id', { ascending: true }).limit(1).maybeSingle();
    if (existing?.id) {
      const { error } = await admin.from('scraper_config').update(payload).eq('id', existing.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    const { error } = await admin.from('scraper_config').insert(payload);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


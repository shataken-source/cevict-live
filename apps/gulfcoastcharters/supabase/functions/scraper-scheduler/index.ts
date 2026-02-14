/**
 * Scraper Scheduler Edge Function
 *
 * Intended to be invoked by Supabase Cron (e.g. weekly). Reads scraper_urls (active),
 * calls enhanced-smart-scraper for each URL (manual_url mode), persists results to
 * scraped_boats, updates last_scraped. Rate limit: 2s between requests.
 *
 * Requires: scraper_urls table, enhanced-smart-scraper deployed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MS = 2000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: rows } = await admin
      .from('scraper_urls')
      .select('id, url, name')
      .eq('active', true)
      .order('priority', { ascending: false });

    const urls = rows ?? [];
    const results: { url: string; name: string; success: boolean; boat?: boolean }[] = [];
    const functionsUrl = `${supabaseUrl}/functions/v1/enhanced-smart-scraper`;

    for (const row of urls) {
      try {
        const res = await fetch(functionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRole}`,
          },
          body: JSON.stringify({ mode: 'manual_url', url: row.url }),
        });
        const data = await res.json().catch(() => ({}));

        const hasBoat = data?.boat && typeof data.boat === 'object';
        if (hasBoat) {
          const boat = data.boat as Record<string, unknown>;
          const now = new Date().toISOString();
          const validation = data.validation ?? {};
          const existing = await admin
            .from('scraped_boats')
            .select('id, times_seen')
            .eq('source_url', boat.source_url ?? row.url)
            .maybeSingle();

          const rowData = {
            source: boat.source ?? 'scraper-scheduler',
            source_url: boat.source_url ?? row.url,
            name: boat.name ?? null,
            location: boat.location ?? null,
            captain: boat.captain ?? null,
            phone: boat.phone ?? null,
            email: boat.email ?? null,
            boat_type: boat.boat_type ?? null,
            length: boat.length ?? null,
            description: boat.description ?? null,
            last_seen: now,
            data_complete: validation.isComplete ?? false,
            missing_fields: validation.missingFields ?? [],
            data_quality_score: validation.dataQualityScore ?? 0,
          };

          if (existing?.id) {
            await admin
              .from('scraped_boats')
              .update({
                ...rowData,
                times_seen: (existing.times_seen ?? 0) + 1,
              })
              .eq('id', existing.id);
          } else {
            await admin.from('scraped_boats').insert({
              ...rowData,
              first_seen: now,
              times_seen: 1,
              claimed: false,
            });
          }
        }

        await admin
          .from('scraper_urls')
          .update({ last_scraped: new Date().toISOString() })
          .eq('id', row.id);

        results.push({ url: row.url, name: row.name, success: res.ok, boat: hasBoat });
      } catch (err) {
        console.error(`[scraper-scheduler] ${row.url}:`, err);
        results.push({ url: row.url, name: row.name, success: false });
      }

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

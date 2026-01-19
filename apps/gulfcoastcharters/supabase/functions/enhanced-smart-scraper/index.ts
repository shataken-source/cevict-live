/**
 * enhanced-smart-scraper (Supabase Edge Function)
 *
 * Minimal, production-safe scraper:
 * - Fetches a few public pages (HullTruth + Craigslist RSS)
 * - Extracts basic fields via regex (best-effort)
 * - Validates required fields, computes missing fields + quality score
 * - Upserts into `scraped_boats`
 * - Writes `scraper_logs` + `scraper_failure_reports`
 *
 * IMPORTANT:
 * - Scraping is best-effort and can break if upstream HTML changes.
 * - Keep request volume low; respect rate limits.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_FIELDS = ['name', 'location', 'captain', 'phone', 'boat_type', 'length'] as const;

type ScrapedBoat = {
  source: string;
  source_url?: string | null;
  source_post_id?: string | null;
  name?: string | null;
  location?: string | null;
  captain?: string | null;
  phone?: string | null;
  email?: string | null;
  boat_type?: string | null;
  length?: number | null;
  description?: string | null;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function validateBoat(b: ScrapedBoat) {
  const missing: string[] = [];
  const has = (k: keyof ScrapedBoat) => {
    const v = b[k];
    if (typeof v === 'number') return Number.isFinite(v) && v > 0;
    return Boolean(String(v || '').trim());
  };

  for (const f of REQUIRED_FIELDS) {
    if (f === 'length') {
      if (!has('length')) missing.push('length');
      continue;
    }
    if (!has(f as any)) missing.push(f);
  }

  // Minimum info: name + location (or phone/email)
  const hasMinimumInfo = has('name') && (has('location') || has('phone') || has('email'));

  // Simple quality scoring (0-100): 15 points per required field, +10 if has description
  let score = 0;
  for (const f of REQUIRED_FIELDS) score += missing.includes(f) ? 0 : 15;
  if (has('description')) score += 10;
  score = clamp(score, 0, 100);

  return {
    missingFields: missing,
    dataQualityScore: score,
    isComplete: missing.length === 0,
    hasMinimumInfo,
  };
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'gulfcoastcharters (enhanced-smart-scraper; contact: support@gulfcoastcharters.com)',
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function extractPhone(text: string): string | null {
  const m = text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  return m?.[1] ? clean(m[1]) : null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m?.[1] ? clean(m[1]) : null;
}

function extractLengthAndType(text: string): { length: number | null; boat_type: string | null } {
  // Try: "26 ft Contender", "32' SeaVee", etc.
  const m = text.match(/(\d{2,3})\s*(?:ft|foot|')\s*([A-Za-z][A-Za-z0-9 \-]{2,30})/i);
  if (!m?.[1]) return { length: null, boat_type: null };
  const len = Number(m[1]);
  const type = m[2] ? clean(m[2]) : null;
  return { length: Number.isFinite(len) ? len : null, boat_type: type };
}

async function scrapeHullTruth(target: number): Promise<ScrapedBoat[]> {
  const out: ScrapedBoat[] = [];
  const baseUrl = 'https://www.thehulltruth.com';
  const forumUrl = `${baseUrl}/boating-forum/charter-boat-business/`;
  const html = await fetchText(forumUrl);

  // Very simple extraction: thread links from hrefs that look like /boating-forum/charter-boat-business/...
  const links = Array.from(html.matchAll(/href=\"(\/boating-forum\/charter-boat-business\/[^\"#]+)\"/g))
    .map((m) => m[1])
    .filter(Boolean);

  const unique = Array.from(new Set(links)).slice(0, Math.max(target * 2, 10));

  for (const rel of unique) {
    if (out.length >= target) break;
    const url = `${baseUrl}${rel}`;
    try {
      const threadHtml = await fetchText(url);
      // Title
      const title = clean((threadHtml.match(/<title>([^<]+)<\/title>/i)?.[1] || '').replace(/\s-\sThe Hull Truth.*$/i, ''));
      if (!title || !title.match(/charter|fishing|captain|boat/i)) continue;

      // First message snippet (best-effort)
      const bodyText = clean(
        (threadHtml.match(/<article[^>]*>([\s\S]{0,8000})<\/article>/i)?.[1] || '')
          .replace(/<[^>]+>/g, ' ')
      );

      const phone = extractPhone(bodyText);
      const email = extractEmail(bodyText);
      const { length, boat_type } = extractLengthAndType(`${title} ${bodyText}`);

      const location =
        bodyText.match(/\b(Orange Beach|Gulf Shores|Destin|Pensacola|Panama City|Biloxi|Gulfport|Galveston|Port Aransas|New Orleans)\b/i)?.[1] ??
        null;

      out.push({
        source: 'thehulltruth',
        source_url: url,
        source_post_id: rel.split('/').filter(Boolean).pop() ?? null,
        name: title,
        captain: null,
        phone,
        email,
        location,
        boat_type,
        length,
        description: bodyText ? bodyText.slice(0, 500) : null,
      });
    } catch {
      // ignore individual failures
    }
  }

  return out;
}

async function scrapeCraigslistRss(target: number, state?: string | null): Promise<ScrapedBoat[]> {
  // Craigslist RSS is city-specific; this is a best-effort “nationwide-ish” fallback using a few Gulf cities.
  // FilterState is kept for future expansion.
  const cities = ['pensacola', 'mobile', 'miami', 'neworleans', 'houston', 'tampa', 'jacksonville'];
  const out: ScrapedBoat[] = [];

  for (const city of cities) {
    if (out.length >= target) break;
    const url = `https://${city}.craigslist.org/search/sss?format=rss&query=charter%20boat`;
    try {
      const xml = await fetchText(url);
      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, 10);
      for (const item of items) {
        if (out.length >= target) break;
        const blob = item[1] || '';
        const title = clean(blob.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] || blob.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
        const link = clean(blob.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
        const descRaw = blob.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] || '';
        const desc = clean(descRaw.replace(/<[^>]+>/g, ' ')).slice(0, 500);

        const phone = extractPhone(descRaw);
        const email = extractEmail(descRaw);
        const { length, boat_type } = extractLengthAndType(`${title} ${desc}`);

        out.push({
          source: 'craigslist',
          source_url: link || null,
          source_post_id: link ? link.split('/').pop()?.split('.').shift() ?? null : null,
          name: title || null,
          location: city,
          captain: null,
          phone,
          email,
          boat_type,
          length,
          description: desc || null,
        });
      }
    } catch {
      // ignore
    }
  }

  // best-effort filter by state token if provided (e.g., "FL")
  if (state) {
    const token = String(state).trim().toLowerCase();
    if (token) return out.filter((b) => String(b.location || '').toLowerCase().includes(token)).slice(0, target);
  }

  return out.slice(0, target);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const startedAt = new Date().toISOString();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = String(body?.mode || 'manual');
  const sourcesRaw = body?.sources;
  const sources: string[] = Array.isArray(sourcesRaw) ? sourcesRaw.map(String) : [];
  const filterState = body?.filterState ? String(body.filterState) : null;
  const maxBoats = clamp(Number(body?.maxBoats ?? 10) || 10, 1, 100);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const results = {
    mode,
    timestamp: startedAt,
    targetBoats: maxBoats,
    scrapedBoats: [] as ScrapedBoat[],
    completeBoats: [] as ScrapedBoat[],
    incompleteBoats: [] as any[],
    failures: [] as any[],
    newBoats: 0,
    updatedBoats: 0,
    errors: [] as any[],
  };

  try {
    const wanted = new Set((sources.length ? sources : ['thehulltruth', 'craigslist']).map((s) => s.toLowerCase()));

    if (wanted.has('thehulltruth')) {
      results.scrapedBoats.push(...(await scrapeHullTruth(maxBoats)));
    }
    if (wanted.has('craigslist')) {
      results.scrapedBoats.push(...(await scrapeCraigslistRss(maxBoats, filterState)));
    }

    results.scrapedBoats = results.scrapedBoats.slice(0, maxBoats);

    for (const boat of results.scrapedBoats) {
      const v = validateBoat(boat);

      if (v.isComplete) results.completeBoats.push(boat);
      else if (v.hasMinimumInfo) results.incompleteBoats.push({ ...boat, missingFields: v.missingFields });
      else {
        results.failures.push({ boat, reason: 'Missing critical information', missingFields: v.missingFields });
        continue;
      }

      // Upsert: attempt to match by name OR phone OR email (best-effort)
      const keyName = String(boat.name || '').replace(/[,]/g, ' ');
      const keyPhone = String(boat.phone || '').replace(/[,]/g, ' ');
      const keyEmail = String(boat.email || '').replace(/[,]/g, ' ');

      const { data: existing } = await admin
        .from('scraped_boats')
        .select('id,times_seen')
        .or(`name.eq.${keyName},phone.eq.${keyPhone},email.eq.${keyEmail}`)
        .maybeSingle();

      const now = new Date().toISOString();
      if (existing?.id) {
        const { error } = await admin
          .from('scraped_boats')
          .update({
            ...boat,
            last_seen: now,
            times_seen: (existing.times_seen || 0) + 1,
            data_complete: v.isComplete,
            missing_fields: v.missingFields,
            data_quality_score: v.dataQualityScore,
            updated_at: now,
          })
          .eq('id', existing.id);

        if (error) results.errors.push({ boat: boat.name, error: error.message, action: 'update' });
        else results.updatedBoats++;
      } else {
        const { error } = await admin.from('scraped_boats').insert({
          ...boat,
          first_seen: now,
          last_seen: now,
          times_seen: 1,
          claimed: false,
          data_complete: v.isComplete,
          missing_fields: v.missingFields,
          data_quality_score: v.dataQualityScore,
          created_at: now,
          updated_at: now,
        });

        if (error) results.errors.push({ boat: boat.name, error: error.message, action: 'insert' });
        else results.newBoats++;
      }
    }

    // Logs
    await admin.from('scraper_logs').insert({
      mode,
      sources: Array.from(wanted.values()),
      filter_state: filterState,
      target_boats: maxBoats,
      boats_scraped: results.scrapedBoats.length,
      complete_boats: results.completeBoats.length,
      incomplete_boats: results.incompleteBoats.length,
      new_boats: results.newBoats,
      updated_boats: results.updatedBoats,
      failures_count: results.failures.length,
      errors_count: results.errors.length,
      errors: results.errors.length ? results.errors : null,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    if (results.failures.length || results.incompleteBoats.length) {
      await admin.from('scraper_failure_reports').insert({
        run_timestamp: startedAt,
        mode,
        sources: Array.from(wanted.values()),
        total_failures: results.failures.length,
        total_incomplete: results.incompleteBoats.length,
        failures: results.failures,
        incomplete_boats: results.incompleteBoats,
        created_at: new Date().toISOString(),
      });
    }

    if (results.newBoats > 0) {
      await admin.from('notifications').insert({
        type: 'scraper_results',
        title: `🔍 Scraper Found ${results.newBoats} New Boats!`,
        message: `Complete: ${results.completeBoats.length}, Incomplete: ${results.incompleteBoats.length}, Failed: ${results.failures.length}`,
        user_id: null,
        link_url: '/admin/scraper-reports',
        metadata: {
          completeBoats: results.completeBoats.length,
          incompleteBoats: results.incompleteBoats.length,
          failures: results.failures.length,
        },
      });
    }

    return json({
      success: true,
      ...results,
      summary: {
        targeted: maxBoats,
        found: results.scrapedBoats.length,
        complete: results.completeBoats.length,
        incomplete: results.incompleteBoats.length,
        saved: results.newBoats + results.updatedBoats,
        failed: results.failures.length,
      },
    });
  } catch (e: any) {
    return json({ error: 'Internal error', details: String(e?.message || e) }, { status: 500 });
  }
});


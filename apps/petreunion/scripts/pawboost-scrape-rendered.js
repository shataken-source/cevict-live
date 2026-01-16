/* eslint-disable no-console */
/**
 * Standalone PawBoost rendered scraper (Playwright) that writes directly to Supabase.
 * Designed for Windows Task Scheduler (does not require Next.js dev server).
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 * - PETREUNION_RUN_MATCHER_URL (e.g. https://petreunion.org) to trigger /api/petreunion/run-matcher after saving
 */

const { chromium } = require('playwright');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36';

function arg(name, fallback) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function toTitle(text) {
  return String(text || '')
    .split(/[-_]/)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''))
    .filter(Boolean)
    .join(' ');
}

function buildBrowseUrl(status, page, species) {
  const statusCode = status === 'lost' ? 100 : 101;
  const base = `https://www.pawboost.com/lost-found-pets?status=${statusCode}`;
  const withSpecies = species ? `${base}&species=${species}` : base;
  return `${withSpecies}&page=${page}`;
}

function parseListings(html, fallbackStatus) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const listings = [];

  function parseLandingUrl(href) {
    const abs = href.startsWith('http') ? href : `https://www.pawboost.com${href}`;
    const u = new URL(abs);
    const parts = u.pathname.split('/').filter(Boolean);
    const petIdx = parts.indexOf('pet');
    const postId = petIdx >= 0 && parts[petIdx + 1] ? parts[petIdx + 1] : null;
    const slug = parts[parts.length - 1] || '';
    const slugParts = slug.split('-').filter(Boolean);
    const inferredStatus = slugParts[0] === 'lost' ? 'lost' : slugParts[0] === 'found' ? 'found' : null;
    const petName = slugParts.length > 1 ? toTitle(slugParts[1]) : null;
    const zip = slugParts.length >= 2 && /^\d{5}$/.test(slugParts[slugParts.length - 1]) ? slugParts[slugParts.length - 1] : null;
    const st =
      slugParts.length >= 3 && /^[A-Za-z]{2}$/.test(slugParts[slugParts.length - 2]) ? slugParts[slugParts.length - 2].toUpperCase() : null;
    const city = slugParts.length >= 4 && st ? toTitle(slugParts.slice(2, slugParts.length - (zip ? 2 : 1)).join('-')) : null;
    return { abs, postId, inferredStatus, petName, city, state: st };
  }

  const linkCandidates = $('a[href^="/landing/pet/"], a[href*="/landing/pet/"]');
  linkCandidates.each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.includes('/landing/pet/')) return;
    let parsed;
    try {
      parsed = parseLandingUrl(href);
    } catch {
      return;
    }
    if (!parsed.postId) return;
    if (seen.has(parsed.postId)) return;
    seen.add(parsed.postId);

    const $card = $(el).closest('article, li, div');
    const cardText = $card.text().replace(/\s+/g, ' ').trim();
    let pet_name = parsed.petName || 'Pet';
    const headerText = $card.find('h1,h2,h3,h4,strong').first().text().trim();
    if (headerText && headerText.length <= 40) pet_name = headerText;

    const lower = cardText.toLowerCase();
    const pet_type = lower.includes('cat') || lower.includes('kitten') ? 'cat' : 'dog';

    let location_city = parsed.city || null;
    let location_state = parsed.state || null;
    const locMatch = cardText.match(/([A-Za-z][A-Za-z.\s]+),\s*([A-Z]{2})\b/);
    if (!location_state && locMatch) {
      location_city = locMatch[1].trim();
      location_state = locMatch[2].trim();
    }

    let photo_url = null;
    const img = $(el).find('img').attr('src') || $card.find('img').first().attr('src') || '';
    if (img) photo_url = img.startsWith('//') ? `https:${img}` : img;

    listings.push({
      source_post_id: `pawboost_${parsed.postId}`,
      source_url: parsed.abs,
      pet_name,
      status: parsed.inferredStatus || fallbackStatus,
      pet_type,
      location_city,
      location_state,
      photo_url,
      description: cardText ? cardText.slice(0, 500) : null,
    });
  });

  return listings;
}

function inferBreed(desc) {
  const d = String(desc || '').toLowerCase();
  const m = d.match(
    /\b(yorkie|yorkshire terrier|labrador|lab|golden retriever|german shepherd|husky|beagle|boxer|poodle|pit bull|pitbull|terrier|dachshund|chihuahua|bulldog|corgi|rottweiler|doberman|mastiff|great dane)\b/i
  );
  if (!m) return null;
  const raw = m[1].toLowerCase();
  if (raw === 'lab') return 'Labrador';
  if (raw === 'pitbull') return 'Pit Bull';
  if (raw === 'yorkie') return 'Yorkshire Terrier';
  return raw
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function inferColor(desc) {
  const d = String(desc || '').toLowerCase();
  const m = d.match(/\b(black|white|brown|tan|gray|grey|brindle|orange|golden|cream)\b/i);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  return raw === 'grey' ? 'Gray' : raw[0].toUpperCase() + raw.slice(1);
}

function inferSize(desc) {
  const d = String(desc || '').toLowerCase();
  if (/\b(tiny|teacup)\b/.test(d)) return 'small';
  const m = d.match(/\b(small|medium|large|giant)\b/i);
  return m ? m[1].toLowerCase() : null;
}

async function fetchRendered(url, fallbackStatus, timeoutMs) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1280, height: 720 }, locale: 'en-US' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(1500);
    const html = await page.content();
    await context.close();
    return { html, listings: parseListings(html, fallbackStatus) };
  } finally {
    await browser.close();
  }
}

async function main() {
  const maxPets = parseInt(arg('maxPets', process.env.PAWBOOST_MAX_PETS || '200'), 10) || 200;
  const maxPages = parseInt(arg('maxPages', process.env.PAWBOOST_MAX_PAGES || '5'), 10) || 5;
  const states = String(arg('states', process.env.PAWBOOST_STATES || 'AL'))
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const save = String(arg('save', 'true')).toLowerCase() !== 'false';
  const timeoutMs = parseInt(arg('timeoutMs', process.env.PAWBOOST_TIMEOUT_MS || '60000'), 10) || 60000;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = save && supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
  if (save && !supabase) {
    console.error('Missing SUPABASE credentials (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
    process.exitCode = 2;
    return;
  }

  const all = [];
  const debugRequests = [];

  for (const state of states) {
    for (const status of ['lost', 'found']) {
      for (const species of ['Dog', 'Cat']) {
        for (let page = 1; page <= maxPages; page++) {
          if (all.length >= maxPets) break;
          const url = buildBrowseUrl(status, page, species);
          try {
            const res = await fetchRendered(url, status, timeoutMs);
            debugRequests.push({ url, listings: res.listings.length });
            for (const l of res.listings) {
              if (all.length >= maxPets) break;
              if (l.location_state && String(l.location_state).toUpperCase() !== state) continue;
              all.push(l);
            }
          } catch (e) {
            debugRequests.push({ url, error: String(e && e.message ? e.message : e) });
          }
        }
      }
    }
  }

  // de-dupe within run
  const uniq = [];
  const seen = new Set();
  for (const p of all) {
    if (seen.has(p.source_post_id)) continue;
    seen.add(p.source_post_id);
    uniq.push(p);
  }

  let inserted = 0;
  let skipped = 0;

  if (save && supabase && uniq.length) {
    // Existing by source_post_id
    const existing = new Set();
    const chunkSize = 250;
    for (let i = 0; i < uniq.length; i += chunkSize) {
      const chunk = uniq.slice(i, i + chunkSize).map((p) => p.source_post_id);
      const { data, error } = await supabase.from('lost_pets').select('source_post_id').in('source_post_id', chunk);
      if (error) throw new Error(error.message);
      for (const r of data || []) existing.add(r.source_post_id);
    }

    const toInsert = uniq.filter((p) => !existing.has(p.source_post_id));
    skipped = uniq.length - toInsert.length;

    if (toInsert.length) {
      const payload = toInsert.map((p) => ({
        pet_name: p.pet_name || null,
        pet_type: p.pet_type || 'dog',
        breed: inferBreed(p.description) || 'Mixed',
        color: inferColor(p.description) || 'Unknown',
        size: inferSize(p.description) || 'medium',
        age: null,
        gender: 'unknown',
        status: p.status,
        location_city: p.location_city || null,
        location_state: (p.location_state || null),
        description: p.description || null,
        photo_url: p.photo_url || null,
        source_platform: 'pawboost',
        source_url: p.source_url,
        source_post_id: p.source_post_id,
        shelter_name: null,
      }));

      const { error } = await supabase.from('lost_pets').insert(payload);
      if (error) throw new Error(error.message);
      inserted = payload.length;
    }
  }

  const summary = {
    success: true,
    states,
    maxPets,
    scraped: uniq.length,
    inserted,
    skipped,
    sample: uniq.slice(0, 5),
    debugRequests,
  };

  console.log(JSON.stringify(summary, null, 2));

  const matcherBase = process.env.PETREUNION_RUN_MATCHER_URL || null;
  if (matcherBase) {
    try {
      const resp = await fetch(`${String(matcherBase).replace(/\/+$/, '')}/api/petreunion/run-matcher`, { method: 'POST' });
      const text = await resp.text();
      console.log(`[matcher] HTTP ${resp.status}: ${text.slice(0, 500)}`);
    } catch (e) {
      console.warn('[matcher] call failed:', String(e && e.message ? e.message : e));
    }
  }
}

main().catch((e) => {
  console.error('Fatal:', e && e.stack ? e.stack : e);
  process.exitCode = 1;
});


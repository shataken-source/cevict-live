/**
 * Syndicate Progno picks to Prognostication website
 *
 * Fetches today's picks from Supabase, applies tier logic matching
 * Prognostication's allocateTiers thresholds, then POSTs each tier
 * to the Prognostication webhook endpoint.
 *
 * Usage:
 *   npx tsx scripts/syndicate-to-prognostication.ts
 *   npx tsx scripts/syndicate-to-prognostication.ts --date 2026-02-22
 *   npx tsx scripts/syndicate-to-prognostication.ts --dry-run
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
}

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_KEY = process.env.PROGNO_INTERNAL_API_KEY || process.env.PROGNO_API_KEY!;
const WEBHOOK_URL = process.env.PROGNOSTICATION_WEBHOOK_URL
  || 'https://prognostication.com/api/webhooks/progno';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const dateArgEq = args.find(a => a.startsWith('--date='))?.split('=')[1];
const dateIdx = args.indexOf('--date');
const dateArgPos = dateIdx >= 0 ? args[dateIdx + 1] : undefined;
const dateArg = dateArgEq || (dateArgPos && !dateArgPos.startsWith('--') ? dateArgPos : undefined);
const TARGET_DATE = dateArg || new Date().toISOString().split('T')[0];

// ── Tier thresholds (must match Prognostication's allocateTiers) ─────────────
// elite:   confidence >= 80  (top picks, full analysis)
// pro:     confidence 65-79  (mid-tier, full analysis)
// free:    confidence < 65   (leftovers, no analysis stripped server-side)
const ELITE_THRESHOLD = 80;
const PRO_THRESHOLD = 65;

// ── Types ────────────────────────────────────────────────────────────────────
interface RawPick {
  id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  game_matchup?: string;
  pick: string;
  pick_type?: string;
  confidence: number;
  odds?: number;
  game_time?: string;
  game_id?: string;
  value_bet_edge?: number;
  expected_value?: number;
  analysis?: string;
  reasoning?: string | string[];
  tier?: string;
  recommended_line?: number;
  mc_win_probability?: number;
  composite_score?: number;
  triple_align?: boolean;
  powered_by?: string;
  created_at: string;
}

interface SyndicationPick {
  game_id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  game_matchup: string;
  pick: string;
  pick_type: string;
  confidence: number;
  odds: number | null;
  game_time: string | null;
  value_bet_edge: number;
  expected_value: number;
  analysis: string;
  reasoning: string;
  tier: string;
  mc_win_probability: number | null;
  composite_score: number | null;
  triple_align: boolean;
  source: string;
}

// ── Fetch picks from Supabase Storage bucket ─────────────────────────────────
// Picks are stored as predictions-YYYY-MM-DD.json in the 'predictions' bucket.
// Falls back to: predictions-early-YYYY-MM-DD.json, then the picks DB table.
async function fetchPicksFromSupabase(date: string): Promise<RawPick[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const storageBase = `${SUPABASE_URL}/storage/v1/object/predictions`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };

  // Try regular predictions file
  for (const fileName of [`predictions-${date}.json`, `predictions-early-${date}.json`]) {
    try {
      const res = await fetch(`${storageBase}/${fileName}`, { headers });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        const picks: RawPick[] = parsed.picks || parsed;
        if (Array.isArray(picks) && picks.length > 0) {
          console.log(`  Source: storage/${fileName} (${picks.length} picks)`);
          return picks;
        }
      }
    } catch { /* try next */ }
  }

  // Fallback: Supabase DB picks table (36-hour window)
  const windowStart = `${date}T00:00:00`;
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const windowEnd = nextDay.toISOString().split('T')[0] + 'T12:00:00';
  const tableUrl = `${SUPABASE_URL}/rest/v1/picks?select=*&created_at=gte.${windowStart}&created_at=lt.${windowEnd}&order=confidence.desc`;

  const res = await fetch(tableUrl, {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

  if (res.ok) {
    const data: RawPick[] = await res.json();
    if (data.length > 0) {
      console.log(`  Source: picks table (${data.length} picks)`);
      return data;
    }
  }

  return [];
}

// ── Transform raw pick to syndication format ─────────────────────────────────
function transformPick(p: RawPick, tier: string): SyndicationPick {
  const reasoning = Array.isArray(p.reasoning)
    ? p.reasoning.join(' ')
    : (p.reasoning || p.analysis || '');

  return {
    game_id: p.game_id || p.id,
    sport: (p.sport || p.league || 'UNKNOWN').toUpperCase(),
    league: (p.league || p.sport || 'UNKNOWN').toUpperCase(),
    home_team: p.home_team,
    away_team: p.away_team,
    game_matchup: p.game_matchup || `${p.away_team} @ ${p.home_team}`,
    pick: p.pick,
    pick_type: p.pick_type || 'MONEYLINE',
    confidence: p.confidence,
    odds: p.odds ?? null,
    game_time: p.game_time ?? null,
    value_bet_edge: p.value_bet_edge ?? 0,
    expected_value: p.expected_value ?? 0,
    analysis: p.analysis || '',
    reasoning: reasoning,
    tier,
    mc_win_probability: p.mc_win_probability ?? null,
    composite_score: p.composite_score ?? null,
    triple_align: p.triple_align ?? false,
    source: 'progno-engine',
  };
}

// ── Allocate tiers (mirrors Prognostication's allocateTiers logic) ───────────
function allocateTiers(picks: RawPick[]): { elite: RawPick[]; pro: RawPick[]; free: RawPick[] } {
  // Sort by composite_score desc, then confidence desc, then edge desc
  const sorted = [...picks].sort((a, b) => {
    const scoreA = (a.composite_score ?? 0) || ((a.value_bet_edge ?? 0) * 2.5 + a.confidence);
    const scoreB = (b.composite_score ?? 0) || ((b.value_bet_edge ?? 0) * 2.5 + b.confidence);
    return scoreB - scoreA;
  });

  const used = new Set<string>();

  // Elite: confidence >= 80 (or tier === 'elite' from Progno)
  const elite = sorted.filter(p =>
    (p.confidence >= ELITE_THRESHOLD || p.tier === 'elite') && !used.has(p.id)
  );
  elite.forEach(p => used.add(p.id));

  // Pro: confidence 65-79 (or tier === 'strong'/'premium')
  const pro = sorted.filter(p =>
    (p.confidence >= PRO_THRESHOLD && p.confidence < ELITE_THRESHOLD || p.tier === 'strong' || p.tier === 'premium')
    && !used.has(p.id)
  );
  pro.forEach(p => used.add(p.id));

  // Free: everything else
  const free = sorted.filter(p => !used.has(p.id));

  return { elite, pro, free };
}

// ── POST one tier to Prognostication webhook ─────────────────────────────────
async function postTier(
  tier: 'elite' | 'premium' | 'free',
  picks: SyndicationPick[],
  batchId: string
): Promise<void> {
  if (picks.length === 0) {
    console.log(`  [${tier.toUpperCase()}] No picks — skipping`);
    return;
  }

  const checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(picks))
    .digest('hex')
    .slice(0, 16);

  const payload = {
    tier,
    picks,
    batchId: `${batchId}-${tier}`,
    checksum,
    timestamp: new Date().toISOString(),
    source: 'progno-syndication-script',
  };

  if (DRY_RUN) {
    console.log(`  [${tier.toUpperCase()}] DRY RUN — would POST ${picks.length} picks`);
    console.log(`    Payload preview:`, JSON.stringify(payload).slice(0, 200) + '...');
    return;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-progno-api-key': API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Webhook POST failed for ${tier}: ${res.status} ${JSON.stringify(body)}`);
  }

  console.log(`  [${tier.toUpperCase()}] ✅ Posted ${picks.length} picks → processed: ${(body as any).processed ?? '?'}`);
  if ((body as any).errors?.length) {
    console.warn(`  [${tier.toUpperCase()}] ⚠️  Webhook errors:`, (body as any).errors);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔗 PROGNO → PROGNOSTICATION SYNDICATION');
  console.log('═'.repeat(50));
  console.log(`  Date:        ${TARGET_DATE}`);
  console.log(`  Webhook:     ${WEBHOOK_URL}`);
  console.log(`  API Key:     ${API_KEY ? API_KEY.slice(0, 20) + '...' : '❌ MISSING'}`);
  console.log(`  Dry Run:     ${DRY_RUN}`);
  console.log('');

  if (!API_KEY) {
    console.error('❌ PROGNO_INTERNAL_API_KEY not set in .env.local');
    process.exit(1);
  }

  // 1. Fetch picks
  console.log(`📥 Fetching picks for ${TARGET_DATE}...`);
  let rawPicks: RawPick[];
  try {
    rawPicks = await fetchPicksFromSupabase(TARGET_DATE);
  } catch (err: any) {
    // Try yesterday if today returns nothing
    console.warn(`  ⚠️  ${err.message} — trying yesterday...`);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    rawPicks = await fetchPicksFromSupabase(yesterday);
  }

  if (rawPicks.length === 0) {
    console.error('❌ No picks found. Run the daily prediction pipeline first.');
    process.exit(1);
  }

  console.log(`  Found ${rawPicks.length} picks\n`);

  // 2. Allocate tiers
  const { elite, pro, free } = allocateTiers(rawPicks);
  console.log(`📊 Tier allocation:`);
  console.log(`  Elite:   ${elite.length} picks (confidence ≥ ${ELITE_THRESHOLD}%)`);
  console.log(`  Pro:     ${pro.length} picks (confidence ${PRO_THRESHOLD}-${ELITE_THRESHOLD - 1}%)`);
  console.log(`  Free:    ${free.length} picks (confidence < ${PRO_THRESHOLD}%)`);
  console.log('');

  // 3. Build batch ID (date-based for idempotency)
  const batchId = `progno-${TARGET_DATE}-${Date.now()}`;

  // 4. POST each tier
  console.log(`📤 Syndicating to ${WEBHOOK_URL}...`);
  await postTier('elite', elite.map(p => transformPick(p, 'elite')), batchId);
  await postTier('premium', pro.map(p => transformPick(p, 'premium')), batchId);
  await postTier('free', free.map(p => transformPick(p, 'free')), batchId);

  console.log('\n✅ Syndication complete!');
  if (DRY_RUN) console.log('   (Dry run — no data was actually sent)');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

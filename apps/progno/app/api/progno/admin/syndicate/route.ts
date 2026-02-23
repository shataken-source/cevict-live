/**
 * Admin API: Trigger Progno → Prognostication syndication
 *
 * Reads today's picks from Supabase Storage, allocates tiers,
 * and POSTs each tier to the Prognostication webhook.
 *
 * POST /api/progno/admin/syndicate
 * Body: { date?: "YYYY-MM-DD", dryRun?: boolean }
 * Auth: x-admin-secret header OR secret in body
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ELITE_THRESHOLD = 80;
const PRO_THRESHOLD   = 65;

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false;
  const cronSecret  = process.env.CRON_SECRET;
  const adminPass   = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  return (
    (!!cronSecret  && secret.trim() === cronSecret) ||
    (!!adminPass   && secret.trim() === adminPass)
  );
}

async function fetchPicksFromStorage(date: string): Promise<any[]> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) throw new Error('Supabase env vars not configured');

  const headers = { apikey: supaKey, Authorization: `Bearer ${supaKey}` };
  const base    = `${supaUrl}/storage/v1/object/predictions`;

  for (const fileName of [`predictions-${date}.json`, `predictions-early-${date}.json`]) {
    try {
      const res = await fetch(`${base}/${fileName}`, { headers });
      if (!res.ok) continue;
      const parsed = await res.json();
      const picks  = parsed.picks || parsed;
      if (Array.isArray(picks) && picks.length > 0) return picks;
    } catch { /* try next */ }
  }
  return [];
}

function allocateTiers(picks: any[]): { elite: any[]; premium: any[]; free: any[] } {
  const sorted = [...picks].sort((a, b) => {
    const sa = (a.composite_score ?? 0) || ((a.value_bet_edge ?? 0) * 2.5 + (a.confidence ?? 0));
    const sb = (b.composite_score ?? 0) || ((b.value_bet_edge ?? 0) * 2.5 + (b.confidence ?? 0));
    return sb - sa;
  });
  const used = new Set<string>();
  const elite   = sorted.filter(p => (p.confidence >= ELITE_THRESHOLD || p.tier === 'elite') && !used.has(p.id));
  elite.forEach(p => used.add(p.id));
  const premium = sorted.filter(p => (p.confidence >= PRO_THRESHOLD && p.confidence < ELITE_THRESHOLD) && !used.has(p.id));
  premium.forEach(p => used.add(p.id));
  const free    = sorted.filter(p => !used.has(p.id));
  return { elite, premium, free };
}

function transformPick(p: any, tier: string) {
  return {
    game_id:            p.game_id || p.id,
    sport:              (p.sport || p.league || 'UNKNOWN').toUpperCase(),
    league:             (p.league || p.sport || 'UNKNOWN').toUpperCase(),
    home_team:          p.home_team,
    away_team:          p.away_team,
    game_matchup:       p.game_matchup || `${p.away_team} @ ${p.home_team}`,
    pick:               p.pick,
    pick_type:          p.pick_type || 'MONEYLINE',
    confidence:         p.confidence,
    odds:               p.odds ?? null,
    game_time:          p.game_time ?? null,
    value_bet_edge:     p.value_bet_edge ?? 0,
    expected_value:     p.expected_value ?? 0,
    analysis:           p.analysis || '',
    reasoning:          Array.isArray(p.reasoning) ? p.reasoning.join(' ') : (p.reasoning || p.analysis || ''),
    tier,
    mc_win_probability: p.mc_win_probability ?? null,
    composite_score:    p.composite_score ?? null,
    triple_align:       p.triple_align ?? false,
    source:             'progno-engine',
  };
}

async function postTier(
  tier: 'elite' | 'premium' | 'free',
  picks: any[],
  batchId: string,
  webhookUrl: string,
  apiKey: string,
  dryRun: boolean
): Promise<{ tier: string; count: number; success: boolean; message: string }> {
  if (picks.length === 0) return { tier, count: 0, success: true, message: 'No picks — skipped' };
  if (dryRun)             return { tier, count: picks.length, success: true, message: `DRY RUN — would post ${picks.length} picks` };

  const checksum = crypto.createHash('sha256').update(JSON.stringify(picks)).digest('hex').slice(0, 16);
  const payload  = { tier, picks, batchId: `${batchId}-${tier}`, checksum, timestamp: new Date().toISOString(), source: 'progno-admin' };

  const res  = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-progno-api-key': apiKey },
    body:    JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) return { tier, count: picks.length, success: false, message: `HTTP ${res.status}: ${JSON.stringify(body)}` };
  const errors = (body as any).errors ?? [];
  return {
    tier,
    count:   picks.length,
    success: errors.length === 0,
    message: errors.length > 0 ? `Posted but with errors: ${errors.join('; ')}` : `Posted ${picks.length} picks`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body    = await request.json().catch(() => ({}));
    const secret  = request.headers.get('x-admin-secret') || body.secret;
    const dryRun  = body.dryRun === true;
    const date    = body.date || new Date().toISOString().split('T')[0];

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = process.env.PROGNOSTICATION_WEBHOOK_URL || 'https://prognostication.com/api/webhooks/progno';
    const apiKey     = process.env.PROGNO_INTERNAL_API_KEY || process.env.PROGNO_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'PROGNO_INTERNAL_API_KEY not configured' }, { status: 500 });

    const rawPicks = await fetchPicksFromStorage(date);
    if (rawPicks.length === 0) {
      return NextResponse.json({ success: false, error: `No picks found for ${date}. Run predictions first.` }, { status: 404 });
    }

    const { elite, premium, free } = allocateTiers(rawPicks);
    const batchId = `progno-admin-${date}-${Date.now()}`;

    const results = await Promise.all([
      postTier('elite',   elite.map(p => transformPick(p, 'elite')),     batchId, webhookUrl, apiKey, dryRun),
      postTier('premium', premium.map(p => transformPick(p, 'premium')), batchId, webhookUrl, apiKey, dryRun),
      postTier('free',    free.map(p => transformPick(p, 'free')),       batchId, webhookUrl, apiKey, dryRun),
    ]);

    const allSuccess = results.every(r => r.success);
    return NextResponse.json({
      success: allSuccess,
      date,
      dryRun,
      totalPicks: rawPicks.length,
      tiers: { elite: elite.length, premium: premium.length, free: free.length },
      results,
    });
  } catch (e: any) {
    console.error('[admin/syndicate]', e);
    return NextResponse.json({ success: false, error: e?.message || 'Request failed' }, { status: 500 });
  }
}

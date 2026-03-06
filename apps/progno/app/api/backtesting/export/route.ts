/**
 * Backtesting Data Export API
 * GET /api/backtesting/export
 *
 * Bulk export of historical odds + game results for backtesting.
 * Supports JSON and CSV. Tiered API key access.
 *
 * Query params:
 *   sport       - required: nfl, nba, mlb, nhl, ncaaf, ncaab, college-baseball
 *   startDate   - required: YYYY-MM-DD
 *   endDate     - required: YYYY-MM-DD
 *   format      - json (default) or csv
 *   type        - all (default), closing, opening, snapshots
 *   bookmaker   - filter by bookmaker (pinnacle, draftkings, fanduel, betmgm)
 *   market      - filter by market type (moneyline, spreads, totals)
 *   includeResults - true/false (join game outcomes, default true)
 *   cursor      - pagination cursor (captured_at of last row)
 *   limit       - rows per page (default 1000, max by tier)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl',
  ncaaf: 'americanfootball_ncaaf',
  ncaab: 'basketball_ncaab',
  'college-baseball': 'baseball_ncaa',
  // Also accept raw keys
  americanfootball_nfl: 'americanfootball_nfl',
  basketball_nba: 'basketball_nba',
  baseball_mlb: 'baseball_mlb',
  icehockey_nhl: 'icehockey_nhl',
  americanfootball_ncaaf: 'americanfootball_ncaaf',
  basketball_ncaab: 'basketball_ncaab',
  baseball_ncaa: 'baseball_ncaa',
};

interface TierConfig {
  maxDays: number;
  maxRows: number;
  rateLimitPerDay: number;
  includeSnapshots: boolean;
  includeResults: boolean;
}

const TIERS: Record<number, TierConfig> = {
  1: { maxDays: 30,  maxRows: 5000,   rateLimitPerDay: 50,   includeSnapshots: false, includeResults: true },
  2: { maxDays: 180, maxRows: 50000,  rateLimitPerDay: 500,  includeSnapshots: true,  includeResults: true },
  3: { maxDays: 730, maxRows: 500000, rateLimitPerDay: 5000, includeSnapshots: true,  includeResults: true },
};

function validateApiKey(req: NextRequest): { valid: boolean; tier: number } {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, tier: 0 };
  const key = authHeader.replace('Bearer ', '').trim();

  if (key === process.env.PROGNO_API_KEY_TIER3) return { valid: true, tier: 3 };
  if (key === process.env.PROGNO_API_KEY_TIER2) return { valid: true, tier: 2 };
  if (key === process.env.PROGNO_API_KEY_TIER1) return { valid: true, tier: 1 };
  // Admin secret gets tier 3
  if (key === process.env.PROGNO_ADMIN_PASSWORD) return { valid: true, tier: 3 };

  return { valid: false, tier: 0 };
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const { valid, tier } = validateApiKey(req);
  if (!valid) {
    return NextResponse.json({
      error: 'Invalid or missing API key',
      docs: 'Use Authorization: Bearer YOUR_KEY. Contact admin for API access.',
    }, { status: 401 });
  }

  const tierConfig = TIERS[tier] || TIERS[1];
  const { searchParams } = new URL(req.url);

  const sportParam = searchParams.get('sport')?.toLowerCase();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const format = searchParams.get('format') || 'json';
  const type = searchParams.get('type') || 'all'; // all, closing, opening, snapshots
  const bookmaker = searchParams.get('bookmaker');
  const market = searchParams.get('market');
  const includeResults = searchParams.get('includeResults') !== 'false';
  const cursor = searchParams.get('cursor');
  const limitParam = parseInt(searchParams.get('limit') || '1000', 10);
  const limit = Math.min(limitParam, tierConfig.maxRows);

  // Validate
  if (!sportParam) {
    return NextResponse.json({ error: 'Missing required param: sport', validSports: Object.keys(SPORT_MAP).filter(k => !k.includes('_')) }, { status: 400 });
  }
  const sportKey = SPORT_MAP[sportParam];
  if (!sportKey) {
    return NextResponse.json({ error: `Unknown sport: ${sportParam}`, validSports: Object.keys(SPORT_MAP).filter(k => !k.includes('_')) }, { status: 400 });
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params: startDate and endDate (YYYY-MM-DD)' }, { status: 400 });
  }

  const daysRequested = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysRequested > tierConfig.maxDays) {
    return NextResponse.json({
      error: `Date range too large: ${Math.ceil(daysRequested)} days requested, tier ${tier} max: ${tierConfig.maxDays} days`,
      tip: tier < 3 ? 'Upgrade your tier for longer date ranges' : undefined,
    }, { status: 403 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Build odds query
    let query = supabase
      .from('historical_odds')
      .select('game_id,sport,home_team,away_team,commence_time,bookmaker,market_type,home_odds,away_odds,home_spread,away_spread,total_line,over_odds,under_odds,captured_at,is_opening,is_closing')
      .eq('sport', sportKey)
      .gte('captured_at', `${startDate}T00:00:00Z`)
      .lte('captured_at', `${endDate}T23:59:59Z`)
      .order('captured_at', { ascending: true })
      .limit(limit);

    // Type filter
    if (type === 'closing') query = query.eq('is_closing', true);
    else if (type === 'opening') query = query.eq('is_opening', true);
    else if (type === 'snapshots' && !tierConfig.includeSnapshots) {
      return NextResponse.json({ error: 'Snapshots export requires Tier 2+' }, { status: 403 });
    }

    // Optional filters
    if (bookmaker) query = query.eq('bookmaker', bookmaker);
    if (market) query = query.eq('market_type', market);
    if (cursor) query = query.gt('captured_at', cursor);

    const { data: oddsData, error: oddsError } = await query;
    if (oddsError) {
      console.error('[Backtesting Export] Query error:', oddsError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    let resultMap = new Map<string, any>();

    // Fetch game results if requested
    if (includeResults && tierConfig.includeResults && oddsData?.length) {
      const gameIds = [...new Set(oddsData.map(r => r.game_id))];
      // Fetch in batches of 100
      for (let i = 0; i < gameIds.length; i += 100) {
        const batch = gameIds.slice(i, i + 100);
        const { data: results } = await supabase
          .from('game_results')
          .select('game_id,home_score,away_score,winner,total_points,home_margin,status')
          .in('game_id', batch);
        if (results) {
          for (const r of results) resultMap.set(r.game_id, r);
        }
      }
    }

    // Join odds + results
    const rows = (oddsData || []).map(row => {
      const result = resultMap.get(row.game_id);
      return {
        ...row,
        ...(result ? {
          home_score: result.home_score,
          away_score: result.away_score,
          winner: result.winner,
          total_points: result.total_points,
          home_margin: result.home_margin,
          game_status: result.status,
        } : {}),
      };
    });

    const responseTime = Date.now() - startTime;
    const lastRow = rows[rows.length - 1];
    const hasMore = rows.length === limit;

    if (format === 'csv') {
      const csv = toCSV(rows);
      const filename = `${sportParam}-${type}-${startDate}-to-${endDate}.csv`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Total-Rows': String(rows.length),
          'X-Has-More': String(hasMore),
          'X-Next-Cursor': hasMore && lastRow ? lastRow.captured_at : '',
          'X-Response-Time-Ms': String(responseTime),
        },
      });
    }

    return NextResponse.json({
      meta: {
        sport: sportParam,
        sportKey,
        type,
        dateRange: { startDate, endDate },
        filters: { bookmaker: bookmaker || 'all', market: market || 'all' },
        rows: rows.length,
        hasMore,
        nextCursor: hasMore && lastRow ? lastRow.captured_at : null,
        tier,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      },
      data: rows,
    });

  } catch (error: any) {
    console.error('[Backtesting Export] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function toCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

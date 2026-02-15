import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// API Key validation (simple version - enhance with proper auth later)
const VALID_API_KEYS = [
  process.env.PROGNO_API_KEY_TIER1,
  process.env.PROGNO_API_KEY_TIER2,
  process.env.PROGNO_API_KEY_TIER3,
].filter(Boolean);

function validateApiKey(req: NextRequest): { valid: boolean; tier?: number } {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false };
  }

  const key = authHeader.replace('Bearer ', '').trim();

  if (key === process.env.PROGNO_API_KEY_TIER3) return { valid: true, tier: 3 };
  if (key === process.env.PROGNO_API_KEY_TIER2) return { valid: true, tier: 2 };
  if (key === process.env.PROGNO_API_KEY_TIER1) return { valid: true, tier: 1 };

  return { valid: false };
}

// Rate limiting by tier
const RATE_LIMITS = {
  1: 100,   // Hobby: 100 requests/day
  2: 1000,  // Pro: 1000 requests/day
  3: 10000, // Enterprise: 10000 requests/day
};

/**
 * GET /api/historical-odds
 * Query params:
 * - sport: nhl, nba, nfl, mlb, ncaab, ncaaf, nascar, college-baseball
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - format: json (default) or csv
 * - includeLines: true/false (include all bookmaker lines, default false)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Validate API key
  const { valid, tier } = validateApiKey(req);
  if (!valid) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Use Authorization: Bearer YOUR_KEY' },
      { status: 401 }
    );
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport')?.toLowerCase();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const format = searchParams.get('format') || 'json';
  const includeLines = searchParams.get('includeLines') === 'true';

  // Validate required params
  if (!sport) {
    return NextResponse.json(
      { error: 'Missing required parameter: sport' },
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: startDate and endDate (YYYY-MM-DD format)' },
      { status: 400 }
    );
  }

  // Validate date range (limit based on tier)
  const maxDays = tier === 3 ? 365 : tier === 2 ? 90 : 30;
  const daysRequested = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysRequested > maxDays) {
    return NextResponse.json(
      { error: `Date range too large. Tier ${tier} max: ${maxDays} days. Upgrade for more.` },
      { status: 403 }
    );
  }

  try {
    // Build query
    let query = supabase
      .from('odds_cache')
      .select(includeLines ? '*' : 'id,external_id,sport,home_team,away_team,commence_time,game_date,home_moneyline,away_moneyline,home_spread,away_spread,spread_line,total_line,source')
      .eq('sport', sport)
      .gte('game_date', startDate)
      .lte('game_date', endDate)
      .order('game_date', { ascending: true });

    // Tier 1 gets limited fields and fewer records
    if (tier === 1) {
      query = query.limit(100);
    } else if (tier === 2) {
      query = query.limit(1000);
    }
    // Tier 3 gets unlimited

    const { data, error } = await query;

    if (error) {
      console.error('[HistoricalOddsAPI] Database error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    // Format response
    const response = {
      meta: {
        sport,
        dateRange: { startDate, endDate },
        gamesReturned: data?.length || 0,
        tier,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      },
      data: data || [],
    };

    // CSV format
    if (format === 'csv') {
      const csv = convertToCSV(data || []);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${sport}-odds-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[HistoricalOddsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/historical-odds/sports
 * List available sports and their data availability
 */
export async function OPTIONS(req: NextRequest) {
  const { valid, tier } = validateApiKey(req);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('odds_cache')
      .select('sport, game_date')
      .order('game_date', { ascending: true });

    if (error) throw error;

    // Aggregate by sport
    const sportStats = (data || []).reduce((acc, row) => {
      if (!acc[row.sport]) {
        acc[row.sport] = {
          sport: row.sport,
          firstDate: row.game_date,
          lastDate: row.game_date,
          totalGames: 0,
        };
      }
      acc[row.sport].totalGames++;
      acc[row.sport].lastDate = row.game_date > acc[row.sport].lastDate ? row.game_date : acc[row.sport].lastDate;
      return acc;
    }, {});

    return NextResponse.json({
      tier,
      sports: Object.values(sportStats),
      totalGames: data?.length || 0,
    });

  } catch (error) {
    console.error('[HistoricalOddsAPI] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(v => 
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(',')
  );

  return [headers, ...rows].join('\n');
}

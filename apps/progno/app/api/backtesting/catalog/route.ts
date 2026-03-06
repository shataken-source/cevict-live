/**
 * Backtesting Data Catalog
 * GET /api/backtesting/catalog
 *
 * Public endpoint (no auth required) showing what data is available,
 * coverage dates, row counts, and pricing tiers. This is the landing
 * page for potential data buyers.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPORT_LABELS: Record<string, string> = {
  americanfootball_nfl: 'NFL',
  basketball_nba: 'NBA',
  baseball_mlb: 'MLB',
  icehockey_nhl: 'NHL',
  americanfootball_ncaaf: 'NCAAF',
  basketball_ncaab: 'NCAAB',
  baseball_ncaa: 'College Baseball',
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let sportStats: any[] = [];
  let totalOddsRows = 0;
  let totalGamesWithResults = 0;
  let oldestDate: string | null = null;
  let newestDate: string | null = null;

  if (url && key) {
    const sb = createClient(url, key);

    // Get per-sport stats from historical_odds
    for (const [sportKey, label] of Object.entries(SPORT_LABELS)) {
      try {
        // Total rows
        const { count: totalRows } = await sb
          .from('historical_odds')
          .select('id', { count: 'exact', head: true })
          .eq('sport', sportKey);

        // Opening lines count
        const { count: openingCount } = await sb
          .from('historical_odds')
          .select('id', { count: 'exact', head: true })
          .eq('sport', sportKey)
          .eq('is_opening', true);

        // Closing lines count
        const { count: closingCount } = await sb
          .from('historical_odds')
          .select('id', { count: 'exact', head: true })
          .eq('sport', sportKey)
          .eq('is_closing', true);

        // Date range
        const { data: earliest } = await sb
          .from('historical_odds')
          .select('captured_at')
          .eq('sport', sportKey)
          .order('captured_at', { ascending: true })
          .limit(1);

        const { data: latest } = await sb
          .from('historical_odds')
          .select('captured_at')
          .eq('sport', sportKey)
          .order('captured_at', { ascending: false })
          .limit(1);

        // Games with results
        const { count: resultsCount } = await sb
          .from('game_results')
          .select('id', { count: 'exact', head: true })
          .eq('sport', sportKey);

        const firstDate = earliest?.[0]?.captured_at?.split('T')[0] || null;
        const lastDate = latest?.[0]?.captured_at?.split('T')[0] || null;

        if (firstDate && (!oldestDate || firstDate < oldestDate)) oldestDate = firstDate;
        if (lastDate && (!newestDate || lastDate > newestDate)) newestDate = lastDate;

        totalOddsRows += totalRows || 0;
        totalGamesWithResults += resultsCount || 0;

        if ((totalRows || 0) > 0) {
          sportStats.push({
            sport: label,
            sportKey: sportKey.replace('americanfootball_', '').replace('basketball_', '').replace('icehockey_', '').replace('baseball_', ''),
            totalOddsRows: totalRows || 0,
            openingLines: openingCount || 0,
            closingLines: closingCount || 0,
            gamesWithResults: resultsCount || 0,
            dateRange: { from: firstDate, to: lastDate },
          });
        }
      } catch { continue; }
    }
  }

  return NextResponse.json({
    name: 'Cevict Sports Odds — Backtesting Data',
    description: 'Hourly odds snapshots from 4 major bookmakers across 7 sports, with opening/closing line tags and ESPN game results. Designed for sports betting backtesting and model development.',
    coverage: {
      sports: sportStats,
      totalOddsRows,
      totalGamesWithResults,
      dateRange: { from: oldestDate, to: newestDate },
      updateFrequency: 'Hourly (every 60 minutes)',
    },
    bookmakers: [
      { key: 'pinnacle', type: 'Sharp', description: 'Most respected sharp bookmaker. The gold standard for closing line value.' },
      { key: 'draftkings', type: 'Public', description: 'Major US sportsbook. Heavy public action.' },
      { key: 'fanduel', type: 'Public', description: 'Major US sportsbook. Popular with casual bettors.' },
      { key: 'betmgm', type: 'Public', description: 'Major US sportsbook. MGM Resorts backing.' },
    ],
    markets: [
      { key: 'moneyline', fields: ['home_odds', 'away_odds'], description: 'American moneyline odds for home and away teams.' },
      { key: 'spreads', fields: ['home_spread', 'away_spread', 'home_odds', 'away_odds'], description: 'Point spread with juice for each side.' },
      { key: 'totals', fields: ['total_line', 'over_odds', 'under_odds'], description: 'Over/Under total points line with juice.' },
    ],
    features: [
      'Hourly snapshots — track line movements throughout the day',
      'Opening lines — first available odds for each game',
      'Closing lines — last odds snapshot before game start (CLV analysis)',
      'Game results — final scores from ESPN (win/loss, total points, margin)',
      'Multi-bookmaker — sharp (Pinnacle) + public (DK, FD, BetMGM) for steam move detection',
      'Pre-joined dataset — odds + outcomes in one query via closing lines view',
    ],
    dataFields: {
      odds: ['game_id', 'sport', 'home_team', 'away_team', 'commence_time', 'bookmaker', 'market_type', 'home_odds', 'away_odds', 'home_spread', 'away_spread', 'total_line', 'over_odds', 'under_odds', 'captured_at', 'is_opening', 'is_closing'],
      results: ['game_id', 'sport', 'home_team', 'away_team', 'commence_time', 'game_date', 'home_score', 'away_score', 'winner', 'total_points', 'home_margin'],
    },
    api: {
      exportEndpoint: '/api/backtesting/export',
      catalogEndpoint: '/api/backtesting/catalog',
      legacyEndpoint: '/api/historical-odds',
      authentication: 'Bearer token in Authorization header',
      formats: ['json', 'csv'],
      pagination: 'Cursor-based via X-Next-Cursor header or nextCursor field',
    },
    tiers: [
      { tier: 1, name: 'Starter', maxDays: 30, maxRowsPerRequest: 5000, requestsPerDay: 50, features: ['Closing + opening lines', 'Game results', 'JSON + CSV export'] },
      { tier: 2, name: 'Pro', maxDays: 180, maxRowsPerRequest: 50000, requestsPerDay: 500, features: ['Everything in Starter', 'Full hourly snapshots', 'Line movement tracking'] },
      { tier: 3, name: 'Enterprise', maxDays: 730, maxRowsPerRequest: 500000, requestsPerDay: 5000, features: ['Everything in Pro', '2+ years of data', 'Bulk downloads', 'Priority support'] },
    ],
    contact: 'For API access and pricing, contact admin.',
    timestamp: new Date().toISOString(),
  });
}

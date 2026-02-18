/**
 * GET /api/backtest/meta
 * Public endpoint — no auth required.
 * Returns historical data coverage so buyers can evaluate before purchasing.
 *
 * Response shape:
 *   available          — false if no data collected yet
 *   totalGames         — distinct completed games stored in game_outcomes
 *   oddsRecords        — total rows in historical_odds (multiple snapshots per game)
 *   gradedPicks        — graded prediction results in prediction_results
 *   sports[]           — per-sport breakdown with game count + date range
 *   dateRange          — overall min/max dates across all sports
 *   dataReadiness      — % toward 65% threshold for API sales
 *   pricingUrl         — link to tier/pricing info
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SPORT_META: Record<string, { name: string; league: string }> = {
  basketball_nba:        { name: 'NBA Basketball',           league: 'NBA'   },
  americanfootball_nfl:  { name: 'NFL Football',             league: 'NFL'   },
  icehockey_nhl:         { name: 'NHL Hockey',               league: 'NHL'   },
  baseball_mlb:          { name: 'MLB Baseball',             league: 'MLB'   },
  basketball_ncaab:      { name: 'NCAAB College Basketball', league: 'NCAAB' },
  americanfootball_ncaaf:{ name: 'NCAAF College Football',   league: 'NCAAF' },
  baseball_ncaa:         { name: 'College Baseball',         league: 'CBB'   },
}

// Target rows before declaring API open for sale
const SALES_READY_THRESHOLD = 10000

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Run all queries in parallel for speed
    const [
      gamesResult,
      oddsCountResult,
      oddsRangeMinResult,
      oddsRangeMaxResult,
      picksCountResult,
    ] = await Promise.all([
      // All completed games with sport+game_date for aggregation
      supabase
        .from('game_outcomes')
        .select('sport, game_date')
        .order('game_date', { ascending: true })
        .limit(100000),

      // Total historical_odds record count
      supabase
        .from('historical_odds')
        .select('*', { count: 'exact', head: true }),

      // Earliest odds record
      supabase
        .from('historical_odds')
        .select('commence_time')
        .order('commence_time', { ascending: true })
        .limit(1),

      // Latest odds record
      supabase
        .from('historical_odds')
        .select('commence_time')
        .order('commence_time', { ascending: false })
        .limit(1),

      // Total graded picks
      supabase
        .from('prediction_results')
        .select('*', { count: 'exact', head: true }),
    ])

    const games = gamesResult.data || []
    const totalGames = games.length
    const totalOddsRecords = oddsCountResult.count || 0
    const totalGradedPicks = picksCountResult.count || 0

    // Aggregate games by sport
    const sportMap: Record<string, { count: number; minDate: string; maxDate: string }> = {}
    for (const row of games) {
      const s = (row.sport as string) || 'unknown'
      if (!sportMap[s]) {
        sportMap[s] = { count: 0, minDate: row.game_date as string, maxDate: row.game_date as string }
      }
      sportMap[s].count++
      if ((row.game_date as string) < sportMap[s].minDate) sportMap[s].minDate = row.game_date as string
      if ((row.game_date as string) > sportMap[s].maxDate) sportMap[s].maxDate = row.game_date as string
    }

    const sports = Object.entries(sportMap).map(([key, stats]) => ({
      sport_key: key,
      name: SPORT_META[key]?.name || key,
      league: SPORT_META[key]?.league || key.toUpperCase(),
      games_with_results: stats.count,
      date_range: {
        min: stats.minDate,
        max: stats.maxDate,
      },
    })).sort((a, b) => b.games_with_results - a.games_with_results)

    const oddsMin = (oddsRangeMinResult.data?.[0] as any)?.commence_time?.split('T')[0] || null
    const oddsMax = (oddsRangeMaxResult.data?.[0] as any)?.commence_time?.split('T')[0] || null
    const gamesMin = games[0]?.game_date as string | undefined || null
    const gamesMax = games[games.length - 1]?.game_date as string | undefined || null

    const percentFull = Math.round((totalGames / SALES_READY_THRESHOLD) * 100)

    return NextResponse.json({
      available: totalGames > 0,
      totalGames,
      oddsRecords: totalOddsRecords,
      gradedPicks: totalGradedPicks,
      sports,
      dateRange: {
        games: { min: gamesMin, max: gamesMax },
        odds:  { min: oddsMin,  max: oddsMax  },
      },
      dataReadiness: {
        gamesCollected: totalGames,
        targetGames: SALES_READY_THRESHOLD,
        percentFull,
        salesReady: percentFull >= 65,
        message: percentFull >= 65
          ? 'Historical data ready for purchase.'
          : `Data collection in progress (${percentFull}% of target). API opens at 65%.`,
      },
      pricingUrl: '/api/progno/backtest?action=pricing',
      buyUrl: '/api/progno/backtest',
      note: 'oddsRecords contains multiple snapshots per game across bookmakers and market types. Join game_outcomes on game_id for actual results.',
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
  }
}

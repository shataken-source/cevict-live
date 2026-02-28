/**
 * Bet Performance Reports
 * GET /api/progno/admin/trading/performance
 *
 * Returns aggregated stats from the actual_bets table:
 * - Overall: total bets, W/L, ROI, profit
 * - By sport: breakdown per sport
 * - By date: daily performance
 * - Recent bets list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  if (!SECRET) return false
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  return !!token && token === SECRET
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // Fetch all actual bets
    const { data: bets, error } = await supabase
      .from('actual_bets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const allBets = bets || []

    // ── Overall Stats ──
    const settled = allBets.filter(b => b.result === 'win' || b.result === 'loss')
    const wins = settled.filter(b => b.result === 'win')
    const losses = settled.filter(b => b.result === 'loss')
    const pending = allBets.filter(b => !b.result && b.status !== 'cancelled' && b.status !== 'error')
    const totalStaked = settled.reduce((s, b) => s + (b.stake_cents || 0), 0)
    const totalProfit = settled.reduce((s, b) => s + (b.profit_cents || 0), 0)
    const totalPayout = wins.reduce((s, b) => s + (b.payout_cents || 0), 0)

    const overall = {
      totalBets: allBets.length,
      settled: settled.length,
      pending: pending.length,
      wins: wins.length,
      losses: losses.length,
      winRate: settled.length > 0 ? Math.round((wins.length / settled.length) * 100 * 10) / 10 : 0,
      totalStakedCents: totalStaked,
      totalStaked: `$${(totalStaked / 100).toFixed(2)}`,
      totalProfitCents: totalProfit,
      totalProfit: `$${(totalProfit / 100).toFixed(2)}`,
      totalPayoutCents: totalPayout,
      totalPayout: `$${(totalPayout / 100).toFixed(2)}`,
      roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 100 * 10) / 10 : 0,
    }

    // ── By Sport ──
    const sportMap = new Map<string, { bets: number; wins: number; losses: number; staked: number; profit: number }>()
    for (const b of allBets) {
      const sport = b.sport || 'Unknown'
      if (!sportMap.has(sport)) sportMap.set(sport, { bets: 0, wins: 0, losses: 0, staked: 0, profit: 0 })
      const s = sportMap.get(sport)!
      s.bets++
      if (b.result === 'win') { s.wins++; s.staked += b.stake_cents || 0; s.profit += b.profit_cents || 0 }
      if (b.result === 'loss') { s.losses++; s.staked += b.stake_cents || 0; s.profit += b.profit_cents || 0 }
    }
    const bySport = Array.from(sportMap.entries()).map(([sport, s]) => ({
      sport,
      ...s,
      winRate: (s.wins + s.losses) > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100 * 10) / 10 : 0,
      roi: s.staked > 0 ? Math.round((s.profit / s.staked) * 100 * 10) / 10 : 0,
      profitDisplay: `$${(s.profit / 100).toFixed(2)}`,
    })).sort((a, b) => b.bets - a.bets)

    // ── By Date ──
    const dateMap = new Map<string, { bets: number; wins: number; losses: number; staked: number; profit: number }>()
    for (const b of allBets) {
      const date = b.game_date || 'unknown'
      if (!dateMap.has(date)) dateMap.set(date, { bets: 0, wins: 0, losses: 0, staked: 0, profit: 0 })
      const d = dateMap.get(date)!
      d.bets++
      if (b.result === 'win') { d.wins++; d.staked += b.stake_cents || 0; d.profit += b.profit_cents || 0 }
      if (b.result === 'loss') { d.losses++; d.staked += b.stake_cents || 0; d.profit += b.profit_cents || 0 }
    }
    const byDate = Array.from(dateMap.entries()).map(([date, d]) => ({
      date,
      ...d,
      winRate: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100 * 10) / 10 : 0,
      profitDisplay: `$${(d.profit / 100).toFixed(2)}`,
    })).sort((a, b) => b.date.localeCompare(a.date))

    // ── Recent Bets (last 50) ──
    const recentBets = allBets.slice(0, 50).map(b => ({
      id: b.id,
      created_at: b.created_at,
      game_date: b.game_date,
      pick: b.pick,
      home_team: b.home_team,
      away_team: b.away_team,
      sport: b.sport,
      confidence: b.confidence,
      ticker: b.ticker,
      side: b.side,
      price_cents: b.price_cents,
      contracts: b.contracts,
      stake_cents: b.stake_cents,
      status: b.status,
      result: b.result,
      profit_cents: b.profit_cents,
      order_id: b.order_id,
    }))

    return NextResponse.json({
      success: true,
      overall,
      bySport,
      byDate,
      recentBets,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

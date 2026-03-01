/**
 * Wallboard Bets Endpoint (public, no auth required)
 * GET /api/progno/wallboard/bets
 *
 * Returns today's actual_bets for the wallboard display.
 * No auth needed — read-only, today only, no sensitive data exposed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, bets: [], error: 'DB not configured' })
  }

  try {
    // Use CST date for "today"
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    const { data: bets, error } = await supabase
      .from('actual_bets')
      .select('id, pick, home_team, away_team, sport, league, confidence, game_date, ticker, market_title, side, price_cents, contracts, stake_cents, status, result, profit_cents, payout_cents, dry_run, created_at')
      .eq('game_date', today)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[wallboard/bets]', error.message)
      return NextResponse.json({ success: false, bets: [], error: error.message })
    }

    const all = bets || []
    const r = (v: string | null | undefined) => (v || '').toLowerCase()
    const settled = all.filter(b => r(b.result) === 'win' || r(b.result) === 'loss')
    const wins = settled.filter(b => r(b.result) === 'win').length
    const losses = settled.filter(b => r(b.result) === 'loss').length
    const pending = all.filter(b => !b.result && b.status !== 'cancelled' && b.status !== 'error').length
    const activeBets = all.filter(b => b.status !== 'cancelled' && b.status !== 'error')
    const totalStakeCents = activeBets.reduce((s, b) => s + (b.stake_cents || 0), 0)
    const totalProfitCents = settled.reduce((s, b) => s + (b.profit_cents || 0), 0)
    const roi = totalStakeCents > 0 ? (totalProfitCents / totalStakeCents) * 100 : 0

    return NextResponse.json({
      success: true,
      date: today,
      bets: all,
      summary: {
        total: all.length,
        wins,
        losses,
        pending,
        totalStakeCents,
        totalProfitCents,
        winRate: (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
        roi: Math.round(roi * 10) / 10,
      },
    })
  } catch (e: any) {
    console.error('[wallboard/bets]', e?.message)
    return NextResponse.json({ success: false, bets: [], error: e?.message || 'Failed' })
  }
}

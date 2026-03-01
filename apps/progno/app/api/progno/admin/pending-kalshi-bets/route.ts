/**
 * List actual_bets that have a Kalshi ticker but no result yet (unsettled).
 * POST with body { secret } — same auth as run-cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (
    (cronSecret && secret.trim() === cronSecret) ||
    (adminPassword && secret.trim() === adminPassword)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret } = body as { secret?: string }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase not configured', pending: [] })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: pending, error } = await supabase
      .from('actual_bets')
      .select('id, pick, home_team, away_team, sport, league, game_date, ticker, market_title, side, stake_cents, created_at')
      .not('ticker', 'is', null)
      .is('result', null)
      .order('game_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[pending-kalshi-bets]', error.message)
      return NextResponse.json({ success: false, error: error.message, pending: [] }, { status: 500 })
    }

    const list = (pending || []).map((b: any) => ({
      id: b.id,
      pick: b.pick,
      home_team: b.home_team,
      away_team: b.away_team,
      sport: b.sport,
      league: b.league,
      game_date: b.game_date,
      ticker: b.ticker,
      market_title: b.market_title,
      side: b.side,
      stake_cents: b.stake_cents,
      created_at: b.created_at,
    }))

    return NextResponse.json({ success: true, pending: list, count: list.length })
  } catch (e: any) {
    console.error('[pending-kalshi-bets]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Failed', pending: [] }, { status: 500 })
  }
}

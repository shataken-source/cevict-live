/**
 * POST /api/trailervegas/webhook
 *
 * Stripe webhook handler for TrailerVegas.
 * On checkout.session.completed:
 *   1. Load pending picks from trailervegas_pending by session_id
 *   2. Run the grading engine (same logic as admin grader)
 *   3. Store results in trailervegas_reports
 *   4. Mark pending row as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/app/lib/stripe'
import { gameTeamsMatch, teamsMatch } from '@/app/lib/team-matcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function americanProfitPerUnit(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 1
  if (odds > 0) return odds / 100
  return 100 / Math.abs(odds)
}

async function gradePicksFromData(picks: any[], supabase: any) {
  // Normalize
  const normalized = picks
    .map((p: any) => ({
      date: (p.date || p.game_date || '').toString().slice(0, 10),
      home_team: (p.home_team || '').toString(),
      away_team: (p.away_team || '').toString(),
      pick: (p.pick || '').toString(),
      league: p.league ? p.league.toString().toUpperCase() : undefined,
      odds: toNumber(p.odds),
      stake: toNumber(p.stake) ?? 1,
    }))
    .filter((p: any) => p.date && p.home_team && p.away_team && p.pick)

  const dates = Array.from(new Set(normalized.map((p: any) => p.date))).sort()

  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('game_date, home_team, away_team, home_score, away_score, league')
    .in('game_date', dates)

  const byDate: Record<string, any[]> = {}
  for (const row of (outcomes || [])) {
    if (!byDate[row.game_date]) byDate[row.game_date] = []
    byDate[row.game_date].push(row)
  }

  let wins = 0, losses = 0, pending = 0, unmatched = 0, unsupported = 0
  let totalStake = 0, totalProfit = 0
  const byLeague: Record<string, any> = {}
  const graded: any[] = []

  for (const p of normalized) {
    const games = byDate[p.date] || []
    let match: any | undefined
    for (const g of games) {
      if (g.home_team && g.away_team && gameTeamsMatch(p.home_team, p.away_team, g.home_team, g.away_team)) {
        match = g
        break
      }
    }

    if (!match) { unmatched++; graded.push({ ...p, status: 'unmatched' }); continue }

    const homeScore = typeof match.home_score === 'number' ? match.home_score : null
    const awayScore = typeof match.away_score === 'number' ? match.away_score : null
    if (homeScore === null || awayScore === null) { pending++; graded.push({ ...p, status: 'pending' }); continue }

    const leagueKey = (p.league || match.league || 'UNKNOWN').toUpperCase()
    if (!byLeague[leagueKey]) byLeague[leagueKey] = { wins: 0, losses: 0, pending: 0, stake: 0, profit: 0, picks: 0 }

    const isHomePick = p.pick.toLowerCase() === 'home' || teamsMatch(p.pick, match.home_team)
    const isAwayPick = p.pick.toLowerCase() === 'away' || teamsMatch(p.pick, match.away_team)
    if (!isHomePick && !isAwayPick) { unsupported++; graded.push({ ...p, status: 'unsupported' }); continue }

    const homeWon = homeScore > awayScore
    const awayWon = awayScore > homeScore
    let status = 'lose'
    let profit = 0

    if ((isHomePick && homeWon) || (isAwayPick && awayWon)) {
      status = 'win'
      profit = p.odds !== undefined ? p.stake * americanProfitPerUnit(p.odds) : p.stake
      wins++
    } else if ((isHomePick && awayWon) || (isAwayPick && homeWon)) {
      status = 'lose'
      profit = -p.stake
      losses++
    } else {
      status = 'pending'
      pending++
    }

    totalStake += p.stake
    totalProfit += profit

    const agg = byLeague[leagueKey]
    agg.picks++; agg.stake += p.stake; agg.profit += profit
    if (status === 'win') agg.wins++
    else if (status === 'lose') agg.losses++

    graded.push({ ...p, status, profit, matched_home: match.home_team, matched_away: match.away_team, home_score: homeScore, away_score: awayScore })
  }

  const gradedCount = wins + losses
  const winRate = gradedCount > 0 ? Math.round((wins / gradedCount) * 1000) / 10 : 0
  const roi = totalStake > 0 ? Math.round((totalProfit / totalStake) * 1000) / 10 : 0

  const leagueSummary: Record<string, any> = {}
  for (const [league, agg] of Object.entries(byLeague) as [string, any][]) {
    const g = agg.wins + agg.losses
    leagueSummary[league] = {
      picks: agg.picks, graded: g, wins: agg.wins, losses: agg.losses,
      winRate: g > 0 ? Math.round((agg.wins / g) * 1000) / 10 : 0,
      roi: agg.stake > 0 ? Math.round((agg.profit / agg.stake) * 1000) / 10 : 0,
    }
  }

  return {
    counts: { total: normalized.length, graded: gradedCount, wins, losses, pending, unmatched, unsupported },
    performance: { winRate, roi, totalStake, totalProfit: Math.round(totalProfit * 100) / 100 },
    byLeague: leagueSummary,
    sample: graded.slice(0, 200),
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Verify Stripe signature
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[trailervegas/webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as any
  const sessionId = session.id

  try {
    // Load pending picks
    const { data: pendingRow } = await supabase
      .from('trailervegas_pending')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!pendingRow || !pendingRow.picks) {
      console.error(`[trailervegas/webhook] No pending picks for session ${sessionId}`)
      return NextResponse.json({ received: true, error: 'No pending picks' })
    }

    const picks = JSON.parse(pendingRow.picks)

    // Run grading
    const report = await gradePicksFromData(picks, supabase)

    // Store report
    await supabase
      .from('trailervegas_reports')
      .upsert({
        session_id: sessionId,
        email: session.customer_details?.email || null,
        report: JSON.stringify(report),
        pick_count: pendingRow.pick_count,
        amount_paid: session.amount_total,
        created_at: new Date().toISOString(),
      })

    // Mark pending as completed
    await supabase
      .from('trailervegas_pending')
      .update({ status: 'completed' })
      .eq('session_id', sessionId)

    console.log(`[trailervegas/webhook] Report generated for session ${sessionId}: ${report.performance.winRate}% WR, ${report.performance.roi}% ROI`)

  } catch (err: any) {
    console.error(`[trailervegas/webhook] Error processing session ${sessionId}:`, err.message)
  }

  return NextResponse.json({ received: true })
}

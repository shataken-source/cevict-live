/**
 * Compare early-line picks vs regular picks for the same games (by game_id).
 * When the same game appears in both files and the pick flips to the other side,
 * that's a possible line-move arb: you have early position; regular run likes the other side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadPredictionsSnapshot } from '@/app/lib/early-lines'

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
    const { secret, earlyDate, regularDate } = body as { secret?: string; earlyDate?: string; regularDate?: string }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    if (!earlyDate || !regularDate) {
      return NextResponse.json(
        { success: false, error: 'earlyDate and regularDate are required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const earlyData = await loadPredictionsSnapshot(earlyDate, true)
    const regularData = await loadPredictionsSnapshot(regularDate, false)
    if (!earlyData) {
      return NextResponse.json({ success: false, error: `Early file not found: predictions-early-${earlyDate}.json` }, { status: 404 })
    }
    if (!regularData) {
      return NextResponse.json({ success: false, error: `Regular file not found: predictions-${regularDate}.json` }, { status: 404 })
    }
    const earlyPicks = Array.isArray(earlyData.picks) ? earlyData.picks : []
    const regularPicks = Array.isArray(regularData.picks) ? regularData.picks : []

    const regularByGameId: Record<string, any> = {}
    for (const p of regularPicks) {
      const id = p.game_id || `${p.home_team}-${p.away_team}`
      regularByGameId[id] = p
    }

    const matches: Array<Record<string, any>> = []

    for (const ep of earlyPicks) {
      const gameId = ep.game_id || `${ep.home_team}-${ep.away_team}`
      const rp = regularByGameId[gameId]
      if (!rp) continue

      const sideFlipped = ep.pick !== rp.pick
      const oddsDelta = (rp.odds ?? 0) - (ep.odds ?? 0)
      const confDelta = (rp.confidence ?? 0) - (ep.confidence ?? 0)
      const evDelta = (rp.expected_value ?? 0) - (ep.expected_value ?? 0)

      matches.push({
        game_id: gameId,
        home_team: ep.home_team,
        away_team: ep.away_team,
        sport: ep.sport || ep.league || '',
        game_time: ep.game_time || rp.game_time || null,

        early_pick: ep.pick,
        early_odds: ep.odds ?? 0,
        early_confidence: ep.confidence ?? 0,
        early_ev: ep.expected_value ?? 0,
        early_mc_win: ep.mc_win_probability ?? null,
        early_pick_type: ep.pick_type ?? null,
        early_line: ep.recommended_line ?? null,

        regular_pick: rp.pick,
        regular_odds: rp.odds ?? 0,
        regular_confidence: rp.confidence ?? 0,
        regular_ev: rp.expected_value ?? 0,
        regular_mc_win: rp.mc_win_probability ?? null,
        regular_pick_type: rp.pick_type ?? null,
        regular_line: rp.recommended_line ?? null,

        side_flipped: sideFlipped,
        odds_delta: oddsDelta,
        conf_delta: confDelta,
        ev_delta: evDelta,
      })
    }

    const sideFlippedCount = matches.filter(m => m.side_flipped).length

    const message =
      matches.length === 0
        ? 'No games appear in both files (or no overlap by game_id).'
        : sideFlippedCount > 0
          ? `${sideFlippedCount} game(s) flipped to the other side — possible line-move arb/hedge.`
          : `${matches.length} same game(s); pick unchanged.`

    const hintNoOverlap =
      matches.length === 0 && earlyDate === regularDate
        ? 'Using the same date for both: early file has games 2–5 days ahead, regular has 0–2 days ahead. Overlap is only ~2 days out. Run Regular again 1–2 days later (e.g. Regular date = day when those early games are now 0–2 days out), then compare.'
        : matches.length === 0
          ? 'To get overlap: Early file = when you ran Early lines. Regular file = when you ran Regular so the same games are now 0–2 days out (e.g. 2 days after Early run).'
          : null

    return NextResponse.json({
      success: true,
      earlyDate,
      regularDate,
      matches,
      totalMatches: matches.length,
      sideFlippedCount,
      message,
      hintNoOverlap,
    })
  } catch (e: any) {
    console.error('[early-vs-regular]', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to compare' },
      { status: 500 }
    )
  }
}

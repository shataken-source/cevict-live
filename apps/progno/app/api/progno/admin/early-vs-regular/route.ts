/**
 * Compare early-line picks vs regular picks for the same games (by game_id).
 * When the same game appears in both files and the pick flips to the other side,
 * that's a possible line-move arb: you have early position; regular run likes the other side.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

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

    const appRoot = process.cwd()
    const earlyPath = path.join(appRoot, `predictions-early-${earlyDate}.json`)
    const regularPath = path.join(appRoot, `predictions-${regularDate}.json`)

    function listPredictionFiles(): string[] {
      try {
        const names = fs.readdirSync(appRoot)
        return names.filter(
          (n) => n.startsWith('predictions-') && n.endsWith('.json')
        ).sort()
      } catch {
        return []
      }
    }

    const availableFiles = listPredictionFiles()

    if (!fs.existsSync(earlyPath)) {
      return NextResponse.json({
        success: false,
        error: `Early file not found: predictions-early-${earlyDate}.json`,
        path: earlyPath,
        availableFiles,
        hint: availableFiles.length ? 'Use a date that matches an existing file (e.g. predictions-early-2026-02-05.json → Early date 2026-02-05).' : 'Run "Get predictions" with Early lines first.',
      }, { status: 404 })
    }
    if (!fs.existsSync(regularPath)) {
      return NextResponse.json({
        success: false,
        error: `Regular file not found: predictions-${regularDate}.json`,
        path: regularPath,
        availableFiles,
        hint: availableFiles.length ? 'Use a date that matches an existing file (e.g. predictions-2026-02-05.json → Regular date 2026-02-05).' : 'Run "Get predictions" with Regular (0–2 days) first.',
      }, { status: 404 })
    }

    const earlyData = JSON.parse(fs.readFileSync(earlyPath, 'utf8'))
    const regularData = JSON.parse(fs.readFileSync(regularPath, 'utf8'))
    const earlyPicks = Array.isArray(earlyData.picks) ? earlyData.picks : []
    const regularPicks = Array.isArray(regularData.picks) ? regularData.picks : []

    const regularByGameId: Record<string, any> = {}
    for (const p of regularPicks) {
      const id = p.game_id || `${p.home_team}-${p.away_team}`
      regularByGameId[id] = p
    }

    const matches: Array<{
      game_id: string
      home_team: string
      away_team: string
      sport: string
      early_pick: string
      early_odds: number
      regular_pick: string
      regular_odds: number
      side_flipped: boolean
    }> = []

    for (const ep of earlyPicks) {
      const gameId = ep.game_id || `${ep.home_team}-${ep.away_team}`
      const rp = regularByGameId[gameId]
      if (!rp) continue

      const sideFlipped = ep.pick !== rp.pick
      matches.push({
        game_id: gameId,
        home_team: ep.home_team,
        away_team: ep.away_team,
        sport: ep.sport || ep.league || '',
        early_pick: ep.pick,
        early_odds: ep.odds ?? 0,
        regular_pick: rp.pick,
        regular_odds: rp.odds ?? 0,
        side_flipped: sideFlipped,
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

/**
 * Grade my_picks — uses the same ESPN score providers as daily-results.
 * POST { secret, date? } → grades all pending my_picks for the given date (or all pending).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPreviousDayResultsFromProviders } from '../../../../../../lib/data-sources/results-apis'
import { gameTeamsMatch, teamsMatch } from '../../../../../lib/team-matcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const LEAGUE_MAP: Record<string, string> = {
  NBA: 'basketball_nba',
  NCAAB: 'basketball_ncaab',
  NHL: 'icehockey_nhl',
  NFL: 'americanfootball_nfl',
  MLB: 'baseball_mlb',
  CBB: 'baseball_ncaa',
  NCAAF: 'americanfootball_ncaaf',
  NCAA: 'basketball_ncaab',
}

function isAuthorized(request: NextRequest, bodySecret?: string): boolean {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  if (!SECRET) return false
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  return [token, bodySecret].filter(Boolean).some(t => t === SECRET)
}

export async function POST(request: NextRequest) {
  let body: any
  try { body = await request.json() } catch { body = {} }

  if (!isAuthorized(request, body?.secret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Missing Supabase credentials' }, { status: 500 })
  }
  const sb = createClient(supabaseUrl, supabaseKey)

  // Load pending picks — optionally filter by date
  const date = body.date || null
  let query = sb.from('my_picks').select('*').eq('status', 'pending')
  if (date) query = query.eq('game_date', date)
  const { data: picks, error: pickErr } = await query

  if (pickErr) {
    if (pickErr.code === 'PGRST205') {
      return NextResponse.json({ success: false, error: 'Table my_picks does not exist. Run the migration SQL in Supabase dashboard.' }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: pickErr.message }, { status: 500 })
  }

  if (!picks || picks.length === 0) {
    return NextResponse.json({ success: true, total: 0, graded: 0, wins: 0, losses: 0, pending: 0, message: 'No pending picks to grade.' })
  }

  // Collect all dates we need scores for
  const datesToFetch = new Set<string>()
  for (const p of picks) {
    if (p.game_date) datesToFetch.add(p.game_date)
    if (p.commence_time) {
      try {
        const gt = new Date(p.commence_time)
        if (!isNaN(gt.getTime())) {
          datesToFetch.add(gt.toISOString().split('T')[0])
          const etShifted = new Date(gt.getTime() - 5 * 60 * 60 * 1000)
          datesToFetch.add(etShifted.toISOString().split('T')[0])
        }
      } catch { }
    }
  }
  // Also add date+1 and date-1 for each unique game_date
  const extraDates = new Set<string>()
  for (const d of datesToFetch) {
    const next = new Date(d + 'T12:00:00Z')
    next.setDate(next.getDate() + 1)
    extraDates.add(next.toISOString().split('T')[0])
    const prev = new Date(d + 'T12:00:00Z')
    prev.setDate(prev.getDate() - 1)
    extraDates.add(prev.toISOString().split('T')[0])
  }
  for (const d of extraDates) datesToFetch.add(d)
  const allDates = [...datesToFetch].sort()

  // Fetch scores per league
  const scoresByLeague: Record<string, { home: string; away: string; homeScore: number; awayScore: number }[]> = {}
  const leagues = [...new Set(picks.map((p: any) => (p.league || 'NBA').toUpperCase()))]

  for (const league of leagues) {
    if (!LEAGUE_MAP[league]) continue
    try {
      const allResults = await Promise.all(
        allDates.map(d =>
          fetchPreviousDayResultsFromProviders(league as any, d).catch(() => [])
        )
      )
      const combined = allResults.flat()
      const seen = new Set<string>()
      scoresByLeague[league] = combined.filter(r => {
        const key = `${r.homeTeam}|${r.awayTeam}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).map(r => ({ home: r.homeTeam, away: r.awayTeam, homeScore: r.homeScore, awayScore: r.awayScore }))
    } catch {
      scoresByLeague[league] = []
    }
  }

  // Grade each pick
  let wins = 0, losses = 0, stillPending = 0
  const updates: { id: string; status: string; actual_winner: string; home_score: number; away_score: number; graded_at: string }[] = []

  for (const p of picks) {
    const league = (p.league || 'NBA').toUpperCase()
    const scores = scoresByLeague[league] ?? []
    const match = scores.find(s => gameTeamsMatch(p.home_team, p.away_team, s.home, s.away))

    if (!match) {
      stillPending++
      continue
    }

    const actualWinner = match.homeScore > match.awayScore ? match.home : match.away
    const isWin = teamsMatch(p.pick, actualWinner)

    if (isWin) wins++
    else losses++

    updates.push({
      id: p.id,
      status: isWin ? 'win' : 'lose',
      actual_winner: actualWinner,
      home_score: match.homeScore,
      away_score: match.awayScore,
      graded_at: new Date().toISOString(),
    })
  }

  // Batch update
  for (const u of updates) {
    await sb.from('my_picks').update({
      status: u.status,
      actual_winner: u.actual_winner,
      home_score: u.home_score,
      away_score: u.away_score,
      graded_at: u.graded_at,
    }).eq('id', u.id)
  }

  const graded = wins + losses
  const total = picks.length

  console.log(`[my-picks grade] ${total} picks: ${wins}W / ${losses}L / ${stillPending} pending`)

  return NextResponse.json({
    success: true,
    total,
    graded,
    wins,
    losses,
    pending: stillPending,
    message: `Graded ${graded} of ${total} picks. ${wins}W / ${losses}L. ${stillPending} still pending.`,
  })
}

/**
 * Internal TrailerVegas grader (in-house only).
 *
 * POST /api/progno/admin/trailervegas/grade
 * Auth: Bearer <admin/cron secret> or x-admin-secret header.
 *
 * Accepts either:
 * - multipart/form-data with a `file` field (CSV or JSON)
 * - application/json body: { picks: UploadedPick[] } or UploadedPick[]
 *
 * UploadedPick format (recommended CSV headers / JSON fields):
 * - date (YYYY-MM-DD)
 * - home_team
 * - away_team
 * - pick (team name, or 'home'/'away')
 * - odds (American, e.g. -110 or 145) — optional, used for ROI when present
 * - stake (units, default 1)
 * - league (e.g. NBA, NFL) — optional, used only for reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gameTeamsMatch, teamsMatch } from '@/app/lib/team-matcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type UploadedPick = {
  date?: string
  game_date?: string
  home_team?: string
  away_team?: string
  pick?: string
  odds?: number | string
  stake?: number | string
  league?: string
}

type GradedUploadedPick = UploadedPick & {
  resolved_date?: string
  matched_game?: {
    home_team: string
    away_team: string
    game_date: string
    league?: string
    home_score?: number | null
    away_score?: number | null
  }
  status: 'win' | 'lose' | 'pending' | 'unmatched' | 'unsupported'
  profit?: number
}

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  if (!token) return false
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  const cronSecret = process.env.CRON_SECRET
  return (adminPassword && token === adminPassword) || (cronSecret && token === cronSecret)
}

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

function parseCsv(text: string): UploadedPick[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(',').map(h => h.trim())
  const picks: UploadedPick[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (!cols.length) continue
    const row: any = {}
    header.forEach((h, idx) => {
      row[h] = cols[idx]
    })
    picks.push(row as UploadedPick)
  }
  return picks
}

async function extractPicks(request: NextRequest): Promise<UploadedPick[]> {
  const contentType = request.headers.get('content-type') || ''

  // multipart form with file
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return []
    const text = await (file as File).text()
    // Try JSON first
    const trimmed = text.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed as UploadedPick[]
        if (Array.isArray((parsed as any).picks)) return (parsed as any).picks as UploadedPick[]
      } catch { /* fall through to CSV */ }
    }
    // Fallback: CSV
    return parseCsv(text)
  }

  // JSON body
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    if (Array.isArray(body)) return body as UploadedPick[]
    if (Array.isArray((body as any).picks)) return (body as any).picks as UploadedPick[]
    return []
  }

  return []
}

function americanProfitPerUnit(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 1
  if (odds > 0) return odds / 100
  return 100 / Math.abs(odds)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
  }

  const rawPicks = await extractPicks(request)
  if (!rawPicks.length) {
    return NextResponse.json({ success: false, error: 'No picks found in upload. Expect CSV with headers or JSON array.' }, { status: 400 })
  }

  // Normalize picks
  const picks: UploadedPick[] = rawPicks
    .map(p => {
      const date = (p.date || p.game_date || '').toString().slice(0, 10)
      const home_team = (p.home_team || '').toString()
      const away_team = (p.away_team || '').toString()
      const pick = (p.pick || '').toString()
      const league = p.league ? p.league.toString().toUpperCase() : undefined
      const odds = toNumber(p.odds)
      const stake = toNumber(p.stake) ?? 1
      return { date, home_team, away_team, pick, league, odds, stake }
    })
    .filter(p => p.date && p.home_team && p.away_team && p.pick)

  if (!picks.length) {
    return NextResponse.json({ success: false, error: 'Uploaded picks missing required fields (date, home_team, away_team, pick).' }, { status: 400 })
  }

  const dates = Array.from(new Set(picks.map(p => p.date!))).sort()

  // Load game_outcomes for these dates
  let outcomes: any[] = []
  try {
    const { data, error } = await supabase
      .from('game_outcomes')
      .select('game_date, home_team, away_team, home_score, away_score, league')
      .in('game_date', dates)
    if (error) {
      return NextResponse.json({ success: false, error: `Failed to load game_outcomes: ${error.message}` }, { status: 500 })
    }
    outcomes = data || []
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to query game_outcomes' }, { status: 500 })
  }

  const byDate: Record<string, any[]> = {}
  for (const row of outcomes) {
    const d = row.game_date
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(row)
  }

  const graded: GradedUploadedPick[] = []
  let wins = 0
  let losses = 0
  let pending = 0
  let unmatched = 0
  let unsupported = 0
  let totalStake = 0
  let totalProfit = 0

  const byLeagueAgg: Record<string, { wins: number; losses: number; pending: number; stake: number; profit: number; picks: number }> = {}

  for (const p of picks) {
    const date = p.date!
    const games = byDate[date] || []
    let match: any | undefined
    for (const g of games) {
      if (g.home_team && g.away_team && gameTeamsMatch(p.home_team!, p.away_team!, g.home_team, g.away_team)) {
        match = g
        break
      }
    }

    if (!match) {
      unmatched++
      graded.push({ ...p, status: 'unmatched' })
      continue
    }

    const homeScore = typeof match.home_score === 'number' ? match.home_score : null
    const awayScore = typeof match.away_score === 'number' ? match.away_score : null

    if (homeScore === null || awayScore === null) {
      pending++
      graded.push({
        ...p,
        resolved_date: match.game_date,
        matched_game: {
          home_team: match.home_team,
          away_team: match.away_team,
          game_date: match.game_date,
          league: match.league,
          home_score: match.home_score,
          away_score: match.away_score,
        },
        status: 'pending',
      })
      continue
    }

    const leagueKey = (p.league || match.league || 'UNKNOWN').toString().toUpperCase()
    if (!byLeagueAgg[leagueKey]) byLeagueAgg[leagueKey] = { wins: 0, losses: 0, pending: 0, stake: 0, profit: 0, picks: 0 }

    const stake = toNumber(p.stake) ?? 1
    const odds = toNumber(p.odds)
    const isHomePick = p.pick!.toLowerCase() === 'home' || teamsMatch(p.pick!, match.home_team)
    const isAwayPick = p.pick!.toLowerCase() === 'away' || teamsMatch(p.pick!, match.away_team)

    if (!isHomePick && !isAwayPick) {
      unsupported++
      graded.push({
        ...p,
        resolved_date: match.game_date,
        matched_game: {
          home_team: match.home_team,
          away_team: match.away_team,
          game_date: match.game_date,
          league: match.league,
          home_score: match.home_score,
          away_score: match.away_score,
        },
        status: 'unsupported',
      })
      continue
    }

    const homeWon = homeScore > awayScore
    const awayWon = awayScore > homeScore
    let status: GradedUploadedPick['status'] = 'lose'
    let profit = 0

    if ((isHomePick && homeWon) || (isAwayPick && awayWon)) {
      status = 'win'
      if (odds !== undefined) {
        profit = stake * americanProfitPerUnit(odds)
      } else {
        profit = stake // treat as even money if odds missing
      }
      wins++
    } else if ((isHomePick && awayWon) || (isAwayPick && homeWon)) {
      status = 'lose'
      profit = -stake
      losses++
    } else {
      // tie / push – treat as pending for now
      status = 'pending'
      pending++
      profit = 0
    }

    totalStake += stake
    totalProfit += profit

    const agg = byLeagueAgg[leagueKey]
    agg.picks++
    agg.stake += stake
    agg.profit += profit
    if (status === 'win') agg.wins++
    else if (status === 'lose') agg.losses++
    else if (status === 'pending') agg.pending++

    graded.push({
      ...p,
      resolved_date: match.game_date,
      matched_game: {
        home_team: match.home_team,
        away_team: match.away_team,
        game_date: match.game_date,
        league: match.league,
        home_score: match.home_score,
        away_score: match.away_score,
      },
      status,
      profit,
    })
  }

  const gradedCount = wins + losses
  const total = graded.length
  const winRate = gradedCount > 0 ? (wins / gradedCount) * 100 : 0
  const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0

  const leagueSummary: Record<string, { picks: number; graded: number; wins: number; losses: number; pending: number; winRate: number; roi: number }> = {}
  for (const [league, agg] of Object.entries(byLeagueAgg)) {
    const g = agg.wins + agg.losses
    leagueSummary[league] = {
      picks: agg.picks,
      graded: g,
      wins: agg.wins,
      losses: agg.losses,
      pending: agg.pending,
      winRate: g > 0 ? (agg.wins / g) * 100 : 0,
      roi: agg.stake > 0 ? (agg.profit / agg.stake) * 100 : 0,
    }
  }

  // Truncate detailed results to avoid huge payloads
  const maxDetails = 200
  const truncatedDetails = graded.slice(0, maxDetails)

  return NextResponse.json({
    success: true,
    counts: { total, graded: gradedCount, wins, losses, pending, unmatched, unsupported },
    performance: {
      winRate: Number.isFinite(winRate) ? Math.round(winRate * 10) / 10 : null,
      roi: Number.isFinite(roi) ? Math.round(roi * 10) / 10 : null,
      totalStake,
      totalProfit: Math.round(totalProfit * 100) / 100,
    },
    byLeague: leagueSummary,
    sample: truncatedDetails,
    sampleLimit: maxDetails,
  })
}


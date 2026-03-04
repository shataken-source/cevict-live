/**
 * Early Lines Performance API
 * Compares early-line picks vs regular picks against actual game outcomes
 * to determine if early lines are helping or hurting overall performance.
 *
 * Loads prediction files + game_outcomes from Supabase for a date range,
 * grades both early and regular picks, and produces a head-to-head comparison.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadPredictionsSnapshot } from '@/app/lib/early-lines'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (
    (cronSecret && secret.trim() === cronSecret.trim()) ||
    (adminPassword && secret.trim() === adminPassword.trim())
  ) as boolean
}

/** Normalize team name for fuzzy matching */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  // Last-word match (mascot): "Minnesota Timberwolves" vs "Timberwolves"
  const lastA = na.replace(/.*?([a-z]+)$/, '$1')
  const lastB = nb.replace(/.*?([a-z]+)$/, '$1')
  if (lastA.length > 3 && lastA === lastB) return true
  return false
}

function profitFromOdds(odds: number, won: boolean): number {
  if (!won) return -100
  if (odds > 0) return odds
  return (100 / Math.abs(odds)) * 100
}

interface GradedPick {
  game_id: string
  home_team: string
  away_team: string
  sport: string
  pick: string
  pick_type: string
  odds: number
  confidence: number
  recommended_line?: number
  won: boolean | null // null = no outcome found
  profit: number
}

interface DayResult {
  date: string
  early: { picks: number; wins: number; losses: number; profit: number; winRate: number }
  regular: { picks: number; wins: number; losses: number; profit: number; winRate: number }
  divergences: {
    game_id: string
    home_team: string
    away_team: string
    sport: string
    early_pick: string
    regular_pick: string
    early_odds: number
    regular_odds: number
    early_confidence: number
    regular_confidence: number
    actual_winner: string
    early_correct: boolean
    regular_correct: boolean
  }[]
}

function gradePick(
  pick: any,
  outcomes: Map<string, { home_team: string; away_team: string; home_score: number; away_score: number; winner: string }>
): GradedPick {
  const gameId = pick.game_id || `${pick.home_team}-${pick.away_team}`

  // Try exact game_id match first, then fuzzy team match
  let outcome = outcomes.get(gameId)
  if (!outcome) {
    for (const [, o] of outcomes) {
      if (namesMatch(pick.home_team, o.home_team) && namesMatch(pick.away_team, o.away_team)) {
        outcome = o
        break
      }
      // Try swapped
      if (namesMatch(pick.home_team, o.away_team) && namesMatch(pick.away_team, o.home_team)) {
        outcome = o
        break
      }
    }
  }

  if (!outcome) {
    return {
      game_id: gameId,
      home_team: pick.home_team,
      away_team: pick.away_team,
      sport: pick.sport || pick.league || '',
      pick: pick.pick,
      pick_type: pick.pick_type || 'ML',
      odds: pick.odds ?? -110,
      confidence: pick.confidence ?? 50,
      recommended_line: pick.recommended_line,
      won: null,
      profit: 0,
    }
  }

  const actualWinner = outcome.winner
  if (actualWinner === 'TIE') {
    return {
      game_id: gameId,
      home_team: pick.home_team,
      away_team: pick.away_team,
      sport: pick.sport || pick.league || '',
      pick: pick.pick,
      pick_type: pick.pick_type || 'ML',
      odds: pick.odds ?? -110,
      confidence: pick.confidence ?? 50,
      recommended_line: pick.recommended_line,
      won: null,
      profit: 0,
    }
  }

  // For spread picks, check against spread
  if (pick.pick_type?.toUpperCase() === 'SPREAD' && pick.recommended_line != null) {
    const margin = outcome.home_score - outcome.away_score
    const line = pick.recommended_line
    const pickedHome = namesMatch(pick.pick, outcome.home_team)
    const covered = pickedHome ? (margin + line > 0) : (-margin - line > 0)
    const pushed = pickedHome ? (margin + line === 0) : (-margin - line === 0)
    if (pushed) {
      return {
        game_id: gameId, home_team: pick.home_team, away_team: pick.away_team,
        sport: pick.sport || '', pick: pick.pick, pick_type: 'SPREAD',
        odds: pick.odds ?? -110, confidence: pick.confidence ?? 50,
        recommended_line: pick.recommended_line, won: null, profit: 0,
      }
    }
    return {
      game_id: gameId, home_team: pick.home_team, away_team: pick.away_team,
      sport: pick.sport || '', pick: pick.pick, pick_type: 'SPREAD',
      odds: pick.odds ?? -110, confidence: pick.confidence ?? 50,
      recommended_line: pick.recommended_line,
      won: covered,
      profit: covered ? profitFromOdds(pick.odds ?? -110, true) : -100,
    }
  }

  // Moneyline
  const won = namesMatch(pick.pick, actualWinner)
  return {
    game_id: gameId,
    home_team: pick.home_team,
    away_team: pick.away_team,
    sport: pick.sport || pick.league || '',
    pick: pick.pick,
    pick_type: pick.pick_type || 'ML',
    odds: pick.odds ?? -110,
    confidence: pick.confidence ?? 50,
    recommended_line: pick.recommended_line,
    won,
    profit: profitFromOdds(pick.odds ?? -110, won),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, startDate, endDate, days } = body as {
      secret?: string; startDate?: string; endDate?: string; days?: number
    }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    // Build date range
    const end = endDate || new Date().toISOString().split('T')[0]
    const numDays = days || 14
    const dates: string[] = []
    const endD = new Date(end + 'T12:00:00Z')
    if (startDate) {
      const startD = new Date(startDate + 'T12:00:00Z')
      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
    } else {
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(endD.getTime() - i * 86400000)
        dates.push(d.toISOString().split('T')[0])
      }
    }

    // Load game outcomes from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Missing Supabase credentials' }, { status: 500 })
    }
    const sb = createClient(supabaseUrl, supabaseKey)

    const { data: outcomeRows, error: outcomeErr } = await sb
      .from('game_outcomes')
      .select('game_id, game_date, home_team, away_team, home_score, away_score, winner')
      .in('game_date', dates)

    if (outcomeErr) {
      return NextResponse.json({ success: false, error: `Failed to load outcomes: ${outcomeErr.message}` }, { status: 500 })
    }

    // Index outcomes by date → map of game_id → outcome
    const outcomesByDate = new Map<string, Map<string, any>>()
    for (const o of (outcomeRows || [])) {
      if (!outcomesByDate.has(o.game_date)) outcomesByDate.set(o.game_date, new Map())
      const dateMap = outcomesByDate.get(o.game_date)!
      const key = o.game_id || `${o.home_team}-${o.away_team}`
      dateMap.set(key, o)
    }

    // Process each date
    const dailyResults: DayResult[] = []
    let totalEarly = { picks: 0, wins: 0, losses: 0, profit: 0, graded: 0 }
    let totalRegular = { picks: 0, wins: 0, losses: 0, profit: 0, graded: 0 }
    let totalDivergences = 0
    let earlyRightWhenDiverged = 0
    let regularRightWhenDiverged = 0
    let bothWrongWhenDiverged = 0
    let bothRightWhenDiverged = 0

    // Per-sport tracking
    const bySport: Record<string, { early: { w: number; l: number; profit: number }; regular: { w: number; l: number; profit: number } }> = {}

    // Confidence bucket tracking
    const byConfBucket: Record<string, { early: { w: number; l: number }; regular: { w: number; l: number } }> = {}

    for (const date of dates) {
      const earlyData = await loadPredictionsSnapshot(date, true)
      const regularData = await loadPredictionsSnapshot(date, false)

      if (!earlyData && !regularData) continue

      const earlyPicks = Array.isArray(earlyData?.picks) ? earlyData.picks : []
      const regularPicks = Array.isArray(regularData?.picks) ? regularData.picks : []

      if (earlyPicks.length === 0 && regularPicks.length === 0) continue

      // Get outcomes for this date AND adjacent dates (games may span midnight)
      const allOutcomes = new Map<string, any>()
      for (const [d, m] of outcomesByDate) {
        // Include outcomes from date-1, date, date+1
        const dateMs = new Date(date + 'T12:00:00Z').getTime()
        const dMs = new Date(d + 'T12:00:00Z').getTime()
        if (Math.abs(dateMs - dMs) <= 2 * 86400000) {
          for (const [k, v] of m) allOutcomes.set(k, v)
        }
      }

      // Grade early picks
      const gradedEarly = earlyPicks.map((p: any) => gradePick(p, allOutcomes))
      const earlyGraded = gradedEarly.filter(g => g.won !== null)
      const earlyWins = earlyGraded.filter(g => g.won === true).length
      const earlyLosses = earlyGraded.filter(g => g.won === false).length
      const earlyProfit = earlyGraded.reduce((s, g) => s + g.profit, 0)

      // Grade regular picks
      const gradedRegular = regularPicks.map((p: any) => gradePick(p, allOutcomes))
      const regGraded = gradedRegular.filter(g => g.won !== null)
      const regWins = regGraded.filter(g => g.won === true).length
      const regLosses = regGraded.filter(g => g.won === false).length
      const regProfit = regGraded.reduce((s, g) => s + g.profit, 0)

      // Find divergences — games where early and regular picked different sides
      const earlyByGame = new Map<string, any>()
      for (const p of earlyPicks) {
        const id = p.game_id || `${p.home_team}-${p.away_team}`
        earlyByGame.set(id, p)
      }

      const divergences: DayResult['divergences'] = []
      for (const rp of regularPicks) {
        const gameId = rp.game_id || `${rp.home_team}-${rp.away_team}`
        const ep = earlyByGame.get(gameId)
        if (!ep) continue
        if (ep.pick === rp.pick) continue // Same pick, not a divergence

        const outcome = allOutcomes.get(gameId) ||
          [...allOutcomes.values()].find(o =>
            namesMatch(ep.home_team, o.home_team) && namesMatch(ep.away_team, o.away_team)
          )

        if (!outcome || outcome.winner === 'TIE') continue

        const earlyCorrect = namesMatch(ep.pick, outcome.winner)
        const regularCorrect = namesMatch(rp.pick, outcome.winner)

        divergences.push({
          game_id: gameId,
          home_team: ep.home_team,
          away_team: ep.away_team,
          sport: ep.sport || ep.league || '',
          early_pick: ep.pick,
          regular_pick: rp.pick,
          early_odds: ep.odds ?? 0,
          regular_odds: rp.odds ?? 0,
          early_confidence: ep.confidence ?? 0,
          regular_confidence: rp.confidence ?? 0,
          actual_winner: outcome.winner,
          early_correct: earlyCorrect,
          regular_correct: regularCorrect,
        })

        totalDivergences++
        if (earlyCorrect && !regularCorrect) earlyRightWhenDiverged++
        else if (!earlyCorrect && regularCorrect) regularRightWhenDiverged++
        else if (earlyCorrect && regularCorrect) bothRightWhenDiverged++
        else bothWrongWhenDiverged++
      }

      // Accumulate totals
      totalEarly.picks += earlyPicks.length
      totalEarly.wins += earlyWins
      totalEarly.losses += earlyLosses
      totalEarly.profit += earlyProfit
      totalEarly.graded += earlyGraded.length

      totalRegular.picks += regularPicks.length
      totalRegular.wins += regWins
      totalRegular.losses += regLosses
      totalRegular.profit += regProfit
      totalRegular.graded += regGraded.length

      // Per-sport accumulation
      for (const g of earlyGraded) {
        const s = (g.sport || 'unknown').toUpperCase()
        if (!bySport[s]) bySport[s] = { early: { w: 0, l: 0, profit: 0 }, regular: { w: 0, l: 0, profit: 0 } }
        if (g.won) bySport[s].early.w++; else bySport[s].early.l++
        bySport[s].early.profit += g.profit
      }
      for (const g of regGraded) {
        const s = (g.sport || 'unknown').toUpperCase()
        if (!bySport[s]) bySport[s] = { early: { w: 0, l: 0, profit: 0 }, regular: { w: 0, l: 0, profit: 0 } }
        if (g.won) bySport[s].regular.w++; else bySport[s].regular.l++
        bySport[s].regular.profit += g.profit
      }

      // Confidence bucket accumulation
      for (const g of earlyGraded) {
        const bucket = g.confidence >= 80 ? '80+' : g.confidence >= 70 ? '70-79' : g.confidence >= 60 ? '60-69' : '<60'
        if (!byConfBucket[bucket]) byConfBucket[bucket] = { early: { w: 0, l: 0 }, regular: { w: 0, l: 0 } }
        if (g.won) byConfBucket[bucket].early.w++; else byConfBucket[bucket].early.l++
      }
      for (const g of regGraded) {
        const bucket = g.confidence >= 80 ? '80+' : g.confidence >= 70 ? '70-79' : g.confidence >= 60 ? '60-69' : '<60'
        if (!byConfBucket[bucket]) byConfBucket[bucket] = { early: { w: 0, l: 0 }, regular: { w: 0, l: 0 } }
        if (g.won) byConfBucket[bucket].regular.w++; else byConfBucket[bucket].regular.l++
      }

      if (earlyGraded.length > 0 || regGraded.length > 0) {
        dailyResults.push({
          date,
          early: {
            picks: earlyPicks.length,
            wins: earlyWins,
            losses: earlyLosses,
            profit: Math.round(earlyProfit * 100) / 100,
            winRate: earlyGraded.length > 0 ? Math.round((earlyWins / earlyGraded.length) * 1000) / 10 : 0,
          },
          regular: {
            picks: regularPicks.length,
            wins: regWins,
            losses: regLosses,
            profit: Math.round(regProfit * 100) / 100,
            winRate: regGraded.length > 0 ? Math.round((regWins / regGraded.length) * 1000) / 10 : 0,
          },
          divergences,
        })
      }
    }

    // Build summary
    const earlyWinRate = totalEarly.graded > 0 ? Math.round((totalEarly.wins / totalEarly.graded) * 1000) / 10 : 0
    const regWinRate = totalRegular.graded > 0 ? Math.round((totalRegular.wins / totalRegular.graded) * 1000) / 10 : 0
    const earlyROI = totalEarly.graded > 0 ? Math.round((totalEarly.profit / (totalEarly.graded * 100)) * 1000) / 10 : 0
    const regROI = totalRegular.graded > 0 ? Math.round((totalRegular.profit / (totalRegular.graded * 100)) * 1000) / 10 : 0

    // Verdict
    let verdict: string
    const winRateDiff = earlyWinRate - regWinRate
    const roiDiff = earlyROI - regROI
    if (totalDivergences === 0) {
      verdict = 'No divergences found — early and regular picks agreed on every game. Early lines add coverage (more games) but don\'t change picks.'
    } else if (earlyRightWhenDiverged > regularRightWhenDiverged) {
      verdict = `EARLY LINES HELPING — When picks disagreed, early was right ${earlyRightWhenDiverged}x vs regular ${regularRightWhenDiverged}x. Early lines are catching value before the market moves.`
    } else if (regularRightWhenDiverged > earlyRightWhenDiverged) {
      verdict = `EARLY LINES HURTING — When picks disagreed, regular was right ${regularRightWhenDiverged}x vs early ${earlyRightWhenDiverged}x. Game-time lines are more accurate.`
    } else {
      verdict = `NEUTRAL — When picks disagreed, early and regular were equally right (${earlyRightWhenDiverged}x each). Early lines add volume without clear accuracy edge.`
    }

    // Format per-sport
    const sportBreakdown = Object.entries(bySport).map(([sport, data]) => {
      const eWR = (data.early.w + data.early.l) > 0 ? Math.round((data.early.w / (data.early.w + data.early.l)) * 1000) / 10 : 0
      const rWR = (data.regular.w + data.regular.l) > 0 ? Math.round((data.regular.w / (data.regular.w + data.regular.l)) * 1000) / 10 : 0
      return {
        sport,
        early: { wins: data.early.w, losses: data.early.l, winRate: eWR, profit: Math.round(data.early.profit) },
        regular: { wins: data.regular.w, losses: data.regular.l, winRate: rWR, profit: Math.round(data.regular.profit) },
        delta_winRate: Math.round((eWR - rWR) * 10) / 10,
        better: eWR > rWR ? 'early' : eWR < rWR ? 'regular' : 'tie',
      }
    }).sort((a, b) => Math.abs(b.delta_winRate) - Math.abs(a.delta_winRate))

    // Format confidence buckets
    const confBreakdown = Object.entries(byConfBucket).map(([bucket, data]) => {
      const eWR = (data.early.w + data.early.l) > 0 ? Math.round((data.early.w / (data.early.w + data.early.l)) * 1000) / 10 : 0
      const rWR = (data.regular.w + data.regular.l) > 0 ? Math.round((data.regular.w / (data.regular.w + data.regular.l)) * 1000) / 10 : 0
      return { bucket, early: { ...data.early, winRate: eWR }, regular: { ...data.regular, winRate: rWR } }
    }).sort((a, b) => {
      const order = ['80+', '70-79', '60-69', '<60']
      return order.indexOf(a.bucket) - order.indexOf(b.bucket)
    })

    return NextResponse.json({
      success: true,
      dateRange: { start: dates[0], end: dates[dates.length - 1], days: dates.length },
      verdict,
      summary: {
        early: { picks: totalEarly.picks, graded: totalEarly.graded, wins: totalEarly.wins, losses: totalEarly.losses, winRate: earlyWinRate, roi: earlyROI, profit: Math.round(totalEarly.profit) },
        regular: { picks: totalRegular.picks, graded: totalRegular.graded, wins: totalRegular.wins, losses: totalRegular.losses, winRate: regWinRate, roi: regROI, profit: Math.round(totalRegular.profit) },
        winRateDelta: Math.round(winRateDiff * 10) / 10,
        roiDelta: Math.round(roiDiff * 10) / 10,
      },
      divergences: {
        total: totalDivergences,
        earlyRight: earlyRightWhenDiverged,
        regularRight: regularRightWhenDiverged,
        bothRight: bothRightWhenDiverged,
        bothWrong: bothWrongWhenDiverged,
      },
      sportBreakdown,
      confBreakdown,
      daily: dailyResults,
    })
  } catch (e: any) {
    console.error('[early-lines-performance]', e)
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

/**
 * Cron: Grade yesterday's predictions and write results-YYYY-MM-DD.json
 * Schedule: 6:00 UTC daily (Vercel). Run after US games have finished so the Odds API
 * has final scores — midnight UTC is still US evening so all picks would be pending.
 *
 * Reads predictions-YYYY-MM-DD.json (date = yesterday by default), fetches scores
 * from Odds API first; if a league has no completed games, falls back to API-Sports
 * (when API_SPORTS_KEY is set). Matches each pick to a completed game, grades win/lose,
 * writes results-YYYY-MM-DD.json.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPreviousDayResultsFromProviders } from '../../../../lib/data-sources/results-apis'
import { gameTeamsMatch, teamsMatch, normalizeForMatch } from '../../../lib/team-matcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SPORT_KEY_MAP: Record<string, string> = {
  NFL: 'americanfootball_nfl',
  NBA: 'basketball_nba',
  MLB: 'baseball_mlb',
  NHL: 'icehockey_nhl',
  NCAAF: 'americanfootball_ncaaf',
  NCAAB: 'basketball_ncaab',
  CBB: 'baseball_ncaa',
}

// Leagues that need to search multiple sport buckets (e.g. NCAA = basketball OR baseball)
const SPORT_KEY_MULTI: Record<string, string[]> = {
  NCAA: ['NCAAB', 'CBB'],
}

/** Thin wrapper so existing call sites keep working */
function norm(name: string): string {
  return normalizeForMatch(name).replace(/\s+/g, '')
}

function namesMatch(a: string, b: string): boolean {
  return teamsMatch(a, b)
}

type GradedPick = {
  home_team: string
  away_team: string
  pick: string
  confidence: number
  sport?: string
  league?: string
  game_id?: string
  status: 'win' | 'lose' | 'pending'
  actualWinner?: string
  actualScore?: { home: number; away: number }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url || '')
  const dateParam = url.searchParams.get('date')
  // Default: yesterday (when run at 12am, we grade the day that just ended)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = dateParam || yesterday.toISOString().split('T')[0]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseKey) {
    console.error('[CRON daily-results] Missing SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ success: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }
  const sbClient = createClient(supabaseUrl!, supabaseKey)

  // Load predictions from Supabase Storage
  const fileName = `predictions-${date}.json`
  let payload: any
  try {
    const { data: storageData, error: storageErr } = await sbClient.storage
      .from('predictions')
      .download(fileName)
    if (storageErr || !storageData) {
      return NextResponse.json({
        success: false,
        error: `No predictions file in storage: ${fileName}`,
        detail: storageErr?.message,
      }, { status: 404 })
    }
    const raw = await storageData.text()
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
    payload = JSON.parse(clean)
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid predictions JSON' }, { status: 400 })
  }

  // Support both formats: { date, picks: [...] } (new) or top-level array (old)
  const rawPicks = Array.isArray(payload) ? payload : (payload.picks ?? [])
  // Normalize each item: ensure home_team, away_team, pick (old format has winner, no home/away)
  const picks = rawPicks.map((p: any) => {
    const pick = p.pick ?? p.winner
    let home_team = p.home_team
    let away_team = p.away_team
    if ((!home_team || !away_team) && p.keyFactors?.[0]) {
      const text = p.keyFactors[0]
      // e.g. "Team strength: Carolina Hurricanes (104%) vs Ottawa Senators (103%)"
      const vsMatch = text.match(/Team strength:\s*([^(]+?)\s*\([^)]*\)\s+vs\s+([^(]+?)\s*\(/)
      if (vsMatch) {
        home_team = (home_team || vsMatch[1].trim()) as string
        away_team = (away_team || vsMatch[2].trim()) as string
      }
    }
    return { ...p, home_team, away_team, pick }
  }).filter((p: any) => p.pick && p.home_team && p.away_team)

  const noPicksMsg = picks.length === 0
    ? (rawPicks.length === 0
      ? 'No picks to grade'
      : `No valid picks to grade (file had ${rawPicks.length} entries but missing home_team/away_team or pick; use daily-predictions cron format).`)
    : null

  console.log(`[GRADE] Loaded ${picks.length} picks from ${fileName}:`, picks.map(p => `${p.away_team} @ ${p.home_team} (${p.sport || p.league || 'unknown'})`).join(', '))

  // Fetch scores — ESPN free scoreboard is primary (no key, near real-time, full coverage)
  // Also fetch date+1 since the prediction engine sometimes pulls next-day games late at night
  const nextDate = new Date(date + 'T12:00:00Z')
  nextDate.setDate(nextDate.getDate() + 1)
  const nextDateStr = nextDate.toISOString().split('T')[0]

  const scoresByKey: Record<string, { home: string; away: string; homeScore: number; awayScore: number; gameId?: string }[]> = {}
  const fallbackSummary: Record<string, string | number> = {}

  for (const league of Object.keys(SPORT_KEY_MAP)) {
    try {
      const [gameResults, nextDayResults] = await Promise.all([
        fetchPreviousDayResultsFromProviders(league as 'NFL' | 'NBA' | 'NHL' | 'MLB' | 'NCAAB' | 'NCAAF', date),
        fetchPreviousDayResultsFromProviders(league as 'NFL' | 'NBA' | 'NHL' | 'MLB' | 'NCAAB' | 'NCAAF', nextDateStr).catch(() => []),
      ])
      const combined = [...gameResults, ...nextDayResults]
      // Deduplicate by home+away
      const seen = new Set<string>()
      const deduped = combined.filter(r => {
        const key = `${r.homeTeam}|${r.awayTeam}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      scoresByKey[league] = deduped.map(r => ({ home: r.homeTeam, away: r.awayTeam, homeScore: r.homeScore, awayScore: r.awayScore }))
      console.log(`[GRADE] ${league}: ${gameResults.length} games (${date}) + ${nextDayResults.length} games (${nextDateStr}) from ESPN`)
    } catch (e) {
      scoresByKey[league] = []
      const msg = (e as Error)?.message ?? 'error'
      console.warn(`[GRADE] ESPN fetch failed for ${league}:`, msg)
      fallbackSummary[league] = `err: ${msg.slice(0, 50)}`
    }
  }

  // ── Always persist ALL completed games to game_outcomes for backtesting ──
  // Runs regardless of whether we have picks to grade — so every day's results are captured.
  let gameOutcomesStored = 0
  {
    try {
      const gameOutcomeRows: any[] = []
      for (const [league, games] of Object.entries(scoresByKey)) {
        const sportKey = SPORT_KEY_MAP[league]
        const usedFallback = league in fallbackSummary
        for (const game of games) {
          if (game.homeScore === 0 && game.awayScore === 0) continue
          const winner = game.homeScore > game.awayScore
            ? game.home
            : game.awayScore > game.homeScore
              ? game.away
              : 'TIE'
          gameOutcomeRows.push({
            game_id: game.gameId || null,
            game_date: date,
            sport: sportKey || league.toLowerCase(),
            league,
            home_team: game.home,
            away_team: game.away,
            home_score: game.homeScore,
            away_score: game.awayScore,
            winner,
            source: usedFallback ? 'api-sports' : 'odds-api',
          })
        }
      }
      if (gameOutcomeRows.length > 0) {
        // Deduplicate by (game_date, home_team, away_team) to avoid Postgres
        // error: "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const uniq = new Map<string, any>()
        for (const r of gameOutcomeRows) {
          const key = `${r.game_date}|${norm(r.home_team)}|${norm(r.away_team)}`
          if (!uniq.has(key)) uniq.set(key, r)
        }
        const uniqueRows = Array.from(uniq.values())

        const { error: outcomesError } = await sbClient
          .from('game_outcomes')
          .upsert(uniqueRows, { onConflict: 'game_date,home_team,away_team' })
        if (outcomesError) {
          console.warn(`[CRON daily-results] game_outcomes insert error:`, outcomesError.message)
        } else {
          gameOutcomesStored = uniqueRows.length
          console.log(`[CRON daily-results] Stored ${gameOutcomesStored} game outcomes for backtesting`)
        }
      }
    } catch (e) {
      console.warn(`[CRON daily-results] game_outcomes write failed:`, (e as Error).message)
    }
  }

  // If no valid picks, return early now that game_outcomes have been saved
  if (noPicksMsg) {
    const emptyResult = { date, gradedAt: new Date().toISOString(), results: [], summary: { total: 0, correct: 0, pending: 0, graded: 0, winRate: 0 } }
    return NextResponse.json({ success: true, date, message: noPicksMsg, summary: emptyResult.summary, gameOutcomesStored })
  }

  const results: GradedPick[] = []
  let correct = 0
  let pending = 0

  for (const p of picks) {
    const sport = (p.sport || p.league || 'NBA').toUpperCase()
    const leagueHint = sport in SPORT_KEY_MAP ? sport : null
    const multiHints = SPORT_KEY_MULTI[sport] ?? null
    const homeMatch = (s: any) => gameTeamsMatch(p.home_team ?? '', p.away_team ?? '', s.home, s.away)
    let match: { home: string; away: string; homeScore: number; awayScore: number } | undefined
    let matchedLeague: string | undefined
    if (leagueHint) {
      const scores = scoresByKey[leagueHint] ?? []
      match = scores.find(homeMatch)
      if (match) matchedLeague = leagueHint
    }
    // NCAA = could be basketball OR baseball — search both buckets
    if (!match && multiHints) {
      for (const lk of multiHints) {
        const scores = scoresByKey[lk] ?? []
        match = scores.find(homeMatch)
        if (match) { matchedLeague = lk; break }
      }
    }
    // Only cross-league search if pick has no known sport — prevents NHL picks matching NBA when NHL=0
    if (!match && !leagueHint && !multiHints) {
      for (const lk of Object.keys(SPORT_KEY_MAP)) {
        const scores = scoresByKey[lk] ?? []
        match = scores.find(homeMatch)
        if (match) {
          matchedLeague = lk
          break
        }
      }
    }

    if (!match) {
      console.log(`[GRADE] No match for ${p.home_team} vs ${p.away_team} (${sport}). Available games in ${sport}:`,
        scoresByKey[leagueHint || '']?.map(g => `${g.away} @ ${g.home}`).join(', ') || 'none')
      results.push({
        home_team: p.home_team,
        away_team: p.away_team,
        pick: p.pick,
        confidence: p.confidence ?? 0,
        sport: p.sport,
        league: p.league,
        game_id: p.game_id,
        status: 'pending',
      })
      pending++
      continue
    }

    const actualWinner = match.homeScore > match.awayScore ? match.home : match.away
    const predictedWinner = p.pick
    const winnerCorrect = namesMatch(predictedWinner, actualWinner)
    if (winnerCorrect) correct++

    results.push({
      home_team: p.home_team,
      away_team: p.away_team,
      pick: p.pick,
      confidence: p.confidence ?? 0,
      sport: p.sport ?? matchedLeague,
      league: p.league ?? matchedLeague,
      game_id: p.game_id,
      status: winnerCorrect ? 'win' : 'lose',
      actualWinner: actualWinner,
      actualScore: { home: match.homeScore, away: match.awayScore },
    })
  }

  const graded = results.filter(r => r.status !== 'pending')
  const total = results.length
  const winRate = graded.length > 0 ? (correct / graded.length) * 100 : 0

  const out = {
    date,
    gradedAt: new Date().toISOString(),
    results,
    summary: { total, correct, pending, graded: graded.length, winRate: Math.round(winRate * 10) / 10 },
  }

  // Store results JSON in Supabase Storage
  const resultsFileName = `results-${date}.json`
  const { error: resStorErr } = await sbClient.storage
    .from('predictions')
    .upload(resultsFileName, Buffer.from(JSON.stringify(out, null, 2), 'utf8'), {
      contentType: 'application/json',
      upsert: true,
    })
  if (resStorErr) console.warn(`[CRON daily-results] Storage upload results:`, resStorErr.message)

  // Persist graded results to Supabase for historical tracking
  let dbInserted = 0
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = sbClient
      const gradedRows = results
        .filter(r => r.status === 'win' || r.status === 'lose')
        .map(r => ({
          game_date: date,
          home_team: r.home_team,
          away_team: r.away_team,
          pick: r.pick,
          confidence: r.confidence,
          sport: r.sport || r.league || 'unknown',
          league: r.league || r.sport || 'unknown',
          game_id: r.game_id || null,
          status: r.status,
          actual_winner: (r as any).actualWinner || null,
          actual_home_score: (r as any).actualScore?.home ?? null,
          actual_away_score: (r as any).actualScore?.away ?? null,
          graded_at: new Date().toISOString(),
        }))

      if (gradedRows.length > 0) {
        const { error } = await supabase
          .from('prediction_results')
          .upsert(gradedRows, { onConflict: 'game_date,home_team,away_team' })

        if (error) {
          console.warn(`[CRON daily-results] Supabase insert error:`, error.message)
        } else {
          dbInserted = gradedRows.length
          console.log(`[CRON daily-results] Stored ${dbInserted} graded results in Supabase`)
        }
      }

      // Also store daily summary
      const { error: summaryError } = await sbClient
        .from('prediction_daily_summary')
        .upsert({
          date,
          total_picks: total,
          correct,
          wrong: graded.length - correct,
          pending,
          graded: graded.length,
          win_rate: out.summary.winRate,
          graded_at: new Date().toISOString(),
        }, { onConflict: 'date' })

      if (summaryError) {
        console.warn(`[CRON daily-results] Summary insert error:`, summaryError.message)
      }
    } catch (e) {
      console.warn(`[CRON daily-results] DB persistence failed:`, (e as Error).message)
    }
  }

  // Per-league score counts and source (Odds API vs API-Sports fallback) for admin UI
  const scoresByLeague: Record<string, { count: number; source: 'odds' | 'fallback' }> = {}
  for (const league of Object.keys(SPORT_KEY_MAP)) {
    const count = (scoresByKey[league] ?? []).length
    const source = league in fallbackSummary ? 'fallback' : 'odds'
    scoresByLeague[league] = { count, source }
  }

  console.log(`[CRON daily-results] Graded ${total} picks for ${date}: ${correct}W / ${graded.length - correct}L (${pending} pending)`)
  const message =
    graded.length === 0 && pending > 0
      ? `${total} picks for ${date} — all pending. Games for this date may not have been played yet or scores not yet available from the Odds API. Re-run after games are complete.`
      : `Graded ${total} picks: ${correct} correct, ${graded.length - correct} wrong, ${pending} pending. Win rate ${out.summary.winRate}%.${dbInserted > 0 ? ` ${dbInserted} results saved to database.` : ''}${gameOutcomesStored > 0 ? ` ${gameOutcomesStored} game outcomes stored for backtesting.` : ''}`
  return NextResponse.json({
    success: true,
    date,
    file: resultsFileName,
    summary: out.summary,
    message,
    dbInserted,
    gameOutcomesStored,
    results: out.results,
    fallbackSummary: Object.keys(fallbackSummary).length > 0 ? fallbackSummary : undefined,
    scoresByLeague,
  })
}

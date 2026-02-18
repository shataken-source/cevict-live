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
import fs from 'node:fs'
import path from 'node:path'
import { getPrimaryKey } from '../../../keys-store'
import { fetchPreviousDayResultsFromProviders } from '../../../../lib/data-sources/results-apis'

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

/** Aggressive normalization: strip diacritics, punctuation, spaces; lowercase. */
function norm(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['.’'`]/g, '')           // apostrophes and curly/smart quotes
    .replace(/[.\-&]/g, '')           // period, hyphen, ampersand (e.g. Texas A&M)
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim()
}

/** Alias groups: each sub-array is equivalent team names (after norm). Builds a map so we can match any variant. */
const TEAM_ALIAS_GROUPS: string[][] = [
  ['utahmammoth', 'utahhockeyclub', 'utahhockey'],  // NHL Utah
  ['floridaintl', 'floridainternational', 'floridafiu', 'fiu', 'floridagoldenpanthers'],
  ['gwrevolutionaries', 'georgewashington', 'gw'],
  ['ncstatewolfpack', 'ncstate', 'northcarolinastate'],
  ['ulmonroe', 'louisianamonroe', 'ulmonroewarhawks', 'ulm'],
  ['ucfknights', 'ucf', 'centralflorida'],
  ['unlvrebels', 'unlv', 'nevadalasvegas'],
  ['byucougars', 'byu', 'brighamyoung'],
  ['stthomas', 'stthomastommies'],  // St. Thomas (MN)
  ['arkansaslittlerocktrojans', 'arkansaslittlerock', 'littlerock', 'ualr'],
  ['siuedwardsvillecougars', 'siuedwardsville', 'southernillinoisuniversityedwardsville'],
  ['floridaatlanticowls', 'floridaatlantic', 'fau'],
  ['georgestpanthers', 'georgiastate', 'georgiastpanthers'],
  ['texasstatebobcats', 'texasstate'],
  ['southfloridabulls', 'southflorida', 'usf'],
  ['northtexasmeangreen', 'northtexas', 'unt'],
  ['louisianatechbulldogs', 'louisianatech', 'latech'],
  ['newmexicostateaggies', 'newmexicostate', 'nmstate'],
  ['stlouisbillikens', 'saintlouis', 'stlouis'],  // NCAAB Saint Louis
  ['stjohnsredstorm', 'stjohns'],
  ['georgetownhoyas', 'georgetown'],
  ['vcurevolutionaries', 'vcu', 'virginiacommonwealth'],
  ['uicflames', 'uic', 'illinoischicago'],
  ['youngstownstpenguins', 'youngstownstate', 'youngstownst'],
  ['wrightstateraiders', 'wrightstate', 'wrightst'],
  ['detroitmercytitans', 'detroitmercy', 'detroit'],
  ['southdakotacoyotes', 'southdakota', 'southdakotastate'],
  ['arizonastsundevils', 'arizonastate', 'arizonast'],
  ['washingtonstcougars', 'washingtonstate', 'washingtonst'],
  ['utahstateaggies', 'utahstate'],
  ['santaclarabroncos', 'santaclara'],
  ['sandiegotoreros', 'sandiego', 'universityofsandiego'],
  ['pepperdinewaves', 'pepperdine'],
  ['seattleredhawks', 'seattle', 'seattleuniversity'],
  ['loyolamarymountlions', 'loyolamarymount', 'lmulions'],
  ['stbonaventurebonnies', 'stbonaventure', 'bonaventure'],
  ['georgiatechyellowjackets', 'georgiatech', 'georgiainstituteoftechnology'],
]
// Normalize alias group entries and build map: for each norm form, list of all equivalent keys
function buildAliasMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const group of TEAM_ALIAS_GROUPS) {
    const normalizedGroup = [...new Set(group.map(n => norm(n)))]
    for (const key of normalizedGroup) {
      map.set(key, normalizedGroup)
    }
  }
  return map
}
const ALIAS_MAP = buildAliasMap()

/** All normalized keys for a team name (norm + any aliases in same group). Used for matching. */
function allNormKeys(name: string): string[] {
  const n = norm(name)
  return ALIAS_MAP.get(n) ?? [n]
}

function namesMatch(a: string, b: string): boolean {
  const keysA = allNormKeys(a)
  const keysB = allNormKeys(b)
  return keysA.some(k => keysB.includes(k))
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

  const apiKey = getPrimaryKey()
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Odds API key not set' }, { status: 500 })
  }

  const appRoot = process.cwd()
  const predictionsPath = path.join(appRoot, `predictions-${date}.json`)

  if (!fs.existsSync(predictionsPath)) {
    return NextResponse.json({
      success: false,
      error: `No predictions file: predictions-${date}.json`,
      path: predictionsPath,
    }, { status: 404 })
  }

  let payload: any
  try {
    const raw = fs.readFileSync(predictionsPath, 'utf8')
    // Strip UTF-8 BOM if present so JSON.parse succeeds on files written with BOM.
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

  if (picks.length === 0) {
    const outPath = path.join(appRoot, `results-${date}.json`)
    const emptyResult = {
      date,
      gradedAt: new Date().toISOString(),
      results: [],
      summary: { total: 0, correct: 0, pending: 0, graded: 0, winRate: 0 }
    }
    fs.writeFileSync(outPath, JSON.stringify(emptyResult, null, 2), 'utf8')
    const msg = rawPicks.length === 0
      ? 'No picks to grade'
      : `No valid picks to grade (file had ${rawPicks.length} entries but missing home_team/away_team or pick; use daily-predictions cron format).`
    return NextResponse.json({ success: true, date, file: outPath, message: msg, summary: emptyResult.summary })
  }

  // Fetch scores for all sports (daysFrom=2 to catch games that finished yesterday)
  const scoresByKey: Record<string, { home: string; away: string; homeScore: number; awayScore: number }[]> = {}
  for (const [league, sportKey] of Object.entries(SPORT_KEY_MAP)) {
    try {
      const scoreUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=2&apiKey=${apiKey}`
      const res = await fetch(scoreUrl, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data)) continue
      const completed = data.filter((g: any) => g.completed && Array.isArray(g.scores))
      scoresByKey[league] = completed.map((g: any) => {
        const home = g.home_team
        const away = g.away_team
        const homeEntry = g.scores?.find((s: any) => norm(s.name) === norm(home))
        const awayEntry = g.scores?.find((s: any) => norm(s.name) === norm(away))
        const homeScore = Number(homeEntry?.score ?? homeEntry?.points ?? 0)
        const awayScore = Number(awayEntry?.score ?? awayEntry?.points ?? 0)
        return { home, away, homeScore, awayScore }
      }).filter((x: any) => x.homeScore !== undefined && x.awayScore !== undefined)
    } catch {
      scoresByKey[league] = []
    }
  }

  // Fallback: when Odds API returned no scores, try API-Sports (same key for all; header: x-apisports-key)
  // Dashboard: NHL=v1.hockey, NFL/NCAAF=v1.american-football, NCAAB=v1.basketball, MLB=v1.baseball
  const apiSportsKey = process.env.API_SPORTS_KEY
  const API_SPORTS_HOSTS: Record<string, string> = {
    NHL: 'v1.hockey.api-sports.io',
    NBA: 'v1.basketball.api-sports.io',
    NFL: 'v1.american-football.api-sports.io',
    NCAAB: 'v1.basketball.api-sports.io',
    NCAAF: 'v1.american-football.api-sports.io',
    MLB: 'v1.baseball.api-sports.io',
  }
  const API_SPORTS_LEAGUES: Record<string, string> = {
    NHL: '57',
    NBA: '12',
    NFL: '1',
    NCAAB: '116',
    NCAAF: '8',
    MLB: '1',
  }
  const FINISHED_STATUS = new Set(['FT', 'AOT', 'AET', 'AP', 'FT_PEN', 'SO']) // finished / after OT / after penalty / shootout
  const fallbackSummary: Record<string, string | number> = {}

  if (apiSportsKey) {
    for (const league of Object.keys(SPORT_KEY_MAP)) {
      const existing = scoresByKey[league] ?? []
      if (existing.length > 0) continue
      const host = API_SPORTS_HOSTS[league]
      const leagueId = API_SPORTS_LEAGUES[league]
      if (!host || !leagueId) continue
      try {
        const url = `https://${host}/games?league=${leagueId}&date=${date}&timezone=America/New_York`
        const res = await fetch(url, {
          headers: { 'x-apisports-key': apiSportsKey },
          cache: 'no-store',
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.warn(`[CRON daily-results] API-Sports ${league} ${res.status}: ${errText}`)
          fallbackSummary[league] = `${res.status}${errText ? ` ${errText.slice(0, 40)}` : ''}`
          continue
        }
        const json = await res.json()
        const games = Array.isArray(json?.response) ? json.response : []
        const finished = games.filter(
          (g: any) => FINISHED_STATUS.has(String(g.status?.short)) && g.scores?.home?.total != null && g.scores?.away?.total != null
        )
        const list = finished.map((g: any) => ({
          home: (g.teams?.home?.name ?? '').trim(),
          away: (g.teams?.away?.name ?? '').trim(),
          homeScore: Number(g.scores.home.total),
          awayScore: Number(g.scores.away.total),
        })).filter((x: any) => x.home && x.away)
        scoresByKey[league] = list
        fallbackSummary[league] = list.length
        if (list.length > 0) {
          console.log(`[CRON daily-results] Fallback API-Sports: ${league} got ${list.length} scores`)
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? 'error'
        console.warn(`[CRON daily-results] API-Sports fallback ${league}:`, msg)
        fallbackSummary[league] = `err: ${msg.slice(0, 50)}`
      }
    }
  }

  // Third fallback: external results APIs (Rolling Insights, JsonOdds, TheSportsDB, Score24, BALLDONTLIE)
  for (const league of Object.keys(SPORT_KEY_MAP)) {
    if ((scoresByKey[league] ?? []).length > 0) continue
    try {
      const gameResults = await fetchPreviousDayResultsFromProviders(league as 'NFL' | 'NBA' | 'NHL' | 'MLB' | 'NCAAB' | 'NCAAF', date)
      if (gameResults.length > 0) {
        scoresByKey[league] = gameResults.map((r) => ({
          home: r.homeTeam,
          away: r.awayTeam,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
        }))
        fallbackSummary[league] = `results-apis: ${gameResults.length}`
        console.log(`[CRON daily-results] Results-APIs fallback: ${league} got ${gameResults.length} scores`)
      }
    } catch (e) {
      const msg = (e as Error)?.message ?? 'error'
      console.warn(`[CRON daily-results] Results-APIs fallback ${league}:`, msg)
    }
  }

  const results: GradedPick[] = []
  let correct = 0
  let pending = 0

  for (const p of picks) {
    const sport = (p.sport || p.league || 'NBA').toUpperCase()
    const leagueHint = sport in SPORT_KEY_MAP ? sport : null
    const homeMatch = (s: any) => namesMatch(s.home, p.home_team ?? '') && namesMatch(s.away, p.away_team ?? '')
    // Try hinted league first; if no match, try all leagues (handles missing sport/league in old predictions)
    let match: { home: string; away: string; homeScore: number; awayScore: number } | undefined
    let matchedLeague: string | undefined
    if (leagueHint) {
      const scores = scoresByKey[leagueHint] ?? []
      match = scores.find(homeMatch)
      if (match) matchedLeague = leagueHint
    }
    if (!match) {
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

  const outPath = path.join(appRoot, `results-${date}.json`)
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')

  // Per-league score counts and source (Odds API vs API-Sports fallback) for admin UI
  const scoresByLeague: Record<string, { count: number; source: 'odds' | 'fallback' }> = {}
  for (const league of Object.keys(SPORT_KEY_MAP)) {
    const count = (scoresByKey[league] ?? []).length
    const source = league in fallbackSummary ? 'fallback' : 'odds'
    scoresByLeague[league] = { count, source }
  }

  console.log(`[CRON daily-results] Graded ${total} picks for ${date}: ${correct}W / ${graded.length - correct}L (${pending} pending) -> ${outPath}`)
  const message =
    graded.length === 0 && pending > 0
      ? `${total} picks for ${date} — all pending. Games for this date may not have been played yet or scores not yet available from the Odds API. Re-run after games are complete.`
      : `Graded ${total} picks: ${correct} correct, ${graded.length - correct} wrong, ${pending} pending. Win rate ${out.summary.winRate}%.`
  return NextResponse.json({
    success: true,
    date,
    file: outPath,
    summary: out.summary,
    message,
    results: out.results,
    fallbackSummary: Object.keys(fallbackSummary).length > 0 ? fallbackSummary : undefined,
    scoresByLeague,
  })
}

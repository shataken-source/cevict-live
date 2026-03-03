/**
 * 7-DAY SIMULATION — Full pipeline on historical data
 * Uses historical_odds + game_outcomes from Supabase (last 7 days), runs the real
 * pick engine (runPickEngine + rankPicks), and prints predictions after each major step
 * so you can fine-tune the process.
 *
 * Usage: npm run simulate:7day
 *        npx tsx scripts/run-7day-simulation.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ok */ }
}
loadEnvFile(path.resolve(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Types (from probability-analyzer-simulation) ─────────────────────────────
interface ReconstructedGame {
  gameId: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  homeOdds: number
  awayOdds: number
  spreadPoint: number
  totalPoint: number
  homeNoVigProb: number
  awayNoVigProb: number
}

interface GameOutcome {
  game_date: string
  sport: string
  league: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  winner: string
}

const SPORT_DEFAULT_TOTAL: Record<string, number> = {
  basketball_nba: 224,
  basketball_ncaab: 145,
  americanfootball_nfl: 44,
  americanfootball_ncaaf: 58,
  icehockey_nhl: 6,
  baseball_mlb: 9,
  baseball_ncaa: 9,
}

function sportToLeague(sport: string): string {
  return sport
    .replace('basketball_', '')
    .replace('americanfootball_', '')
    .replace('icehockey_', '')
    .replace('baseball_', '')
    .toUpperCase()
}

function teamsMatch(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return n(a) === n(b) || n(a).includes(n(b)) || n(b).includes(n(a))
}

// ── Build synthetic The-Odds-API style game for runPickEngine ─────────────────
function toSyntheticGame(g: ReconstructedGame): { game: any; sport: string } {
  const sport = g.sport
  const game = {
    id: g.gameId,
    home_team: g.homeTeam,
    away_team: g.awayTeam,
    commence_time: g.commenceTime,
    bookmakers: [
      {
        key: 'consensus',
        title: 'Consensus',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: g.homeTeam, price: g.homeOdds },
              { name: g.awayTeam, price: g.awayOdds },
            ],
          },
          {
            key: 'spreads',
            outcomes: [
              { name: g.homeTeam, point: g.spreadPoint, price: -110 },
              { name: g.awayTeam, point: -g.spreadPoint, price: -110 },
            ],
          },
          {
            key: 'totals',
            outcomes: [
              { name: 'Over', point: g.totalPoint, price: -110 },
              { name: 'Under', point: g.totalPoint, price: -110 },
            ],
          },
        ],
      },
    ],
  }
  return { game, sport }
}

// ── Grade a pick against outcome ─────────────────────────────────────────────
function gradePick(
  pick: any,
  outcome: GameOutcome
): { result: 'win' | 'loss' | 'push'; profit: number; detail: string } {
  const actualTotal = outcome.home_score + outcome.away_score
  const winner = outcome.winner || (outcome.home_score > outcome.away_score ? outcome.home_team : outcome.away_team)

  if (pick.pick_type === 'MONEYLINE') {
    const won = teamsMatch(pick.pick, winner)
    const odds = pick.odds ?? -110
    const profit = won ? (odds > 0 ? odds : 100) : odds > 0 ? -100 : odds
    return { result: won ? 'win' : 'loss', profit, detail: won ? 'ML win' : 'ML loss' }
  }

  if (pick.pick_type === 'SPREAD') {
    const homeCover = outcome.home_score + (pick.recommended_line ?? 0) > outcome.away_score
    const awayCover = !homeCover
    const pickedHome = pick.pick === pick.home_team
    const covered = pickedHome ? homeCover : awayCover
    const profit = covered ? 100 : -110
    return { result: covered ? 'win' : 'loss', profit, detail: covered ? 'Cover' : 'No cover' }
  }

  if (pick.pick_type === 'TOTAL') {
    const isOver = String(pick.pick).toLowerCase().includes('over')
    const line = pick.recommended_line ?? actualTotal
    const overHit = actualTotal > line
    const underHit = actualTotal < line
    const push = actualTotal === line
    if (push) return { result: 'push', profit: 0, detail: 'Push' }
    const won = isOver ? overHit : underHit
    const profit = won ? 100 : -110
    return { result: won ? 'win' : 'loss', profit, detail: won ? 'Total hit' : 'Total miss' }
  }

  // Fallback: treat as ML
  const won = teamsMatch(pick.pick, winner)
  const odds = pick.odds ?? -110
  const profit = won ? (odds > 0 ? odds : 100) : odds > 0 ? -100 : odds
  return { result: won ? 'win' : 'loss', profit, detail: won ? 'ML win' : 'ML loss' }
}

// ── Fetch 7 days historical_odds + game_outcomes and reconstruct games ────────
async function fetchAndReconstruct(optionalEndDate?: string): Promise<{
  games: ReconstructedGame[]
  outcomes: GameOutcome[]
}> {
  let endDateStr: string
  let startDateStr: string

  if (optionalEndDate) {
    const end = new Date(optionalEndDate + 'T12:00:00Z')
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    startDateStr = start.toISOString().split('T')[0]
    endDateStr = end.toISOString().split('T')[0]
    console.log(`  📅 7-day window (--date=${optionalEndDate}): ${startDateStr} → ${endDateStr}`)
  } else {
    const { data: latestOdds } = await supabase
      .from('historical_odds')
      .select('captured_at')
      .order('captured_at', { ascending: false })
      .limit(1)
    const { data: earliestOdds } = await supabase
      .from('historical_odds')
      .select('captured_at')
      .order('captured_at', { ascending: true })
      .limit(1)

    if (!latestOdds?.length) {
      console.error('No historical_odds data')
      return { games: [], outcomes: [] }
    }

    const latest = new Date(latestOdds[0].captured_at)
    const start = new Date(latest)
    start.setDate(start.getDate() - 7)
    startDateStr = start.toISOString().split('T')[0]
    endDateStr = latest.toISOString().split('T')[0]
    console.log(`  📅 7-day window: ${startDateStr} → ${endDateStr}`)
  }

  const startStr = new Date(startDateStr + 'T00:00:00Z').toISOString()
  const endStr = new Date(endDateStr + 'T23:59:59.999Z').toISOString()

  let allOdds: any[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: rows, error } = await supabase
      .from('historical_odds')
      .select('*')
      .gte('captured_at', startStr)
      .lte('captured_at', endStr)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) {
      console.error('Error fetching odds:', error.message)
      break
    }
    if (!rows?.length) break
    allOdds = allOdds.concat(rows)
    if (rows.length < pageSize) break
    page++
  }

  const outStart = new Date(startDateStr + 'T00:00:00Z')
  outStart.setDate(outStart.getDate() - 1)
  const outEnd = new Date(endDateStr + 'T00:00:00Z')
  outEnd.setDate(outEnd.getDate() + 1)
  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('*')
    .gte('game_date', outStart.toISOString().split('T')[0])
    .lte('game_date', outEnd.toISOString().split('T')[0])

  const gameMap = new Map<
    string,
    { sport: string; homeTeam: string; awayTeam: string; commenceTime: string; bookOdds: Map<string, any> }
  >()
  for (const row of allOdds) {
    if (!gameMap.has(row.game_id)) {
      gameMap.set(row.game_id, {
        sport: row.sport,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        commenceTime: row.commence_time,
        bookOdds: new Map(),
      })
    }
    const g = gameMap.get(row.game_id)!
    const bmKey = `${row.bookmaker}_${row.market_type}`
    const existing = g.bookOdds.get(bmKey)
    if (!existing || new Date(row.captured_at) > new Date(existing.captured_at)) {
      g.bookOdds.set(bmKey, row)
    }
  }

  function oddsToProb(odds: number): number {
    return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
  }
  function shinDevig(impliedHome: number, impliedAway: number): { home: number; away: number } {
    const eps = 1e-9
    function solveTrueProb(implied: number, z: number): number {
      let p = Math.max(eps, Math.min(1 - eps, implied))
      for (let i = 0; i < 25; i++) {
        const next = implied - z * Math.sqrt(p * (1 - p))
        const nc = Math.max(eps, Math.min(1 - eps, next))
        if (Math.abs(nc - p) < eps) return nc
        p = nc
      }
      return p
    }
    let zLo = 0,
      zHi = 2
    for (let b = 0; b < 40; b++) {
      const zMid = (zLo + zHi) / 2
      const th = solveTrueProb(impliedHome, zMid)
      const ta = solveTrueProb(impliedAway, zMid)
      const sum = th + ta
      if (Math.abs(sum - 1) < eps) {
        const s = th + ta
        return { home: s > 0 ? th / s : 0.5, away: s > 0 ? ta / s : 0.5 }
      }
      if (sum > 1) zLo = zMid
      else zHi = zMid
    }
    const z = (zLo + zHi) / 2
    const home = solveTrueProb(impliedHome, z)
    const away = solveTrueProb(impliedAway, z)
    const s = home + away
    return { home: s > 0 ? home / s : 0.5, away: s > 0 ? away / s : 0.5 }
  }

  const games: ReconstructedGame[] = []
  for (const [gameId, g] of gameMap) {
    let homeOddsSum = 0,
      awayOddsSum = 0,
      homeN = 0,
      awayN = 0
    let spreadSum = 0,
      spreadN = 0,
      totalSum = 0,
      totalN = 0
    for (const [, row] of g.bookOdds) {
      if (row.market_type === 'moneyline' && row.home_odds != null && row.away_odds != null) {
        if (Math.abs(row.home_odds) >= 100 && Math.abs(row.away_odds) >= 100) {
          homeOddsSum += row.home_odds
          homeN++
          awayOddsSum += row.away_odds
          awayN++
        }
      } else if (row.market_type === 'spreads' && row.home_spread != null) {
        spreadSum += Number(row.home_spread)
        spreadN++
      } else if (row.market_type === 'totals' && row.total_line != null) {
        totalSum += Number(row.total_line)
        totalN++
      }
    }
    if (!homeN || !awayN) continue
    const homeOdds = Math.round(homeOddsSum / homeN)
    const awayOdds = Math.round(awayOddsSum / awayN)
    const spreadPoint = spreadN > 0 ? Math.round((spreadSum / spreadN) * 10) / 10 : 0
    const totalPoint = totalN > 0 ? Math.round(totalSum / totalN) : SPORT_DEFAULT_TOTAL[g.sport] ?? 44
    const { home: homeNoVig, away: awayNoVig } = shinDevig(oddsToProb(homeOdds), oddsToProb(awayOdds))
    games.push({
      gameId,
      sport: g.sport,
      league: sportToLeague(g.sport),
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      commenceTime: g.commenceTime,
      homeOdds,
      awayOdds,
      spreadPoint,
      totalPoint,
      homeNoVigProb: homeNoVig,
      awayNoVigProb: awayNoVig,
    })
  }

  return { games, outcomes: outcomes || [] }
}

function getTodayDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/\//g, '-')
}

function getDateArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--date='))
  if (!arg) return null
  const date = arg.split('=')[1]?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return date
}

async function main() {
  const todayOnly = process.argv.includes('--today-only')
  const dateArg = getDateArg()
  const todayStr = getTodayDateStr()
  const singleDay = dateArg || (todayOnly ? todayStr : null)

  if (dateArg) {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  SINGLE-DAY SIMULATION — ${dateArg} (historical data → picks → grading)   ║
╚══════════════════════════════════════════════════════════════════════════╝
`)
  } else if (todayOnly) {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  TODAY'S PREDICTIONS — New code (home-only off, tuned floors, analyzer) ║
║  Date: ${todayStr} (CT)                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
`)
  } else {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  7-DAY SIMULATION — Full pipeline (historical data → picks → grading)  ║
║  Predictions printed after each major step for fine-tuning               ║
╚══════════════════════════════════════════════════════════════════════════╝
`)
  }

  // ═══ STEP 1: Load historical data ═══
  const step1Msg = dateArg
    ? `═══ Loading odds (7-day window ending ${dateArg}, then filter to ${dateArg}) ═══\n`
    : todayOnly
      ? '═══ Loading odds (7-day window, then filter to today) ═══\n'
      : '═══ STEP 1: Load 7-day historical data (historical_odds + game_outcomes) ═══\n'
  console.log(step1Msg)
  let { games, outcomes } = await fetchAndReconstruct(dateArg || undefined)
  if (!games.length) {
    console.error('❌ No games reconstructed. Ensure historical_odds has data for the window.')
    process.exit(1)
  }

  if (singleDay) {
    games = games.filter((g) => g.commenceTime && g.commenceTime.slice(0, 10) === singleDay)
    if (!games.length) {
      console.error(`❌ No games found for ${singleDay}. Check historical_odds and game dates.`)
      process.exit(1)
    }
    console.log(`  Games for ${singleDay}: ${games.length}\n`)
    outcomes = outcomes || []
  } else {
    if (!outcomes.length) {
      console.error('❌ No game_outcomes. Run daily-results cron or backfill game_outcomes.')
      process.exit(1)
    }
  }

  const byDay = new Map<string, ReconstructedGame[]>()
  for (const g of games) {
    const d = g.commenceTime ? g.commenceTime.slice(0, 10) : 'unknown'
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(g)
  }
  console.log(`  Games loaded: ${games.length} total`)
  for (const [day, list] of [...byDay.entries()].sort()) {
    console.log(`    ${day}: ${list.length} games`)
  }
  console.log(`  Outcomes: ${outcomes.length}\n`)

  // Match games to outcomes for grading later
  const outcomeByKey = new Map<string, GameOutcome>()
  for (const o of outcomes) {
    const key = `${o.game_date}|${o.home_team}|${o.away_team}`
    outcomeByKey.set(key, o)
  }
  function findOutcome(g: ReconstructedGame): GameOutcome | null {
    const commenceDate = g.commenceTime ? g.commenceTime.slice(0, 10) : ''
    for (const o of outcomes) {
      if (teamsMatch(g.homeTeam, o.home_team) && teamsMatch(g.awayTeam, o.away_team)) {
        if (o.home_score + o.away_score > 0) return o
      }
    }
    return null
  }

  // ═══ STEP 2: Run full pick engine on each game ═══
  console.log('═══ STEP 2: Run pick engine (runPickEngine) on each game ═══\n')
  const { runPickEngine, rankPicks } = await import('../app/lib/modules/pick-engine')
  const allPicks: any[] = []
  let dropped = 0
  for (const g of games) {
    const { game, sport } = toSyntheticGame(g)
    try {
      const pick = await runPickEngine(game, sport)
      if (pick) {
        allPicks.push(pick)
      } else {
        dropped++
      }
    } catch (err: any) {
      dropped++
      if (dropped <= 3) console.error(`  [drop] ${g.homeTeam} vs ${g.awayTeam}: ${err.message}`)
    }
  }
  console.log(`  Raw picks produced: ${allPicks.length} (dropped: ${dropped})`)
  console.log('\n  Sample picks (first 8):')
  allPicks.slice(0, 8).forEach((p, i) => {
    const line = p.recommended_line != null ? ` ${p.pick_type} ${p.recommended_line}` : ''
    console.log(`    ${i + 1}. ${p.game_matchup || `${p.away_team} @ ${p.home_team}`} → ${p.pick}${line} | ${p.confidence}% conf | edge ${(p.value_bet_edge || 0).toFixed(1)}%`)
  })
  console.log('')

  // ═══ STEP 3: Rank picks (same as picks/today) ═══
  console.log('═══ STEP 3: Rank picks (rankPicks — composite score, tier, max per sport) ═══\n')
  const ranked = rankPicks([...allPicks])
  const topN = ranked.slice(0, 25)
  console.log(`  Top ${topN.length} picks after ranking:`)
  topN.forEach((p, i) => {
    const line = p.recommended_line != null ? ` ${p.pick_type} ${p.recommended_line}` : ''
    console.log(`    ${i + 1}. ${p.game_matchup || `${p.away_team} @ ${p.home_team}`} → ${p.pick}${line} | ${p.confidence}% | score ${(p.composite_score ?? 0).toFixed(1)}`)
  })
  console.log('')

  // ═══ STEP 4: Grade against outcomes ═══
  console.log('═══ STEP 4: Grade predictions vs actual outcomes ═══\n')
  let wins = 0,
    losses = 0,
    pushes = 0
  let totalProfit = 0
  const graded: { pick: any; outcome: GameOutcome; result: string; profit: number }[] = []
  for (const pick of allPicks) {
    const g = games.find(
      (x) =>
        (pick.game_id && x.gameId === pick.game_id) ||
        (teamsMatch(x.homeTeam, pick.home_team) && teamsMatch(x.awayTeam, pick.away_team))
    )
    if (!g) continue
    const outcome = findOutcome(g)
    if (!outcome) continue
    const { result, profit } = gradePick(pick, outcome)
    if (result === 'win') wins++
    else if (result === 'loss') losses++
    else pushes++
    totalProfit += profit
    graded.push({ pick, outcome, result, profit })
  }
  const gradedNonPush = wins + losses
  const winRate = gradedNonPush > 0 ? Math.round((wins / gradedNonPush) * 1000) / 10 : 0
  const roi = gradedNonPush > 0 ? Math.round((totalProfit / (gradedNonPush * 100)) * 10000) / 100 : 0
  console.log(`  Graded: ${graded.length} picks with outcomes (${wins}W / ${losses}L / ${pushes}P)`)
  console.log(`  Win rate: ${winRate}%  |  ROI: ${roi}%  |  Total profit (units): ${totalProfit.toFixed(0)}`)
  console.log('\n  Graded picks (first 12):')
  graded.slice(0, 12).forEach((g, i) => {
    const p = g.pick
    console.log(`    ${i + 1}. ${p.pick} (${p.pick_type}) → ${g.result.toUpperCase()} ${g.profit >= 0 ? '+' : ''}${g.profit}  |  ${p.home_team} ${g.outcome.home_score}-${g.outcome.away_score} ${p.away_team}`)
  })
  console.log('')

  // Summary
  console.log('═══ SUMMARY ═══')
  console.log(`  Step 1: ${games.length} games, ${outcomes.length} outcomes`)
  console.log(`  Step 2: ${allPicks.length} picks from engine (${dropped} dropped)`)
  console.log(`  Step 3: Top ${topN.length} after ranking`)
  console.log(`  Step 4: ${graded.length} graded → ${winRate}% WR, ${roi}% ROI`)
  console.log('')
  if (process.argv.includes('--tune')) {
    console.log('TUNE_RESULT=' + JSON.stringify({ winRate, roi, graded: graded.length, picks: allPicks.length, wins, losses, pushes }))
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

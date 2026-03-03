/**
 * FULL PIPELINE AUDIT — 10,000 Bootstrap Simulations
 * ═══════════════════════════════════════════════════════════════════════════════
 * Runs ALL historical data through the REAL pick engine (runPickEngine + rankPicks),
 * grades against actual outcomes, then performs deep analysis on every pipeline step:
 *
 *   1. Data loading & game reconstruction
 *   2. Pick engine execution (signals, MC, value bets, filters)
 *   3. Ranking (composite score, sport caps)
 *   4. Grading against outcomes
 *   5. Deep analysis:
 *      - Confidence calibration (Brier score per bucket)
 *      - Filter drop audit (which filters kill the most picks, are drops justified?)
 *      - Value bet accuracy (do high-edge picks actually win more?)
 *      - Home vs Away performance
 *      - Sport-by-sport breakdown
 *      - Odds range profitability
 *      - Pick type (ML vs Spread vs Total) accuracy
 *      - Signal contribution analysis
 *      - Day-of-week patterns
 *      - Composite score vs actual performance
 *      - Triple-align picks performance
 *      - Favorite vs Underdog accuracy
 *   6. 10,000 bootstrap bankroll simulations
 *   7. Actionable recommendations
 *
 * Usage:
 *   npx tsx scripts/run-pipeline-audit.ts
 *   npx tsx scripts/run-pipeline-audit.ts --runs=20000
 *   npx tsx scripts/run-pipeline-audit.ts --days=14
 *   npx tsx scripts/run-pipeline-audit.ts --date=2026-03-01
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

// ── CLI args ─────────────────────────────────────────────────────────────────
function getArg(name: string): string | null {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=')[1]?.trim() || null : null
}
const NUM_RUNS = Math.min(100000, Math.max(100, parseInt(getArg('runs') || '10000', 10)))
const NUM_DAYS = Math.min(90, Math.max(1, parseInt(getArg('days') || '7', 10)))
const DATE_ARG = getArg('date')

// ── Types ────────────────────────────────────────────────────────────────────
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
  basketball_nba: 224, basketball_ncaab: 145,
  americanfootball_nfl: 44, americanfootball_ncaaf: 58,
  icehockey_nhl: 6, baseball_mlb: 9, baseball_ncaa: 9,
}

function sportToLeague(sport: string): string {
  return sport
    .replace('basketball_', '').replace('americanfootball_', '')
    .replace('icehockey_', '').replace('baseball_', '')
    .toUpperCase()
}

function teamsMatch(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return n(a) === n(b) || n(a).includes(n(b)) || n(b).includes(n(a))
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
  let zLo = 0, zHi = 2
  for (let b = 0; b < 40; b++) {
    const zMid = (zLo + zHi) / 2
    const th = solveTrueProb(impliedHome, zMid)
    const ta = solveTrueProb(impliedAway, zMid)
    const sum = th + ta
    if (Math.abs(sum - 1) < eps) {
      const s = th + ta
      return { home: s > 0 ? th / s : 0.5, away: s > 0 ? ta / s : 0.5 }
    }
    if (sum > 1) zLo = zMid; else zHi = zMid
  }
  const z = (zLo + zHi) / 2
  const home = solveTrueProb(impliedHome, z)
  const away = solveTrueProb(impliedAway, z)
  const s = home + away
  return { home: s > 0 ? home / s : 0.5, away: s > 0 ? away / s : 0.5 }
}

// ── Build synthetic game for runPickEngine ──────────────────────────────────
function toSyntheticGame(g: ReconstructedGame): { game: any; sport: string } {
  return {
    game: {
      id: g.gameId,
      home_team: g.homeTeam,
      away_team: g.awayTeam,
      commence_time: g.commenceTime,
      bookmakers: [{
        key: 'consensus',
        title: 'Consensus',
        markets: [
          { key: 'h2h', outcomes: [{ name: g.homeTeam, price: g.homeOdds }, { name: g.awayTeam, price: g.awayOdds }] },
          { key: 'spreads', outcomes: [{ name: g.homeTeam, point: g.spreadPoint, price: -110 }, { name: g.awayTeam, point: -g.spreadPoint, price: -110 }] },
          { key: 'totals', outcomes: [{ name: 'Over', point: g.totalPoint, price: -110 }, { name: 'Under', point: g.totalPoint, price: -110 }] },
        ],
      }],
    },
    sport: g.sport,
  }
}

// ── Grading ─────────────────────────────────────────────────────────────────
interface GradedPick {
  pick: any
  game: ReconstructedGame
  outcome: GameOutcome
  result: 'win' | 'loss' | 'push'
  profit: number // per $100 unit
}

function profitFromOdds(odds: number, won: boolean): number {
  if (!won) return -100
  if (odds > 0) return odds
  return Math.round((100 / Math.abs(odds)) * 100)
}

function gradePick(pick: any, game: ReconstructedGame, outcome: GameOutcome): GradedPick {
  const homeWon = outcome.home_score > outcome.away_score
  const isTie = outcome.home_score === outcome.away_score

  if (pick.pick_type === 'SPREAD' && pick.recommended_line != null) {
    const margin = outcome.home_score - outcome.away_score
    const line = pick.recommended_line
    const pickedHome = teamsMatch(pick.pick, outcome.home_team)
    const covered = pickedHome ? (margin + line > 0) : (-margin - line > 0)
    const pushed = pickedHome ? (margin + line === 0) : (-margin - line === 0)
    if (pushed) return { pick, game, outcome, result: 'push', profit: 0 }
    const profit = covered ? profitFromOdds(pick.odds ?? -110, true) : -100
    return { pick, game, outcome, result: covered ? 'win' : 'loss', profit }
  }

  if (pick.pick_type === 'TOTAL') {
    const actualTotal = outcome.home_score + outcome.away_score
    const isOver = String(pick.pick).toLowerCase().includes('over')
    const line = pick.recommended_line ?? actualTotal
    if (actualTotal === line) return { pick, game, outcome, result: 'push', profit: 0 }
    const won = isOver ? actualTotal > line : actualTotal < line
    const profit = won ? profitFromOdds(pick.odds ?? -110, true) : -100
    return { pick, game, outcome, result: won ? 'win' : 'loss', profit }
  }

  // Moneyline
  if (isTie) return { pick, game, outcome, result: 'push', profit: 0 }
  const pickedHome = teamsMatch(pick.pick, outcome.home_team)
  const won = (pickedHome && homeWon) || (!pickedHome && !homeWon)
  const profit = won ? profitFromOdds(pick.odds ?? -110, true) : -100
  return { pick, game, outcome, result: won ? 'win' : 'loss', profit }
}

// ── Data Fetching ───────────────────────────────────────────────────────────
async function fetchAndReconstruct(): Promise<{ games: ReconstructedGame[]; outcomes: GameOutcome[] }> {
  let endDateStr: string
  let startDateStr: string

  if (DATE_ARG) {
    const end = new Date(DATE_ARG + 'T12:00:00Z')
    const start = new Date(end)
    start.setDate(start.getDate() - NUM_DAYS)
    startDateStr = start.toISOString().split('T')[0]
    endDateStr = end.toISOString().split('T')[0]
  } else {
    const { data: latestOdds } = await supabase
      .from('historical_odds').select('captured_at').order('captured_at', { ascending: false }).limit(1)
    if (!latestOdds?.length) { console.error('No historical_odds data'); return { games: [], outcomes: [] } }
    const latest = new Date(latestOdds[0].captured_at)
    const start = new Date(latest)
    start.setDate(start.getDate() - NUM_DAYS)
    startDateStr = start.toISOString().split('T')[0]
    endDateStr = latest.toISOString().split('T')[0]
  }

  console.log(`  📅 ${NUM_DAYS}-day window: ${startDateStr} → ${endDateStr}`)

  const startStr = new Date(startDateStr + 'T00:00:00Z').toISOString()
  const endStr = new Date(endDateStr + 'T23:59:59.999Z').toISOString()

  let allOdds: any[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: rows, error } = await supabase
      .from('historical_odds').select('*')
      .gte('captured_at', startStr).lte('captured_at', endStr)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) { console.error('Error fetching odds:', error.message); break }
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
    .from('game_outcomes').select('*')
    .gte('game_date', outStart.toISOString().split('T')[0])
    .lte('game_date', outEnd.toISOString().split('T')[0])

  console.log(`  📊 ${allOdds.length} odds records, ${outcomes?.length ?? 0} outcomes`)

  const gameMap = new Map<string, { sport: string; homeTeam: string; awayTeam: string; commenceTime: string; bookOdds: Map<string, any> }>()
  for (const row of allOdds) {
    if (!gameMap.has(row.game_id)) {
      gameMap.set(row.game_id, { sport: row.sport, homeTeam: row.home_team, awayTeam: row.away_team, commenceTime: row.commence_time, bookOdds: new Map() })
    }
    const g = gameMap.get(row.game_id)!
    const bmKey = `${row.bookmaker}_${row.market_type}`
    const existing = g.bookOdds.get(bmKey)
    if (!existing || new Date(row.captured_at) > new Date(existing.captured_at)) {
      g.bookOdds.set(bmKey, row)
    }
  }

  const games: ReconstructedGame[] = []
  for (const [gameId, g] of gameMap) {
    let homeOddsSum = 0, awayOddsSum = 0, homeN = 0, awayN = 0
    let spreadSum = 0, spreadN = 0, totalSum = 0, totalN = 0
    for (const [, row] of g.bookOdds) {
      if (row.market_type === 'moneyline' && row.home_odds != null && row.away_odds != null) {
        if (Math.abs(row.home_odds) >= 100 && Math.abs(row.away_odds) >= 100) {
          homeOddsSum += row.home_odds; homeN++
          awayOddsSum += row.away_odds; awayN++
        }
      } else if (row.market_type === 'spreads' && row.home_spread != null) {
        spreadSum += Number(row.home_spread); spreadN++
      } else if (row.market_type === 'totals' && row.total_line != null) {
        totalSum += Number(row.total_line); totalN++
      }
    }
    if (!homeN || !awayN) continue
    const homeOdds = Math.round(homeOddsSum / homeN)
    const awayOdds = Math.round(awayOddsSum / awayN)
    const spreadPoint = spreadN > 0 ? Math.round((spreadSum / spreadN) * 10) / 10 : 0
    const totalPoint = totalN > 0 ? Math.round(totalSum / totalN) : SPORT_DEFAULT_TOTAL[g.sport] ?? 44
    const { home: homeNoVig, away: awayNoVig } = shinDevig(oddsToProb(homeOdds), oddsToProb(awayOdds))
    games.push({
      gameId, sport: g.sport, league: sportToLeague(g.sport),
      homeTeam: g.homeTeam, awayTeam: g.awayTeam, commenceTime: g.commenceTime,
      homeOdds, awayOdds, spreadPoint, totalPoint,
      homeNoVigProb: homeNoVig, awayNoVigProb: awayNoVig,
    })
  }

  return { games, outcomes: outcomes || [] }
}

// ── Bootstrap Bankroll Simulation ───────────────────────────────────────────
function bootstrapBankroll(graded: GradedPick[], numSims: number, startBR = 10000, bet = 100) {
  const nonPush = graded.filter(g => g.result !== 'push')
  if (!nonPush.length) return { avgBR: startBR, medBR: startBR, stdDev: 0, winRate: 0, roi: 0, profPct: 0, p5: startBR, p95: startBR, p1: startBR, p99: startBR, maxDD: 0, bustPct: 0 }

  const finals: number[] = []
  const dds: number[] = []
  let busts = 0
  for (let sim = 0; sim < numSims; sim++) {
    let br = startBR, peak = startBR, maxDD = 0
    for (let i = 0; i < nonPush.length; i++) {
      const idx = Math.floor(Math.random() * nonPush.length)
      br += (nonPush[idx].profit / 100) * bet
      if (br > peak) peak = br
      const dd = (peak - br) / peak
      if (dd > maxDD) maxDD = dd
      if (br <= 0) { busts++; br = 0; break }
    }
    finals.push(br)
    dds.push(maxDD)
  }
  finals.sort((a, b) => a - b)
  const avg = finals.reduce((s, v) => s + v, 0) / numSims
  const wins = nonPush.filter(g => g.result === 'win').length
  const totalProfit = nonPush.reduce((s, g) => s + g.profit, 0)
  return {
    avgBR: Math.round(avg),
    medBR: Math.round(finals[Math.floor(numSims / 2)]),
    stdDev: Math.round(Math.sqrt(finals.reduce((s, v) => s + (v - avg) ** 2, 0) / numSims)),
    winRate: Math.round((wins / nonPush.length) * 10000) / 100,
    roi: Math.round((totalProfit / (nonPush.length * 100)) * 10000) / 100,
    profPct: Math.round(finals.filter(b => b > startBR).length / numSims * 10000) / 100,
    p1: Math.round(finals[Math.floor(numSims * 0.01)]),
    p5: Math.round(finals[Math.floor(numSims * 0.05)]),
    p95: Math.round(finals[Math.floor(numSims * 0.95)]),
    p99: Math.round(finals[Math.floor(numSims * 0.99)]),
    maxDD: Math.round(dds.reduce((s, v) => s + v, 0) / numSims * 10000) / 100,
    bustPct: Math.round(busts / numSims * 10000) / 100,
  }
}

// ── Formatting helpers ──────────────────────────────────────────────────────
function pad(s: string, len = 16): string { return s.padStart(len) }
function padR(s: string, len: number): string { return s.padEnd(len) }
function pct(n: number, d: number): string { return d > 0 ? (n / d * 100).toFixed(1) + '%' : '—' }
function fmtProfit(p: number): string { return (p >= 0 ? '+' : '') + p.toFixed(0) }

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  FULL PIPELINE AUDIT — ${NUM_RUNS.toLocaleString()} Bootstrap Sims • ${NUM_DAYS}-Day Window            ║
║  Real pick engine (runPickEngine + rankPicks) → grade → deep analysis  ║
╚══════════════════════════════════════════════════════════════════════════╝
`)

  // ═══ STEP 1: Load historical data ═══
  console.log('═══ STEP 1: Load historical data ═══\n')
  const { games, outcomes } = await fetchAndReconstruct()
  if (!games.length) { console.error('❌ No games. Check historical_odds.'); process.exit(1) }
  if (!outcomes.length) { console.error('❌ No outcomes. Check game_outcomes.'); process.exit(1) }

  console.log(`  🎮 ${games.length} games reconstructed`)

  // Match games to outcomes
  function findOutcome(g: ReconstructedGame): GameOutcome | null {
    for (const o of outcomes) {
      if (teamsMatch(g.homeTeam, o.home_team) && teamsMatch(g.awayTeam, o.away_team)) {
        if (o.home_score + o.away_score > 0) return o
      }
    }
    return null
  }

  const matched = new Map<string, { game: ReconstructedGame; outcome: GameOutcome }>()
  let unmatched = 0
  for (const g of games) {
    const outcome = findOutcome(g)
    if (outcome) matched.set(g.gameId, { game: g, outcome })
    else unmatched++
  }
  console.log(`  ✅ Matched: ${matched.size} games with outcomes`)
  console.log(`  ❓ Unmatched: ${unmatched} (pending/no outcome)\n`)

  if (matched.size < 5) { console.error('❌ Too few matched games for meaningful analysis.'); process.exit(1) }

  // League breakdown
  const leagueCount: Record<string, number> = {}
  for (const [, { game }] of matched) leagueCount[game.league] = (leagueCount[game.league] || 0) + 1
  console.log('  League breakdown:')
  for (const [lg, ct] of Object.entries(leagueCount).sort((a, b) => b[1] - a[1])) console.log(`    ${lg}: ${ct}`)
  console.log('')

  // ═══ STEP 2: Run real pick engine on all games ═══
  console.log('═══ STEP 2: Run real pick engine ═══\n')
  const { runPickEngine, rankPicks } = await import('../app/lib/modules/pick-engine')

  const allPicks: { pick: any; game: ReconstructedGame }[] = []
  let dropped = 0
  const dropReasons: Record<string, number> = {}

  // Capture filter drops by patching console.log temporarily
  const origLog = console.log
  const filterDrops: string[] = []
  console.log = (...args: any[]) => {
    const msg = args.join(' ')
    if (msg.includes('] Dropped ')) {
      filterDrops.push(msg)
      const filterMatch = msg.match(/^\[([^\]]+)\]/)
      if (filterMatch) dropReasons[filterMatch[1]] = (dropReasons[filterMatch[1]] || 0) + 1
    }
    // Suppress noisy MC/analyzer logs during bulk run
    if (msg.includes('[probability-analyzer]') || msg.includes('[MC]')) return
    // Pass through other logs
  }

  for (const [, { game }] of matched) {
    const { game: synth, sport } = toSyntheticGame(game)
    try {
      const pick = await runPickEngine(synth, sport)
      if (pick) {
        allPicks.push({ pick, game })
      } else {
        dropped++
      }
    } catch (err: any) {
      dropped++
      if (dropped <= 3) origLog(`  [engine error] ${game.homeTeam} vs ${game.awayTeam}: ${err.message}`)
    }
  }
  console.log = origLog

  console.log(`  Raw picks: ${allPicks.length} produced, ${dropped} dropped by filters`)
  console.log(`  Filter drop breakdown:`)
  for (const [filter, ct] of Object.entries(dropReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${filter}: ${ct} (${(ct / matched.size * 100).toFixed(1)}% of games)`)
  }
  console.log(`  Pass rate: ${(allPicks.length / matched.size * 100).toFixed(1)}% of games produce a pick\n`)

  // ═══ STEP 3: Rank picks ═══
  console.log('═══ STEP 3: Rank picks ═══\n')
  const rankedRaw = rankPicks(allPicks.map(p => p.pick))
  const rankedSet = new Set(rankedRaw.map((p: any) => p.game_id))
  const ranked = allPicks.filter(p => rankedSet.has(p.pick.game_id))
  const cutByRanking = allPicks.length - ranked.length
  console.log(`  Before ranking: ${allPicks.length} → After: ${ranked.length} (${cutByRanking} cut by ranking)`)

  // Sport caps analysis
  const sportCounts: Record<string, number> = {}
  for (const { pick } of allPicks) sportCounts[pick.sport || 'unknown'] = (sportCounts[pick.sport || 'unknown'] || 0) + 1
  const rankedSportCounts: Record<string, number> = {}
  for (const { pick } of ranked) rankedSportCounts[pick.sport || 'unknown'] = (rankedSportCounts[pick.sport || 'unknown'] || 0) + 1
  console.log(`  Sport distribution (pre→post ranking):`)
  for (const sport of Object.keys(sportCounts).sort()) {
    console.log(`    ${sport}: ${sportCounts[sport]} → ${rankedSportCounts[sport] || 0}`)
  }
  console.log('')

  // ═══ STEP 4: Grade all picks ═══
  console.log('═══ STEP 4: Grade all picks against outcomes ═══\n')

  // Grade ALL picks (not just ranked) for full analysis
  const allGraded: GradedPick[] = []
  for (const { pick, game } of allPicks) {
    const outcome = matched.get(game.gameId)?.outcome
    if (!outcome) continue
    allGraded.push(gradePick(pick, game, outcome))
  }

  // Also grade ranked-only
  const rankedGraded: GradedPick[] = []
  for (const { pick, game } of ranked) {
    const outcome = matched.get(game.gameId)?.outcome
    if (!outcome) continue
    rankedGraded.push(gradePick(pick, game, outcome))
  }

  function printStats(label: string, graded: GradedPick[]) {
    const nonPush = graded.filter(g => g.result !== 'push')
    const wins = nonPush.filter(g => g.result === 'win').length
    const losses = nonPush.filter(g => g.result === 'loss').length
    const pushes = graded.filter(g => g.result === 'push').length
    const totalProfit = nonPush.reduce((s, g) => s + g.profit, 0)
    const wr = nonPush.length > 0 ? (wins / nonPush.length * 100).toFixed(1) : '—'
    const roi = nonPush.length > 0 ? (totalProfit / (nonPush.length * 100) * 100).toFixed(2) : '—'
    console.log(`  ${label}: ${wins}W / ${losses}L / ${pushes}P  |  WR: ${wr}%  |  ROI: ${roi}%  |  Profit: ${fmtProfit(totalProfit)} units`)
  }

  printStats('All picks (pre-ranking)', allGraded)
  printStats('Ranked picks (final)', rankedGraded)
  console.log('')

  // ═══ STEP 5: Deep Analysis ═══
  console.log('═'.repeat(70))
  console.log('  DEEP ANALYSIS — Finding pipeline weaknesses')
  console.log('═'.repeat(70) + '\n')

  const nonPush = allGraded.filter(g => g.result !== 'push')

  // ── 5a: Confidence Calibration ──
  console.log('── 5a: CONFIDENCE CALIBRATION ──\n')
  const confBuckets = [
    { min: 0, max: 55 }, { min: 55, max: 60 }, { min: 60, max: 65 },
    { min: 65, max: 70 }, { min: 70, max: 75 }, { min: 75, max: 80 },
    { min: 80, max: 85 }, { min: 85, max: 90 }, { min: 90, max: 101 },
  ]
  let overallBrierSum = 0
  console.log('  Conf Range   | Count |  Wins | WR%    | Avg Conf | Brier  | Gap')
  console.log('  ─────────────┼───────┼───────┼────────┼──────────┼────────┼────────')
  for (const bucket of confBuckets) {
    const inBucket = nonPush.filter(g => g.pick.confidence >= bucket.min && g.pick.confidence < bucket.max)
    if (!inBucket.length) continue
    const wins = inBucket.filter(g => g.result === 'win').length
    const wr = wins / inBucket.length * 100
    const avgConf = inBucket.reduce((s, g) => s + g.pick.confidence, 0) / inBucket.length
    const brier = inBucket.reduce((s, g) => {
      const p = g.pick.confidence / 100
      const actual = g.result === 'win' ? 1 : 0
      return s + (p - actual) ** 2
    }, 0) / inBucket.length
    overallBrierSum += inBucket.reduce((s, g) => {
      const p = g.pick.confidence / 100
      const actual = g.result === 'win' ? 1 : 0
      return s + (p - actual) ** 2
    }, 0)
    const gap = wr - avgConf
    const gapStr = gap >= 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)
    const flag = Math.abs(gap) > 10 ? (gap > 0 ? ' ✅ underconf' : ' ⚠️ overconf') : ''
    console.log(`  ${padR(`${bucket.min}-${bucket.max}%`, 13)} | ${pad(String(inBucket.length), 5)} | ${pad(String(wins), 5)} | ${pad(wr.toFixed(1) + '%', 6)} | ${pad(avgConf.toFixed(1) + '%', 8)} | ${pad(brier.toFixed(3), 6)} | ${gapStr}${flag}`)
  }
  const overallBrier = nonPush.length > 0 ? overallBrierSum / nonPush.length : 0
  console.log(`\n  Overall Brier score: ${overallBrier.toFixed(4)} (lower is better; <0.22 = good, <0.18 = great)`)
  console.log('')

  // ── 5b: Sport-by-Sport ──
  console.log('── 5b: SPORT-BY-SPORT PERFORMANCE ──\n')
  const bySport: Record<string, { wins: number; losses: number; profit: number; avgConf: number; confSum: number }> = {}
  for (const g of nonPush) {
    const sport = g.pick.sport || g.pick.league || 'unknown'
    if (!bySport[sport]) bySport[sport] = { wins: 0, losses: 0, profit: 0, avgConf: 0, confSum: 0 }
    const s = bySport[sport]
    if (g.result === 'win') s.wins++; else s.losses++
    s.profit += g.profit
    s.confSum += g.pick.confidence
  }
  console.log('  Sport    | Record    | WR%    | ROI%     | Profit   | Avg Conf')
  console.log('  ─────────┼───────────┼────────┼──────────┼──────────┼─────────')
  for (const [sport, s] of Object.entries(bySport).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))) {
    const total = s.wins + s.losses
    const wr = (s.wins / total * 100).toFixed(1)
    const roi = (s.profit / (total * 100) * 100).toFixed(2)
    const avgConf = (s.confSum / total).toFixed(1)
    const flag = parseFloat(roi) < -5 ? ' ⚠️' : parseFloat(roi) > 5 ? ' ✅' : ''
    console.log(`  ${padR(sport, 8)} | ${padR(`${s.wins}-${s.losses}`, 9)} | ${pad(wr + '%', 6)} | ${pad(roi + '%', 8)} | ${pad(fmtProfit(s.profit), 8)} | ${avgConf}%${flag}`)
  }
  console.log('')

  // ── 5c: Pick Type Performance ──
  console.log('── 5c: PICK TYPE PERFORMANCE ──\n')
  const byType: Record<string, { wins: number; losses: number; profit: number }> = {}
  for (const g of nonPush) {
    const type = g.pick.pick_type || 'MONEYLINE'
    if (!byType[type]) byType[type] = { wins: 0, losses: 0, profit: 0 }
    if (g.result === 'win') byType[type].wins++; else byType[type].losses++
    byType[type].profit += g.profit
  }
  console.log('  Type       | Record    | WR%    | ROI%     | Profit')
  console.log('  ───────────┼───────────┼────────┼──────────┼────────')
  for (const [type, s] of Object.entries(byType).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))) {
    const total = s.wins + s.losses
    const wr = (s.wins / total * 100).toFixed(1)
    const roi = (s.profit / (total * 100) * 100).toFixed(2)
    console.log(`  ${padR(type, 10)} | ${padR(`${s.wins}-${s.losses}`, 9)} | ${pad(wr + '%', 6)} | ${pad(roi + '%', 8)} | ${fmtProfit(s.profit)}`)
  }
  console.log('')

  // ── 5d: Home vs Away ──
  console.log('── 5d: HOME vs AWAY PERFORMANCE ──\n')
  const homePicks = nonPush.filter(g => g.pick.is_home_pick)
  const awayPicks = nonPush.filter(g => !g.pick.is_home_pick)
  function sideStats(picks: GradedPick[]): { wins: number; losses: number; wr: string; roi: string; profit: number } {
    const wins = picks.filter(g => g.result === 'win').length
    const losses = picks.length - wins
    return {
      wins, losses,
      wr: picks.length > 0 ? (wins / picks.length * 100).toFixed(1) : '—',
      roi: picks.length > 0 ? (picks.reduce((s, g) => s + g.profit, 0) / (picks.length * 100) * 100).toFixed(2) : '—',
      profit: picks.reduce((s, g) => s + g.profit, 0),
    }
  }
  const homeS = sideStats(homePicks)
  const awayS = sideStats(awayPicks)
  console.log(`  HOME: ${homeS.wins}W/${homeS.losses}L  WR: ${homeS.wr}%  ROI: ${homeS.roi}%  Profit: ${fmtProfit(homeS.profit)}`)
  console.log(`  AWAY: ${awayS.wins}W/${awayS.losses}L  WR: ${awayS.wr}%  ROI: ${awayS.roi}%  Profit: ${fmtProfit(awayS.profit)}`)
  console.log('')

  // ── 5e: Favorite vs Underdog ──
  console.log('── 5e: FAVORITE vs UNDERDOG ──\n')
  const favPicks = nonPush.filter(g => g.pick.is_favorite_pick)
  const dogPicks = nonPush.filter(g => !g.pick.is_favorite_pick)
  const favS = sideStats(favPicks)
  const dogS = sideStats(dogPicks)
  console.log(`  FAVORITE: ${favS.wins}W/${favS.losses}L  WR: ${favS.wr}%  ROI: ${favS.roi}%  Profit: ${fmtProfit(favS.profit)}`)
  console.log(`  UNDERDOG: ${dogS.wins}W/${dogS.losses}L  WR: ${dogS.wr}%  ROI: ${dogS.roi}%  Profit: ${fmtProfit(dogS.profit)}`)
  console.log('')

  // ── 5f: Odds Range Profitability ──
  console.log('── 5f: ODDS RANGE PROFITABILITY ──\n')
  const oddsRanges = [
    { min: -10000, max: -200, label: 'Heavy Fav (-200+)' },
    { min: -200, max: -100, label: 'Favorite (-200 to -100)' },
    { min: -100, max: 100, label: 'Pick em (-100 to +100)' },
    { min: 100, max: 200, label: 'Dog (+100 to +200)' },
    { min: 200, max: 500, label: 'Big Dog (+200 to +500)' },
    { min: 500, max: 100000, label: 'Longshot (+500+)' },
  ]
  console.log('  Odds Range              | Count | WR%    | ROI%     | Profit')
  console.log('  ────────────────────────┼───────┼────────┼──────────┼────────')
  for (const range of oddsRanges) {
    const inRange = nonPush.filter(g => {
      const odds = g.pick.odds ?? 0
      return odds >= range.min && odds < range.max
    })
    if (!inRange.length) continue
    const wins = inRange.filter(g => g.result === 'win').length
    const profit = inRange.reduce((s, g) => s + g.profit, 0)
    const roi = (profit / (inRange.length * 100) * 100).toFixed(2)
    console.log(`  ${padR(range.label, 23)} | ${pad(String(inRange.length), 5)} | ${pad((wins / inRange.length * 100).toFixed(1) + '%', 6)} | ${pad(roi + '%', 8)} | ${fmtProfit(profit)}`)
  }
  console.log('')

  // ── 5g: Value Bet Edge Analysis ──
  console.log('── 5g: VALUE BET EDGE ANALYSIS ──\n')
  const edgeRanges = [
    { min: -100, max: 0, label: 'Negative edge (<0%)' },
    { min: 0, max: 2, label: 'Low edge (0-2%)' },
    { min: 2, max: 5, label: 'Medium edge (2-5%)' },
    { min: 5, max: 10, label: 'High edge (5-10%)' },
    { min: 10, max: 20, label: 'Very high edge (10-20%)' },
    { min: 20, max: 1000, label: 'Extreme edge (20%+)' },
  ]
  console.log('  Edge Range              | Count | WR%    | ROI%     | Profit')
  console.log('  ────────────────────────┼───────┼────────┼──────────┼────────')
  for (const range of edgeRanges) {
    const inRange = nonPush.filter(g => {
      const edge = g.pick.value_bet_edge ?? 0
      return edge >= range.min && edge < range.max
    })
    if (!inRange.length) continue
    const wins = inRange.filter(g => g.result === 'win').length
    const profit = inRange.reduce((s, g) => s + g.profit, 0)
    const roi = (profit / (inRange.length * 100) * 100).toFixed(2)
    const flag = parseFloat(roi) < -10 ? ' ⚠️' : ''
    console.log(`  ${padR(range.label, 23)} | ${pad(String(inRange.length), 5)} | ${pad((wins / inRange.length * 100).toFixed(1) + '%', 6)} | ${pad(roi + '%', 8)} | ${fmtProfit(profit)}${flag}`)
  }
  console.log('')

  // ── 5h: Triple-Align Performance ──
  console.log('── 5h: TRIPLE-ALIGN PICKS ──\n')
  const tripleAlign = nonPush.filter(g => g.pick.triple_align)
  const nonTriple = nonPush.filter(g => !g.pick.triple_align)
  const triS = sideStats(tripleAlign)
  const nonTriS = sideStats(nonTriple)
  console.log(`  TRIPLE-ALIGN: ${triS.wins}W/${triS.losses}L  WR: ${triS.wr}%  ROI: ${triS.roi}%  (n=${tripleAlign.length})`)
  console.log(`  NON-ALIGNED:  ${nonTriS.wins}W/${nonTriS.losses}L  WR: ${nonTriS.wr}%  ROI: ${nonTriS.roi}%  (n=${nonTriple.length})`)
  console.log('')

  // ── 5i: Composite Score vs Performance ──
  console.log('── 5i: COMPOSITE SCORE vs PERFORMANCE ──\n')
  const scoreRanges = [
    { min: 0, max: 15, label: 'Low (0-15)' },
    { min: 15, max: 25, label: 'Mid (15-25)' },
    { min: 25, max: 35, label: 'High (25-35)' },
    { min: 35, max: 50, label: 'Very High (35-50)' },
    { min: 50, max: 200, label: 'Elite (50+)' },
  ]
  console.log('  Score Range          | Count | WR%    | ROI%     | Profit')
  console.log('  ─────────────────────┼───────┼────────┼──────────┼────────')
  for (const range of scoreRanges) {
    const inRange = nonPush.filter(g => {
      const score = g.pick.composite_score ?? 0
      return score >= range.min && score < range.max
    })
    if (!inRange.length) continue
    const wins = inRange.filter(g => g.result === 'win').length
    const profit = inRange.reduce((s, g) => s + g.profit, 0)
    const roi = (profit / (inRange.length * 100) * 100).toFixed(2)
    console.log(`  ${padR(range.label, 21)} | ${pad(String(inRange.length), 5)} | ${pad((wins / inRange.length * 100).toFixed(1) + '%', 6)} | ${pad(roi + '%', 8)} | ${fmtProfit(profit)}`)
  }
  console.log('')

  // ── 5j: Signal Contribution Analysis ──
  console.log('── 5j: SIGNAL CONTRIBUTION ──\n')
  const signalImpact: Record<string, { favoredWins: number; favoredLosses: number; totalDelta: number; count: number }> = {}
  for (const g of nonPush) {
    const trace = g.pick.signal_trace || {}
    for (const [sigId, sig] of Object.entries(trace) as [string, any][]) {
      if (!signalImpact[sigId]) signalImpact[sigId] = { favoredWins: 0, favoredLosses: 0, totalDelta: 0, count: 0 }
      const s = signalImpact[sigId]
      s.count++
      s.totalDelta += Math.abs(sig.delta || 0)
      const aligned = sig.favors === 'home' ? g.pick.is_home_pick : sig.favors === 'away' ? !g.pick.is_home_pick : true
      if (aligned && g.result === 'win') s.favoredWins++
      if (aligned && g.result === 'loss') s.favoredLosses++
    }
  }
  console.log('  Signal              | Avg |Δ| | Favored WR% | Count')
  console.log('  ────────────────────┼─────────┼─────────────┼──────')
  for (const [sig, s] of Object.entries(signalImpact).sort((a, b) => b[1].count - a[1].count)) {
    const avgDelta = s.count > 0 ? (s.totalDelta / s.count).toFixed(1) : '—'
    const favoredTotal = s.favoredWins + s.favoredLosses
    const favoredWR = favoredTotal > 0 ? (s.favoredWins / favoredTotal * 100).toFixed(1) + '%' : '—'
    console.log(`  ${padR(sig, 20)} | ${pad(avgDelta, 7)} | ${pad(favoredWR, 11)} | ${s.count}`)
  }
  console.log('')

  // ── 5k: Day of Week ──
  console.log('── 5k: DAY OF WEEK PERFORMANCE ──\n')
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDay: Record<number, { wins: number; losses: number; profit: number }> = {}
  for (let i = 0; i < 7; i++) byDay[i] = { wins: 0, losses: 0, profit: 0 }
  for (const g of nonPush) {
    const dateStr = g.game.commenceTime?.slice(0, 10) || g.outcome.game_date
    if (!dateStr) continue
    const d = new Date(dateStr + 'T12:00:00Z')
    if (isNaN(d.getTime())) continue
    const day = d.getUTCDay()
    if (g.result === 'win') byDay[day].wins++; else byDay[day].losses++
    byDay[day].profit += g.profit
  }
  console.log('  Day        | Record    | WR%    | ROI%     | Profit')
  console.log('  ───────────┼───────────┼────────┼──────────┼────────')
  for (let i = 0; i < 7; i++) {
    const s = byDay[i]
    const total = s.wins + s.losses
    if (!total) continue
    const wr = (s.wins / total * 100).toFixed(1)
    const roi = (s.profit / (total * 100) * 100).toFixed(2)
    console.log(`  ${padR(DAYS[i], 10)} | ${padR(`${s.wins}-${s.losses}`, 9)} | ${pad(wr + '%', 6)} | ${pad(roi + '%', 8)} | ${fmtProfit(s.profit)}`)
  }
  console.log('')

  // ═══ STEP 6: Bootstrap Bankroll Simulations ═══
  console.log('═'.repeat(70))
  console.log(`  STEP 6: ${NUM_RUNS.toLocaleString()} BOOTSTRAP BANKROLL SIMULATIONS`)
  console.log('═'.repeat(70) + '\n')

  console.log('  Running simulations...')
  const allStats = bootstrapBankroll(allGraded, NUM_RUNS)
  const rankedStats = bootstrapBankroll(rankedGraded, NUM_RUNS)

  console.log('\n┌─────────────────────────┬──────────────────┬──────────────────┐')
  console.log('│ Metric                  │ All Picks        │ Ranked Only      │')
  console.log('├─────────────────────────┼──────────────────┼──────────────────┤')
  const rows: [string, string, string][] = [
    ['Win Rate', allStats.winRate + '%', rankedStats.winRate + '%'],
    ['ROI', allStats.roi + '%', rankedStats.roi + '%'],
    ['Avg Final Bankroll', '$' + allStats.avgBR, '$' + rankedStats.avgBR],
    ['Median Final Bankroll', '$' + allStats.medBR, '$' + rankedStats.medBR],
    ['Std Dev', '$' + allStats.stdDev, '$' + rankedStats.stdDev],
    ['% Profitable Sims', allStats.profPct + '%', rankedStats.profPct + '%'],
    ['1st Percentile', '$' + allStats.p1, '$' + rankedStats.p1],
    ['5th Percentile', '$' + allStats.p5, '$' + rankedStats.p5],
    ['95th Percentile', '$' + allStats.p95, '$' + rankedStats.p95],
    ['99th Percentile', '$' + allStats.p99, '$' + rankedStats.p99],
    ['Avg Max Drawdown', allStats.maxDD + '%', rankedStats.maxDD + '%'],
    ['Bust Rate', allStats.bustPct + '%', rankedStats.bustPct + '%'],
  ]
  for (const [label, a, r] of rows) {
    console.log(`│ ${padR(label, 23)} │ ${pad(a, 16)} │ ${pad(r, 16)} │`)
  }
  console.log('└─────────────────────────┴──────────────────┴──────────────────┘')

  // Per-sport bankroll
  console.log('\n  Per-sport bankroll (all picks):')
  for (const [sport] of Object.entries(bySport).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))) {
    const sportGraded = allGraded.filter(g => (g.pick.sport || g.pick.league) === sport)
    if (sportGraded.length < 5) continue
    const stats = bootstrapBankroll(sportGraded, Math.min(NUM_RUNS, 5000))
    console.log(`    ${padR(sport, 8)}: WR ${stats.winRate}% | ROI ${stats.roi}% | Avg BR $${stats.avgBR} | Prof ${stats.profPct}%`)
  }
  console.log('')

  // ═══ STEP 7: Recommendations ═══
  console.log('═'.repeat(70))
  console.log('  STEP 7: RECOMMENDATIONS')
  console.log('═'.repeat(70) + '\n')

  const recommendations: string[] = []

  // Confidence calibration issues
  if (overallBrier > 0.25) recommendations.push(`🔴 HIGH PRIORITY: Brier score ${overallBrier.toFixed(4)} is very poor (>0.25). Confidence formula needs recalibration.`)
  else if (overallBrier > 0.22) recommendations.push(`🟡 MEDIUM: Brier score ${overallBrier.toFixed(4)} is above ideal (<0.22). Consider tightening confidence compression.`)
  else recommendations.push(`✅ Brier score ${overallBrier.toFixed(4)} is good (<0.22). Confidence calibration is reasonable.`)

  // Filter analysis
  const totalDropRate = dropped / matched.size * 100
  if (totalDropRate > 70) recommendations.push(`🟡 FILTER PASS RATE: Only ${(100 - totalDropRate).toFixed(1)}% of games produce picks. Filters may be too aggressive.`)
  if (totalDropRate < 30) recommendations.push(`🟡 FILTER PASS RATE: ${(100 - totalDropRate).toFixed(1)}% of games produce picks. Filters may be too loose.`)

  // Sport-specific issues
  for (const [sport, s] of Object.entries(bySport)) {
    const total = s.wins + s.losses
    if (total < 5) continue
    const roi = s.profit / (total * 100) * 100
    const wr = s.wins / total * 100
    const avgConf = s.confSum / total
    if (roi < -10) recommendations.push(`🔴 ${sport}: ROI ${roi.toFixed(1)}% is very negative. Consider raising confidence floor or reducing picks.`)
    else if (roi < -5) recommendations.push(`🟡 ${sport}: ROI ${roi.toFixed(1)}% is negative. Monitor or tighten filters.`)
    if (wr < avgConf - 10) recommendations.push(`⚠️ ${sport}: Overconfident — WR ${wr.toFixed(1)}% vs avg confidence ${avgConf.toFixed(1)}%. Lower sport multiplier.`)
    if (wr > avgConf + 10) recommendations.push(`💡 ${sport}: Underconfident — WR ${wr.toFixed(1)}% vs avg confidence ${avgConf.toFixed(1)}%. Could increase multiplier.`)
  }

  // Value bet edge analysis
  for (const range of edgeRanges) {
    const inRange = nonPush.filter(g => {
      const edge = g.pick.value_bet_edge ?? 0
      return edge >= range.min && edge < range.max
    })
    if (inRange.length < 5) continue
    const wins = inRange.filter(g => g.result === 'win').length
    const roi = inRange.reduce((s, g) => s + g.profit, 0) / (inRange.length * 100) * 100
    if (range.min >= 10 && roi < 0) recommendations.push(`⚠️ High-edge picks (${range.label}) have negative ROI (${roi.toFixed(1)}%). Edge detection may be unreliable at this range.`)
    if (range.min < 2 && roi > 5) recommendations.push(`💡 Low-edge picks (${range.label}) are profitable (${roi.toFixed(1)}% ROI). Consider lowering VALUE_MIN_EDGE threshold.`)
  }

  // Home vs Away
  if (homePicks.length >= 10 && awayPicks.length >= 10) {
    const homeROI = homeS.profit / (homePicks.length * 100) * 100
    const awayROI = awayS.profit / (awayPicks.length * 100) * 100
    if (homeROI < -10 && awayROI > 0) recommendations.push(`🟡 HOME picks are losing (${homeROI.toFixed(1)}% ROI) while AWAY picks profit (${awayROI.toFixed(1)}%). Consider disabling HOME_ONLY_MODE if on.`)
    if (awayROI < -10 && homeROI > 0) recommendations.push(`🟡 AWAY picks are losing (${awayROI.toFixed(1)}% ROI) while HOME picks profit (${homeROI.toFixed(1)}%). HOME_ONLY_MODE might help.`)
  }

  // Triple-align
  if (tripleAlign.length >= 5 && nonTriple.length >= 5) {
    const triROI = triS.profit / (tripleAlign.length * 100) * 100
    const nonTriROI = nonTriS.profit / (nonTriple.length * 100) * 100
    if (triROI > nonTriROI + 5) recommendations.push(`✅ Triple-align picks outperform (${triROI.toFixed(1)}% vs ${nonTriROI.toFixed(1)}% ROI). Consider weighting them more.`)
    if (triROI < nonTriROI - 5) recommendations.push(`⚠️ Triple-align picks underperform (${triROI.toFixed(1)}% vs ${nonTriROI.toFixed(1)}% ROI). Triple-align bonus may be counterproductive.`)
  }

  // Ranking impact
  if (allGraded.length > rankedGraded.length + 5) {
    const allROI = allStats.roi
    const rankedROI = rankedStats.roi
    if (rankedROI > allROI + 2) recommendations.push(`✅ Ranking improves ROI by ${(rankedROI - allROI).toFixed(1)}pp. Composite scoring is working.`)
    if (rankedROI < allROI - 2) recommendations.push(`⚠️ Ranking HURTS ROI by ${(allROI - rankedROI).toFixed(1)}pp. The ranking formula may be cutting good picks.`)
  }

  // Pick type analysis
  for (const [type, s] of Object.entries(byType)) {
    const total = s.wins + s.losses
    if (total < 5) continue
    const roi = s.profit / (total * 100) * 100
    if (roi < -10) recommendations.push(`🟡 ${type} picks are losing (${roi.toFixed(1)}% ROI, n=${total}). Consider deprioritizing this pick type.`)
  }

  // Bankroll health
  if (allStats.bustPct > 5) recommendations.push(`🔴 HIGH BUST RISK: ${allStats.bustPct}% of simulations go bankrupt. Edge is insufficient for unit sizing.`)
  if (allStats.profPct < 50) recommendations.push(`🔴 LOSING: Only ${allStats.profPct}% of simulations are profitable. Fundamental edge issue.`)
  if (allStats.profPct >= 60) recommendations.push(`✅ ${allStats.profPct}% of simulations profitable. Positive edge detected.`)

  if (!recommendations.length) recommendations.push('✅ No major issues detected. Pipeline is performing within expected parameters.')

  for (const rec of recommendations) console.log(`  ${rec}`)
  console.log('')

  // ═══ Save results ═══
  const results = {
    timestamp: new Date().toISOString(),
    config: { bootstrapRuns: NUM_RUNS, days: NUM_DAYS, dateArg: DATE_ARG },
    data: { gamesReconstructed: games.length, matched: matched.size, unmatched, leagueBreakdown: leagueCount },
    engine: { picksProduced: allPicks.length, dropped, dropReasons, passRate: (allPicks.length / matched.size * 100), ranked: ranked.length },
    performance: {
      allPicks: { winRate: allStats.winRate, roi: allStats.roi, avgBR: allStats.avgBR, profPct: allStats.profPct },
      rankedPicks: { winRate: rankedStats.winRate, roi: rankedStats.roi, avgBR: rankedStats.avgBR, profPct: rankedStats.profPct },
    },
    calibration: { overallBrier },
    recommendations,
  }
  const outPath = path.resolve(__dirname, '..', 'pipeline-audit-results.json')
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`📄 Results saved to ${outPath}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

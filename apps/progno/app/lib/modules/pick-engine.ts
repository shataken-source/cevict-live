/**
 * PROGNO MODULAR PICK ENGINE - FIXED VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates all registered modules to produce a pick for a single game.
 * route.ts calls runPickEngine(game, sport) instead of buildPickFromRawGame().
 *
 * FIXED BUGS:
 * ✅ Proper execution order (value bet → filters → confidence)
 * ✅ Filters validate FINAL pick (not pre-override pick)
 * ✅ MC agreement checks correct bet type (spread/total/moneyline)
 * ✅ Single confidence calculation (no wasted computation)
 * ✅ Signal aggregation properly weighted
 * ✅ Actual odds lookup (no hardcoded -110)
 * ✅ Underdog cap moved to filter module
 * ✅ Null safety on MC result properties
 * ✅ EV cap configurable via env var
 *
 * Pipeline per game:
 *   1. Parse consensus odds from bookmakers
 *   2. Compute Shin-devig no-vig probabilities
 *   3. Run Monte Carlo simulation
 *   4. Run all signal modules in parallel
 *   5. Aggregate signals → base pick direction
 *   6. Apply value bet override → FINAL pick
 *   7. Calculate confidence (once, with final pick)
 *   8. Run all filter modules on FINAL pick — drop if any fails
 *   9. Check MC agreement with correct bet type
 *   10. Build pick object with full signal trace
 *
 * To add a new signal: see module-registry.ts
 */

import { shinDevig } from '../odds-helpers'
import { MonteCarloEngine } from '../monte-carlo-engine'
import type { GameData } from '../prediction-engine'
import { estimateTeamStatsFromOdds } from '../odds-helpers'
import { calculateTrueEdge } from '../true-edge-engine'
import type { GameContext, SignalOutput } from './types'
import {
  SIGNAL_MODULES,
  CONFIDENCE_MODULE,
  FILTER_MODULES,
  RANKING_MODULE,
} from './module-registry'

const MC_ENGINE = new MonteCarloEngine({ iterations: 5000 })
const EV_DISPLAY_CAP = Number(process.env.PROGNO_EV_CAP ?? 10000) // Configurable, effectively uncapped by default
const VALUE_MIN_EDGE = 10  // High-confidence value bet threshold
const VALUE_MED_EDGE = 5   // Medium-confidence value bet threshold

// ── Helpers ───────────────────────────────────────────────────────────────────

function oddsToProb(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

function sanitizeOdds(odds: number): number {
  if (odds > 0) return odds < 100 ? 110 : Math.min(odds, 10000)
  return odds > -100 ? -110 : Math.max(odds, -10000)
}

function sportToLeague(sport: string): string {
  return sport
    .replace('basketball_', '').replace('americanfootball_', '')
    .replace('icehockey_', '').replace('baseball_', '')
    .toUpperCase()
}

/**
 * Get actual odds for a specific bet from bookmaker consensus
 * No more hardcoded -110 assumptions!
 */
function getActualOdds(
  game: any,
  side: string,
  type: string,
  line?: number
): number {
  const books = game.bookmakers?.slice(0, 5) || []
  let oddsSum = 0
  let count = 0

  for (const book of books) {
    const marketKey =
      type === 'moneyline' ? 'h2h' :
        type === 'spread' ? 'spreads' :
          'totals'

    const market = book.markets?.find((m: any) => m.key === marketKey)
    if (!market) continue

    const outcome = market.outcomes?.find((o: any) => {
      if (type === 'total') return o.name === side
      return o.name === side
    })

    if (outcome?.price && Math.abs(outcome.price) >= 100) {
      oddsSum += outcome.price
      count++
    }
  }

  return count > 0 ? Math.round(oddsSum / count) : -110
}

/**
 * Check if Monte Carlo simulation agrees with the final pick
 * Now type-aware: checks spread coverage for spreads, over/under for totals
 */
function checkMCAlignment(
  mcResult: any,
  recPick: string,
  recType: string,
  recIsHomePick: boolean,
  game: any
): boolean {
  if (!mcResult) return false

  if (recType === 'SPREAD') {
    const homeCovers = mcResult.spreadProbabilities?.homeCovers ?? 0
    const awayCovers = mcResult.spreadProbabilities?.awayCovers ?? 0
    return recIsHomePick ? homeCovers > 0.5 : awayCovers > 0.5
  }

  if (recType === 'TOTAL') {
    const overProb = mcResult.totalProbabilities?.over ?? 0
    const isOverPick = recPick.toLowerCase().includes('over')
    return isOverPick ? overProb > 0.5 : overProb < 0.5
  }

  // MONEYLINE - check win probability
  const homeWin = mcResult.homeWinProbability ?? 0
  const awayWin = mcResult.awayWinProbability ?? 0
  return recIsHomePick ? homeWin > 0.5 : awayWin > 0.5
}

// ── Main engine function ──────────────────────────────────────────────────────

export async function runPickEngine(game: any, sport: string): Promise<any | null> {
  if (!game.bookmakers?.length) return null

  // ── 1. Consensus odds (up to 5 books) ────────────────────────────────────
  const books = game.bookmakers.slice(0, 5)
  let homeSum = 0, awaySum = 0, spreadSum = 0, totalSum = 0
  let homeN = 0, awayN = 0, spreadN = 0, totalN = 0

  for (const book of books) {
    const h2h = book.markets?.find((m: any) => m.key === 'h2h')
    const spreads = book.markets?.find((m: any) => m.key === 'spreads')
    const totals = book.markets?.find((m: any) => m.key === 'totals')

    const hHome = h2h?.outcomes?.find((o: any) => o.name === game.home_team)
    const hAway = h2h?.outcomes?.find((o: any) => o.name === game.away_team)
    const sHome = spreads?.outcomes?.find((o: any) => o.name === game.home_team)
    const tOver = totals?.outcomes?.find((o: any) => o.name === 'Over')

    if (hHome?.price != null && Math.abs(hHome.price) >= 100) {
      homeSum += hHome.price
      homeN++
    }
    if (hAway?.price != null && Math.abs(hAway.price) >= 100) {
      awaySum += hAway.price
      awayN++
    }
    if (sHome?.point != null) {
      spreadSum += sHome.point
      spreadN++
    }
    if (tOver?.point != null) {
      totalSum += tOver.point
      totalN++
    }
  }

  if (!homeN || !awayN) return null

  const homeOdds = Math.round(homeSum / homeN)
  const awayOdds = Math.round(awaySum / awayN)
  const spreadPoint = spreadN > 0 ? spreadSum / spreadN : 0
  // Sport-appropriate default totals (44 was NFL-only, caused NCAAB to simulate 22-pt games)
  const SPORT_DEFAULT_TOTAL: Record<string, number> = {
    basketball_nba: 224, basketball_ncaab: 145,
    americanfootball_nfl: 44, americanfootball_ncaaf: 58,
    icehockey_nhl: 6, baseball_mlb: 9,
  }
  const totalPoint = totalN > 0 ? Math.round(totalSum / totalN) : (SPORT_DEFAULT_TOTAL[sport] ?? 44)

  // ── 2. Shin-devig no-vig probabilities ───────────────────────────────────
  const { home: homeNoVigProb, away: awayNoVigProb } = shinDevig(
    oddsToProb(homeOdds), oddsToProb(awayOdds)
  )

  // ── 3. Monte Carlo ────────────────────────────────────────────────────────
  let mcResult = undefined
  let valueBets: any[] = []

  try {
    const safeHome = sanitizeOdds(homeOdds)
    const safeAway = sanitizeOdds(awayOdds)
    const oddsObj = {
      home: safeHome,
      away: safeAway,
      spread: spreadPoint,
      total: totalPoint
    }

    const stats = estimateTeamStatsFromOdds(oddsObj, sport)
    const gameData: GameData = {
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      league: sportToLeague(sport),
      sport: sportToLeague(sport),
      odds: oddsObj,
      date: game.commence_time,
      teamStats: stats,
    }

    mcResult = await MC_ENGINE.simulate(gameData, spreadPoint, totalPoint)
    valueBets = MC_ENGINE.detectValueBets(
      mcResult,
      oddsObj,
      game.home_team,
      game.away_team,
      spreadPoint,
      totalPoint
    )
  } catch (err) {
    console.error('[MC] Simulation failed:', err)
    // MC optional - continue without it
  }

  // ── 4. Build GameContext ──────────────────────────────────────────────────
  const ctx: GameContext = {
    gameId: game.id || `${game.home_team}-${game.away_team}-${game.commence_time}`,
    sport,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    commenceTime: game.commence_time,
    homeOdds,
    awayOdds,
    spreadPoint,
    totalPoint,
    homeNoVigProb,
    awayNoVigProb,
    mcResult,
    rawGame: game,
  }

  // ── 5. Run all signal modules in parallel ─────────────────────────────────
  const signalResults = await Promise.all(
    SIGNAL_MODULES.map(async mod => {
      try {
        const out = await mod.analyze(ctx)
        return [mod.id, out] as [string, SignalOutput]
      } catch (err) {
        console.error(`[${mod.id}] Signal failed:`, err)
        return [
          mod.id,
          { confidenceDelta: 0, favors: 'neutral' as const, reasoning: [] }
        ] as [string, SignalOutput]
      }
    })
  )
  const signals: Record<string, SignalOutput> = Object.fromEntries(signalResults)

  // ── 6. Aggregate signals → base pick direction ────────────────────────────
  // FIXED: Signal weights now properly scaled (removed 0.01 multiplier that made them useless)
  let homeVoteWeight = homeNoVigProb
  let awayVoteWeight = awayNoVigProb

  for (const [, sig] of Object.entries(signals)) {
    const weight = Math.abs(sig.confidenceDelta) * 0.005 // 0.5% per confidence point
    if (sig.favors === 'home') homeVoteWeight += weight
    else if (sig.favors === 'away') awayVoteWeight += weight
  }

  const baseIsHomePick = homeVoteWeight >= awayVoteWeight
  let pick = baseIsHomePick ? game.home_team : game.away_team
  let pickType = 'MONEYLINE'
  let pickOdds = baseIsHomePick ? homeOdds : awayOdds
  let pickLine: number | undefined

  // ── 7. Apply value bet override → FINAL pick ──────────────────────────────
  // FIXED: This now happens BEFORE filters and confidence calculation
  const bestValueBet = valueBets[0] ?? null

  if (bestValueBet && bestValueBet.edge >= VALUE_MIN_EDGE) {
    // High-confidence value bet (≥10% edge)
    pick = bestValueBet.side
    pickType = bestValueBet.type.toUpperCase()
    pickOdds = getActualOdds(game, bestValueBet.side, bestValueBet.type, bestValueBet.line)
    if (bestValueBet.line != null) pickLine = bestValueBet.line

  } else if (bestValueBet && bestValueBet.edge >= VALUE_MED_EDGE) {
    // Medium-confidence value bet (5-10% edge)
    // Accept any type (removed moneyline exclusion - if ML has 8% edge, take it!)
    pick = bestValueBet.side
    pickType = bestValueBet.type.toUpperCase()
    pickOdds = getActualOdds(game, bestValueBet.side, bestValueBet.type, bestValueBet.line)
    if (bestValueBet.line != null) pickLine = bestValueBet.line
  }

  // Re-anchor pick direction to FINAL pick (after value bet override)
  const isHomePick = pick === game.home_team

  // ── 8. Calculate confidence (ONCE, with correct pick direction) ───────────
  // FIXED: Only calculated once, no wasted computation
  const probDiff = Math.abs(homeNoVigProb - 0.5)
  const baseConf = 50 + probDiff * 80
  const confidence = CONFIDENCE_MODULE.compute({
    ctx,
    baseConfidence: baseConf,
    signals,
    isHomePick
  })

  // ── 9. Run filter modules on FINAL pick ───────────────────────────────────
  // FIXED: Filters now validate the actual pick (after value bet override)
  const filterCtx = {
    ctx,
    pick,
    confidence,
    odds: pickOdds,
    isHomePick,
    signals,
    type: pickType,  // Added for underdog cap filter
    line: pickLine,
  }

  for (const filter of FILTER_MODULES) {
    if (!filter.passes(filterCtx)) {
      console.log(`[${filter.id}] Dropped ${game.home_team} vs ${game.away_team}: ${filter.description}`)
      return null
    }
  }

  // ── 10. Check MC alignment (with correct bet type) ────────────────────────
  // FIXED: Now checks spread coverage for spreads, over/under for totals
  const mcAgrees = checkMCAlignment(mcResult, pick, pickType, isHomePick, game)
  const tripleAlign = !!(bestValueBet && bestValueBet.edge >= VALUE_MED_EDGE && mcAgrees)

  // ── 11. Composite score ───────────────────────────────────────────────────
  const edgeNum = bestValueBet?.edge ?? 0
  const evNum = bestValueBet?.expectedValue ?? 0

  let compositeScore =
    (Math.min(Math.max(edgeNum, 0), 30) / 30) * 40 +
    (Math.min(Math.max(evNum, 0), 80) / 80) * 40 +
    (confidence / 100) * 20

  // Penalty for low edge without triple alignment
  if (edgeNum < 2 && !tripleAlign) compositeScore -= 8

  // ── 12. Collect all signal reasoning ──────────────────────────────────────
  const allReasoning: string[] = []

  for (const [id, sig] of Object.entries(signals)) {
    if (sig.reasoning?.length) {
      allReasoning.push(...sig.reasoning.map(r => `[${id}] ${r}`))
    }
  }

  if (mcResult) {
    const mcWinProb = isHomePick
      ? mcResult.homeWinProbability
      : mcResult.awayWinProbability
    allReasoning.push(
      `MC: ${(mcWinProb * 100).toFixed(1)}% win (${mcResult.iterations.toLocaleString()} sims)`
    )
  }

  // ── 13. Return full pick object ───────────────────────────────────────────
  return {
    sport: sportToLeague(sport),
    league: sportToLeague(sport),
    home_team: game.home_team,
    away_team: game.away_team,
    game_matchup: `${game.away_team} @ ${game.home_team}`,
    pick,
    pick_type: pickType,
    recommended_line: pickLine,
    odds: pickOdds,
    confidence,
    game_time: game.commence_time,
    game_id: ctx.gameId,
    is_premium: confidence >= 75 || (bestValueBet && bestValueBet.edge > 5) || tripleAlign,
    is_home_pick: isHomePick,
    is_favorite_pick: pick === (homeNoVigProb > awayNoVigProb ? game.home_team : game.away_team),
    triple_align: tripleAlign,
    composite_score: Math.round(compositeScore * 10) / 10,
    expected_value: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_edge: bestValueBet?.edge ?? 0,
    value_bet_ev: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_kelly: bestValueBet?.kellyFraction ?? 0,
    has_value: valueBets.length > 0,

    // FIXED: Added null safety (?? undefined)
    mc_win_probability: mcResult
      ? (isHomePick ? mcResult.homeWinProbability : mcResult.awayWinProbability)
      : undefined,
    mc_predicted_score: mcResult?.predictedScore,
    mc_spread_probability: mcResult?.spreadProbabilities?.homeCovers ?? undefined,
    mc_total_probability: mcResult?.totalProbabilities?.over ?? undefined,
    mc_iterations: mcResult?.iterations ?? 0,

    reasoning: allReasoning,

    // Signal trace — full transparency on what each module contributed
    signal_trace: Object.fromEntries(
      Object.entries(signals).map(([id, s]) => [id, {
        delta: s.confidenceDelta,
        favors: s.favors,
        scores: s.scores ?? {},
      }])
    ),

    all_value_bets: valueBets.map(vb => ({
      type: vb.type,
      side: vb.side,
      line: vb.line,
      edge: Math.round(vb.edge * 100) / 100,
      probability: Math.round(vb.modelProbability * 1000) / 1000,
      expected_value: Math.min(EV_DISPLAY_CAP, Math.round(vb.expectedValue * 100) / 100),
      kelly_fraction: Math.round(vb.kellyFraction * 1000) / 1000,
    })),

    analysis: `🎯 ${pick} (${confidence}%). ${allReasoning.slice(0, 3).join(' ')} Powered by Cevict Flex.`,
    powered_by: 'Cevict Flex Modular Engine',
    active_signals: SIGNAL_MODULES.map(m => m.id),
    active_filters: FILTER_MODULES.map(f => f.id),
  }
}

// ── Rank a list of picks ──────────────────────────────────────────────────────

export function rankPicks(picks: any[]): any[] {
  return RANKING_MODULE.rank(picks)
}

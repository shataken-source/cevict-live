/**
 * PROGNO MODULAR PICK ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates all registered modules to produce a pick for a single game.
 * route.ts calls runPickEngine(game, sport) instead of buildPickFromRawGame().
 *
 * Pipeline per game:
 *   1. Parse consensus odds from bookmakers
 *   2. Compute Shin-devig no-vig probabilities
 *   3. Run Monte Carlo simulation
 *   4. Run all signal modules in parallel
 *   5. Compute final confidence via confidence module
 *   6. Run all filter modules — drop if any fails
 *   7. Build pick object with full signal trace
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
const EV_DISPLAY_CAP = 150

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

// ── Main engine function ──────────────────────────────────────────────────────

export async function runPickEngine(game: any, sport: string): Promise<any | null> {
  if (!game.bookmakers?.length) return null

  // ── 1. Consensus odds (up to 5 books) ────────────────────────────────────
  const books = game.bookmakers.slice(0, 5)
  let homeSum = 0, awaySum = 0, spreadSum = 0, totalSum = 0
  let homeN = 0, awayN = 0, spreadN = 0, totalN = 0

  for (const book of books) {
    const h2h     = book.markets?.find((m: any) => m.key === 'h2h')
    const spreads = book.markets?.find((m: any) => m.key === 'spreads')
    const totals  = book.markets?.find((m: any) => m.key === 'totals')
    const hHome   = h2h?.outcomes?.find((o: any) => o.name === game.home_team)
    const hAway   = h2h?.outcomes?.find((o: any) => o.name === game.away_team)
    const sHome   = spreads?.outcomes?.find((o: any) => o.name === game.home_team)
    const tOver   = totals?.outcomes?.find((o: any) => o.name === 'Over')
    if (hHome?.price != null && Math.abs(hHome.price) >= 100) { homeSum += hHome.price; homeN++ }
    if (hAway?.price != null && Math.abs(hAway.price) >= 100) { awaySum += hAway.price; awayN++ }
    if (sHome?.point != null) { spreadSum += sHome.point; spreadN++ }
    if (tOver?.point  != null) { totalSum  += tOver.point;  totalN++ }
  }

  if (!homeN || !awayN) return null

  const homeOdds   = Math.round(homeSum / homeN)
  const awayOdds   = Math.round(awaySum / awayN)
  const spreadPoint = spreadN > 0 ? spreadSum / spreadN : 0
  const totalPoint  = totalN  > 0 ? Math.round(totalSum / totalN) : 44

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
    const oddsObj  = { home: safeHome, away: safeAway, spread: spreadPoint, total: totalPoint }
    const stats    = estimateTeamStatsFromOdds(oddsObj, sport)
    const gameData: GameData = {
      homeTeam: game.home_team, awayTeam: game.away_team,
      league: sportToLeague(sport), sport: sportToLeague(sport),
      odds: oddsObj, date: game.commence_time, teamStats: stats,
    }
    mcResult   = await MC_ENGINE.simulate(gameData, spreadPoint, totalPoint)
    valueBets  = MC_ENGINE.detectValueBets(mcResult, oddsObj, game.home_team, game.away_team, spreadPoint, totalPoint)
  } catch { /* MC optional */ }

  // ── 4. Build GameContext ──────────────────────────────────────────────────
  const ctx: GameContext = {
    gameId: game.id || `${game.home_team}-${game.away_team}-${game.commence_time}`,
    sport,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    commenceTime: game.commence_time,
    homeOdds, awayOdds, spreadPoint, totalPoint,
    homeNoVigProb, awayNoVigProb,
    mcResult,
    rawGame: game,
  }

  // ── 5. Run all signal modules in parallel ─────────────────────────────────
  const signalResults = await Promise.all(
    SIGNAL_MODULES.map(async mod => {
      try {
        const out = await mod.analyze(ctx)
        return [mod.id, out] as [string, SignalOutput]
      } catch {
        return [mod.id, { confidenceDelta: 0, favors: 'neutral' as const, reasoning: [] }] as [string, SignalOutput]
      }
    })
  )
  const signals: Record<string, SignalOutput> = Object.fromEntries(signalResults)

  // ── 6. Determine pick direction ───────────────────────────────────────────
  // Aggregate signal votes to decide home vs away
  let homeVoteWeight = homeNoVigProb
  let awayVoteWeight = awayNoVigProb
  for (const [, sig] of Object.entries(signals)) {
    if (sig.favors === 'home') homeVoteWeight += Math.abs(sig.confidenceDelta) * 0.01
    else if (sig.favors === 'away') awayVoteWeight += Math.abs(sig.confidenceDelta) * 0.01
  }
  const isHomePick = homeVoteWeight >= awayVoteWeight
  const pick       = isHomePick ? game.home_team : game.away_team
  const pickOdds   = isHomePick ? homeOdds : awayOdds

  // ── 7. Compute confidence ─────────────────────────────────────────────────
  const probDiff    = Math.abs(homeNoVigProb - 0.5)
  const baseConf    = 50 + probDiff * 80
  const confidence  = CONFIDENCE_MODULE.compute({ ctx, baseConfidence: baseConf, signals, isHomePick })

  // ── 8. Run filter modules ─────────────────────────────────────────────────
  const filterCtx = { ctx, pick, confidence, odds: pickOdds, isHomePick, signals }
  for (const filter of FILTER_MODULES) {
    if (!filter.passes(filterCtx)) {
      console.log(`[${filter.id}] Dropped ${game.home_team} vs ${game.away_team}: ${filter.description}`)
      return null
    }
  }

  // ── 9. Best value bet ─────────────────────────────────────────────────────
  const bestValueBet = valueBets[0] ?? null
  const VALUE_MIN_EDGE = 10
  let recPick  = pick
  let recType  = bestValueBet?.type?.toUpperCase() || 'MONEYLINE'
  let recOdds  = pickOdds
  let recLine: number | undefined

  if (bestValueBet && bestValueBet.edge >= VALUE_MIN_EDGE) {
    recPick  = bestValueBet.side
    recType  = bestValueBet.type.toUpperCase()
    recOdds  = bestValueBet.type === 'moneyline'
      ? (bestValueBet.side === game.home_team ? homeOdds : awayOdds)
      : -110
    if (bestValueBet.line != null) recLine = bestValueBet.line
  } else if (bestValueBet && bestValueBet.edge >= 5 && bestValueBet.type !== 'moneyline') {
    recPick  = bestValueBet.side
    recType  = bestValueBet.type.toUpperCase()
    recOdds  = -110
    if (bestValueBet.line != null) recLine = bestValueBet.line
  }

  // ── 10. Triple alignment ──────────────────────────────────────────────────
  const mcAgrees    = mcResult && (recPick === game.home_team
    ? (mcResult.homeWinProbability ?? 0) > 0.5
    : (mcResult.awayWinProbability ?? 0) > 0.5)
  const tripleAlign = !!(bestValueBet && bestValueBet.edge >= 5 && mcAgrees)

  // ── 11. Composite score ───────────────────────────────────────────────────
  const edgeNum = bestValueBet?.edge ?? 0
  const evNum   = bestValueBet?.expectedValue ?? 0
  let compositeScore =
    (Math.min(Math.max(edgeNum, 0), 30) / 30) * 40 +
    (Math.min(Math.max(evNum,  0), 80) / 80) * 40 +
    (confidence / 100) * 20
  if (edgeNum < 2 && !tripleAlign) compositeScore -= 8

  // ── 12. Collect all signal reasoning ─────────────────────────────────────
  const allReasoning: string[] = []
  for (const [id, sig] of Object.entries(signals)) {
    if (sig.reasoning?.length) {
      allReasoning.push(...sig.reasoning.map(r => `[${id}] ${r}`))
    }
  }
  if (mcResult) {
    const mcWin = recPick === game.home_team
      ? mcResult.homeWinProbability : mcResult.awayWinProbability
    allReasoning.push(`MC: ${(mcWin * 100).toFixed(1)}% win (${mcResult.iterations.toLocaleString()} sims)`)
  }

  // ── 13. Return full pick object ───────────────────────────────────────────
  return {
    sport: sportToLeague(sport),
    league: sportToLeague(sport),
    home_team: game.home_team,
    away_team: game.away_team,
    pick: recPick,
    pick_type: recType,
    recommended_line: recLine,
    odds: recOdds,
    confidence,
    game_time: game.commence_time,
    game_id: ctx.gameId,
    is_premium: confidence >= 75 || (bestValueBet && bestValueBet.edge > 5) || tripleAlign,
    is_home_pick: isHomePick,
    is_favorite_pick: recPick === (homeNoVigProb > awayNoVigProb ? game.home_team : game.away_team),
    triple_align: tripleAlign,
    composite_score: Math.round(compositeScore * 10) / 10,
    expected_value: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_edge: bestValueBet?.edge ?? 0,
    value_bet_ev: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_kelly: bestValueBet?.kellyFraction ?? 0,
    has_value: valueBets.length > 0,
    mc_win_probability: mcResult
      ? (recPick === game.home_team ? mcResult.homeWinProbability : mcResult.awayWinProbability)
      : undefined,
    mc_predicted_score: mcResult?.predictedScore,
    mc_spread_probability: mcResult?.spreadProbabilities?.homeCovers,
    mc_total_probability: mcResult?.totalProbabilities?.over,
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
      type: vb.type, side: vb.side, line: vb.line,
      edge: Math.round(vb.edge * 100) / 100,
      probability: Math.round(vb.modelProbability * 1000) / 1000,
      expected_value: Math.min(EV_DISPLAY_CAP, Math.round(vb.expectedValue * 100) / 100),
      kelly_fraction: Math.round(vb.kellyFraction * 1000) / 1000,
    })),
    analysis: `🎯 ${recPick} (${confidence}%). ${allReasoning.slice(0, 3).join(' ')} Powered by Cevict Flex.`,
    powered_by: 'Cevict Flex Modular Engine',
    active_signals: SIGNAL_MODULES.map(m => m.id),
    active_filters: FILTER_MODULES.map(f => f.id),
  }
}

// ── Rank a list of picks ──────────────────────────────────────────────────────

export function rankPicks(picks: any[]): any[] {
  return RANKING_MODULE.rank(picks)
}

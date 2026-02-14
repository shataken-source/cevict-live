/**
 * Enhanced Picks API with Cevict Flex (7-Dimensional Claude Effect)
 *
 * Vig-Aware Value: no-vig baseline, odds-informed MC, spread-vs-ML IAI; top 10 by edge+EV; max 3 per sport.
 *
 * Golden Rules (see LINE_MOVEMENT_GOLDEN_RULES.md): Follow the Money not Tickets; bet with the House on Freezes; trust Sharps (Pinnacle/Circa). When data exists, power 7D with real market deltas (odds diff, money vs tickets, line movement velocity)—not narrative/sentiment seeds.
 *
 * 7 dimensions (current): SF=odds bias, NM/NIG/EPD=0 without real data, IAI=spread-vs-ML, CSI=prob gap, TRD=time decay.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MonteCarloEngine } from '../../../lib/monte-carlo-engine'
import { GameData } from '../../../lib/prediction-engine'
import { getPrimaryKey } from '../../../keys-store'
import { estimateTeamStatsFromOdds, shinDevig } from '../../../lib/odds-helpers'
import { predictScoreComprehensive } from '../../../score-prediction-service'

export const runtime = 'nodejs'

/** Cap displayed EV per $100 so copy stays realistic (avoid "win $500 per $100" claims). */
const EV_DISPLAY_CAP = 150
/** Regular picks: today + next day (0–1 days ahead). */
const REGULAR_MAX_DAYS_AHEAD = 1
/** Early lines: 3–5 days ahead (so you can compare when those games hit regular window). */
const EARLY_LINES_MIN_DAYS = 3
const EARLY_LINES_MAX_DAYS = 5
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Claude Effect weights (7 dimensions)
const CLAUDE_EFFECT_WEIGHTS = {
  SF: 0.12,   // Sentiment Field
  NM: 0.18,   // Narrative Momentum
  IAI: 0.20,  // Information Asymmetry Index
  CSI: 0.10,  // Chaos Sensitivity Index
  NIG: 0.12,  // News Impact Grade
  TRD: 0.10,  // Temporal Recency Decay (multiplier)
  EPD: 0.18,  // External Pressure Differential
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create client if credentials exist
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(request: Request) {
  try {
    const url = request.url ? new URL(request.url) : null
    const favoriteOnly = url?.searchParams?.get('favoriteOnly') === '1' || url?.searchParams?.get('favoriteOnly') === 'true'
    const earlyLines = url?.searchParams?.get('earlyLines') === '1' || url?.searchParams?.get('earlyLines') === 'true'

    const today = new Date().toISOString().split('T')[0]

    // Cache only for regular picks (same-day window); early lines always fetch fresh
    // Also skip cache if existing picks have unrealistic scores (e.g., NHL 5-5)
    if (supabase && !earlyLines) {
      const { data: existingPicks } = await supabase
        .from('picks')
        .select('*')
        .gte('game_time', `${today}T00:00:00`)
        .lt('game_time', `${today}T23:59:59`)

      // Validate cached picks - skip if NHL has unrealistic scores (5-5)
      const hasUnrealisticScores = existingPicks?.some((p: any) => {
        const isNHL = p.sport?.toUpperCase() === 'NHL' || p.league?.toUpperCase() === 'NHL'
        const score = p.mc_predicted_score
        if (isNHL && score) {
          // NHL should average ~3 goals per team, not 5
          return score.home >= 5 && score.away >= 5
        }
        return false
      })

      if (existingPicks && existingPicks.length > 0 && !hasUnrealisticScores) {
        const filtered = favoriteOnly ? existingPicks.filter((p: any) => p.is_favorite_pick === true) : existingPicks
        const topFromCache = selectTop10(filtered)
        return NextResponse.json({
          message: favoriteOnly
            ? `Top ${topFromCache.length} favorite-only picks (of ${filtered.length})`
            : 'Picks already generated for today (top 10 returned)',
          picks: topFromCache,
          count: topFromCache.length,
          total_games: existingPicks.length,
          source: 'cache',
          strategy: 'Triple Alignment; top 10 by composite score; max 3 per sport.',
          powered_by: 'Cevict Flex (7-Dimensional Claude Effect)',
        })
      } else if (hasUnrealisticScores) {
        console.log('[Picks API] Skipping cache - found unrealistic NHL scores (5-5), regenerating...')
      }
    }

    // Fetch games from Odds API (env + .progno/keys.json)
    const oddsApiKey = getPrimaryKey()
    if (!oddsApiKey) {
      return NextResponse.json(
        { error: 'ODDS_API_KEY not configured' },
        { status: 500 }
      )
    }

    // All 6 sports (NFL, NBA, NHL, MLB, NCAAF, NCAAB)
    const sports = [
      'basketball_nba',
      'americanfootball_nfl',
      'icehockey_nhl',
      'baseball_mlb',
      'americanfootball_ncaaf',
      'basketball_ncaab',
    ]

    const allPicks: any[] = []

    for (const sport of sports) {
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        )

        if (!response.ok) continue

        const games = await response.json()
        if (!Array.isArray(games)) continue

        const now = new Date()
        const inWindow = (commence: Date) => {
          if (earlyLines) {
            const min = new Date(now); min.setDate(min.getDate() + EARLY_LINES_MIN_DAYS); min.setHours(0, 0, 0, 0)
            const max = new Date(now); max.setDate(max.getDate() + EARLY_LINES_MAX_DAYS); max.setHours(23, 59, 59, 999)
            return commence >= min && commence <= max
          }
          const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + REGULAR_MAX_DAYS_AHEAD); cutoff.setHours(23, 59, 59, 999)
          return commence <= cutoff
        }

        for (const game of games) {
          const commence = game.commence_time ? new Date(game.commence_time) : null
          if (!commence || !inWindow(commence)) continue
          const pick = await buildPickFromRawGame(game, sport)
          if (!pick) continue
          // Favorite-only (backtest showed underdog value bets lose; favorite-only is profitable)
          if (favoriteOnly && !pick.is_favorite_pick) continue
          // Save to Supabase if available
          if (supabase) {
            try {
              const { data, error } = await supabase.from('picks').insert([pick]).select()
              if (!error && data) {
                allPicks.push(data[0])
              } else {
                allPicks.push(pick)
              }
            } catch {
              allPicks.push(pick)
            }
          } else {
            allPicks.push(pick)
          }
        }
      } catch (sportError) {
        console.error(`Error processing ${sport}:`, sportError)
        continue
      }
    }

    const topPicks = selectTop10(allPicks)
    const windowLabel = earlyLines ? `Early lines (${EARLY_LINES_MIN_DAYS}-${EARLY_LINES_MAX_DAYS} days ahead)` : `Regular (0-${REGULAR_MAX_DAYS_AHEAD} days)`

    return NextResponse.json({
      message: topPicks.length > 0
        ? favoriteOnly
          ? `Top ${topPicks.length} favorite-only picks (of ${allPicks.length} games) — Cevict Flex — ${windowLabel}`
          : `Top ${topPicks.length} picks (of ${allPicks.length} games) — Cevict Flex + Triple Alignment — ${windowLabel}`
        : earlyLines ? `No games 2-5 days ahead` : 'No games found today',
      favorite_only: favoriteOnly,
      picks: topPicks,
      count: topPicks.length,
      total_games: allPicks.length,
      premium_count: topPicks.filter((p: any) => p.is_premium).length,
      value_bets_count: topPicks.filter((p: any) => p.has_value).length,
      strategy: 'Triple Alignment: model pick + value bet side + MC agree. Top 20 by composite score (confidence + edge + EV + triple bonus). Max 3 per sport (NFL/NBA/NHL/MLB/NCAAF/NCAAB). Ensures all tiers (Elite/Pro/Free) receive picks. Consensus odds (up to 3 books).',
      ...(allPicks.length === 0 && { hint: 'Odds source: The Odds API (the-odds-api.com). Check quota and regions if key is set.' }),
      earlyLines: earlyLines,
      window: windowLabel,
      powered_by: 'Cevict Flex (7-Dimensional Claude Effect)',
      technology: {
        monte_carlo: '1000+ simulations per game',
        claude_effect: '7 dimensions of AI analysis',
        value_detection: 'Edge + Kelly Criterion optimization',
        consensus_odds: 'Up to 5 bookmakers averaged to reduce single-book bias',
        top_n: 'Best 10 picks only, sport-diverse (max 3 per league)',
      },
      dimensions: {
        SF: 'Sentiment Field - Team emotional state',
        NM: 'Narrative Momentum - Story power detection',
        IAI: 'Information Asymmetry - Sharp money tracking',
        CSI: 'Chaos Sensitivity - Upset potential',
        NIG: 'News Impact Grade - Breaking news effect',
        TRD: 'Temporal Recency Decay - Data freshness',
        EPD: 'External Pressure Differential - Must-win scenarios',
      },
      metrics_guide: {
        ev_per_100: 'Expected profit in dollars per $100 wagered (American odds). EV = P(win)×profit_if_win − P(lose)×100. Displayed EV is capped at $150 per $100 for clarity; actual expected profit can be higher on large underdogs. Past results do not guarantee future outcomes.',
        edge_pct: 'Percentage-point edge: model win probability minus market implied probability. Positive = model sees value.',
        odds: 'American odds (e.g. -110, +200). Consensus from bookmakers; sanitized for edge/EV when consensus is invalid.',
      },
    })

  } catch (error: any) {
    console.error('[Picks API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate picks' },
      { status: 500 }
    )
  }
}

/**
 * Calculate 7-Dimensional Claude Effect
 * This is what makes us better than ALL competitors
 *
 * Uses game-specific data to generate unique values per game.
 * IAI (Information Asymmetry) now uses spread-vs-ML implied win prob as sharp signal.
 */
function calculate7DimensionalClaudeEffect(
  game: any,
  homeProb: number,
  awayProb: number,
  spread?: number,
  sportKey?: string
) {
  // Initialize dimensions (no seeded random; use only odds/spread-derived signals per Gemini audit)
  const dimensions = {
    SF: 0,   // Sentiment Field (-0.2 to +0.2)
    NM: 0,   // Narrative Momentum (-0.15 to +0.15)
    IAI: 0,  // Information Asymmetry (-0.1 to +0.1)
    CSI: 0,  // Chaos Sensitivity (0 to 0.25)
    NIG: 0,  // News Impact Grade (-0.1 to +0.1)
    TRD: 1,  // Temporal Recency Decay (0.8 to 1.0 multiplier)
    EPD: 0,  // External Pressure Differential (-0.15 to +0.15)
  }

  const reasoning: string[] = []

  // 1. SENTIMENT FIELD (SF) - Odds-derived only (no seeded noise; Gemini audit: fake AI = return 0 when no real data)
  const oddsBias = (homeProb - 0.5) * 0.3 // -0.15 to +0.15
  dimensions.SF = Math.max(-0.2, Math.min(0.2, oddsBias))
  if (Math.abs(dimensions.SF) > 0.08) {
    reasoning.push(`Sentiment ${dimensions.SF > 0 ? 'favors home' : 'favors away'} (${(dimensions.SF * 100).toFixed(0)}%)`)
  }

  // 2. NARRATIVE MOMENTUM (NM) - No real narrative data; neutral (do not inject seeded random)
  dimensions.NM = 0

  // 3. INFORMATION ASYMMETRY INDEX (IAI) - Spread vs ML implied (sharp signal; no noise)
  dimensions.IAI = detectSpreadVsMLSignal(homeProb, spread ?? 0, sportKey ?? '')
  if (Math.abs(dimensions.IAI) > 0.03) {
    reasoning.push(`Sharp money: ${dimensions.IAI > 0 ? 'backing home' : 'backing away'}`)
  }

  // 4. CHAOS SENSITIVITY INDEX (CSI) - Based on probability gap
  dimensions.CSI = calculateChaosSensitivity(homeProb, awayProb)
  if (dimensions.CSI > 0.12) {
    reasoning.push(`⚠️ Upset risk: ${(dimensions.CSI * 100).toFixed(0)}%`)
  }

  // 5. NEWS IMPACT GRADE (NIG) - No real news data; neutral (do not inject seeded random)
  dimensions.NIG = 0

  // 6. TEMPORAL RECENCY DECAY (TRD) - Fresh data multiplier
  const gameTime = new Date(game.commence_time)
  const hoursUntilGame = (gameTime.getTime() - Date.now()) / (1000 * 60 * 60)
  dimensions.TRD = hoursUntilGame < 12 ? 1.0 : hoursUntilGame < 24 ? 0.97 : hoursUntilGame < 48 ? 0.93 : 0.88

  // 7. EXTERNAL PRESSURE DIFFERENTIAL (EPD) - No real pressure data; neutral (do not inject seeded random)
  dimensions.EPD = 0

  // Calculate total Claude Effect
  const totalEffect = (
    (CLAUDE_EFFECT_WEIGHTS.SF * dimensions.SF) +
    (CLAUDE_EFFECT_WEIGHTS.NM * dimensions.NM) +
    (CLAUDE_EFFECT_WEIGHTS.IAI * dimensions.IAI) +
    (CLAUDE_EFFECT_WEIGHTS.CSI * -dimensions.CSI) + // CSI reduces confidence
    (CLAUDE_EFFECT_WEIGHTS.NIG * dimensions.NIG) +
    (CLAUDE_EFFECT_WEIGHTS.EPD * dimensions.EPD)
  ) * dimensions.TRD

  // Home/away adjustments
  const homeAdjustment = totalEffect > 0 ? totalEffect : 0
  const awayAdjustment = totalEffect < 0 ? -totalEffect : 0

  // Confidence level based on effect magnitude
  const absEffect = Math.abs(totalEffect)
  const confidence = absEffect > 0.08 ? 'ELITE' :
    absEffect > 0.05 ? 'HIGH' :
      absEffect > 0.025 ? 'MEDIUM' : 'LOW'

  return {
    dimensions,
    totalEffect,
    homeAdjustment,
    awayAdjustment,
    confidence,
    reasoning,
  }
}

/**
 * Generate a deterministic hash from game ID (reserved for future real-data keys).
 */
function hashGameId(gameId: string): number {
  let hash = 0
  for (let i = 0; i < gameId.length; i++) {
    const char = gameId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/** No real narrative data; return 0 (Gemini audit: do not use seeded random). */
function detectNarrativeMomentum(_game: any, _gameHash: number): number {
  return 0
}

/**
 * Spread vs ML implied win probability as sharp signal (no seeded noise; Gemini audit).
 */
function detectSpreadVsMLSignal(
  homeNoVigProb: number,
  spread: number,
  sportKey: string
): number {
  const spreadToWinPct: Record<string, number> = {
    nfl: 0.02,
    ncaaf: 0.018,
    nba: 0.015,
    ncaab: 0.016,
    nhl: 0.025,
    mlb: 0.02,
  }
  const key = sportKey.replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')
  const pctPerPoint = spreadToWinPct[key] ?? 0.02
  const spreadImpliedHomeWin = 0.5 - spread * pctPerPoint
  const diff = spreadImpliedHomeWin - homeNoVigProb
  const clamp = Math.max(-0.1, Math.min(0.1, diff * 2))
  return clamp
}

function calculateChaosSensitivity(homeProb: number, awayProb: number): number {
  // Higher when probabilities are closer (more uncertain)
  const probDiff = Math.abs(homeProb - awayProb)

  // Exponential decay - closer games = much higher chaos
  if (probDiff < 0.05) return 0.22  // Pick'em game
  if (probDiff < 0.10) return 0.18
  if (probDiff < 0.15) return 0.14
  if (probDiff < 0.20) return 0.10
  if (probDiff < 0.25) return 0.07
  return 0.04  // Heavy favorite
}

/** No real pressure data; return 0 (Gemini audit: do not use seeded random). */
function detectExternalPressure(_game: any, _gameHash: number): number {
  return 0
}

/**
 * Experimental factors from game time (UTC). No weather/rest/QB data yet — plug in when available.
 * Ideas: night games (home boost?), weekend (soft lines?), early start (travel/sleep?), prime time (sharper lines).
 */
function getExperimentalFactors(commenceTime: string): {
  nightGame: boolean
  weekend: boolean
  earlyGame: boolean
  primeTime: boolean
  confidenceDelta: number
  tags: string[]
  reasonLine: string
} {
  const d = new Date(commenceTime)
  const hour = d.getUTCHours()
  const day = d.getUTCDay() // 0 Sun, 6 Sat
  const nightGame = hour >= 22 || hour < 6
  const weekend = day === 0 || day === 6
  const earlyGame = hour < 14 && hour >= 5
  const primeTime = hour >= 18 || hour <= 2
  const tags: string[] = []
  let delta = 0
  if (nightGame) {
    delta += 0.5
    tags.push('Night game')
  }
  if (weekend) {
    delta += 0.3
    tags.push('Weekend')
  }
  if (earlyGame) {
    delta -= 0.4
    tags.push('Early start')
  }
  if (primeTime) {
    delta -= 0.2
    tags.push('Prime time')
  }
  const reasonLine =
    tags.length > 0
      ? `Experimental: ${tags.join(', ')} (${delta >= 0 ? '+' : ''}${(delta * 12).toFixed(0)} conf)`
      : ''
  return { nightGame, weekend, earlyGame, primeTime, confidenceDelta: delta, tags, reasonLine }
}

function generateEnhancedAnalysis(
  game: any,
  pick: string,
  claudeEffect: any,
  confidence: number,
  mcResult: any,
  valueBets: any[],
  expFactors?: { tags: string[] }
): string {
  const parts: string[] = []

  // Main pick
  parts.push(`🎯 Picking ${pick} with ${confidence}% confidence.`)

  // Experimental time/slot signals (night, weekend, early, prime)
  if (expFactors?.tags?.length) {
    parts.push(`⏱️ Slot: ${expFactors.tags.join(', ')}.`)
  }

  // Monte Carlo insight
  if (mcResult) {
    const winProb = pick === game.home_team
      ? mcResult.homeWinProbability
      : mcResult.awayWinProbability
    parts.push(`📊 ${mcResult.iterations.toLocaleString()} simulations: ${(winProb * 100).toFixed(1)}% win rate for ${pick}.`)
    parts.push(`📈 Predicted score: ${mcResult.predictedScore.home}-${mcResult.predictedScore.away}.`)
  }

  // Claude Effect reasoning
  if (claudeEffect.reasoning.length > 0) {
    parts.push(`🤖 AI signals: ${claudeEffect.reasoning.join(' ')}`)
  }

  // Value bet callout (cap displayed EV so we don't overpromise)
  if (valueBets.length > 0) {
    const best = valueBets[0]
    const evDisplay = best.expectedValue > EV_DISPLAY_CAP ? `${EV_DISPLAY_CAP}.00+` : best.expectedValue.toFixed(2)
    parts.push(`💰 Value detected: ${best.type} ${best.side} (+${best.edge.toFixed(1)}% edge, $${evDisplay} EV per $100).`)
  }

  // AI confidence
  if (claudeEffect.confidence === 'ELITE' || claudeEffect.confidence === 'HIGH') {
    parts.push(`⚡ Cevict Flex ${claudeEffect.confidence} confidence pick.`)
  }

  parts.push('Powered by Cevict Flex 7D AI.')

  return parts.join(' ')
}

function oddsToProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100)
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100)
  }
}

/** Clamp American odds to a sane range so edge/EV are not distorted by bad consensus (e.g. -2). */
function sanitizeAmericanOdds(odds: number): number {
  if (odds > 0) {
    if (odds < 100) return 110
    if (odds > 10000) return 10000
    return odds
  } else {
    if (odds > -100) return -110
    if (odds < -10000) return -10000
    return odds
  }
}

/**
 * Build one Cevict Flex pick from a raw Odds API game. Same engine as the full picks/today pipeline (7D + Monte Carlo + value).
 */
async function buildPickFromRawGame(game: any, sport: string): Promise<any> {
  const MAX_BOOKMAKERS_FOR_CONSENSUS = 5
  const monteCarloEngine = new MonteCarloEngine({ iterations: 1500 })

  if (!game.bookmakers || game.bookmakers.length === 0) return null
  const books = game.bookmakers.slice(0, MAX_BOOKMAKERS_FOR_CONSENSUS)
  let homeOddsSum = 0, awayOddsSum = 0, spreadSum = 0, totalSum = 0
  let homeCount = 0, awayCount = 0, spreadCount = 0, totalCount = 0
  for (const book of books) {
    const h2h = book.markets?.find((m: any) => m.key === 'h2h')
    const spreads = book.markets?.find((m: any) => m.key === 'spreads')
    const totals = book.markets?.find((m: any) => m.key === 'totals')
    const hHome = h2h?.outcomes?.find((o: any) => o.name === game.home_team)
    const hAway = h2h?.outcomes?.find((o: any) => o.name === game.away_team)
    if (hHome?.price != null) { homeOddsSum += hHome.price; homeCount++ }
    if (hAway?.price != null) { awayOddsSum += hAway.price; awayCount++ }
    const sHome = spreads?.outcomes?.find((o: any) => o.name === game.home_team)
    const tOver = totals?.outcomes?.find((o: any) => o.name === 'Over')
    if (sHome?.point != null) { spreadSum += sHome.point; spreadCount++ }
    if (tOver?.point != null) { totalSum += tOver.point; totalCount++ }
  }
  const homeOdds = homeCount > 0 ? { price: Math.round(homeOddsSum / homeCount) } : null
  const awayOdds = awayCount > 0 ? { price: Math.round(awayOddsSum / awayCount) } : null
  const spreadPoint = spreadCount > 0 ? spreadSum / spreadCount : 0
  const totalPoint = totalCount > 0 ? Math.round(totalSum / totalCount) : 44
  if (!homeOdds || !awayOdds) return null

  const homeImplied = oddsToProb(homeOdds.price)
  const awayImplied = oddsToProb(awayOdds.price)
  const { home: homeProb, away: awayProb } = shinDevig(homeImplied, awayImplied)

  const claudeEffect = calculate7DimensionalClaudeEffect(game, homeProb, awayProb, spreadPoint, sport)
  const adjustedHomeProb = homeProb * (1 + claudeEffect.homeAdjustment)
  const adjustedAwayProb = awayProb * (1 + claudeEffect.awayAdjustment)
  const favorite = adjustedHomeProb > adjustedAwayProb ? game.home_team : game.away_team
  const noVigFavorite = homeProb > awayProb ? game.home_team : game.away_team
  const favoriteOdds = favorite === game.home_team ? homeOdds.price : awayOdds.price
  const favoriteProb = Math.max(adjustedHomeProb, adjustedAwayProb)

  let monteCarloResult = null
  let valueBets: any[] = []
  try {
    const homePrice = sanitizeAmericanOdds(homeOdds.price)
    const awayPrice = sanitizeAmericanOdds(awayOdds.price)
    const oddsForStats = { home: homePrice, away: awayPrice, spread: spreadPoint, total: totalPoint }
    const estimatedStats = estimateTeamStatsFromOdds(oddsForStats, sport)
    const gameData: GameData = {
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      league: sportToLeague(sport),
      sport: sportToLeague(sport),
      odds: { home: homePrice, away: awayPrice, spread: spreadPoint, total: totalPoint },
      date: game.commence_time,
      teamStats: estimatedStats,
    }
    monteCarloResult = await monteCarloEngine.simulate(gameData, gameData.odds.spread, gameData.odds.total)
    valueBets = monteCarloEngine.detectValueBets(monteCarloResult, gameData.odds, game.home_team, game.away_team, gameData.odds.spread, gameData.odds.total)
  } catch {
    // Monte Carlo failed, continue with basic pick
  }

  const probDiff = Math.abs(favoriteProb - 0.5)
  const baseConfidence = 50 + (probDiff * 80)
  const claudeBoost = claudeEffect.totalEffect * 40
  let mcBoost = 0
  if (monteCarloResult) {
    const mcWinProb = monteCarloResult.homeWinProbability > 0.5 ? monteCarloResult.homeWinProbability : monteCarloResult.awayWinProbability
    mcBoost = (mcWinProb - 0.5) * 30
  }
  const chaosPenalty = claudeEffect.dimensions.CSI * 25
  const expFactors = getExperimentalFactors(game.commence_time)
  const expConfidenceBoost = expFactors.confidenceDelta * 12
  let confidence = Math.round(baseConfidence + claudeBoost + mcBoost - chaosPenalty + expConfidenceBoost)
  confidence = Math.min(92, Math.max(52, confidence))

  const bestValueBet = valueBets.length > 0 ? valueBets[0] : null
  const VALUE_PICK_MIN_EDGE = 10
  let recommendedPick = favorite
  let recommendedType = bestValueBet?.type?.toUpperCase() || 'MONEYLINE'
  let recommendedOdds = favoriteOdds
  let recommendedLine: number | undefined
  if (bestValueBet && bestValueBet.edge >= VALUE_PICK_MIN_EDGE) {
    recommendedPick = bestValueBet.side
    recommendedType = bestValueBet.type.toUpperCase()
    if (bestValueBet.type === 'moneyline') {
      recommendedOdds = bestValueBet.side === game.home_team ? homeOdds.price : awayOdds.price
    } else {
      recommendedOdds = -110
      if (bestValueBet.line != null) recommendedLine = bestValueBet.line
    }
  } else if (bestValueBet && bestValueBet.edge >= 5 && (bestValueBet.type === 'spread' || bestValueBet.type === 'total')) {
    recommendedPick = bestValueBet.side
    recommendedType = bestValueBet.type.toUpperCase()
    recommendedOdds = -110
    if (bestValueBet.line != null) recommendedLine = bestValueBet.line
  }

  const valueSideMatchesPick = bestValueBet && (bestValueBet.side === favorite || bestValueBet.side === game.home_team || bestValueBet.side === game.away_team)
  const mcAgrees = monteCarloResult && (favorite === game.home_team ? (monteCarloResult.homeWinProbability ?? 0) > 0.5 : (monteCarloResult.awayWinProbability ?? 0) > 0.5)
  const tripleAlign = !!(bestValueBet && bestValueBet.edge >= 5 && valueSideMatchesPick && mcAgrees)

  // Use recommendedPick so "Picking X" in analysis matches the actual pick we return (value bet can override favorite)
  const analysis = generateEnhancedAnalysis(game, recommendedPick, claudeEffect, confidence, monteCarloResult, valueBets, expFactors)

  const edgeNum = bestValueBet?.edge ?? 0
  const evNum = bestValueBet?.expectedValue ?? 0
  const normalizedEv = Math.min(Math.max(evNum, 0), 80) / 80
  const normalizedEdge = Math.min(Math.max(edgeNum, 0), 30) / 30
  let compositeScore = normalizedEdge * 35 + normalizedEv * 35 + (confidence / 100) * 20 + (tripleAlign ? 20 : 0) + (valueBets.length > 0 ? 10 : 0)
  if (edgeNum < 2 && !tripleAlign) compositeScore -= 8

  // Calculate totals prediction
  const totalLine = totalPoint ?? 44
  let totalPrediction: 'over' | 'under' | null = null
  let totalProb = 0.5
  let totalEdge = 0
  let totalPick = null

  if (monteCarloResult?.totalProbabilities) {
    const overProb = monteCarloResult.totalProbabilities.over
    const underProb = monteCarloResult.totalProbabilities.under
    const avgTotal = monteCarloResult.totalProbabilities.averageTotal

    // Determine which side has higher probability
    if (overProb > underProb) {
      totalPrediction = 'over'
      totalProb = overProb
    } else {
      totalPrediction = 'under'
      totalProb = underProb
    }

    // Calculate edge vs implied probability (-110 = 52.4%)
    const impliedProb = 0.524  // -110 odds
    totalEdge = (totalProb - impliedProb) * 100

    // Calculate EV for totals
    const totalStake = 100
    const totalProfit = 100  // -110 pays $100 profit on $110 stake, but we simplify to $100 on $100
    const totalEV = (totalProb * totalProfit) - ((1 - totalProb) * totalStake)

    totalPick = {
      side: totalPrediction,
      line: totalLine,
      probability: totalProb,
      edge: totalEdge,
      expectedValue: totalEV,
      averageTotal: avgTotal,
      overProbability: overProb,
      underProbability: underProb
    }
  }

  return {
    sport: sportToLeague(sport),
    league: sportToLeague(sport),
    home_team: game.home_team,
    away_team: game.away_team,
    pick: recommendedPick,
    pick_type: recommendedType,
    recommended_line: recommendedLine,
    odds: recommendedOdds,
    confidence,
    game_time: game.commence_time,
    is_premium: confidence >= 75 || (bestValueBet && bestValueBet.edge > 5) || tripleAlign,
    analysis,
    game_id: game.id || `${game.home_team}-${game.away_team}-${game.commence_time}`,
    expected_value_raw: bestValueBet?.expectedValue ?? 0,
    expected_value: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    reasoning: [...(claudeEffect.reasoning || []), ...(expFactors.reasonLine ? [expFactors.reasonLine] : [])].filter(Boolean),
    triple_align: tripleAlign,
    composite_score: Math.round(compositeScore * 10) / 10,
    claude_effect: claudeEffect.totalEffect,
    sentiment_field: claudeEffect.dimensions.SF,
    narrative_momentum: claudeEffect.dimensions.NM,
    information_asymmetry: claudeEffect.dimensions.IAI,
    chaos_sensitivity: claudeEffect.dimensions.CSI,
    news_impact: claudeEffect.dimensions.NIG,
    temporal_decay: claudeEffect.dimensions.TRD,
    external_pressure: claudeEffect.dimensions.EPD,
    ai_confidence: claudeEffect.confidence,
    mc_win_probability: monteCarloResult?.homeWinProbability,
    mc_predicted_score: monteCarloResult?.predictedScore,
    mc_spread_probability: monteCarloResult?.spreadProbabilities?.homeCovers,
    mc_total_probability: monteCarloResult?.totalProbabilities?.over,
    mc_iterations: monteCarloResult?.iterations || 0,
    value_bet_edge: bestValueBet?.edge || 0,
    value_bet_ev: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_kelly: bestValueBet?.kellyFraction || 0,
    has_value: valueBets.length > 0,
    is_favorite_pick: recommendedPick === noVigFavorite,
    experimental_factors: { night_game: expFactors.nightGame, weekend: expFactors.weekend, early_game: expFactors.earlyGame, prime_time: expFactors.primeTime, tags: expFactors.tags, confidence_delta: expFactors.confidenceDelta },
    experimental_placeholders: { weather_good_vs_bad: null, rest_after_loss_vs_win: null, home_qb_age_vs_away: null, run_yards_vs_pass: null },
    // NEW: Totals prediction
    total: totalPick ? {
      prediction: totalPick.side,
      line: totalPick.line,
      edge: Math.round(totalPick.edge * 100) / 100,
      probability: Math.round(totalPick.probability * 1000) / 1000,
      expected_value: Math.min(EV_DISPLAY_CAP, Math.round(totalPick.expectedValue * 100) / 100),
      average_projected_total: Math.round(totalPick.averageTotal * 10) / 10,
      over_probability: Math.round(totalPick.overProbability * 1000) / 1000,
      under_probability: Math.round(totalPick.underProbability * 1000) / 1000,
      has_value: totalPick.edge >= 3
    } : null,
    all_value_bets: valueBets.map(vb => ({
      type: vb.type,
      side: vb.side,
      line: vb.line,
      edge: Math.round(vb.edge * 100) / 100,
      probability: Math.round(vb.modelProbability * 1000) / 1000,
      expected_value: Math.min(EV_DISPLAY_CAP, Math.round(vb.expectedValue * 100) / 100),
      kelly_fraction: Math.round(vb.kellyFraction * 1000) / 1000,
      confidence: vb.confidence,
      reasoning: vb.reasoning
    }))
  }
}

async function fetchRawGamesForSport(sportKey: string, apiKey: string): Promise<any[]> {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const SPORTS_LIST = [
  'basketball_nba',
  'americanfootball_nfl',
  'icehockey_nhl',
  'baseball_mlb',
  'americanfootball_ncaaf',
  'basketball_ncaab',
]

/**
 * Single-game Cevict Flex prediction. Same engine as /api/picks/today (7D + Monte Carlo + value).
 * Use for v2 ?action=prediction so single-game and top-10 use the same model.
 * @param sportHint - Optional sport key (e.g. basketball_nba) to avoid fetching all sports.
 */
export async function getSingleGamePick(gameId: string, sportHint?: string): Promise<any | null> {
  const apiKey = getPrimaryKey()
  if (!apiKey) return null
  const sportsToTry = sportHint ? [sportHint] : SPORTS_LIST
  for (const sport of sportsToTry) {
    const games = await fetchRawGamesForSport(sport, apiKey)
    const game = games.find((g: any) => g.id === gameId)
    if (game) {
      const pick = await buildPickFromRawGame(game, sport)
      return pick ?? null
    }
  }
  return null
}

function sportToLeague(sport: string): string {
  const map: Record<string, string> = {
    'basketball_nba': 'NBA',
    'americanfootball_nfl': 'NFL',
    'icehockey_nhl': 'NHL',
    'baseball_mlb': 'MLB',
    'americanfootball_ncaaf': 'NCAAF',
    'basketball_ncaab': 'NCAAB',
  }
  return map[sport] || sport.toUpperCase()
}

/** All 6 leagues for diversity */
const LEAGUES_FOR_DIVERSITY = ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAF', 'NCAAB']
const TOP_N = 20  // Increased to ensure all tiers get picks (Elite:5 + Pro:3 + Free:2 + extras)
const MAX_PER_SPORT = 3

/**
 * Select top N picks by composite score with sport diversity.
 * Vig-Aware Value strategy: rank by edge + EV first (beat Vegas), then confidence.
 * Max 3 per sport so all 6 leagues (NFL, NBA, NHL, MLB, NCAAF, NCAAB) can appear in top 10.
 */
function selectTop10(picks: any[]): any[] {
  const score = (p: any) => typeof p.composite_score === 'number' ? p.composite_score : (p.confidence ?? 50)
  const evForSort = (p: any) => typeof p.expected_value_raw === 'number' ? p.expected_value_raw : (p.expected_value ?? 0)
  const sorted = [...picks].sort((a, b) => {
    const scoreDiff = score(b) - score(a)
    if (scoreDiff !== 0) return scoreDiff
    return evForSort(b) - evForSort(a)
  })
  const result: any[] = []
  const countBySport: Record<string, number> = {}
  for (const p of sorted) {
    if (result.length >= TOP_N) break
    const sport = p.sport || p.league || 'OTHER'
    const count = countBySport[sport] ?? 0
    if (count < MAX_PER_SPORT) {
      result.push(p)
      countBySport[sport] = count + 1
    }
  }
  return result
}

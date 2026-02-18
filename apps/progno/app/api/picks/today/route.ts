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
import { OddsService } from '../../../../lib/odds-service'
import { fetchApiSportsOdds, ApiSportsGame } from '../../../../lib/api-sports-client'
import { SPORT_VARIANCE, applySportVariance, getCalibratedWinProbability } from '../../../lib/model-calibration'
import { calculateTrueEdge, getStadiumElevation, TRUE_EDGE_ENGINE } from '../../../lib/true-edge-engine'
import { BettingSplitsMonitor } from '../../../lib/betting-splits-monitor'
import { LineMovementTracker } from '../../../lib/line-movement-tracker'
import { InjuryImpactAnalyzer } from '../../../lib/injury-impact-analyzer'
import { WeatherImpactAnalysisService } from '../../../lib/weather-impact-service'
import { ArbitrageDetector, ArbitrageOpportunity } from '../../../lib/arbitrage-detector'
import { LiveBettingMonitor } from '../../../lib/live-betting-monitor'
import { ParlayBuilder } from '../../../lib/parlay-builder'
import { BankrollManagementService } from '../../../lib/bankroll-management-service'
import { ElitePicksEnhancer } from '../../../lib/elite-picks-enhancer'
import { TEASER_CALCULATOR } from '../../../lib/teaser-calculator'

// Initialize trackers (persist across requests)
const lineMovementTracker = new LineMovementTracker()
const liveBettingMonitor = new LiveBettingMonitor()
const bankrollManager = new BankrollManagementService(10000)
const elitePicksEnhancer = new ElitePicksEnhancer()
const parlayBuilder = new ParlayBuilder()

const API_SPORTS_KEY = process.env.API_SPORTS_KEY

const SPORT_TO_API_SPORTS: Record<string, string> = {
  'basketball_ncaab': 'ncaab',
  'baseball_mlb': 'mlb',
  'basketball_nba': 'nba',
  'americanfootball_nfl': 'nfl',
  'icehockey_nhl': 'nhl',
  'americanfootball_ncaaf': 'ncaaf',
  'baseball_ncaa': 'cbb',  // College Baseball
  // Also accept short form (UI sends these)
  'ncaab': 'ncaab',
  'mlb': 'mlb',
  'nba': 'nba',
  'nfl': 'nfl',
  'nhl': 'nhl',
  'ncaaf': 'ncaaf',
  'cbb': 'cbb',  // College Baseball short form
}

/**
 * Convert API-Sports game to The-Odds format for buildPickFromRawGame
 */
function convertApiSportsToOddsFormat(game: ApiSportsGame): any {
  // Create bookmakers structure from API-Sports odds
  const bookmakers = []

  if (game.odds.moneyline.home || game.odds.moneyline.away) {
    const outcomes = []
    if (game.odds.moneyline.home) {
      outcomes.push({ name: game.homeTeam, price: game.odds.moneyline.home })
    }
    if (game.odds.moneyline.away) {
      outcomes.push({ name: game.awayTeam, price: game.odds.moneyline.away })
    }
    bookmakers.push({
      key: 'api-sports',
      title: 'API-Sports',
      markets: [{ key: 'h2h', outcomes }]
    })
  }

  if (game.odds.spread.home || game.odds.spread.away) {
    const spreadOutcomes = []
    if (game.odds.spread.home) {
      spreadOutcomes.push({ name: game.homeTeam, point: game.odds.spread.home, price: -110 })
    }
    if (game.odds.spread.away) {
      spreadOutcomes.push({ name: game.awayTeam, point: game.odds.spread.away, price: -110 })
    }
    if (bookmakers.length > 0) {
      bookmakers[0].markets.push({ key: 'spreads', outcomes: spreadOutcomes })
    } else {
      bookmakers.push({
        key: 'api-sports',
        title: 'API-Sports',
        markets: [{ key: 'spreads', outcomes: spreadOutcomes }]
      })
    }
  }

  if (game.odds.total.line) {
    const totalOutcomes = [
      { name: 'Over', point: game.odds.total.line, price: game.odds.total.over || -110 },
      { name: 'Under', point: game.odds.total.line, price: game.odds.total.under || -110 }
    ]
    if (bookmakers.length > 0) {
      bookmakers[0].markets.push({ key: 'totals', outcomes: totalOutcomes })
    } else {
      bookmakers.push({
        key: 'api-sports',
        title: 'API-Sports',
        markets: [{ key: 'totals', outcomes: totalOutcomes }]
      })
    }
  }

  return {
    id: game.id.toString(),
    sport_key: SPORT_TO_API_SPORTS[game.sport] || game.sport,
    home_team: game.homeTeam,
    away_team: game.awayTeam,
    commence_time: game.startTime,
    bookmakers: bookmakers.length > 0 ? bookmakers : undefined,
  }
}

/** Cap displayed EV per $100 so copy stays realistic (avoid "win $500 per $100" claims). */
const EV_DISPLAY_CAP = 150
/** Regular picks: today + next day (0–1 days ahead). */
const REGULAR_MAX_DAYS_AHEAD = 1
/** Early lines: 3–5 days ahead (so you can compare when those games hit regular window). */
const EARLY_LINES_MIN_DAYS = 3
const EARLY_LINES_MAX_DAYS = 5
export const dynamic = 'force-dynamic'
export const revalidate = 0

const FILTER_STRATEGY = (process.env.FILTER_STRATEGY || 'best') as 'baseline' | 'best' | 'balanced'

const ODDS_FILTER: Record<string, { minOdds: number; maxOdds: number; minConfidence: number }> = {
  baseline: { minOdds: -10000, maxOdds: 10000, minConfidence: 0 },
  best: { minOdds: -130, maxOdds: 200, minConfidence: 80 },
  balanced: { minOdds: -150, maxOdds: 150, minConfidence: 75 },
}

const HOME_ONLY_MODE = process.env.HOME_ONLY_MODE === '1' || process.env.HOME_ONLY_MODE === 'true'

const HOME_BIAS_BOOST = 5
const AWAY_BIAS_PENALTY = 5

const LEAGUE_STAKE_MULTIPLIER: Record<string, number> = {
  ncaaf: 0.5,
  ncaab: 0.75,
  cbb: 0.75,
  nba: 1.0,
  nfl: 1.0,
  nhl: 1.0,
  mlb: 1.0,
}

const LEAGUE_CONFIDENCE_FLOOR: Record<string, number> = {
  ncaaf: 80,
  ncaab: 75,
  cbb: 75,
  nba: 70,
  nfl: 75,
  nhl: 70,
  mlb: 70,
}

const SPORT_SEASONS: Record<string, { start: number; end: number }> = {
  'basketball_nba':        { start: 10, end: 6 },   // Oct–Jun
  'americanfootball_nfl':  { start: 9,  end: 2 },   // Sep–Feb
  'icehockey_nhl':         { start: 10, end: 6 },   // Oct–Jun
  'baseball_mlb':          { start: 3,  end: 10 },  // Mar–Oct
  'americanfootball_ncaaf':{ start: 8,  end: 1 },   // Aug–Jan
  'basketball_ncaab':      { start: 11, end: 4 },   // Nov–Apr
  'baseball_ncaa':         { start: 2,  end: 6 },   // Feb–Jun
}

function isSportInSeason(sportKey: string): boolean {
  const season = SPORT_SEASONS[sportKey]
  if (!season) return true
  const month = new Date().getMonth() + 1
  if (season.start <= season.end) {
    return month >= season.start && month <= season.end
  }
  return month >= season.start || month <= season.end
}

const STREAK_TRACKER = { wins: 0, losses: 0 }

function getStreakMultiplier(): number {
  if (STREAK_TRACKER.wins >= 5) return 1.25
  if (STREAK_TRACKER.wins >= 3) return 1.1
  if (STREAK_TRACKER.losses >= 5) return 0.5
  if (STREAK_TRACKER.losses >= 3) return 0.75
  return 1.0
}

function updateStreak(won: boolean) {
  if (won) {
    STREAK_TRACKER.wins++
    STREAK_TRACKER.losses = 0
  } else {
    STREAK_TRACKER.losses++
    STREAK_TRACKER.wins = 0
  }
}

function getEarlyLineDecay(commenceTime: string): number {
  const gameDate = new Date(commenceTime)
  const now = new Date()
  const daysAhead = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysAhead <= 1) return 1.0
  if (daysAhead <= 2) return 0.97
  if (daysAhead <= 3) return 0.93
  if (daysAhead <= 4) return 0.88
  if (daysAhead <= 5) return 0.82
  return 0.75
}

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

    // All 7 sports (NFL, NBA, NHL, MLB, NCAAF, NCAAB, CBB = College Baseball)
    const sports = [
      'basketball_nba',
      'americanfootball_nfl',
      'icehockey_nhl',
      'baseball_mlb',
      'americanfootball_ncaaf',
      'basketball_ncaab',
      'baseball_ncaa',  // College Baseball (CBB)
    ]

    const allPicks: any[] = []

    for (const sport of sports) {
      if (!isSportInSeason(sport)) {
        console.log(`[Season] Skipping ${sport} — out of season (month ${new Date().getMonth() + 1})`)
        continue
      }
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        )

        if (!response.ok) continue

        const games = await response.json()
        if (!Array.isArray(games)) continue

        // Check odds freshness and write to Supabase if stale
        if (supabase && games.length > 0) {
          await checkAndStoreOdds(games, sport)
        }

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
  trueEdgeResult: any,
  confidence: number,
  mcResult: any,
  valueBets: any[]
): string {
  const parts: string[] = []

  // Main pick
  parts.push(`🎯 Picking ${pick} with ${confidence}% confidence.`)

  // True Edge signals (altitude, market, momentum)
  if (trueEdgeResult?.reasoning?.length) {
    parts.push(`🎲 Edge factors: ${trueEdgeResult.reasoning.join('; ')}.`)
  }

  // Monte Carlo insight
  if (mcResult) {
    const winProb = pick === game.home_team
      ? mcResult.homeWinProbability
      : mcResult.awayWinProbability
    parts.push(`📊 ${mcResult.iterations.toLocaleString()} simulations: ${(winProb * 100).toFixed(1)}% win rate for ${pick}.`)
    parts.push(`📈 Predicted score: ${mcResult.predictedScore.home}-${mcResult.predictedScore.away}.`)
  }

  // True Edge reasoning
  if (trueEdgeResult?.reasoning?.length > 0) {
    parts.push(`🤖 AI signals: ${trueEdgeResult.reasoning.join(' ')}`)
  }

  // Value bet callout (cap displayed EV so we don't overpromise)
  if (valueBets.length > 0) {
    const best = valueBets[0]
    const evDisplay = best.expectedValue > EV_DISPLAY_CAP ? `${EV_DISPLAY_CAP}.00+` : best.expectedValue.toFixed(2)
    parts.push(`💰 Value detected: ${best.type} ${best.side} (+${best.edge.toFixed(1)}% edge, $${evDisplay} EV per $100).`)
  }

  // True Edge strength indicator
  if (trueEdgeResult?.strength === 'strong') {
    parts.push(`⚡ Strong edge detected (${trueEdgeResult.primaryFactor})`)
  }

  parts.push('Powered by Cevict True Edge Engine.')

  return parts.join(' ')
}

function oddsToProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100)
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100)
  }
}

/** Calculate recommended stake using Kelly Criterion with per-league caps */
function calculateStake(odds: number, kellyFraction: number, confidence: number, sport?: string): number {
  const impliedProb = oddsToProb(odds)
  const modelProb = confidence / 100
  const edge = modelProb - impliedProb

  if (edge <= 0) return 0

  const kelly = edge / (1 - impliedProb)
  const baseStake = Math.min(Math.max(kelly * 0.25 * 100, 10), 50)

  const leagueKey = sport?.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '') || ''
  const leagueMultiplier = LEAGUE_STAKE_MULTIPLIER[leagueKey] ?? 1.0
  const streakMultiplier = getStreakMultiplier()
  return Math.round(baseStake * leagueMultiplier * streakMultiplier * 100) / 100
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
  const monteCarloEngine = new MonteCarloEngine({ iterations: 5000 })

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

  const activeFilter = ODDS_FILTER[FILTER_STRATEGY] || ODDS_FILTER.balanced
  const minFavOdds = Math.min(homeOdds.price, awayOdds.price)
  if (minFavOdds < activeFilter.minOdds || Math.max(homeOdds.price, awayOdds.price) > activeFilter.maxOdds) {
    console.log(`[Odds Filter] Skipping ${game.home_team} vs ${game.away_team}: odds [${homeOdds.price}, ${awayOdds.price}] outside [${activeFilter.minOdds}, ${activeFilter.maxOdds}] (strategy: ${FILTER_STRATEGY})`)
    return null
  }

  const homeImplied = oddsToProb(homeOdds.price)
  const awayImplied = oddsToProb(awayOdds.price)
  const { home: homeProb, away: awayProb } = shinDevig(homeImplied, awayImplied)

  const claudeEffect = calculate7DimensionalClaudeEffect(game, homeProb, awayProb, spreadPoint, sport)
  const adjustedHomeProb = homeProb * (1 + claudeEffect.homeAdjustment)
  const adjustedAwayProb = awayProb * (1 + claudeEffect.awayAdjustment)
  const favorite = adjustedHomeProb > adjustedAwayProb ? game.home_team : game.away_team

  if (HOME_ONLY_MODE && favorite !== game.home_team) {
    console.log(`[Home Only] Skipping ${game.home_team} vs ${game.away_team}: away pick filtered (HOME_ONLY_MODE)`)
    return null
  }

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

  // Record line snapshot for movement tracking
  const gameId = game.id || `${game.home_team}-${game.away_team}-${game.commence_time}`
  lineMovementTracker.recordLine(
    gameId,
    sport,
    game.home_team,
    game.away_team,
    {
      timestamp: new Date().toISOString(),
      moneyline: { home: homeOdds.price, away: awayOdds.price },
      spread: spreadPoint ? { line: spreadPoint, home: 0, away: 0 } : undefined,
      total: totalPoint ? { line: totalPoint, over: 0, under: 0 } : undefined,
      source: 'api-sports'
    }
  )

  // Check for steam moves (rapid line shifts)
  const lineMovement = lineMovementTracker.getLineMovement(gameId, sport, game.home_team, game.away_team, 'moneyline')
  const lineVelocity = lineMovement ? Math.abs(lineMovement.movement) / 15 : 0 // Points per 15 min
  const hasSteamMove = lineMovement?.steamMove || false

  // Calculate True Edge factors (replaces old Claude Effect)
  const homeElevation = getStadiumElevation(game.home_team)
  const awayElevation = getStadiumElevation(game.away_team)
  const altitudeDiff = homeElevation - awayElevation

  // Detect reverse line movement (public vs sharp divergence)
  const consensusHomeOdds = homeOdds.price
  const consensusAwayOdds = awayOdds.price
  const noVigHome = homeProb
  const publicPercentage = (consensusHomeOdds < consensusAwayOdds) ? 0.65 : 0.35
  const isReverseLineMovement = (publicPercentage > 0.6 && noVigHome < 0.5) || (publicPercentage < 0.4 && noVigHome > 0.5)

  // Fetch betting splits data (public vs sharp money)
  let bettingSplitsData = null
  if (process.env.SCRAPINGBEE_API_KEY) {
    try {
      const splitsMonitor = new BettingSplitsMonitor(process.env.SCRAPINGBEE_API_KEY)
      const splits = await splitsMonitor.fetchGameSplits(
        game.id || `${game.home_team}-${game.away_team}`,
        sport,
        game.home_team,
        game.away_team
      )
      if (splits) {
        bettingSplitsData = {
          publicPercentage: splits.publicPercentage,
          sharpPercentage: splits.sharpPercentage,
          lineMovement: splits.lineMovement
        }
      }
    } catch {
      // Betting splits optional - continue without
    }
  }

  // Fetch injury impact data using CevictScraper
  let homeTeamInjuries = null
  let awayTeamInjuries = null
  try {
    console.log(`[Injury] Analyzing injuries for ${game.home_team} vs ${game.away_team} (${sport})`)
    const cevictScraperUrl = process.env.CEVICT_SCRAPER_URL || 'http://localhost:3009'
    console.log(`[Injury] Using CevictScraper at: ${cevictScraperUrl}`)
    const injuryAnalyzer = new InjuryImpactAnalyzer(cevictScraperUrl)
    const injuryImpact = await injuryAnalyzer.analyzeGameInjuries(
      sport,
      game.home_team,
      game.away_team
    )
    console.log(`[Injury] Analysis result:`, injuryImpact?.reasoning?.length || 0, 'reasoning items')
    if (injuryImpact) {
      // Extract critical injuries from reasoning
      const criticalHome = injuryImpact.reasoning
        .filter(r => r.includes(game.home_team) && r.includes('critical'))
        .map(r => {
          const match = r.match(/\(([^)]+)\)/)
          return match ? { player: match[1], position: 'unknown', impact: 'critical' as const } : null
        }).filter(Boolean)

      const criticalAway = injuryImpact.reasoning
        .filter(r => r.includes(game.away_team) && r.includes('critical'))
        .map(r => {
          const match = r.match(/\(([^)]+)\)/)
          return match ? { player: match[1], position: 'unknown', impact: 'critical' as const } : null
        }).filter(Boolean)

      homeTeamInjuries = criticalHome.length > 0 ? criticalHome : null
      awayTeamInjuries = criticalAway.length > 0 ? criticalAway : null
      console.log(`[Injury] Found: ${homeTeamInjuries?.length || 0} home, ${awayTeamInjuries?.length || 0} away critical injuries`)
    }
  } catch (err: any) {
    console.error(`[Injury] ERROR analyzing injuries:`, err.message || err)
    // Injury data optional - continue without
  }

  // Fetch weather data for outdoor sports
  let weatherConditions = null
  const isOutdoorSport = !['dome', 'indoor'].some(t => (game.venue || '').toLowerCase().includes(t))
  const outdoorSports = ['nfl', 'mlb', 'ncaaf']

  if (outdoorSports.includes(sport.toLowerCase()) && isOutdoorSport && process.env.OPENWEATHER_API_KEY) {
    try {
      console.log(`[Weather] Fetching for ${game.home_team} vs ${game.away_team} (${sport})`)

      // Map team to city for weather lookup
      const teamToCity = getTeamCity(sport, game.home_team)
      console.log(`[Weather] Looking up city: ${teamToCity}`)

      if (teamToCity) {
        const weatherData = await fetchWeatherFromOpenWeather(teamToCity)
        console.log(`[Weather] API response:`, weatherData ? 'SUCCESS' : 'FAILED')

        if (weatherData) {
          const weatherService = new WeatherImpactAnalysisService()
          const weather = await weatherService.analyzeNFL(
            weatherData,
            game.home_team,
            game.away_team
          )
          if (weather) {
            weatherConditions = {
              temperature: weatherData.temperature,
              windSpeed: weatherData.windSpeed,
              precipitation: weatherData.precipitation,
              condition: weatherData.condition
            }
            console.log(`[Weather] Conditions: ${weatherData.temperature}°F, ${weatherData.windSpeed}mph wind, ${weatherData.condition}`)
            if (weather.reasoning.length > 0) {
              console.log(`[Weather] Impact:`, weather.reasoning.join('; '))
            }
          }
        }
      } else {
        console.log(`[Weather] No city mapping found for ${game.home_team}`)
      }
    } catch (err: any) {
      console.error(`[Weather] ERROR fetching weather:`, err.message || err)
    }
  } else {
    if (!outdoorSports.includes(sport.toLowerCase())) {
      console.log(`[Weather] Skipping - ${sport} is not an outdoor sport`)
    } else if (!isOutdoorSport) {
      console.log(`[Weather] Skipping - indoor/dome venue detected`)
    } else if (!process.env.OPENWEATHER_API_KEY) {
      console.log(`[Weather] Skipping - no OPENWEATHER_API_KEY`)
    }
  }

  // Calculate True Edge
  const trueEdgeResult = calculateTrueEdge(
    {
      // Rest data (placeholder - would come from schedule API)
      restAdvantage: 0, // Would calculate from game dates

      // Market inefficiency
      publicMoneyPercentage: publicPercentage,
      reverseLineMovement: isReverseLineMovement || hasSteamMove,
      lineMovementVelocity: lineVelocity,

      // Betting splits (public fade opportunity)
      bettingSplits: bettingSplitsData || undefined,

      // Stadium environmental
      altitudeDifference: altitudeDiff,
      isIndoor: ['dome', 'indoor'].some(t => (game.venue || '').toLowerCase().includes(t)),
      homeFieldIntensity: 0.6, // Default, elite venues would be 0.8+

      // Injury impact
      homeTeamInjuries: homeTeamInjuries || undefined,
      awayTeamInjuries: awayTeamInjuries || undefined,

      // Weather conditions (for outdoor sports)
      weatherConditions: weatherConditions || undefined,

      // Cluster analysis (placeholder)
      teamVariance: 0.4, // Would calculate from historical variance
    },
    favoriteProb,
    sport
  )

  // CONFIDENCE FORMULA v3: MC-anchored with True Edge and home bias
  // The MC win probability is the strongest signal — use it as the anchor
  const probDiff = Math.abs(favoriteProb - 0.5)
  const marketBaseConf = 50 + (probDiff * 80)

  let mcAnchoredConf = marketBaseConf
  if (monteCarloResult) {
    const isFavoriteHome = favorite === game.home_team
    const mcWinProb = isFavoriteHome
      ? monteCarloResult.homeWinProbability
      : monteCarloResult.awayWinProbability
    // Anchor confidence to MC probability (stronger signal than market-only base)
    mcAnchoredConf = Math.max(marketBaseConf, mcWinProb * 100 - 5)
  }

  // True Edge contribution (max ±12% swing)
  const trueEdgeBoost = trueEdgeResult.totalEdge * 80

  // Chaos penalty from True Edge
  const chaosPenalty = (1 - trueEdgeResult.confidence) * 10

  let confidence = Math.round(mcAnchoredConf + trueEdgeBoost - chaosPenalty)

  // Home/away bias from backtest: home picks +67.3% ROI vs away -19.4% ROI
  const isHomePick = favorite === game.home_team
  if (isHomePick) {
    confidence += HOME_BIAS_BOOST
  } else {
    confidence -= AWAY_BIAS_PENALTY
  }

  // Early-line confidence decay: reduce confidence for games far in the future
  const earlyDecay = getEarlyLineDecay(game.commence_time)
  if (earlyDecay < 1.0) {
    const before = confidence
    confidence = Math.round(confidence * earlyDecay)
    console.log(`[Early Decay] ${game.home_team} vs ${game.away_team}: ${before}% → ${confidence}% (decay ${earlyDecay})`)
  }

  // Hard ceiling: MC probability + 8% (relaxed from +3 to allow True Edge to matter)
  const mcCeiling = monteCarloResult
    ? Math.round((favorite === game.home_team
      ? monteCarloResult.homeWinProbability
      : monteCarloResult.awayWinProbability) * 100 + 8)
    : 95
  confidence = Math.min(confidence, mcCeiling)
  confidence = Math.max(30, Math.min(95, confidence))

  // Filter strategy confidence floor
  if (confidence < activeFilter.minConfidence) {
    console.log(`[Filter] Skipping ${game.home_team} vs ${game.away_team}: confidence ${confidence}% below ${activeFilter.minConfidence}% minimum (strategy: ${FILTER_STRATEGY})`)
    return null
  }

  // Per-league confidence floor (stricter than strategy floor for volatile leagues)
  const leagueKey = sport.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')
  const leagueConfFloor = LEAGUE_CONFIDENCE_FLOOR[leagueKey] ?? 70
  if (confidence < leagueConfFloor) {
    console.log(`[League Filter] Skipping ${game.home_team} vs ${game.away_team}: confidence ${confidence}% below ${leagueKey} floor of ${leagueConfFloor}%`)
    return null
  }

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

  // Post-selection odds filter: catch value bets that exceed strategy limits
  if (recommendedOdds > activeFilter.maxOdds || recommendedOdds < activeFilter.minOdds) {
    console.log(`[Rec Pick Filter] Skipping ${game.home_team} vs ${game.away_team}: recommended odds ${recommendedOdds} outside [${activeFilter.minOdds}, ${activeFilter.maxOdds}] (strategy: ${FILTER_STRATEGY})`)
    return null
  }

  const valueSideMatchesPick = bestValueBet && (bestValueBet.side === favorite || bestValueBet.side === game.home_team || bestValueBet.side === game.away_team)
  // mcAgrees should check if MC agrees with the RECOMMENDED pick (not just the favorite)
  const mcAgrees = monteCarloResult && (recommendedPick === game.home_team
    ? (monteCarloResult.homeWinProbability ?? 0) > 0.5
    : (monteCarloResult.awayWinProbability ?? 0) > 0.5)
  const tripleAlign = !!(bestValueBet && bestValueBet.edge >= 5 && valueSideMatchesPick && mcAgrees)

  // Use True Edge for analysis instead of old Claude Effect
  const analysis = generateEnhancedAnalysis(game, recommendedPick, trueEdgeResult, confidence, monteCarloResult, valueBets)

  const edgeNum = bestValueBet?.edge ?? 0
  const evNum = bestValueBet?.expectedValue ?? 0
  const normalizedEv = Math.min(Math.max(evNum, 0), 80) / 80
  const normalizedEdge = Math.min(Math.max(edgeNum, 0), 30) / 30
  let compositeScore = normalizedEdge * 40 + normalizedEv * 40 + (confidence / 100) * 20
  // REMOVED: tripleAlign bonus (20 pts) and hasValue bonus (10 pts) - not statistically validated
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

  // NEW: Service integrations - initialize variables
  let arbitrageOpportunity = null
  let parlaySuggestions = null
  let optimalStake = calculateStake(recommendedOdds, bestValueBet?.kellyFraction || 0, confidence, sport)
  let eliteEnhancement = null

  // Check for arbitrage opportunities
  try {
    const arbs = await ArbitrageDetector.findOpportunities({ sport, minProfit: 0.5 })
    const gameArb = arbs.find(a => a.gameId === gameId)
    if (gameArb) {
      arbitrageOpportunity = {
        profitPercent: gameArb.profitPercentage,
        stakeHome: gameArb.stakeHome,
        stakeAway: gameArb.stakeAway,
        bookHome: gameArb.side1.sportsbook,
        bookAway: gameArb.side2.sportsbook
      }
    }
  } catch {
    // Arbitrage optional
  }

  // Build parlay suggestions
  if (bestValueBet && confidence >= 60) {
    try {
      const parlayLegs = parlayBuilder.findCorrelatedLegs(
        [{ gameId, pick: recommendedPick, confidence, edge: bestValueBet.edge }],
        []
      )
      if (parlayLegs && parlayLegs.length > 0) {
        parlaySuggestions = parlayLegs
      }
    } catch {
      // Parlay optional
    }
  }

  // Elite picks enhancement
  if (confidence >= 75) {
    try {
      eliteEnhancement = elitePicksEnhancer.enhance({
        pick: recommendedPick,
        confidence,
        trueEdge: trueEdgeResult
      })
    } catch {
      // Elite enhancement optional
    }
  }

  // Calculate bankroll-adjusted stake
  const bankrollStake = bankrollManager.calculateStake(
    confidence,
    bestValueBet?.edge || 0,
    bestValueBet?.kellyFraction || 0.25,
    sport
  )
  optimalStake = Math.max(optimalStake, bankrollStake)

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
    reasoning: (() => {
      const factors = [...(trueEdgeResult.reasoning || [])].filter(Boolean);
      if (monteCarloResult) {
        const mcWin = recommendedPick === game.home_team
          ? monteCarloResult.homeWinProbability
          : monteCarloResult.awayWinProbability;
        factors.push(`MC simulation: ${(mcWin * 100).toFixed(1)}% win probability (${monteCarloResult.iterations.toLocaleString()} iterations)`);
      }
      if (spreadPoint && spreadPoint !== 0) {
        const favTeam = spreadPoint < 0 ? game.home_team : game.away_team;
        factors.push(`Spread: ${favTeam} favored by ${Math.abs(spreadPoint)}`);
      }
      if (bestValueBet && bestValueBet.edge >= 5) {
        factors.push(`Value bet: ${bestValueBet.type} ${bestValueBet.side} (+${bestValueBet.edge.toFixed(1)}% edge)`);
      }
      if (isHomePick) {
        factors.push('Home-team pick (historically +67% ROI)');
      }
      return factors;
    })(),
    triple_align: tripleAlign,
    composite_score: Math.round(compositeScore * 10) / 10,
    claude_effect: trueEdgeResult.totalEdge,
    sentiment_field: 0,  // Disabled - replaced with True Edge
    narrative_momentum: 0,  // Disabled - replaced with True Edge
    information_asymmetry: trueEdgeResult.primaryFactor === 'market' ? trueEdgeResult.totalEdge : 0,
    chaos_sensitivity: 1 - trueEdgeResult.confidence,  // Higher uncertainty = more chaos
    news_impact: 0,  // Disabled
    temporal_decay: 1,  // No decay in True Edge
    external_pressure: 0,  // Disabled
    // Return MC probability for the RECOMMENDED pick, not just home team
    mc_win_probability: monteCarloResult
      ? (recommendedPick === game.home_team
        ? monteCarloResult.homeWinProbability
        : monteCarloResult.awayWinProbability)
      : undefined,
    mc_predicted_score: monteCarloResult?.predictedScore,
    mc_spread_probability: monteCarloResult?.spreadProbabilities?.homeCovers,
    mc_total_probability: monteCarloResult?.totalProbabilities?.over,
    mc_iterations: monteCarloResult?.iterations || 0,
    value_bet_edge: bestValueBet?.edge || 0,
    value_bet_ev: Math.min(EV_DISPLAY_CAP, Math.round((bestValueBet?.expectedValue ?? 0) * 100) / 100),
    value_bet_kelly: bestValueBet?.kellyFraction || 0,
    has_value: valueBets.length > 0,
    is_favorite_pick: recommendedPick === noVigFavorite,
    is_home_pick: isHomePick,
    filter_strategy: FILTER_STRATEGY,
    home_only_mode: HOME_ONLY_MODE,
    league_stake_multiplier: LEAGUE_STAKE_MULTIPLIER[sport.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')] ?? 1.0,
    league_confidence_floor: leagueConfFloor,
    early_line_decay: earlyDecay,
    streak_multiplier: getStreakMultiplier(),
    // SPORT-SPECIFIC VARIANCE: Higher variance sports (NCAAB) get lower stakes
    sport_variance_multiplier: SPORT_VARIANCE[sport.toUpperCase()] ?? 1.0,
    calibrated_stake: applySportVariance(
      calculateStake(recommendedOdds, bestValueBet?.kellyFraction || 0, confidence, sport),
      sport
    ),
    experimental_factors: {
      true_edge_primary: trueEdgeResult.primaryFactor,
      true_edge_strength: trueEdgeResult.strength,
      altitude_difference: altitudeDiff,
      reverse_line_movement: isReverseLineMovement
    },
    experimental_placeholders: { weather_good_vs_bad: null, rest_after_loss_vs_win: null, home_qb_age_vs_away: null, run_yards_vs_pass: null },
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
    })),
    // NEW: Service integrations
    arbitrage_opportunity: arbitrageOpportunity,
    parlay_suggestions: parlaySuggestions,
    optimal_stake: optimalStake,
    bankroll_units: optimalStake / 100,
    live_monitoring_available: true,
    elite_enhancement: eliteEnhancement
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
  console.log(`[getSingleGamePick] Searching for game: ${gameId}, sportHint: ${sportHint}`)

  // Try The-Odds API first
  const apiKey = getPrimaryKey()
  if (apiKey) {
    const sportsToTry = sportHint ? [sportHint] : SPORTS_LIST
    for (const sport of sportsToTry) {
      const games = await fetchRawGamesForSport(sport, apiKey)
      const apiGame = games.find((g: any) => g.id === gameId)
      if (apiGame) {
        console.log(`[getSingleGamePick] Game found in The-Odds ${sport}:`, apiGame.home_team, 'vs', apiGame.away_team)
        const pick = await buildPickFromRawGame(apiGame, sport)
        return pick ?? null
      }
    }
  }

  // Try API-Sports as fallback (for NCAAB, MLB games)
  console.log(`[getSingleGamePick] Game ${gameId} not found in The-Odds, trying API-Sports with sportHint: ${sportHint}...`)
  const apiSportsSport = sportHint ? SPORT_TO_API_SPORTS[sportHint] : undefined
  const apiSportsSports = apiSportsSport ? [apiSportsSport] : Object.values(SPORT_TO_API_SPORTS).filter((v, i, arr) => arr.indexOf(v) === i)

  console.log(`[getSingleGamePick] Searching API-Sports sports:`, apiSportsSports)

  for (const sport of apiSportsSports) {
    if (!sport) continue
    try {
      console.log(`[getSingleGamePick] Fetching API-Sports ${sport}...`)
      const games = await fetchApiSportsOdds(sport)
      console.log(`[getSingleGamePick] API-Sports ${sport} returned ${games.length} games`)

      // Log first few game IDs for debugging
      if (games.length > 0) {
        console.log(`[getSingleGamePick] First 3 game IDs in ${sport}:`, games.slice(0, 3).map((g: ApiSportsGame) => g.id))
      }

      const foundGame = games.find((g: ApiSportsGame) => g.id.toString() === gameId.toString())
      if (foundGame) {
        console.log(`[getSingleGamePick] Game found in API-Sports ${sport}:`, foundGame.homeTeam, 'vs', foundGame.awayTeam)
        const oddsFormatGame = convertApiSportsToOddsFormat(foundGame)
        const oddsApiSportKey = Object.entries(SPORT_TO_API_SPORTS).find(([_, v]) => v === sport)?.[0] || sport
        const pick = await buildPickFromRawGame(oddsFormatGame, oddsApiSportKey)
        return pick ?? null
      }
    } catch (error) {
      console.error(`[getSingleGamePick] API-Sports failed for ${sport}:`, error)
    }
  }

  console.log(`[getSingleGamePick] Game ${gameId} not found in any source`)
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

/**
 * Map team name to city for weather lookup
 */
function getTeamCity(sport: string, teamName: string): string | null {
  // NFL team cities
  const nflCities: Record<string, string> = {
    'Arizona Cardinals': 'Phoenix,AZ,US',
    'Atlanta Falcons': 'Atlanta,GA,US',
    'Baltimore Ravens': 'Baltimore,MD,US',
    'Buffalo Bills': 'Buffalo,NY,US',
    'Carolina Panthers': 'Charlotte,NC,US',
    'Chicago Bears': 'Chicago,IL,US',
    'Cincinnati Bengals': 'Cincinnati,OH,US',
    'Cleveland Browns': 'Cleveland,OH,US',
    'Dallas Cowboys': 'Dallas,TX,US',
    'Denver Broncos': 'Denver,CO,US',
    'Detroit Lions': 'Detroit,MI,US',
    'Green Bay Packers': 'Green Bay,WI,US',
    'Houston Texans': 'Houston,TX,US',
    'Indianapolis Colts': 'Indianapolis,IN,US',
    'Jacksonville Jaguars': 'Jacksonville,FL,US',
    'Kansas City Chiefs': 'Kansas City,MO,US',
    'Las Vegas Raiders': 'Las Vegas,NV,US',
    'Los Angeles Chargers': 'Los Angeles,CA,US',
    'Los Angeles Rams': 'Los Angeles,CA,US',
    'Miami Dolphins': 'Miami,FL,US',
    'Minnesota Vikings': 'Minneapolis,MN,US',
    'New England Patriots': 'Boston,MA,US',
    'New Orleans Saints': 'New Orleans,LA,US',
    'New York Giants': 'New York,NY,US',
    'New York Jets': 'New York,NY,US',
    'Philadelphia Eagles': 'Philadelphia,PA,US',
    'Pittsburgh Steelers': 'Pittsburgh,PA,US',
    'San Francisco 49ers': 'San Francisco,CA,US',
    'Seattle Seahawks': 'Seattle,WA,US',
    'Tampa Bay Buccaneers': 'Tampa,FL,US',
    'Tennessee Titans': 'Nashville,TN,US',
    'Washington Commanders': 'Washington,DC,US',
  }

  // MLB team cities
  const mlbCities: Record<string, string> = {
    'Arizona Diamondbacks': 'Phoenix,AZ,US',
    'Atlanta Braves': 'Atlanta,GA,US',
    'Baltimore Orioles': 'Baltimore,MD,US',
    'Boston Red Sox': 'Boston,MA,US',
    'Chicago Cubs': 'Chicago,IL,US',
    'Chicago White Sox': 'Chicago,IL,US',
    'Cincinnati Reds': 'Cincinnati,OH,US',
    'Cleveland Guardians': 'Cleveland,OH,US',
    'Colorado Rockies': 'Denver,CO,US',
    'Detroit Tigers': 'Detroit,MI,US',
    'Houston Astros': 'Houston,TX,US',
    'Kansas City Royals': 'Kansas City,MO,US',
    'Los Angeles Angels': 'Los Angeles,CA,US',
    'Los Angeles Dodgers': 'Los Angeles,CA,US',
    'Miami Marlins': 'Miami,FL,US',
    'Milwaukee Brewers': 'Milwaukee,WI,US',
    'Minnesota Twins': 'Minneapolis,MN,US',
    'New York Mets': 'New York,NY,US',
    'New York Yankees': 'New York,NY,US',
    'Oakland Athletics': 'Oakland,CA,US',
    'Philadelphia Phillies': 'Philadelphia,PA,US',
    'Pittsburgh Pirates': 'Pittsburgh,PA,US',
    'San Diego Padres': 'San Diego,CA,US',
    'San Francisco Giants': 'San Francisco,CA,US',
    'Seattle Mariners': 'Seattle,WA,US',
    'St. Louis Cardinals': 'St. Louis,MO,US',
    'Tampa Bay Rays': 'Tampa,FL,US',
    'Texas Rangers': 'Arlington,TX,US',
    'Toronto Blue Jays': 'Toronto,CA',
    'Washington Nationals': 'Washington,DC,US',
  }

  // NCAAF - major programs (simplified, would need expansion)
  const ncaafCities: Record<string, string> = {
    'Alabama Crimson Tide': 'Tuscaloosa,AL,US',
    'Ohio State Buckeyes': 'Columbus,OH,US',
    'Georgia Bulldogs': 'Athens,GA,US',
    'Clemson Tigers': 'Clemson,SC,US',
    'Michigan Wolverines': 'Ann Arbor,MI,US',
    'Notre Dame Fighting Irish': 'South Bend,IN,US',
    'Oklahoma Sooners': 'Norman,OK,US',
    'Texas Longhorns': 'Austin,TX,US',
    'Florida Gators': 'Gainesville,FL,US',
    'LSU Tigers': 'Baton Rouge,LA,US',
    'Penn State Nittany Lions': 'State College,PA,US',
    'USC Trojans': 'Los Angeles,CA,US',
    'Oregon Ducks': 'Eugene,OR,US',
    'Florida State Seminoles': 'Tallahassee,FL,US',
    'Miami Hurricanes': 'Miami,FL,US',
    'Auburn Tigers': 'Auburn,AL,US',
    'Wisconsin Badgers': 'Madison,WI,US',
    'Texas A&M Aggies': 'College Station,TX,US',
    'Tennessee Volunteers': 'Knoxville,TN,US',
    'Nebraska Cornhuskers': 'Lincoln,NE,US',
  }

  const sportKey = sport.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')

  if (sportKey === 'nfl') return nflCities[teamName] || null
  if (sportKey === 'mlb') return mlbCities[teamName] || null
  if (sportKey === 'ncaaf') return ncaafCities[teamName] || null

  return null
}

/**
 * Fetch real weather data from OpenWeather API
 */
async function fetchWeatherFromOpenWeather(city: string): Promise<{
  temperature: number
  condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy' | 'fog' | 'extreme'
  windSpeed: number
  humidity: number
  precipitation: number
  visibility: number
} | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.log('[Weather] No OPENWEATHER_API_KEY available')
    return null
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`
    console.log(`[Weather] Calling OpenWeather API for: ${city}`)

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      console.error(`[Weather] OpenWeather API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.main || !data.weather || !data.weather[0]) {
      console.error('[Weather] Invalid response from OpenWeather API')
      return null
    }

    // Map OpenWeather condition to our format
    const weatherId = data.weather[0].id
    let condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy' | 'fog' | 'extreme' = 'clear'

    if (weatherId >= 200 && weatherId < 300) condition = 'extreme' // Thunderstorm
    else if (weatherId >= 300 && weatherId < 600) condition = 'rain' // Drizzle/Rain
    else if (weatherId >= 600 && weatherId < 700) condition = 'snow' // Snow
    else if (weatherId >= 700 && weatherId < 800) condition = 'fog' // Atmosphere (fog, mist, etc.)
    else if (weatherId === 800) condition = 'clear' // Clear
    else if (weatherId > 800) condition = 'cloudy' // Clouds

    // Check for high winds
    const windSpeed = data.wind?.speed || 0
    if (windSpeed > 20) condition = 'windy'

    const result = {
      temperature: Math.round(data.main.temp),
      condition,
      windSpeed: Math.round(windSpeed),
      humidity: data.main.humidity || 50,
      precipitation: data.rain ? (data.rain['1h'] || 0) : 0, // Rain in last hour
      visibility: (data.visibility || 10000) / 1609.34, // Convert meters to miles
    }

    console.log(`[Weather] Raw OpenWeather data:`, {
      temp: data.main.temp,
      condition: data.weather[0].main,
      wind: data.wind?.speed,
      humidity: data.main.humidity
    })

    return result
  } catch (error: any) {
    console.error(`[Weather] Error fetching weather:`, error.message || error)
    return null
  }
}

/** All 6 leagues for diversity */
const LEAGUES_FOR_DIVERSITY = ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAF', 'NCAAB']
const TOP_N = 20  // Increased to ensure all tiers get picks (Elite:5 + Pro:3 + Free:2 + extras)
const MAX_PER_SPORT = 3

/**
 * Select top N picks by composite score.
 * No sport diversity limits - just the best picks overall.
 */
function selectTop10(picks: any[]): any[] {
  const score = (p: any) => typeof p.composite_score === 'number' ? p.composite_score : (p.confidence ?? 50)
  const evForSort = (p: any) => typeof p.expected_value_raw === 'number' ? p.expected_value_raw : (p.expected_value ?? 0)
  const sorted = [...picks].sort((a, b) => {
    const scoreDiff = score(b) - score(a)
    if (scoreDiff !== 0) return scoreDiff
    return evForSort(b) - evForSort(a)
  })
  // Return top 10 - no per-sport limit
  return sorted.slice(0, TOP_N)
}

/**
 * Check if odds in Supabase are stale and write fresh odds if needed.
 * Stale = older than 30 minutes
 */
async function checkAndStoreOdds(games: any[], sport: string): Promise<void> {
  try {
    if (!supabase) return

    const gameIds = games.map(g => g.id)

    // Check the most recent odds for these games in Supabase
    const { data: existingOdds, error } = await supabase
      .from('historical_odds')
      .select('game_id, captured_at')
      .in('game_id', gameIds)
      .eq('sport', sport)
      .order('captured_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[Picks API] Error checking existing odds:', error)
    }

    // Determine if odds are stale (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    let oddsAreStale = true

    if (existingOdds && existingOdds.length > 0) {
      const latestTimestamp = existingOdds[0].captured_at
      oddsAreStale = latestTimestamp < thirtyMinutesAgo
      console.log(`[Picks API] Latest odds for ${sport}: ${latestTimestamp}, stale: ${oddsAreStale}`)
    } else {
      console.log(`[Picks API] No existing odds found for ${sport}, treating as stale`)
    }

    // If stale, write fresh odds to Supabase
    if (oddsAreStale) {
      console.log(`[Picks API] Writing fresh odds to Supabase for ${sport} (${games.length} games)`)

      const records: any[] = []
      const timestamp = new Date().toISOString()

      for (const game of games) {
        for (const bookmaker of game.bookmakers || []) {
          for (const market of bookmaker.markets || []) {
            if (market.key === 'h2h') {
              const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team)
              const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team)
              if (homeOutcome && awayOutcome) {
                records.push({
                  game_id: game.id,
                  sport: sport,
                  home_team: game.home_team,
                  away_team: game.away_team,
                  commence_time: game.commence_time,
                  bookmaker: bookmaker.key,
                  market_type: 'moneyline',
                  home_odds: homeOutcome.price,
                  away_odds: awayOutcome.price,
                  captured_at: timestamp
                })
              }
            } else if (market.key === 'spreads') {
              const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team)
              const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team)
              if (homeOutcome && awayOutcome) {
                records.push({
                  game_id: game.id,
                  sport: sport,
                  home_team: game.home_team,
                  away_team: game.away_team,
                  commence_time: game.commence_time,
                  bookmaker: bookmaker.key,
                  market_type: 'spreads',
                  home_spread: homeOutcome.point,
                  away_spread: awayOutcome.point,
                  home_odds: homeOutcome.price,
                  away_odds: awayOutcome.price,
                  captured_at: timestamp
                })
              }
            } else if (market.key === 'totals') {
              const overOutcome = market.outcomes?.find((o: any) => o.name === 'Over')
              const underOutcome = market.outcomes?.find((o: any) => o.name === 'Under')
              if (overOutcome && underOutcome) {
                records.push({
                  game_id: game.id,
                  sport: sport,
                  home_team: game.home_team,
                  away_team: game.away_team,
                  commence_time: game.commence_time,
                  bookmaker: bookmaker.key,
                  market_type: 'totals',
                  total_line: overOutcome.point,
                  over_odds: overOutcome.price,
                  under_odds: underOutcome.price,
                  captured_at: timestamp
                })
              }
            }
          }
        }
      }

      // Batch insert to Supabase
      if (records.length > 0) {
        const { error: insertError } = await supabase
          .from('historical_odds')
          .upsert(records, {
            onConflict: 'game_id,bookmaker,market_type,captured_at',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error(`[Picks API] Error storing odds in Supabase:`, insertError)
        } else {
          console.log(`[Picks API] Successfully stored ${records.length} odds records in Supabase`)
        }
      }
    } else {
      console.log(`[Picks API] Odds for ${sport} are fresh, skipping Supabase write`)
    }
  } catch (error) {
    console.error('[Picks API] Error in checkAndStoreOdds:', error)
    // Don't throw - this is a background operation
  }
}

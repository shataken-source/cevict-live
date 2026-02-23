/**
 * Enhanced Early Lines Analysis API
 * Provides detailed comparison between early and regular picks with:
 * - Odds movement tracking
 * - Confidence adjustments
 * - Historical accuracy metrics
 * - Arbitrage opportunity scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadPredictionsSnapshot } from '@/app/lib/early-lines'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (
    (cronSecret && secret.trim() === cronSecret.trim()) ||
    (adminPassword && secret.trim() === adminPassword.trim())
  )
}

interface Pick {
  game_id: string
  home_team: string
  away_team: string
  sport: string
  league?: string  // Optional league property
  pick: string
  pick_type: string
  odds: number
  confidence: number
  edge?: number
  expected_value?: number
  composite_score?: number
  is_favorite_pick?: boolean
  has_value?: boolean
  recommended_line?: number
  mc_predicted_score?: { home: number; away: number }
  total?: any
  game_time?: string
}

interface EnhancedMatch {
  game_id: string
  home_team: string
  away_team: string
  sport: string
  game_time?: string

  // Early line data
  early_pick: string
  early_pick_type: string
  early_odds: number
  early_confidence: number
  early_edge: number
  early_expected_value: number
  early_composite_score: number
  early_line?: number
  early_predicted_score?: { home: number; away: number }
  early_total?: any

  // Regular line data
  regular_pick: string
  regular_pick_type: string
  regular_odds: number
  regular_confidence: number
  regular_edge: number
  regular_expected_value: number
  regular_composite_score: number
  regular_line?: number
  regular_predicted_score?: { home: number; away: number }
  regular_total?: any

  // Analysis
  side_flipped: boolean
  odds_movement: number  // Percentage change in odds
  confidence_delta: number  // Change in confidence
  edge_delta: number  // Change in edge
  value_score: number  // 0-100 score for early line value
  recommendation: 'hold' | 'hedge' | 'double_down' | 'close'
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, earlyDate, regularDate } = body as { secret?: string; earlyDate?: string; regularDate?: string }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    if (!earlyDate || !regularDate) {
      return NextResponse.json(
        { success: false, error: 'earlyDate and regularDate are required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Load data (supports both environments)
    const earlyData = await loadPredictionsSnapshot(earlyDate, true)
    const regularData = await loadPredictionsSnapshot(regularDate, false)
    const earlyPicks: Pick[] = Array.isArray(earlyData.picks) ? earlyData.picks : []
    const regularPicks: Pick[] = Array.isArray(regularData.picks) ? regularData.picks : []

    // Index regular picks by game_id
    const regularByGameId: Record<string, Pick> = {}
    for (const p of regularPicks) {
      const id = p.game_id || `${p.home_team}-${p.away_team}`
      regularByGameId[id] = p
    }

    // Generate enhanced matches
    const matches: EnhancedMatch[] = []
    let hedgeOpportunities = 0
    let doubleDownOpportunities = 0
    let closeOpportunities = 0

    for (const early of earlyPicks) {
      const gameId = early.game_id || `${early.home_team}-${early.away_team}`
      const regular = regularByGameId[gameId]
      if (!regular) continue

      const sideFlipped = early.pick !== regular.pick
      const oddsMovement = calculateOddsMovement(early.odds, regular.odds)
      const confidenceDelta = regular.confidence - early.confidence
      const edgeDelta = (regular.edge || 0) - (early.edge || 0)

      // Calculate value score (0-100)
      const valueScore = calculateValueScore(early, regular, sideFlipped, oddsMovement)

      // Determine recommendation
      const { recommendation, reasoning } = generateRecommendation(
        early,
        regular,
        sideFlipped,
        oddsMovement,
        confidenceDelta,
        edgeDelta,
        valueScore
      )

      // Count opportunities
      if (recommendation === 'hedge') hedgeOpportunities++
      if (recommendation === 'double_down') doubleDownOpportunities++
      if (recommendation === 'close') closeOpportunities++

      matches.push({
        game_id: gameId,
        home_team: early.home_team,
        away_team: early.away_team,
        sport: early.sport || early.league || '',
        game_time: early.game_time,

        early_pick: early.pick,
        early_pick_type: early.pick_type,
        early_odds: early.odds,
        early_confidence: early.confidence,
        early_edge: early.edge || 0,
        early_expected_value: early.expected_value || 0,
        early_composite_score: early.composite_score || 0,
        early_line: early.recommended_line,
        early_predicted_score: early.mc_predicted_score,
        early_total: early.total,

        regular_pick: regular.pick,
        regular_pick_type: regular.pick_type,
        regular_odds: regular.odds,
        regular_confidence: regular.confidence,
        regular_edge: regular.edge || 0,
        regular_expected_value: regular.expected_value || 0,
        regular_composite_score: regular.composite_score || 0,
        regular_line: regular.recommended_line,
        regular_predicted_score: regular.mc_predicted_score,
        regular_total: regular.total,

        side_flipped: sideFlipped,
        odds_movement: oddsMovement,
        confidence_delta: confidenceDelta,
        edge_delta: edgeDelta,
        value_score: valueScore,
        recommendation,
        reasoning
      })
    }

    // Sort by value score (highest first)
    matches.sort((a, b) => b.value_score - a.value_score)

    // Calculate summary statistics
    const summary = {
      total_matches: matches.length,
      side_flipped_count: matches.filter(m => m.side_flipped).length,
      hedge_opportunities: hedgeOpportunities,
      double_down_opportunities: doubleDownOpportunities,
      close_opportunities: closeOpportunities,
      avg_odds_movement: matches.length > 0
        ? matches.reduce((sum, m) => sum + Math.abs(m.odds_movement), 0) / matches.length
        : 0,
      avg_confidence_delta: matches.length > 0
        ? matches.reduce((sum, m) => sum + m.confidence_delta, 0) / matches.length
        : 0,
      high_value_picks: matches.filter(m => m.value_score >= 70).length,
    }

    return NextResponse.json({
      success: true,
      earlyDate,
      regularDate,
      summary,
      matches,
      top_opportunities: matches.slice(0, 5),
      hedges: matches.filter(m => m.recommendation === 'hedge'),
      double_downs: matches.filter(m => m.recommendation === 'double_down'),
    })

  } catch (e: any) {
    console.error('[enhanced-early-lines]', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to analyze early lines' },
      { status: 500 }
    )
  }
}

/**
 * Calculate odds movement as percentage change
 */
function calculateOddsMovement(earlyOdds: number, regularOdds: number): number {
  // Convert to implied probabilities
  const earlyProb = americanToImpliedProb(earlyOdds)
  const regularProb = americanToImpliedProb(regularOdds)

  // Return percentage point change
  return (regularProb - earlyProb) * 100
}

/**
 * Convert American odds to implied probability
 */
function americanToImpliedProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100)
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100)
  }
}

/**
 * Calculate value score (0-100) for early line position
 */
function calculateValueScore(
  early: Pick,
  regular: Pick,
  sideFlipped: boolean,
  oddsMovement: number
): number {
  let score = 50  // Base score

  // Side flip is valuable (you got position that moved)
  if (sideFlipped) score += 25

  // Significant odds movement in your favor
  if (Math.abs(oddsMovement) > 5) score += 15
  if (Math.abs(oddsMovement) > 10) score += 10

  // Early line had value
  if ((early.edge || 0) > 3) score += 10
  if ((early.edge || 0) > 5) score += 10

  // Regular still shows value in same direction
  if (!sideFlipped && (regular.edge || 0) > 3) score += 10

  // Confidence held up
  if (regular.confidence >= early.confidence - 5) score += 10

  return Math.min(100, Math.max(0, score))
}

/**
 * Generate recommendation based on early vs regular analysis
 */
function generateRecommendation(
  early: Pick,
  regular: Pick,
  sideFlipped: boolean,
  oddsMovement: number,
  confidenceDelta: number,
  edgeDelta: number,
  valueScore: number
): { recommendation: 'hold' | 'hedge' | 'double_down' | 'close'; reasoning: string } {

  // Side flipped - potential hedge opportunity
  if (sideFlipped) {
    if (valueScore >= 75) {
      return {
        recommendation: 'hedge',
        reasoning: `Line moved ${oddsMovement > 0 ? 'toward' : 'against'} your early position. Side flipped - consider hedging for guaranteed profit or reduced risk.`
      }
    }
    return {
      recommendation: 'close',
      reasoning: `Side flipped but value score is moderate. Consider closing position if risk tolerance is low.`
    }
  }

  // Same side - double down or hold
  if (!sideFlipped) {
    // Both early and regular show value
    if ((early.edge || 0) > 3 && (regular.edge || 0) > 3) {
      if (valueScore >= 70) {
        return {
          recommendation: 'double_down',
          reasoning: `Both early and regular show value. Confidence ${confidenceDelta >= 0 ? 'held' : 'dropped slightly'} but pick remains strong.`
        }
      }
    }

    // Confidence dropped significantly
    if (confidenceDelta < -10) {
      return {
        recommendation: 'close',
        reasoning: `Confidence dropped ${Math.abs(confidenceDelta).toFixed(0)}% from early to regular. Consider reducing position.`
      }
    }

    // Hold - everything looks good
    return {
      recommendation: 'hold',
      reasoning: `Pick unchanged. ${oddsMovement > 2 ? 'Odds moved in your favor.' : 'Market stable.'} Maintain position.`
    }
  }

  return {
    recommendation: 'hold',
    reasoning: 'Maintain current position based on analysis.'
  }
}

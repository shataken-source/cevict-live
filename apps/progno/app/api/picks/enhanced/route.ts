/**
 * Enhanced Picks API
 * Uses complete API-Sports + Claude Effect integration
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getClientForSport,
  getLeagueId,
  getClaudeEffectEngine,
  getAccuracyTracker,
  MultiSourceOddsService,
  type ClaudeEffectInput
} from '@/lib/api-sports'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sport = searchParams.get('sport')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const includeAnalysis = searchParams.get('analysis') !== 'false'

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    // Check cache first
    const { data: cachedPicks } = await supabase
      .from('picks')
      .select('*')
      .gte('game_time', `${date}T00:00:00`)
      .lt('game_time', `${date}T23:59:59`)
      .order('confidence', { ascending: false })

    if (cachedPicks && cachedPicks.length > 0) {
      // Get performance metrics
      const tracker = getAccuracyTracker()
      const metrics = await tracker.getPerformanceMetrics()

      return NextResponse.json({
        success: true,
        source: 'cache',
        date,
        picks: cachedPicks.map(p => formatPick(p, includeAnalysis)),
        count: cachedPicks.length,
        tiers: {
          free: cachedPicks.filter(p => !p.is_premium).slice(0, 3),
          pro: cachedPicks.filter(p => p.is_premium && p.confidence < 80),
          elite: cachedPicks.filter(p => p.is_premium && p.confidence >= 80)
        },
        performance: {
          winRate: metrics.winRate.toFixed(1) + '%',
          last7Days: metrics.last7Days.winRate.toFixed(1) + '%',
          streak: `${metrics.streak.current}${metrics.streak.type === 'win' ? 'W' : 'L'}`
        },
        timestamp: new Date().toISOString()
      })
    }

    // Generate fresh picks
    const sports = sport ? [sport.toLowerCase()] : ['nba', 'nfl', 'nhl']
    const allPicks = await generateEnhancedPicks(sports, date, supabase)

    return NextResponse.json({
      success: true,
      source: 'generated',
      date,
      picks: allPicks.map(p => formatPick(p, includeAnalysis)),
      count: allPicks.length,
      tiers: {
        free: allPicks.filter(p => !p.is_premium).slice(0, 3),
        pro: allPicks.filter(p => p.is_premium && p.confidence < 80),
        elite: allPicks.filter(p => p.is_premium && p.confidence >= 80)
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[ENHANCED PICKS] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function generateEnhancedPicks(
  sports: string[],
  date: string,
  supabase: any
): Promise<any[]> {
  const claudeEffect = getClaudeEffectEngine()
  const oddsService = new MultiSourceOddsService()
  const allPicks: any[] = []

  for (const sport of sports) {
    try {
      const client = getClientForSport(sport)
      const leagueId = getLeagueId(sport)

      if (!client || !leagueId) continue

      // Get games for the date
      const games = await client.getGames({
        league: leagueId,
        date,
        season: new Date().getFullYear()
      })

      for (const game of games) {
        try {
          // Skip past games
          if (new Date(game.date) < new Date()) continue

          // Get teams from database
          const { data: homeTeam } = await supabase
            .from('teams')
            .select('id, name, api_sports_id')
            .eq('api_sports_id', game.teams.home.id)
            .single()

          const { data: awayTeam } = await supabase
            .from('teams')
            .select('id, name, api_sports_id')
            .eq('api_sports_id', game.teams.away.id)
            .single()

          if (!homeTeam || !awayTeam) continue

          // Get standings for base probability
          const { data: homeStandings } = await supabase
            .from('team_standings')
            .select('win_pct')
            .eq('team_id', homeTeam.id)
            .single()

          const { data: awayStandings } = await supabase
            .from('team_standings')
            .select('win_pct')
            .eq('team_id', awayTeam.id)
            .single()

          const homeWinPct = homeStandings?.win_pct || 0.5
          const awayWinPct = awayStandings?.win_pct || 0.5
          const baseProbability = homeWinPct / (homeWinPct + awayWinPct) || 0.5

          // Get multi-source odds
          const oddsComparison = await oddsService.getMultiSourceOdds(
            sport,
            game.id.toString()
          )

          // Calculate Claude Effect (engine uses team names + gameId for real data)
          const input: ClaudeEffectInput = {
            baseProbability,
            baseConfidence: 65,
            gameTime: new Date(game.date),
            sport,
            homeTeam: homeTeam?.name ?? game.teams?.home?.name,
            awayTeam: awayTeam?.name ?? game.teams?.away?.name,
            gameId: game.id?.toString()
          }

          const result = await claudeEffect.calculate(input)

          // Build pick
          const pickTeam = result.adjustedProbability > 0.5 ? homeTeam.name : awayTeam.name

          const pick = {
            id: game.id,
            sport: sport.toUpperCase(),
            home_team: homeTeam.name,
            away_team: awayTeam.name,
            pick: pickTeam,
            pick_type: 'MONEYLINE',
            confidence: Math.round(result.adjustedConfidence),
            probability: result.adjustedProbability,
            game_time: game.date,
            is_premium: result.adjustedConfidence >= 75,
            recommendation: result.recommendation,
            edge: result.edgePercentage,
            analysis: buildAnalysis(result),
            claude_effect: {
              score: result.claudeEffect,
              dimensions: result.dimensions,
              narratives: result.narratives
            },
            odds: {
              consensus: oddsComparison.consensus,
              sharpMoney: oddsComparison.sharpMoneyIndicator,
              marketEfficiency: oddsComparison.marketEfficiencyScore
            },
            api_sports_game_id: game.id
          }

          // Save to database
          const { data: savedPick } = await supabase
            .from('picks')
            .insert([{
              sport: pick.sport,
              home_team: pick.home_team,
              away_team: pick.away_team,
              pick: pick.pick,
              pick_type: pick.pick_type,
              confidence: pick.confidence,
              game_time: pick.game_time,
              is_premium: pick.is_premium,
              analysis: pick.analysis,
              claude_effect: result.claudeEffect,
              sentiment_field: result.dimensions.sentimentField,
              narrative_momentum: result.dimensions.narrativeMomentum,
              information_asymmetry: result.dimensions.informationAsymmetry,
              ai_confidence: pick.recommendation === 'strong_bet' ? 'HIGH' :
                pick.recommendation === 'moderate_bet' ? 'MEDIUM' : 'LOW',
              api_sports_game_id: game.id,
              injury_impact: result.dimensions.chaosSensitivity,
              sharp_signal_strength: oddsComparison.sharpMoneyIndicator !== 'neutral' ? 0.7 : 0,
              market_inefficiency: 1 - oddsComparison.marketEfficiencyScore,
              sources_used: ['api-sports', 'odds-api', 'claude-effect']
            }])
            .select()
            .single()

          allPicks.push(savedPick || pick)
        } catch (err: any) {
          console.error(`[ENHANCED PICKS] Error processing game:`, err.message)
        }
      }
    } catch (err: any) {
      console.error(`[ENHANCED PICKS] Error processing ${sport}:`, err.message)
    }
  }

  // Sort by confidence
  return allPicks.sort((a, b) => b.confidence - a.confidence)
}

function buildAnalysis(result: any): string {
  const parts: string[] = []

  // Main recommendation
  const recMap: Record<string, string> = {
    'strong_bet': '🔥 STRONG BET',
    'moderate_bet': '✅ Moderate Bet',
    'lean': '📊 Lean',
    'avoid': '⚠️ Avoid',
    'no_play': '❌ No Play'
  }
  parts.push(recMap[result.recommendation] || result.recommendation)

  // Edge
  parts.push(`Edge: ${result.edgePercentage.toFixed(1)}%`)

  // Key narratives
  const allNarratives = [
    ...result.narratives.sentiment,
    ...result.narratives.narrative,
    ...result.narratives.information,
    ...result.narratives.chaos,
    ...result.narratives.emergent
  ].filter(n => n && n.length > 0)

  if (allNarratives.length > 0) {
    parts.push(allNarratives.slice(0, 2).join(' '))
  }

  return parts.join(' | ')
}

function formatPick(pick: any, includeAnalysis: boolean): any {
  const formatted: any = {
    id: pick.id,
    sport: pick.sport,
    matchup: `${pick.away_team} @ ${pick.home_team}`,
    pick: pick.pick,
    type: pick.pick_type,
    confidence: pick.confidence,
    gameTime: pick.game_time,
    isPremium: pick.is_premium
  }

  if (includeAnalysis) {
    formatted.analysis = pick.analysis
    formatted.claudeEffect = pick.claude_effect
    formatted.aiConfidence = pick.ai_confidence
  }

  return formatted
}


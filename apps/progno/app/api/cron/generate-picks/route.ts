/**
 * Cron Job: Generate Daily Picks
 * Runs every morning to generate picks for today's games
 * Schedule: 0 8 * * * (8 AM daily)
 */

import { NextResponse } from 'next/server'
import { getClientForSport, getLeagueId, Game } from '@/app/lib/api-sports/client'
import { getClaudeEffectEngine, ClaudeEffectInput } from '@/app/lib/api-sports/claude-effect-complete'
import { syncH2H } from '@/app/lib/api-sports/services/h2h-sync'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[CRON] Unauthorized generate-picks attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
  }

  const claudeEffect = getClaudeEffectEngine()
  const today = new Date().toISOString().split('T')[0]
  const sports = ['nba', 'nfl', 'nhl']
  const allPicks: any[] = []

  try {
    console.log('[CRON] Starting daily pick generation...')

    // Check if picks already exist for today
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('id')
      .gte('game_time', `${today}T00:00:00`)
      .lt('game_time', `${today}T23:59:59`)
      .limit(1)

    if (existingPicks && existingPicks.length > 0) {
      console.log('[CRON] Picks already generated for today')
      return NextResponse.json({
        success: true,
        message: 'Picks already generated for today',
        source: 'cache',
        timestamp: new Date().toISOString()
      })
    }

    for (const sport of sports) {
      try {
        const client = getClientForSport(sport)
        const leagueId = getLeagueId(sport)
        
        if (!client || !leagueId) continue

        // Get today's games
        const games = await client.getGames({
          league: leagueId,
          date: today,
          season: new Date().getFullYear()
        })

        console.log(`[CRON] Processing ${games.length} ${sport.toUpperCase()} games`)

        for (const game of games) {
          try {
            // Skip games that have already started
            if (new Date(game.date) < new Date()) continue

            const pick = await generatePickForGame(
              game, 
              sport, 
              supabase, 
              claudeEffect
            )
            
            if (pick) {
              allPicks.push(pick)
            }
          } catch (err: any) {
            console.error(`[CRON] Error generating pick for game ${game.id}:`, err.message)
          }
        }
      } catch (err: any) {
        console.error(`[CRON] Error processing ${sport}:`, err.message)
      }
    }

    console.log(`[CRON] Generated ${allPicks.length} picks`)

    // Categorize picks by tier
    const freePicks = allPicks.filter(p => p.confidence < 70).slice(0, 3)
    const proPicks = allPicks.filter(p => p.confidence >= 70 && p.confidence < 80)
    const elitePicks = allPicks.filter(p => p.confidence >= 80)

    return NextResponse.json({
      success: true,
      message: `Generated ${allPicks.length} picks`,
      summary: {
        total: allPicks.length,
        free: freePicks.length,
        pro: proPicks.length,
        elite: elitePicks.length
      },
      picks: allPicks,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Pick generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function generatePickForGame(
  game: Game,
  sport: string,
  supabase: any,
  claudeEffect: any
): Promise<any | null> {
  try {
    // Get teams from our database
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

    if (!homeTeam || !awayTeam) {
      console.log(`[CRON] Teams not found for game ${game.id}`)
      return null
    }

    // Sync H2H history if needed
    await syncH2H(game.teams.home.id, game.teams.away.id, sport as any)
      .catch(() => {}) // Non-critical

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

    // Calculate base probability from standings
    const homeWinPct = homeStandings?.win_pct || 0.5
    const awayWinPct = awayStandings?.win_pct || 0.5
    const baseProbability = homeWinPct / (homeWinPct + awayWinPct) || 0.5

    // Prepare Claude Effect input (engine uses team names + gameId for real data)
    const input: ClaudeEffectInput = {
      baseProbability,
      baseConfidence: 65,
      gameTime: new Date(game.date),
      sport,
      homeTeam: homeTeam?.name ?? game.teams?.home?.name,
      awayTeam: awayTeam?.name ?? game.teams?.away?.name,
      gameId: game.id?.toString()
    }

    // Calculate Claude Effect
    const result = await claudeEffect.calculate(input)

    // Determine pick
    const pickTeam = result.adjustedProbability > 0.5 ? homeTeam.name : awayTeam.name
    const pickType = 'MONEYLINE'
    
    // Build analysis text
    const narratives = [
      ...result.narratives.sentiment,
      ...result.narratives.narrative,
      ...result.narratives.information,
      ...result.narratives.chaos
    ].filter(n => n && n.length > 0).slice(0, 3)

    const analysis = narratives.length > 0 
      ? narratives.join(' ') + ` Recommendation: ${result.recommendation}`
      : `Claude Effect Analysis: ${result.recommendation}. Edge: ${result.edgePercentage.toFixed(1)}%`

    // Insert pick
    const pickData = {
      sport: sport.toUpperCase(),
      home_team: homeTeam.name,
      away_team: awayTeam.name,
      pick: pickTeam,
      pick_type: pickType,
      confidence: Math.round(result.adjustedConfidence),
      game_time: game.date,
      is_premium: result.adjustedConfidence >= 75,
      analysis,
      // Claude Effect data
      claude_effect: result.claudeEffect,
      sentiment_field: result.dimensions.sentimentField,
      narrative_momentum: result.dimensions.narrativeMomentum,
      information_asymmetry: result.dimensions.informationAsymmetry,
      ai_confidence: result.recommendation === 'strong_bet' ? 'HIGH' : 
                     result.recommendation === 'moderate_bet' ? 'MEDIUM' : 'LOW',
      // API-Sports data
      api_sports_game_id: game.id,
      injury_impact: result.dimensions.chaosSensitivity,
      sources_used: ['api-sports', 'odds-api']
    }

    const { data: insertedPick, error } = await supabase
      .from('picks')
      .insert([pickData])
      .select()
      .single()

    if (error) {
      console.error(`[CRON] Error inserting pick:`, error.message)
      return null
    }

    console.log(`✓ Generated pick: ${homeTeam.name} vs ${awayTeam.name} → ${pickTeam} (${Math.round(result.adjustedConfidence)}%)`)
    return insertedPick
  } catch (error: any) {
    console.error(`[CRON] Error in generatePickForGame:`, error.message)
    return null
  }
}

export async function POST(request: Request) {
  return GET(request)
}


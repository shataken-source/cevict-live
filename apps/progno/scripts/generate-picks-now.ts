/**
 * Generate picks for today's games - Local Runner
 */

import { getClientForSport, getLeagueId, Game } from '../lib/api-sports/client'
import { getClaudeEffectEngine, ClaudeEffectInput } from '../lib/api-sports/claude-effect-complete'
import { syncH2H } from '../lib/api-sports/services/h2h-sync'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log('⚠️ Supabase not configured - will save to file only')
    return null
  }
  return createClient(url, key)
}

async function generatePickForGame(
  game: Game,
  sport: string,
  supabase: any,
  claudeEffect: any
): Promise<any | null> {
  try {
    // Get teams from our database if available
    let homeTeam: any = null
    let awayTeam: any = null

    if (supabase) {
      const { data: homeData } = await supabase
        .from('teams')
        .select('id, name, api_sports_id')
        .eq('api_sports_id', game.teams.home.id)
        .single()

      const { data: awayData } = await supabase
        .from('teams')
        .select('id, name, api_sports_id')
        .eq('api_sports_id', game.teams.away.id)
        .single()

      homeTeam = homeData
      awayTeam = awayData
    }

    // Fallback to game data if teams not in database
    if (!homeTeam) {
      homeTeam = { id: `temp-${game.teams.home.id}`, name: game.teams.home.name, api_sports_id: game.teams.home.id }
    }
    if (!awayTeam) {
      awayTeam = { id: `temp-${game.teams.away.id}`, name: game.teams.away.name, api_sports_id: game.teams.away.id }
    }

    // Sync H2H history if possible
    if (supabase) {
      await syncH2H(game.teams.home.id, game.teams.away.id, sport as any).catch(() => {})
    }

    // Get standings for base probability
    let homeWinPct = 0.5
    let awayWinPct = 0.5

    if (supabase && homeTeam.id && awayTeam.id) {
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

      homeWinPct = homeStandings?.win_pct || 0.5
      awayWinPct = awayStandings?.win_pct || 0.5
    }

    // Calculate base probability from standings
    const baseProbability = homeWinPct / (homeWinPct + awayWinPct) || 0.5

    // Prepare Claude Effect input
    const input: ClaudeEffectInput = {
      gameId: game.id.toString(),
      sport,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeTeamApiId: game.teams.home.id,
      awayTeamApiId: game.teams.away.id,
      baseProbability,
      baseConfidence: 65,
      gameTime: new Date(game.date)
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
      claude_effect: result.claudeEffect,
      sentiment_field: result.dimensions.sentimentField,
      narrative_momentum: result.dimensions.narrativeMomentum,
      information_asymmetry: result.dimensions.informationAsymmetry,
      ai_confidence: result.recommendation === 'strong_bet' ? 'HIGH' :
                     result.recommendation === 'moderate_bet' ? 'MEDIUM' : 'LOW',
      api_sports_game_id: game.id,
      injury_impact: result.dimensions.chaosSensitivity,
      sources_used: ['api-sports', 'odds-api']
    }

    // Try to insert into database
    if (supabase) {
      const { data: insertedPick, error } = await supabase
        .from('picks')
        .insert([pickData])
        .select()
        .single()

      if (error) {
        console.error(`   ⚠️ Database insert failed:`, error.message)
      } else {
        console.log(`   ✅ Saved to database`)
      }
    }

    console.log(`✓ ${homeTeam.name} vs ${awayTeam.name} → ${pickTeam} (${Math.round(result.adjustedConfidence)}%)`)
    return pickData
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message)
    return null
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║   📊 PROGNO PICK GENERATOR - LOCAL RUN   ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  const supabase = getSupabase()
  const claudeEffect = getClaudeEffectEngine()
  const today = new Date().toISOString().split('T')[0]
  const sports = ['nba', 'nfl', 'nhl']
  const allPicks: any[] = []

  console.log(`📅 Generating picks for: ${today}\n`)

  for (const sport of sports) {
    try {
      console.log(`\n🏀 ${sport.toUpperCase()} - Fetching games...`)
      const client = getClientForSport(sport)
      const leagueId = getLeagueId(sport)

      if (!client || !leagueId) {
        console.log(`   ⚠️ Sport not configured`)
        continue
      }

      // Get today's games
      const games = await client.getGames({
        league: leagueId,
        date: today,
        season: new Date().getFullYear()
      })

      console.log(`   Found ${games.length} games`)

      for (const game of games) {
        try {
          // Skip games that have already started
          if (new Date(game.date) < new Date()) {
            console.log(`   ⏩ Skipping ${game.teams.home.name} vs ${game.teams.away.name} (already started)`)
            continue
          }

          console.log(`\n   🎯 Analyzing: ${game.teams.home.name} vs ${game.teams.away.name}`)
          const pick = await generatePickForGame(game, sport, supabase, claudeEffect)

          if (pick) {
            allPicks.push(pick)
          }
        } catch (err: any) {
          console.error(`   ❌ Error:`, err.message)
        }
      }
    } catch (err: any) {
      console.error(`\n❌ ${sport.toUpperCase()} error:`, err.message)
    }
  }

  // Save to file
  const prognoDir = path.join(process.cwd(), '.progno')
  if (!fs.existsSync(prognoDir)) {
    fs.mkdirSync(prognoDir, { recursive: true })
  }

  const file = path.join(prognoDir, 'picks-all-leagues-latest.json')
  fs.writeFileSync(file, JSON.stringify(allPicks, null, 2), 'utf8')

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log(`║   ✅ GENERATED ${allPicks.length.toString().padStart(3)} PICKS   ║`)
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`\n📁 Saved to: ${file}`)
  console.log(`📊 Database: ${supabase ? 'Connected' : 'Offline'}\n`)

  // Categorize picks by tier
  const freePicks = allPicks.filter(p => p.confidence < 70).slice(0, 3)
  const proPicks = allPicks.filter(p => p.confidence >= 70 && p.confidence < 80)
  const elitePicks = allPicks.filter(p => p.confidence >= 80)

  console.log('📈 BREAKDOWN:')
  console.log(`   🆓 Free Tier: ${freePicks.length}`)
  console.log(`   💎 Pro Tier:  ${proPicks.length}`)
  console.log(`   ⭐ Elite Tier: ${elitePicks.length}\n`)
}

main().catch(console.error)


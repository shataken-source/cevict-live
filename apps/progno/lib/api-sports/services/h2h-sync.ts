/**
 * Head-to-Head Sync Service
 * Syncs historical matchup data for Narrative Momentum (NM)
 */

import { createNBAClient, createNFLClient, createNHLClient, getClientForSport } from '../client'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface H2HSyncResult {
  success: boolean
  count: number
  homeTeam: string
  awayTeam: string
  errors?: string[]
}

export async function syncH2H(
  homeTeamApiId: number, 
  awayTeamApiId: number, 
  sport: 'nba' | 'nfl' | 'nhl'
): Promise<H2HSyncResult> {
  const supabase = getSupabase()
  if (!supabase) {
    return { 
      success: false, 
      count: 0, 
      homeTeam: '', 
      awayTeam: '', 
      errors: ['Supabase not configured'] 
    }
  }

  const client = getClientForSport(sport)
  if (!client) {
    return { 
      success: false, 
      count: 0, 
      homeTeam: '', 
      awayTeam: '', 
      errors: ['Invalid sport'] 
    }
  }

  const errors: string[] = []

  try {
    console.log(`[SYNC] Fetching H2H history for teams ${homeTeamApiId} vs ${awayTeamApiId}...`)
    
    // Fetch head-to-head history
    const h2hGames = await client.getH2H(homeTeamApiId, awayTeamApiId)
    console.log(`[SYNC] Found ${h2hGames.length} historical matchups`)

    // Get team IDs from our database
    const { data: homeTeam } = await supabase
      .from('teams')
      .select('id, name')
      .eq('api_sports_id', homeTeamApiId)
      .single()

    const { data: awayTeam } = await supabase
      .from('teams')
      .select('id, name')
      .eq('api_sports_id', awayTeamApiId)
      .single()

    if (!homeTeam || !awayTeam) {
      return { 
        success: false, 
        count: 0, 
        homeTeam: homeTeam?.name || 'Unknown',
        awayTeam: awayTeam?.name || 'Unknown',
        errors: ['One or both teams not found in database'] 
      }
    }

    let successCount = 0
    
    for (const game of h2hGames) {
      try {
        const homeScore = game.scores?.home?.total || 0
        const awayScore = game.scores?.away?.total || 0
        const pointDiff = Math.abs(homeScore - awayScore)
        
        // Determine which team was home in this historical game
        const gameHomeId = game.teams.home.id === homeTeamApiId ? homeTeam.id : awayTeam.id
        const gameAwayId = game.teams.away.id === awayTeamApiId ? awayTeam.id : homeTeam.id
        const gameHomeScore = game.teams.home.id === homeTeamApiId ? homeScore : awayScore
        const gameAwayScore = game.teams.away.id === awayTeamApiId ? awayScore : homeScore

        // Check for existing record
        const { data: existing } = await supabase
          .from('historical_matchups')
          .select('id')
          .eq('home_team_id', gameHomeId)
          .eq('away_team_id', gameAwayId)
          .eq('game_date', game.date.split('T')[0])
          .single()

        if (existing) {
          // Skip if already exists
          continue
        }

        const { error } = await supabase.from('historical_matchups').insert({
          home_team_id: gameHomeId,
          away_team_id: gameAwayId,
          game_date: game.date.split('T')[0],
          home_score: gameHomeScore,
          away_score: gameAwayScore,
          point_diff: pointDiff,
          was_blowout: pointDiff > 20,
          was_upset: false, // TODO: Calculate based on pre-game odds if available
          season: parseInt(game.date.substring(0, 4))
        })

        if (error) {
          errors.push(`Failed to insert matchup: ${error.message}`)
        } else {
          successCount++
        }
      } catch (err: any) {
        errors.push(`Error processing game: ${err.message}`)
      }
    }

    console.log(`[SYNC] Completed H2H sync: ${successCount} new matchups added`)
    
    return { 
      success: errors.length === 0, 
      count: successCount,
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error('[SYNC ERROR] H2H:', error)
    return { 
      success: false, 
      count: 0, 
      homeTeam: '',
      awayTeam: '',
      errors: [error.message] 
    }
  }
}

/**
 * Calculate Narrative Momentum from H2H history
 * Returns value between -0.15 and 0.15
 */
export async function calculateNarrativeMomentum(
  homeTeamId: number, 
  awayTeamId: number
): Promise<{ momentum: number; narratives: string[] }> {
  const supabase = getSupabase()
  if (!supabase) return { momentum: 0, narratives: [] }

  try {
    // Get recent H2H history
    const { data: h2h } = await supabase
      .from('historical_matchups')
      .select('*')
      .or(`home_team_id.eq.${homeTeamId},away_team_id.eq.${homeTeamId}`)
      .or(`home_team_id.eq.${awayTeamId},away_team_id.eq.${awayTeamId}`)
      .order('game_date', { ascending: false })
      .limit(10)

    if (!h2h || h2h.length === 0) {
      return { momentum: 0, narratives: ['No historical matchup data'] }
    }

    let momentum = 0
    const narratives: string[] = []

    // Check for revenge narrative (recent blowout loss)
    const lastMeeting = h2h[0]
    if (lastMeeting && lastMeeting.was_blowout) {
      // If home team lost badly last time, give them revenge boost
      const homeLost = (lastMeeting.home_team_id === homeTeamId && 
                        lastMeeting.home_score < lastMeeting.away_score) ||
                       (lastMeeting.away_team_id === homeTeamId && 
                        lastMeeting.away_score < lastMeeting.home_score)
      
      if (homeLost) {
        momentum += 0.10
        narratives.push('🔥 Revenge game: Home team suffered blowout loss last meeting')
      }
    }

    // Check for losing streak against opponent
    const recentGames = h2h.slice(0, 5)
    let homeWins = 0
    for (const g of recentGames) {
      const homeWon = (g.home_team_id === homeTeamId && g.home_score > g.away_score) ||
                      (g.away_team_id === homeTeamId && g.away_score > g.home_score)
      if (homeWon) homeWins++
    }

    if (homeWins === 0 && recentGames.length >= 3) {
      // Home team lost last 3+, strong revenge narrative
      momentum += 0.08
      narratives.push(`📈 Home team 0-${recentGames.length} in last meetings - due for a win`)
    } else if (homeWins >= 4) {
      // Home team dominates this matchup
      momentum += 0.05
      narratives.push(`👑 Home team ${homeWins}-${recentGames.length - homeWins} in recent meetings`)
    }

    // Check for recent upset
    const recentUpset = recentGames.find(g => g.was_upset)
    if (recentUpset) {
      // Underdog previously won, adds uncertainty
      momentum *= 0.9
      narratives.push('⚠️ Recent upset in this matchup adds uncertainty')
    }

    // Average point differential
    const avgPointDiff = recentGames.reduce((sum, g) => {
      const homeWon = (g.home_team_id === homeTeamId && g.home_score > g.away_score) ||
                      (g.away_team_id === homeTeamId && g.away_score > g.home_score)
      return sum + (homeWon ? g.point_diff : -g.point_diff)
    }, 0) / recentGames.length

    if (Math.abs(avgPointDiff) > 10) {
      const direction = avgPointDiff > 0 ? 'home' : 'away'
      momentum += avgPointDiff > 0 ? 0.03 : -0.03
      narratives.push(`📊 Average margin: ${Math.abs(avgPointDiff).toFixed(1)} points for ${direction} team`)
    }

    return { 
      momentum: Math.max(-0.15, Math.min(0.15, momentum)),
      narratives
    }
  } catch (error) {
    console.error('Error calculating narrative momentum:', error)
    return { momentum: 0, narratives: ['Error calculating narrative'] }
  }
}


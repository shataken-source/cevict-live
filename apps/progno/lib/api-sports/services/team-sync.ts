/**
 * Team Sync Service
 * Syncs team data from API-Sports to Supabase
 */

import { createNBAClient, createNFLClient, createNHLClient, LEAGUE_IDS } from '../client'

// Lazy-load Supabase
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface SyncResult {
  success: boolean
  sport: string
  count: number
  errors?: string[]
}

export async function syncTeams(sport: 'nba' | 'nfl' | 'nhl'): Promise<SyncResult> {
  const supabase = getSupabase()
  if (!supabase) {
    return { success: false, sport, count: 0, errors: ['Supabase not configured'] }
  }

  const clients = {
    nba: createNBAClient(),
    nfl: createNFLClient(),
    nhl: createNHLClient()
  }

  const leagues = {
    nba: LEAGUE_IDS.nba,
    nfl: LEAGUE_IDS.nfl,
    nhl: LEAGUE_IDS.nhl
  }

  const client = clients[sport]
  const league = leagues[sport]
  const currentSeason = new Date().getFullYear()
  const errors: string[] = []

  try {
    console.log(`[SYNC] Starting team sync for ${sport.toUpperCase()}...`)
    
    // Fetch teams from API-Sports
    const teams = await client.getTeams(league, currentSeason)
    console.log(`[SYNC] Fetched ${teams.length} teams from API-Sports`)

    let successCount = 0
    for (const team of teams) {
      try {
        // Upsert to database
        const { error } = await supabase.from('teams').upsert({
          api_sports_id: team.id,
          name: team.name,
          code: team.code,
          logo_url: team.logo,
          sport: sport.toUpperCase(),
          league: league,
          city: team.city || null,
          country: team.country || null,
          founded: team.founded || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'api_sports_id'
        })

        if (error) {
          errors.push(`Failed to sync team ${team.name}: ${error.message}`)
        } else {
          successCount++
          console.log(`✓ Synced team: ${team.name}`)
        }
      } catch (err: any) {
        errors.push(`Error syncing team ${team.name}: ${err.message}`)
      }
    }

    console.log(`[SYNC] Completed ${sport.toUpperCase()} team sync: ${successCount}/${teams.length}`)
    
    return { 
      success: errors.length === 0, 
      sport, 
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error(`[SYNC ERROR] ${sport} teams:`, error)
    return { 
      success: false, 
      sport, 
      count: 0, 
      errors: [error.message] 
    }
  }
}

export async function syncAllTeams(): Promise<SyncResult[]> {
  const results = await Promise.all([
    syncTeams('nba'),
    syncTeams('nfl'),
    syncTeams('nhl')
  ])
  
  return results
}

export async function syncStandings(sport: 'nba' | 'nfl' | 'nhl'): Promise<SyncResult> {
  const supabase = getSupabase()
  if (!supabase) {
    return { success: false, sport, count: 0, errors: ['Supabase not configured'] }
  }

  const clients = {
    nba: createNBAClient(),
    nfl: createNFLClient(),
    nhl: createNHLClient()
  }

  const leagues = {
    nba: LEAGUE_IDS.nba,
    nfl: LEAGUE_IDS.nfl,
    nhl: LEAGUE_IDS.nhl
  }

  const client = clients[sport]
  const league = leagues[sport]
  const currentSeason = new Date().getFullYear()
  const errors: string[] = []

  try {
    console.log(`[SYNC] Starting standings sync for ${sport.toUpperCase()}...`)
    
    const standings = await client.getStandings(league, currentSeason)
    console.log(`[SYNC] Fetched ${standings.length} standings from API-Sports`)

    let successCount = 0
    for (const standing of standings) {
      try {
        // Get team ID from our database
        const { data: team } = await supabase
          .from('teams')
          .select('id')
          .eq('api_sports_id', standing.team.id)
          .single()

        if (!team) {
          errors.push(`Team not found in DB: ${standing.team.name}`)
          continue
        }

        const { error } = await supabase.from('team_standings').upsert({
          team_id: team.id,
          season: currentSeason,
          league: league,
          wins: standing.won,
          losses: standing.lost,
          win_pct: standing.won / (standing.won + standing.lost) || 0,
          points_for: standing.points?.for || 0,
          points_against: standing.points?.against || 0,
          point_diff: (standing.points?.for || 0) - (standing.points?.against || 0),
          streak: standing.streak || null,
          rank: standing.position,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'team_id'
        })

        if (error) {
          errors.push(`Failed to sync standing for ${standing.team.name}: ${error.message}`)
        } else {
          successCount++
        }
      } catch (err: any) {
        errors.push(`Error syncing standing: ${err.message}`)
      }
    }

    console.log(`[SYNC] Completed ${sport.toUpperCase()} standings sync: ${successCount}/${standings.length}`)
    
    return { 
      success: errors.length === 0, 
      sport, 
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error(`[SYNC ERROR] ${sport} standings:`, error)
    return { 
      success: false, 
      sport, 
      count: 0, 
      errors: [error.message] 
    }
  }
}


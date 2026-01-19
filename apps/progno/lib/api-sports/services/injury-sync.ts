/**
 * Injury Sync Service
 * Syncs injury data from API-Sports for Chaos Sensitivity Index (CSI)
 */

import { createNBAClient, createNFLClient, createNHLClient, LEAGUE_IDS } from '../client'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface InjurySyncResult {
  success: boolean
  sport: string
  count: number
  activeInjuries: number
  errors?: string[]
}

export async function syncInjuries(sport: 'nba' | 'nfl' | 'nhl'): Promise<InjurySyncResult> {
  const supabase = getSupabase()
  if (!supabase) {
    return { success: false, sport, count: 0, activeInjuries: 0, errors: ['Supabase not configured'] }
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
    console.log(`[SYNC] Starting injury sync for ${sport.toUpperCase()}...`)
    
    // First, mark all existing injuries as inactive (will reactivate current ones)
    await supabase
      .from('injuries')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)
      .in('team_id', 
        supabase.from('teams').select('id').eq('sport', sport.toUpperCase())
      )

    // Fetch current injuries
    const injuries = await client.getInjuries({
      league,
      season: currentSeason
    })
    console.log(`[SYNC] Fetched ${injuries.length} injuries from API-Sports`)

    let successCount = 0
    let activeCount = 0

    for (const injuryData of injuries) {
      try {
        const player = injuryData.player
        const team = injuryData.team
        
        // Get team ID from our database
        const { data: teamRecord } = await supabase
          .from('teams')
          .select('id')
          .eq('api_sports_id', team.id)
          .single()

        if (!teamRecord) {
          errors.push(`Team not found: ${team.name}`)
          continue
        }

        // Try to get player ID (may not exist yet)
        let playerId = null
        const { data: playerRecord } = await supabase
          .from('players')
          .select('id')
          .eq('api_sports_id', player.id)
          .single()

        if (playerRecord) {
          playerId = playerRecord.id
        } else {
          // Create player record if doesn't exist
          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({
              api_sports_id: player.id,
              team_id: teamRecord.id,
              name: player.name,
              is_active: true
            })
            .select('id')
            .single()
          
          if (newPlayer) {
            playerId = newPlayer.id
          }
        }

        // Determine severity
        const severity = determineSeverity(injuryData.type, injuryData.reason)
        const bodyPart = extractBodyPart(injuryData.reason)

        // Upsert injury
        const { error } = await supabase.from('injuries').upsert({
          player_id: playerId,
          team_id: teamRecord.id,
          injury_type: injuryData.type || 'Unknown',
          body_part: bodyPart,
          status: mapInjuryStatus(injuryData.status),
          start_date: injuryData.date ? new Date(injuryData.date).toISOString() : null,
          severity,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_id,team_id',
          ignoreDuplicates: false
        })

        if (error) {
          // Try insert if upsert fails
          await supabase.from('injuries').insert({
            player_id: playerId,
            team_id: teamRecord.id,
            injury_type: injuryData.type || 'Unknown',
            body_part: bodyPart,
            status: mapInjuryStatus(injuryData.status),
            start_date: injuryData.date ? new Date(injuryData.date).toISOString() : null,
            severity,
            is_active: true
          })
        }

        successCount++
        activeCount++
        console.log(`✓ Synced injury: ${player.name} - ${injuryData.type}`)
      } catch (err: any) {
        errors.push(`Error syncing injury for ${injuryData.player.name}: ${err.message}`)
      }
    }

    console.log(`[SYNC] Completed ${sport.toUpperCase()} injury sync: ${successCount}/${injuries.length}`)
    
    return { 
      success: errors.length === 0, 
      sport, 
      count: successCount,
      activeInjuries: activeCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error(`[SYNC ERROR] ${sport} injuries:`, error)
    return { 
      success: false, 
      sport, 
      count: 0, 
      activeInjuries: 0,
      errors: [error.message] 
    }
  }
}

export async function syncAllInjuries(): Promise<InjurySyncResult[]> {
  const results = await Promise.all([
    syncInjuries('nba'),
    syncInjuries('nfl'),
    syncInjuries('nhl')
  ])
  
  return results
}

function determineSeverity(type: string, reason: string): string {
  const text = `${type || ''} ${reason || ''}`.toLowerCase()
  
  if (text.includes('season') || text.includes('torn') || text.includes('surgery') || 
      text.includes('acl') || text.includes('achilles')) {
    return 'Severe'
  } else if (text.includes('week') || text.includes('sprain') || text.includes('strain') ||
             text.includes('concussion')) {
    return 'Moderate'
  }
  return 'Minor'
}

function extractBodyPart(reason: string): string {
  if (!reason) return 'Other'
  
  const bodyParts = [
    'knee', 'ankle', 'shoulder', 'back', 'hamstring', 'quad', 
    'calf', 'wrist', 'hand', 'foot', 'achilles', 'groin', 
    'hip', 'elbow', 'neck', 'head', 'rib', 'finger', 'thumb'
  ]
  
  const lowerReason = reason.toLowerCase()
  
  for (const part of bodyParts) {
    if (lowerReason.includes(part)) {
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
  }
  
  return 'Other'
}

function mapInjuryStatus(status: string): string {
  const statusLower = (status || '').toLowerCase()
  
  if (statusLower.includes('out') || statusLower === 'o') {
    return 'Out'
  } else if (statusLower.includes('doubt')) {
    return 'Doubtful'
  } else if (statusLower.includes('question') || statusLower === 'q') {
    return 'Questionable'
  } else if (statusLower.includes('day')) {
    return 'Day-to-Day'
  } else if (statusLower.includes('prob')) {
    return 'Probable'
  }
  
  return 'Unknown'
}

/**
 * Get injury impact for a specific team
 * Returns a chaos sensitivity score 0-1
 */
export async function getTeamInjuryImpact(teamId: number): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  try {
    const { data: injuries } = await supabase
      .from('injuries')
      .select('*, players(*)')
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (!injuries || injuries.length === 0) return 0

    let impact = 0

    // Count by severity
    const severeCount = injuries.filter(i => i.severity === 'Severe').length
    const moderateCount = injuries.filter(i => i.severity === 'Moderate').length
    const minorCount = injuries.filter(i => i.severity === 'Minor').length

    // Severity weights
    impact += severeCount * 0.20
    impact += moderateCount * 0.10
    impact += minorCount * 0.03

    // Check for star player injuries (starters)
    const starInjured = injuries.filter(i => 
      i.severity === 'Severe' && i.players?.is_starter
    ).length
    impact += starInjured * 0.15

    // Check for cluster injuries (3+ at same position)
    const positionCounts: Record<string, number> = {}
    for (const injury of injuries) {
      const pos = injury.players?.position || 'Unknown'
      positionCounts[pos] = (positionCounts[pos] || 0) + 1
    }
    const hasCluster = Object.values(positionCounts).some(c => c >= 3)
    if (hasCluster) impact += 0.10

    return Math.min(1.0, impact)
  } catch (error) {
    console.error('Error calculating injury impact:', error)
    return 0
  }
}


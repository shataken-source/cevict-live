/**
 * Cron Job: Sync Teams
 * Runs weekly to sync team data from API-Sports
 * Schedule: 0 0 * * 0 (Sundays at midnight)
 */

import { NextResponse } from 'next/server'
import { syncAllTeams, syncStandings } from '@/lib/api-sports/services/team-sync'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[CRON] Unauthorized sync-teams attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    console.log('[CRON] Starting team sync...')
    
    // Sync teams for all sports
    const teamResults = await syncAllTeams()
    
    // Also sync standings
    const standingResults = await Promise.all([
      syncStandings('nba'),
      syncStandings('nfl'),
      syncStandings('nhl')
    ])

    const totalTeams = teamResults.reduce((sum, r) => sum + r.count, 0)
    const totalStandings = standingResults.reduce((sum, r) => sum + r.count, 0)
    const hasErrors = teamResults.some(r => !r.success) || standingResults.some(r => !r.success)

    console.log(`[CRON] Team sync complete: ${totalTeams} teams, ${totalStandings} standings`)

    return NextResponse.json({
      success: !hasErrors,
      message: `Synced ${totalTeams} teams and ${totalStandings} standings`,
      teams: teamResults,
      standings: standingResults,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Team sync error:', error)
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

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}


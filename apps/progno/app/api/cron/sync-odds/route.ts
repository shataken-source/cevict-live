/**
 * Cron Job: Sync Odds
 * Runs every 30 minutes to track line movements
 * Schedule: *\/30 * * * * (Every 30 minutes)
 */

import { NextResponse } from 'next/server'
import { MultiSourceOddsService } from '@/lib/api-sports/services/multi-source-odds'
import { getClientForSport, getLeagueId } from '@/lib/api-sports/client'
import { sportsblazeApi } from '@/lib/sportsblaze-client'
import { betstackApi } from '@/lib/betstack-client'

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

  const bypass = process.env.NODE_ENV !== 'production' || process.env.BYPASS_CONSENT === 'true'
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !bypass) {
    console.log('[CRON] Unauthorized sync-odds attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const oddsService = new MultiSourceOddsService()
  const today = new Date().toISOString().split('T')[0]
  const sports = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf', 'cbb']
  const results: any[] = []
  const extraResults = {
    sportsblaze: [] as any[],
    betstack: [] as any[]
  }

  try {
    console.log('[CRON] Starting odds sync...')

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

        console.log(`[CRON] Found ${games.length} ${sport.toUpperCase()} games for today`)

        let synced = 0
        for (const game of games) {
          try {
            // Skip games that have already started
            if (new Date(game.date) < new Date()) continue

            // Get multi-source odds
            await oddsService.getMultiSourceOdds(sport, game.id.toString())
            synced++
          } catch (err) {
            console.error(`[CRON] Error syncing odds for game ${game.id}:`, err)
          }
        }

        results.push({
          sport,
          gamesFound: games.length,
          oddsSynced: synced
        })
      } catch (err: any) {
        console.error(`[CRON] Error processing ${sport}:`, err)
        results.push({
          sport,
          error: err.message
        })
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + (r.oddsSynced || 0), 0)
    console.log(`[CRON] Odds sync complete: ${totalSynced} games synced`)

    return NextResponse.json({
      success: true,
      message: `Synced odds for ${totalSynced} games`,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Odds sync error:', error)
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

export async function POST(request: Request) {
  return GET(request)
}


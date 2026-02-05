/**
 * Cron Job: Update Live Games
 * Runs every minute during game times to track live games
 * Schedule: * * * * * (Every minute) - Only active when games are live
 */

import { NextResponse } from 'next/server'
import { getLiveTracker } from '@/lib/api-sports/services/live-tracker'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[CRON] Unauthorized update-live attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const tracker = getLiveTracker()
  const sports = ['nba', 'nfl', 'nhl']
  const results: any[] = []

  try {
    console.log('[CRON] Updating live games...')

    for (const sport of sports) {
      try {
        const states = await tracker.updateLiveGames(sport)
        results.push({
          sport,
          liveGames: states.length,
          games: states.map(s => ({
            gameId: s.gameId,
            status: s.status,
            score: `${s.homeScore}-${s.awayScore}`,
            momentum: s.momentumScore.toFixed(2),
            winProb: (s.liveWinProbability * 100).toFixed(1) + '%'
          }))
        })
      } catch (err: any) {
        results.push({
          sport,
          error: err.message
        })
      }
    }

    const totalLive = results.reduce((sum, r) => sum + (r.liveGames || 0), 0)

    return NextResponse.json({
      success: true,
      message: `Tracking ${totalLive} live games`,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Live update error:', error)
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


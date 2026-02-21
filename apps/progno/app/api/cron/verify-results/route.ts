/**
 * Cron Job: Verify Results
 * Runs every morning to verify yesterday's picks against actual results
 * Schedule: 0 6 * * * (6 AM daily)
 */

import { NextResponse } from 'next/server'
import { getClientForSport, getLeagueId } from '@/app/lib/api-sports/client'
import { getAccuracyTracker } from '@/app/lib/api-sports/services/accuracy-tracker'

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
    console.log('[CRON] Unauthorized verify-results attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
  }

  const accuracyTracker = getAccuracyTracker()

  try {
    console.log('[CRON] Starting results verification...')

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Get picks from yesterday that don't have results yet
    const { data: pendingPicks, error: fetchError } = await supabase
      .from('picks')
      .select('*')
      .gte('game_time', `${yesterdayStr}T00:00:00`)
      .lt('game_time', `${yesterdayStr}T23:59:59`)
      .is('result', null)

    if (fetchError) {
      throw new Error(`Failed to fetch picks: ${fetchError.message}`)
    }

    if (!pendingPicks || pendingPicks.length === 0) {
      console.log('[CRON] No pending picks to verify')
      return NextResponse.json({
        success: true,
        message: 'No pending picks to verify',
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[CRON] Found ${pendingPicks.length} picks to verify`)

    let verified = 0
    let wins = 0
    let losses = 0

    for (const pick of pendingPicks) {
      try {
        const result = await verifyPick(pick, supabase, accuracyTracker)
        if (result) {
          verified++
          if (result.result === 'win') wins++
          if (result.result === 'loss') losses++
        }
      } catch (err: any) {
        console.error(`[CRON] Error verifying pick ${pick.id}:`, err.message)
      }
    }

    const winRate = verified > 0 ? (wins / verified * 100).toFixed(1) : 0

    console.log(`[CRON] Verified ${verified} picks: ${wins}W-${losses}L (${winRate}%)`)

    return NextResponse.json({
      success: true,
      message: `Verified ${verified} picks`,
      summary: {
        verified,
        wins,
        losses,
        winRate: `${winRate}%`
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Results verification error:', error)
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

async function verifyPick(
  pick: any,
  supabase: any,
  accuracyTracker: any
): Promise<{ result: 'win' | 'loss' | 'push' } | null> {
  try {
    const sport = pick.sport.toLowerCase()
    const client = getClientForSport(sport)
    
    if (!client || !pick.api_sports_game_id) {
      console.log(`[CRON] Cannot verify pick ${pick.id}: missing client or game ID`)
      return null
    }

    // Get game result from API-Sports
    const game = await client.getGame(pick.api_sports_game_id)
    
    if (!game) {
      console.log(`[CRON] Game ${pick.api_sports_game_id} not found`)
      return null
    }

    // Check if game is finished
    const status = (game.status?.long || '').toLowerCase()
    if (!status.includes('final') && !status.includes('finished')) {
      console.log(`[CRON] Game ${pick.api_sports_game_id} not finished yet`)
      return null
    }

    // Determine winner
    const homeScore = game.scores?.home?.total || 0
    const awayScore = game.scores?.away?.total || 0
    
    let actualWinner: string
    if (homeScore > awayScore) {
      actualWinner = pick.home_team
    } else if (awayScore > homeScore) {
      actualWinner = pick.away_team
    } else {
      // Push
      await supabase
        .from('picks')
        .update({ result: 'push' })
        .eq('id', pick.id)

      await accuracyTracker.recordResult({
        pickId: pick.id,
        predictedWinner: pick.pick,
        actualWinner: 'tie',
        result: 'push',
        predictedConfidence: pick.confidence,
        profitLoss: 0,
        sport: pick.sport,
        betType: pick.pick_type
      })

      return { result: 'push' }
    }

    // Determine result
    const isWin = pick.pick === actualWinner
    const result = isWin ? 'win' : 'loss'

    // Calculate profit/loss (assuming -110 odds)
    const profitLoss = isWin ? 0.91 : -1.0

    // Update pick
    await supabase
      .from('picks')
      .update({ 
        result,
        actual_home_score: homeScore,
        actual_away_score: awayScore
      })
      .eq('id', pick.id)

    // Record in accuracy tracker
    await accuracyTracker.recordResult({
      pickId: pick.id,
      predictedWinner: pick.pick,
      actualWinner,
      result,
      predictedConfidence: pick.confidence,
      profitLoss,
      sport: pick.sport,
      betType: pick.pick_type
    })

    console.log(`✓ Verified pick ${pick.id}: ${pick.pick} vs ${actualWinner} = ${result}`)
    return { result }
  } catch (error: any) {
    console.error(`[CRON] Error in verifyPick:`, error.message)
    return null
  }
}

export async function POST(request: Request) {
  return GET(request)
}


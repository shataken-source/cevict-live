/**
 * Cron Job: Sync Injuries
 * Runs every 6 hours to keep injury data current
 * Schedule: 0 *\/6 * * * (Every 6 hours)
 */

import { NextResponse } from 'next/server'
import { syncAllInjuries } from '@/app/lib/api-sports/services/injury-sync'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[CRON] Unauthorized sync-injuries attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    console.log('[CRON] Starting injury sync...')
    
    const results = await syncAllInjuries()

    const totalInjuries = results.reduce((sum, r) => sum + r.count, 0)
    const activeInjuries = results.reduce((sum, r) => sum + r.activeInjuries, 0)
    const hasErrors = results.some(r => !r.success)

    console.log(`[CRON] Injury sync complete: ${totalInjuries} injuries synced, ${activeInjuries} active`)

    return NextResponse.json({
      success: !hasErrors,
      message: `Synced ${totalInjuries} injuries (${activeInjuries} active)`,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[CRON] Injury sync error:', error)
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


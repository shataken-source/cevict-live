import { NextRequest, NextResponse } from 'next/server'
import { sendNewsDrop } from '@/lib/news-drops'

/**
 * POST /api/cron/news-drop
 * Generate and send News Drop (twice daily)
 * 
 * Schedule in vercel.json:
 * - Morning drop: 0 9 * * * (9 AM)
 * - Evening drop: 0 21 * * * (9 PM)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📦 Starting News Drop generation...')
    await sendNewsDrop()

    return NextResponse.json({
      success: true,
      message: 'News Drop generated and sent',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API] Error in news-drop cron:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
  }
}

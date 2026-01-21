import { NextResponse } from 'next/server'
import { monitorTrends } from '@/lib/trend-monitor'

export async function GET(request: Request) {
  // Verify cron secret if needed
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await monitorTrends()
    return NextResponse.json({ success: true, message: 'Trend monitoring completed' })
  } catch (error) {
    console.error('Cron trends error:', error)
    return NextResponse.json({ error: 'Trend monitoring failed' }, { status: 500 })
  }
}

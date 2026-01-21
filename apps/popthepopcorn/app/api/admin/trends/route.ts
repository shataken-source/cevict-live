import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { monitorTrends } from '@/lib/trend-monitor'

export async function POST(request: NextRequest) {
  // Check authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run trend monitor in background
    monitorTrends().catch((error) => {
      console.error('Trend monitor error:', error)
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Trend monitor started. Check logs for progress.' 
    })
  } catch (error) {
    console.error('Error starting trend monitor:', error)
    return NextResponse.json({ error: 'Failed to start trend monitor' }, { status: 500 })
  }
}

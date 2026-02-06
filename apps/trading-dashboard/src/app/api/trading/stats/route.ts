import { NextResponse } from 'next/server'
import { fetchTradingStats } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const stats = await fetchTradingStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch trading stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trading stats' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { fetchRecentTrades } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const trades = await fetchRecentTrades()
    return NextResponse.json(trades)
  } catch (error) {
    console.error('Failed to fetch trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}


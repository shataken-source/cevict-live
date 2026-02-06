/**
 * Proxy for Cevict Arb Tool: fetches SportsData.io Game Odds by Date so the
 * browser doesn't hit CORS and the API key stays on the server.
 *
 * GET /api/arb-proxy?league=nba&date=2026-02-03
 * Uses SPORTSDATA_IO_KEY from env. If missing, returns 500.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE = 'https://api.sportsdata.io/v3'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league')?.trim()?.toLowerCase() || 'nba'
  const date = searchParams.get('date')?.trim()

  if (!date) {
    return NextResponse.json({ error: 'Missing date (YYYY-MM-DD)' }, { status: 400 })
  }

  const key = process.env.SPORTSDATA_IO_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'SPORTSDATA_IO_KEY not set. Add it to .env.local for arb proxy.' },
      { status: 500 }
    )
  }

  const url = `${BASE}/${encodeURIComponent(league)}/odds/json/GameOddsByDate/${encodeURIComponent(date)}?key=${encodeURIComponent(key)}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 401 ? 'Invalid API key' : `SportsData.io ${res.status}`, data },
        { status: res.status >= 400 ? res.status : 502 }
      )
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Unexpected response format', data },
        { status: 502 }
      )
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch odds' },
      { status: 502 }
    )
  }
}

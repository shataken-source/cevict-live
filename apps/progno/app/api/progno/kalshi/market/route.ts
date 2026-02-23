import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: txt }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

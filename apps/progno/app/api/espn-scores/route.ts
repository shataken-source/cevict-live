import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

const SPORT_MAP: Record<string, string> = {
  nba: 'basketball/nba',
  nhl: 'hockey/nhl',
  nfl: 'football/nfl',
  ncaab: 'basketball/mens-college-basketball',
  ncaaf: 'football/college-football',
  mlb: 'baseball/mlb',
}

/**
 * GET /api/espn-scores?sport=nba
 *
 * Free ESPN scoreboard — no API key, no quota.
 * Returns live scores, game status, and broadcast info for today's games.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const sport = (url.searchParams.get('sport') || 'nba').toLowerCase()

  const espnPath = SPORT_MAP[sport]
  if (!espnPath) {
    return NextResponse.json({ success: false, error: `Unsupported sport: ${sport}` }, { status: 400 })
  }

  try {
    const res = await fetch(`${ESPN_BASE}/${espnPath}/scoreboard`, {
      next: { revalidate: 30 }, // Cache 30s at edge
    })
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `ESPN ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const games = (data.events || []).map((event: any) => {
      const comp = event.competitions?.[0]
      if (!comp) return null

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home')
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away')
      if (!homeComp || !awayComp) return null

      const statusType = comp.status?.type
      const isLive = statusType?.state === 'in'
      const isFinal = statusType?.state === 'post'

      // Extract broadcast channels
      const channels: string[] = []
      for (const bc of comp.broadcasts || []) {
        for (const name of bc.names || []) channels.push(name)
      }
      for (const geo of comp.geoBroadcasts || []) {
        const name = geo.media?.shortName || geo.media?.callLetters
        if (name && !channels.includes(name)) channels.push(name)
      }

      return {
        id: event.id,
        home: homeComp.team?.displayName || '',
        away: awayComp.team?.displayName || '',
        homeAbbr: homeComp.team?.abbreviation || '',
        awayAbbr: awayComp.team?.abbreviation || '',
        homeScore: parseInt(homeComp.score || '0') || 0,
        awayScore: parseInt(awayComp.score || '0') || 0,
        completed: isFinal,
        live: isLive,
        status: statusType?.shortDetail || statusType?.description || 'Scheduled',
        startTime: event.date || comp.date || '',
        channels: [...new Set(channels)],
      }
    }).filter(Boolean)

    return NextResponse.json({ success: true, data: games })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'ESPN fetch failed' }, { status: 500 })
  }
}

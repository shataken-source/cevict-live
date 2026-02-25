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

interface BroadcastInfo {
  gameId: string
  home: string
  away: string
  shortName: string
  startTime: string
  status: string
  channels: string[]
  nationalTV: string | null
}

/**
 * GET /api/tv-schedule?sport=nba
 * GET /api/tv-schedule?sport=nba,nhl,ncaab  (comma-separated)
 * GET /api/tv-schedule?sport=all
 *
 * Returns broadcast/TV channel info for today's games from ESPN free API.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const sportParam = (url.searchParams.get('sport') || 'nba').toLowerCase()

  const sports = sportParam === 'all'
    ? Object.keys(SPORT_MAP)
    : sportParam.split(',').map(s => s.trim()).filter(s => SPORT_MAP[s])

  if (sports.length === 0) {
    return NextResponse.json({ success: false, error: 'No valid sports provided' }, { status: 400 })
  }

  const allGames: BroadcastInfo[] = []

  for (const sport of sports) {
    const espnPath = SPORT_MAP[sport]
    if (!espnPath) continue

    try {
      const res = await fetch(`${ESPN_BASE}/${espnPath}/scoreboard`, {
        next: { revalidate: 300 }, // Cache 5 min
      })
      if (!res.ok) continue

      const data = await res.json()

      for (const event of data.events || []) {
        const comp = event.competitions?.[0]
        if (!comp) continue

        const broadcasts = comp.broadcasts || []
        const channels: string[] = []
        let nationalTV: string | null = null

        for (const bc of broadcasts) {
          for (const name of bc.names || []) {
            channels.push(name)
            // Identify national networks
            if (isNationalNetwork(name) && !nationalTV) {
              nationalTV = name
            }
          }
        }

        // Also check geoBroadcasts for more detail
        for (const geo of comp.geoBroadcasts || []) {
          const name = geo.media?.shortName || geo.media?.callLetters
          if (name && !channels.includes(name)) {
            channels.push(name)
            if (isNationalNetwork(name) && !nationalTV) {
              nationalTV = name
            }
          }
        }

        const homeTeam = comp.competitors?.find((c: any) => c.homeAway === 'home')?.team
        const awayTeam = comp.competitors?.find((c: any) => c.homeAway === 'away')?.team

        allGames.push({
          gameId: event.id,
          home: homeTeam?.displayName || homeTeam?.shortDisplayName || '',
          away: awayTeam?.displayName || awayTeam?.shortDisplayName || '',
          shortName: event.shortName || `${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation}`,
          startTime: event.date || comp.date || '',
          status: comp.status?.type?.description || 'Scheduled',
          channels: [...new Set(channels)], // Dedupe
          nationalTV,
        })
      }
    } catch (e) {
      console.warn(`[TV Schedule] Failed to fetch ${sport}:`, (e as Error).message)
    }
  }

  // Sort: games with national TV first, then by start time
  allGames.sort((a, b) => {
    if (a.nationalTV && !b.nationalTV) return -1
    if (!a.nationalTV && b.nationalTV) return 1
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  })

  return NextResponse.json({
    success: true,
    count: allGames.length,
    games: allGames,
  })
}

/** Check if a channel name is a major national network */
function isNationalNetwork(name: string): boolean {
  const national = [
    'ESPN', 'ESPN2', 'ESPNU', 'ESPN+', 'ABC',
    'TNT', 'TBS', 'truTV',
    'FOX', 'FS1', 'FS2', 'FOX Sports 1',
    'CBS', 'CBS Sports', 'CBSSN',
    'NBC', 'NBCSN', 'Peacock', 'USA Network', 'USA',
    'NFL Network', 'NFL', 'MLB Network', 'NHL Network', 'NBA TV',
    'BTN', 'Big Ten Network', 'SEC Network', 'ACC Network',
    'Pac-12 Network',
  ]
  const n = name.trim()
  return national.some(net => n.toLowerCase() === net.toLowerCase() || n.toLowerCase().startsWith(net.toLowerCase()))
}

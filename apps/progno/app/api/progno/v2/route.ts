import { NextResponse } from 'next/server'
import { throttledFetch } from '@/app/lib/external-api-throttle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory cache: 10-minute TTL to avoid burning API quota
const V2_CACHE_TTL = 10 * 60 * 1000
const v2Cache: Map<string, { data: any; ts: number }> = new Map()

const SPORT_KEY: Record<string, string> = {
  nhl: 'icehockey_nhl',
  nba: 'basketball_nba',
  nfl: 'americanfootball_nfl',
  ncaab: 'basketball_ncaab',
  ncaaf: 'americanfootball_ncaaf',
  mlb: 'baseball_mlb',
  cbb: 'baseball_ncaa',
}

const ESPN_PATH: Record<string, string> = {
  nba: 'basketball/nba',
  nhl: 'hockey/nhl',
  nfl: 'football/nfl',
  ncaab: 'basketball/mens-college-basketball',
  ncaaf: 'football/college-football',
  mlb: 'baseball/mlb',
  cbb: 'baseball/college-baseball',
}

async function fetchEspnScores(sport: string): Promise<any[] | null> {
  const espnPath = ESPN_PATH[sport]
  if (!espnPath) return null
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return null
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
      return {
        id: event.id,
        home: homeComp.team?.displayName || '',
        away: awayComp.team?.displayName || '',
        homeScore: parseInt(homeComp.score || '0') || 0,
        awayScore: parseInt(awayComp.score || '0') || 0,
        completed: isFinal,
        live: isLive,
        commence_time: event.date || comp.date || '',
        last_update: isFinal || isLive ? new Date().toISOString() : null,
        status: statusType?.shortDetail || statusType?.description || 'Scheduled',
        source: 'espn',
      }
    }).filter(Boolean)
    return games.length > 0 ? games : null
  } catch {
    return null
  }
}

function americanToImplied(odds: number | null | undefined): number | null {
  if (odds == null || Number.isNaN(odds as any)) return null
  const o = Number(odds)
  if (o > 0) return 100 / (o + 100)
  return Math.abs(o) / (Math.abs(o) + 100)
}

function toId(home: string, away: string, commence: string | Date | undefined): string {
  const d = commence ? new Date(commence).toISOString().slice(0, 10) : 'na'
  return `${home}__${away}__${d}`
}

function getPrimaryKey(): string | null {
  const key =
    (typeof process !== 'undefined' ? process.env.ODDS_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.THE_ODDS_API_KEY : undefined) ||
    null
  return key
}

export async function GET(request: Request) {
  const url = new URL(request.url || '')
  const action = url.searchParams.get('action') || 'games'
  const sport = (url.searchParams.get('sport') || 'nhl').toLowerCase()
  const gameId = url.searchParams.get('gameId') || ''

  const oddsKey = SPORT_KEY[sport]
  if (!oddsKey) {
    return NextResponse.json({ success: false, error: `Unsupported sport: ${sport}` }, { status: 400 })
  }

  const apiKey = getPrimaryKey()

  // Debug aid: call with &debug=1 to see routing and key presence without hitting externals
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      success: true,
      debug: {
        action,
        sport,
        oddsKey,
        hasKey: !!apiKey,
      },
    })
  }

  try {
    if (action === 'games') {
      if (!apiKey) {
        return NextResponse.json({ success: true, data: [] })
      }

      // Check cache first
      const ck = `games_${sport}`
      const hit = v2Cache.get(ck)
      if (hit && (Date.now() - hit.ts) < V2_CACHE_TTL) {
        console.log(`[v2] Cache hit for games/${sport}`)
        return NextResponse.json({ success: true, data: hit.data })
      }

      const remote = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
      const res = await throttledFetch('the-odds-api', remote, { cache: 'no-store' })
      if (!res.ok) {
        // Return stale cache if available rather than error
        if (hit) return NextResponse.json({ success: true, data: hit.data })
        return NextResponse.json({ success: false, error: `Odds API ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
      const out = (Array.isArray(data) ? data : []).map((g: any) => {
        const h2h = g.bookmakers?.flatMap((b: any) => (b.markets || [])).find((m: any) => m?.key === 'h2h')
        const spreads = g.bookmakers?.flatMap((b: any) => (b.markets || [])).find((m: any) => m?.key === 'spreads')
        const totals = g.bookmakers?.flatMap((b: any) => (b.markets || [])).find((m: any) => m?.key === 'totals')
        const ml: Record<string, number | undefined> = {}
        if (h2h?.outcomes) {
          for (const o of h2h.outcomes) ml[o.name] = o.price
        }
        const spreadHome = spreads?.outcomes?.find((o: any) => o.name === g.home_team)?.point
        const totalLine = totals?.outcomes?.[0]?.point
        return {
          id: g.id || toId(g.home_team, g.away_team, g.commence_time),
          homeTeam: g.home_team,
          awayTeam: g.away_team,
          startTime: g.commence_time,
          venue: g.venue || '',
          odds: {
            moneyline: { home: ml[g.home_team] ?? null, away: ml[g.away_team] ?? null },
            spread: { home: spreadHome ?? null },
            total: { line: totalLine ?? null },
          },
        }
      })
      // Store in cache
      v2Cache.set(ck, { data: out, ts: Date.now() })
      return NextResponse.json({ success: true, data: out })
    }

    if (action === 'live-scores') {
      // 1️⃣ Try ESPN first — free, no quota, near real-time
      const espn = await fetchEspnScores(sport)
      if (espn) {
        return NextResponse.json({ success: true, data: espn })
      }

      // 2️⃣ Fallback to Odds API if ESPN returned nothing
      if (!apiKey) {
        return NextResponse.json({ success: true, data: [] })
      }
      const remote = `https://api.the-odds-api.com/v4/sports/${oddsKey}/scores/?daysFrom=1&apiKey=${apiKey}`
      const res = await throttledFetch('the-odds-api', remote, { cache: 'no-store' })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Scores API ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
      const out = (Array.isArray(data) ? data : []).map((g: any) => {
        const hs = g.scores?.find((s: any) => s.name === g.home_team)?.score
        const as = g.scores?.find((s: any) => s.name === g.away_team)?.score
        const commenced = g.commence_time ? new Date(g.commence_time).getTime() <= Date.now() : false
        return {
          id: g.id || toId(g.home_team, g.away_team, g.commence_time),
          home: g.home_team,
          away: g.away_team,
          homeScore: Number(hs ?? 0),
          awayScore: Number(as ?? 0),
          completed: !!g.completed,
          live: commenced && !g.completed,
          commence_time: g.commence_time,
          last_update: g.last_update || null,
          source: 'odds-api',
        }
      })
      return NextResponse.json({ success: true, data: out })
    }

    if (action === 'prediction') {
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'Odds API key not set' }, { status: 400 })
      }

      // Reuse cached raw data if available
      const rawCk = `raw_${sport}`
      const rawHit = v2Cache.get(rawCk)
      let data: any
      if (rawHit && (Date.now() - rawHit.ts) < V2_CACHE_TTL) {
        console.log(`[v2] Cache hit for prediction/${sport}`)
        data = rawHit.data
      } else {
        const remote = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
        const res = await throttledFetch('the-odds-api', remote, { cache: 'no-store' })
        if (!res.ok) {
          return NextResponse.json({ success: false, error: `Odds API ${res.status}` }, { status: 502 })
        }
        data = await res.json()
        v2Cache.set(rawCk, { data, ts: Date.now() })
      }
      const games = (Array.isArray(data) ? data : []).map((g: any) => ({
        id: g.id || toId(g.home_team, g.away_team, g.commence_time),
        homeTeam: g.home_team,
        awayTeam: g.away_team,
        commence_time: g.commence_time,
        h2h: g.bookmakers?.flatMap((b: any) => (b.markets || [])).find((m: any) => m?.key === 'h2h'),
      }))
      const game = games.find((x: any) => String(x.id) === String(gameId))
      if (!game) return NextResponse.json({ success: false, error: `Game not found: ${gameId}` }, { status: 404 })

      let homeOdds: number | null = null
      let awayOdds: number | null = null
      if (game.h2h?.outcomes) {
        for (const o of game.h2h.outcomes) {
          if (o.name === game.homeTeam) homeOdds = Number(o.price)
          if (o.name === game.awayTeam) awayOdds = Number(o.price)
        }
      }
      const homeProb = americanToImplied(homeOdds)
      const awayProb = americanToImplied(awayOdds)
      const winner = (homeProb ?? 0) >= (awayProb ?? 0) ? game.homeTeam : game.awayTeam
      const confidence = Math.max(homeProb ?? 0, awayProb ?? 0)

      const result = {
        winner,
        confidence,
        score: { home: null, away: null },
        keyFactors: [
          `Moneyline edge: ${winner === game.homeTeam ? (homeOdds ?? 'n/a') : (awayOdds ?? 'n/a')}`,
          `Implied probability ${(confidence * 100).toFixed(1)}%`,
        ],
      }
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

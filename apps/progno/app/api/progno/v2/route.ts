/**
 * Lightweight Progno v2 API used by app/progno/page.ts
 *
 * Actions:
 * - action=games&sport=nhl        -> list of upcoming games with basic odds
 * - action=live-scores&sport=nhl  -> live/final scores for yesterday/today
 * - action=prediction&gameId=ID&sport=nhl -> simple probability-based pick for a single game
 */

import { NextResponse } from 'next/server'
import { throttledFetch } from '@/app/lib/external-api-throttle'
import { getPrimaryKey } from '../../keys-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SPORT_KEY: Record<string, string> = {
  nhl: 'icehockey_nhl',
  nba: 'basketball_nba',
  nfl: 'americanfootball_nfl',
  ncaab: 'basketball_ncaab',
  ncaaf: 'americanfootball_ncaaf',
  mlb: 'baseball_mlb',
  cbb: 'baseball_ncaa',
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
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Odds API key not set' }, { status: 500 })
  }

  try {
    if (action === 'games') {
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
      const res = await throttledFetch('the-odds-api', url, { cache: 'no-store' })
      if (!res.ok) {
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
      return NextResponse.json({ success: true, data: out })
    }

    if (action === 'live-scores') {
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/scores/?daysFrom=2&apiKey=${apiKey}`
      const res = await throttledFetch('the-odds-api', url, { cache: 'no-store' })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Scores API ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
      const out = (Array.isArray(data) ? data : []).map((g: any) => {
        const hs = g.scores?.find((s: any) => s.name === g.home_team)?.score ?? g.scores?.find((s: any) => s.name === g.home_team)?.points
        const as = g.scores?.find((s: any) => s.name === g.away_team)?.score ?? g.scores?.find((s: any) => s.name === g.away_team)?.points
        return {
          id: g.id || toId(g.home_team, g.away_team, g.commence_time),
          home: g.home_team,
          away: g.away_team,
          homeScore: Number(hs ?? 0),
          awayScore: Number(as ?? 0),
          completed: !!g.completed,
          commence_time: g.commence_time,
        }
      })
      return NextResponse.json({ success: true, data: out })
    }

    if (action === 'prediction') {
      // Fetch games to find the one requested
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
      const res = await throttledFetch('the-odds-api', url, { cache: 'no-store' })
      if (!res.ok) {
        return NextResponse.json({ success: false, error: `Odds API ${res.status}` }, { status: 502 })
      }
      const data = await res.json()
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

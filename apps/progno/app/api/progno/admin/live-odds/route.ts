import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SPORTS = [
  { key: 'basketball_nba', label: 'NBA' },
  { key: 'basketball_ncaab', label: 'NCAAB' },
  { key: 'icehockey_nhl', label: 'NHL' },
  { key: 'americanfootball_nfl', label: 'NFL' },
  { key: 'baseball_mlb', label: 'MLB' },
  { key: 'americanfootball_ncaaf', label: 'NCAAF' },
  { key: 'baseball_ncaa', label: 'NCAAB Baseball' },
]

function getPrimaryKey(): string | undefined {
  return process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY
}

function americanToDecimal(odds: number): number {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1
}

function impliedProb(odds: number): number {
  return (1 / americanToDecimal(odds)) * 100
}

function noVigProb(homeOdds: number, awayOdds: number) {
  const rawHome = impliedProb(homeOdds)
  const rawAway = impliedProb(awayOdds)
  const overround = rawHome + rawAway
  return { home: rawHome / overround * 100, away: rawAway / overround * 100 }
}

function isAuthorized(request: NextRequest): boolean {
  // Accept secret via header (preferred) or query param (legacy fallback)
  const auth = request.headers.get('authorization') || ''
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const { searchParams } = new URL(request.url)
  const queryToken = searchParams.get('secret') || ''
  const token = headerToken || queryToken
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  if (!cronSecret && !adminPassword) return false
  return (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const sportParam = searchParams.get('sports') || 'basketball_nba,basketball_ncaab,icehockey_nhl'
  const requestedSports = sportParam.split(',').map(s => s.trim()).filter(Boolean)

  const apiKey = getPrimaryKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'No odds API key configured' }, { status: 500 })
  }

  const results: any[] = []
  const errors: Record<string, string> = {}

  await Promise.allSettled(requestedSports.map(async (sportKey) => {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&bookmakers=draftkings,fanduel,betmgm,caesars,pointsbet,betonlineag,williamhill_us,mybookieag`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        errors[sportKey] = `HTTP ${res.status}`
        return
      }
      const games: any[] = await res.json()
      const sportLabel = SPORTS.find(s => s.key === sportKey)?.label || sportKey

      for (const game of games) {
        const bookmakers = game.bookmakers || []
        const books: Record<string, { homeML: number | null; awayML: number | null; homeSpread: number | null; spreadOdds: number | null; total: number | null }> = {}

        let homeMLSum = 0, awayMLSum = 0, homeMLCount = 0, awayMLCount = 0
        let spreadSum = 0, spreadCount = 0
        let totalSum = 0, totalCount = 0

        for (const book of bookmakers) {
          const h2h = book.markets?.find((m: any) => m.key === 'h2h')
          const spreads = book.markets?.find((m: any) => m.key === 'spreads')
          const totals = book.markets?.find((m: any) => m.key === 'totals')

          const hML = h2h?.outcomes?.find((o: any) => o.name === game.home_team)?.price ?? null
          const aML = h2h?.outcomes?.find((o: any) => o.name === game.away_team)?.price ?? null
          const hSpread = spreads?.outcomes?.find((o: any) => o.name === game.home_team)?.point ?? null
          const sOdds = spreads?.outcomes?.find((o: any) => o.name === game.home_team)?.price ?? null
          const tot = totals?.outcomes?.find((o: any) => o.name === 'Over')?.point ?? null

          books[book.key] = { homeML: hML, awayML: aML, homeSpread: hSpread, spreadOdds: sOdds, total: tot }

          if (hML != null && Math.abs(hML) >= 100) { homeMLSum += hML; homeMLCount++ }
          if (aML != null && Math.abs(aML) >= 100) { awayMLSum += aML; awayMLCount++ }
          if (hSpread != null) { spreadSum += hSpread; spreadCount++ }
          if (tot != null) { totalSum += tot; totalCount++ }
        }

        const avgHomeML = homeMLCount > 0 ? Math.round(homeMLSum / homeMLCount) : null
        const avgAwayML = awayMLCount > 0 ? Math.round(awayMLSum / awayMLCount) : null
        const avgSpread = spreadCount > 0 ? Math.round(spreadSum / spreadCount * 2) / 2 : null
        const avgTotal = totalCount > 0 ? Math.round(totalSum / totalCount * 2) / 2 : null

        let noVig = null
        if (avgHomeML && avgAwayML) {
          noVig = noVigProb(avgHomeML, avgAwayML)
        }

        const bestHomeML = homeMLCount > 0
          ? Math.max(...Object.values(books).map(b => b.homeML ?? -9999).filter(v => Math.abs(v) >= 100))
          : null
        const bestAwayML = awayMLCount > 0
          ? Math.max(...Object.values(books).map(b => b.awayML ?? -9999).filter(v => Math.abs(v) >= 100))
          : null

        results.push({
          id: game.id,
          sport: sportLabel,
          sportKey,
          home_team: game.home_team,
          away_team: game.away_team,
          commence_time: game.commence_time,
          bookmakerCount: bookmakers.length,
          books,
          consensus: {
            homeML: avgHomeML,
            awayML: avgAwayML,
            spread: avgSpread,
            total: avgTotal,
          },
          best: {
            homeML: bestHomeML !== -9999 ? bestHomeML : null,
            awayML: bestAwayML !== -9999 ? bestAwayML : null,
          },
          noVig,
        })
      }
    } catch (e: any) {
      errors[sportKey] = e?.message || 'fetch error'
    }
  }))

  results.sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())

  return NextResponse.json({
    success: true,
    count: results.length,
    games: results,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    fetchedAt: new Date().toISOString(),
  })
}

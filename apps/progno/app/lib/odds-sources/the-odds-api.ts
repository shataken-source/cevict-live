/**
 * The Odds API Integration
 *
 * Free tier: 500 requests/month
 * Best for: Early odds from multiple sportsbooks
 *
 * Get API key: https://the-odds-api.com/
 * Set in .env.local: THE_ODDS_API_KEY=your_key_here
 */

import { EarlyOdds } from '../early-odds-aggregator'

export class TheOddsAPI {
  private readonly BASE_URL = 'https://api.the-odds-api.com/v4'
  private readonly apiKey: string

  constructor() {
    // Load from environment variables - try multiple possible names
    this.apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY_2 || process.env.ODDS_API_KEY || ''
    if (this.apiKey) {
      console.log('[The Odds API] API key loaded from environment')
    } else {
      console.warn('[The Odds API] No API key found in environment variables')
    }
  }

  /**
   * Fetch early odds for a sport
   */
  async fetchOdds(sport: string, region: string = 'us'): Promise<EarlyOdds[]> {
    if (!this.apiKey) {
      console.warn('[The Odds API] No API key found, skipping')
      return []
    }

    const sportMap: Record<string, string> = {
      'NFL': 'americanfootball_nfl',
      'NCAAF': 'americanfootball_ncaaf',
      'NBA': 'basketball_nba',
      'NCAAB': 'basketball_ncaab',
      'MLB': 'baseball_mlb',
      'NHL': 'icehockey_nhl'
    }

    const apiSport = sportMap[sport]
    if (!apiSport) return []

    try {
      const url = `${this.BASE_URL}/sports/${apiSport}/odds/?apiKey=${this.apiKey}&regions=${region}&markets=h2h,spreads,totals&oddsFormat=american`

      const response = await fetch(url)
      if (!response.ok) {
        console.error(`[The Odds API] Failed: ${response.status}`)
        return []
      }

      const data = await response.json()
      const earlyOdds: EarlyOdds[] = []

      for (const game of data) {
        // Get odds from first bookmaker (usually the "opening" line)
        const bookmaker = game.bookmakers?.[0]
        if (!bookmaker) continue

        const h2h = bookmaker.markets.find((m: any) => m.key === 'h2h')
        const spreads = bookmaker.markets.find((m: any) => m.key === 'spreads')
        const totals = bookmaker.markets.find((m: any) => m.key === 'totals')

        const homeTeam = game.home_team
        const awayTeam = game.away_team

        // Find home/away outcomes
        const homeH2H = h2h?.outcomes.find((o: any) => o.name === homeTeam)
        const awayH2H = h2h?.outcomes.find((o: any) => o.name === awayTeam)
        const homeSpread = spreads?.outcomes.find((o: any) => o.name === homeTeam)
        const totalOver = totals?.outcomes.find((o: any) => o.name === 'Over')
        const totalUnder = totals?.outcomes.find((o: any) => o.name === 'Under')

        earlyOdds.push({
          gameId: game.id,
          sport,
          homeTeam,
          awayTeam,
          gameDate: game.commence_time,
          capturedAt: new Date().toISOString(),
          source: bookmaker.key as any,
          odds: {
            homeML: homeH2H?.price,
            awayML: awayH2H?.price,
            spread: homeSpread?.point,
            spreadOdds: homeSpread?.price,
            total: totalOver?.point,
            overOdds: totalOver?.price,
            underOdds: totalUnder?.price
          }
        })
      }

      // Log remaining quota
      const remaining = response.headers.get('x-requests-remaining')
      if (remaining) {
        console.log(`[The Odds API] Requests remaining: ${remaining}`)
      }

      return earlyOdds
    } catch (error) {
      console.error('[The Odds API] Error:', error)
      return []
    }
  }

  /**
   * Get all available sports
   */
  async getSports(): Promise<string[]> {
    if (!this.apiKey) return []

    try {
      const url = `${this.BASE_URL}/sports/?apiKey=${this.apiKey}`
      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      return data.map((s: any) => s.key)
    } catch (error) {
      console.error('[The Odds API] Error fetching sports:', error)
      return []
    }
  }
}

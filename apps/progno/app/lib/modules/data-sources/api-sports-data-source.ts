/**
 * Data Source: API-Sports
 * Fallback game data source when The Odds API returns nothing. Priority 2.
 */

import type { DataSourceModule, RawGame } from '../types'
import { fetchApiSportsOdds } from '../../../../lib/api-sports-client'

const SPORT_MAP: Record<string, string> = {
  'basketball_ncaab': 'ncaab', 'baseball_mlb': 'mlb',
  'basketball_nba': 'nba', 'americanfootball_nfl': 'nfl',
  'icehockey_nhl': 'nhl', 'americanfootball_ncaaf': 'ncaaf',
}

export class ApiSportsDataSource implements DataSourceModule {
  readonly id = 'api-sports'
  readonly priority = 2

  async fetch(sport: string): Promise<RawGame[]> {
    if (!process.env.API_SPORTS_KEY) return []
    const mapped = SPORT_MAP[sport]
    if (!mapped) return []
    try {
      const games = await fetchApiSportsOdds(mapped)
      return games.map(g => ({
        id: String(g.id),
        sport,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        commenceTime: g.startTime,
        bookmakers: g.odds?.moneyline?.home ? [{
          key: 'api-sports', title: 'API-Sports',
          markets: [{ key: 'h2h', outcomes: [
            { name: g.homeTeam, price: g.odds.moneyline.home },
            { name: g.awayTeam, price: g.odds.moneyline.away },
          ]}],
        }] : [],
      }))
    } catch {
      return []
    }
  }
}

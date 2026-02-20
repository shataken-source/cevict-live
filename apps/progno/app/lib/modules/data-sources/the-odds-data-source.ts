/**
 * Data Source: The Odds API
 * Primary game data source. Priority 1.
 */

import type { DataSourceModule, RawGame } from '../types'
import { getPrimaryKey } from '../../../keys-store'

export class TheOddsDataSource implements DataSourceModule {
  readonly id = 'the-odds-api'
  readonly priority = 1

  async fetch(sport: string): Promise<RawGame[]> {
    const apiKey = getPrimaryKey()
    if (!apiKey) return []
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`,
        { cache: 'no-store' }
      )
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }
}

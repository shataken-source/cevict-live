/**
 * Multi-Source Odds Comparison Service
 * Compares odds from multiple sources to detect sharp money and market inefficiencies
 */

import { getClientForSport, getLeagueId } from '../client'

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export interface OddsData {
  homeOdds: number | null
  awayOdds: number | null
  spread: number | null
  total: number | null
  source: string
}

export interface OddsComparison {
  gameId: string
  timestamp: string
  sources: {
    apiSports: OddsData | null
    oddsApi: OddsData | null
    sportsBlaze: OddsData | null
  }
  consensus: {
    spread: number | null
    total: number | null
    homeOdds: number | null
    awayOdds: number | null
  }
  variance: {
    spread: number
    total: number
  }
  sharpMoneyIndicator: 'sharp_home' | 'sharp_away' | 'neutral' | 'insufficient_data'
  marketEfficiencyScore: number
  sourcesAvailable: number
}

export class MultiSourceOddsService {
  /**
   * Fetch odds from all available sources and compare
   */
  async getMultiSourceOdds(sport: string, gameId: string): Promise<OddsComparison> {
    const [apiSportsOdds, oddsApiOdds, sportsBlazeOdds] = await Promise.allSettled([
      this.fetchApiSportsOdds(sport, gameId),
      this.fetchOddsApiOdds(sport, gameId),
      this.fetchSportsBlazeOdds(sport, gameId)
    ])

    const comparison = this.compareOdds(
      apiSportsOdds.status === 'fulfilled' ? apiSportsOdds.value : null,
      oddsApiOdds.status === 'fulfilled' ? oddsApiOdds.value : null,
      sportsBlazeOdds.status === 'fulfilled' ? sportsBlazeOdds.value : null,
      gameId
    )

    // Store comparison for historical analysis
    await this.storeOddsSnapshot(comparison)

    return comparison
  }

  /**
   * Fetch odds from API-Sports
   */
  private async fetchApiSportsOdds(sport: string, gameId: string): Promise<OddsData | null> {
    try {
      const client = getClientForSport(sport)
      if (!client) return null

      const odds = await client.getOdds({ game: parseInt(gameId) })
      
      if (!odds || odds.length === 0) return null

      // Find moneyline and spread bets
      let homeOdds: number | null = null
      let awayOdds: number | null = null
      let spread: number | null = null
      let total: number | null = null

      for (const bookmaker of odds) {
        for (const bet of bookmaker.bets) {
          if (bet.name === 'Home/Away' || bet.name === 'Match Winner') {
            const home = bet.values.find(v => v.value === 'Home')
            const away = bet.values.find(v => v.value === 'Away')
            if (home) homeOdds = parseFloat(home.odd)
            if (away) awayOdds = parseFloat(away.odd)
          }
          if (bet.name === 'Handicap' || bet.name === 'Asian Handicap') {
            const homeSpread = bet.values.find(v => v.value.includes('Home'))
            if (homeSpread) {
              const match = homeSpread.value.match(/-?\d+\.?\d*/)
              if (match) spread = parseFloat(match[0])
            }
          }
          if (bet.name === 'Over/Under' || bet.name === 'Total') {
            const overBet = bet.values.find(v => v.value.includes('Over'))
            if (overBet) {
              const match = overBet.value.match(/\d+\.?\d*/)
              if (match) total = parseFloat(match[0])
            }
          }
        }
        // Use first bookmaker with data
        if (homeOdds !== null) break
      }

      return {
        homeOdds,
        awayOdds,
        spread,
        total,
        source: 'api-sports'
      }
    } catch (error) {
      console.error('[ODDS] API-Sports fetch error:', error)
      return null
    }
  }

  /**
   * Fetch odds from The Odds API
   */
  private async fetchOddsApiOdds(sport: string, gameId: string): Promise<OddsData | null> {
    try {
      const apiKey = process.env.ODDS_API_KEY
      if (!apiKey) return null

      // Map sport to Odds API format
      const sportKey = this.mapSportToOddsApi(sport)
      if (!sportKey) return null

      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
      )

      if (!response.ok) return null

      const data = await response.json()
      
      // Find the matching game (simplified - in production, match by teams/time)
      const game = data[0] // This should be matched more precisely
      if (!game || !game.bookmakers || game.bookmakers.length === 0) return null

      const bookmaker = game.bookmakers[0]
      let homeOdds: number | null = null
      let awayOdds: number | null = null
      let spread: number | null = null
      let total: number | null = null

      for (const market of bookmaker.markets) {
        if (market.key === 'h2h') {
          const home = market.outcomes.find((o: any) => o.name === game.home_team)
          const away = market.outcomes.find((o: any) => o.name === game.away_team)
          if (home) homeOdds = home.price
          if (away) awayOdds = away.price
        }
        if (market.key === 'spreads') {
          const homeSpread = market.outcomes.find((o: any) => o.name === game.home_team)
          if (homeSpread) spread = homeSpread.point
        }
        if (market.key === 'totals') {
          const over = market.outcomes.find((o: any) => o.name === 'Over')
          if (over) total = over.point
        }
      }

      return {
        homeOdds,
        awayOdds,
        spread,
        total,
        source: 'odds-api'
      }
    } catch (error) {
      console.error('[ODDS] The Odds API fetch error:', error)
      return null
    }
  }

  /**
   * Fetch odds from SportsBlaze
   */
  private async fetchSportsBlazeOdds(sport: string, gameId: string): Promise<OddsData | null> {
    try {
      const apiKey = process.env.SPORTS_BLAZE_API_KEY
      if (!apiKey) return null

      // SportsBlaze API call (implement based on their API)
      // This is a placeholder - actual implementation depends on SportsBlaze API structure
      
      return null // Placeholder
    } catch (error) {
      console.error('[ODDS] SportsBlaze fetch error:', error)
      return null
    }
  }

  /**
   * Compare odds from multiple sources
   */
  private compareOdds(
    apiSports: OddsData | null,
    oddsApi: OddsData | null,
    sportsBlaze: OddsData | null,
    gameId: string
  ): OddsComparison {
    const sources = [apiSports, oddsApi, sportsBlaze].filter(Boolean) as OddsData[]
    
    if (sources.length === 0) {
      return {
        gameId,
        timestamp: new Date().toISOString(),
        sources: { apiSports, oddsApi, sportsBlaze },
        consensus: { spread: null, total: null, homeOdds: null, awayOdds: null },
        variance: { spread: 0, total: 0 },
        sharpMoneyIndicator: 'insufficient_data',
        marketEfficiencyScore: 0.5,
        sourcesAvailable: 0
      }
    }

    // Calculate consensus values
    const spreads = sources.map(s => s.spread).filter((s): s is number => s !== null)
    const totals = sources.map(s => s.total).filter((t): t is number => t !== null)
    const homeOddsList = sources.map(s => s.homeOdds).filter((o): o is number => o !== null)
    const awayOddsList = sources.map(s => s.awayOdds).filter((o): o is number => o !== null)

    const consensusSpread = spreads.length > 0 ? this.average(spreads) : null
    const consensusTotal = totals.length > 0 ? this.average(totals) : null
    const consensusHomeOdds = homeOddsList.length > 0 ? this.average(homeOddsList) : null
    const consensusAwayOdds = awayOddsList.length > 0 ? this.average(awayOddsList) : null

    // Calculate variance
    const spreadVariance = this.calculateVariance(spreads)
    const totalVariance = this.calculateVariance(totals)

    // Detect sharp money
    const sharpIndicator = this.detectSharpMoney(apiSports, oddsApi, sportsBlaze)

    // Calculate market efficiency (lower variance = more efficient)
    const marketEfficiency = 1 - Math.min(1, (spreadVariance + totalVariance) / 4)

    return {
      gameId,
      timestamp: new Date().toISOString(),
      sources: { apiSports, oddsApi, sportsBlaze },
      consensus: {
        spread: consensusSpread,
        total: consensusTotal,
        homeOdds: consensusHomeOdds,
        awayOdds: consensusAwayOdds
      },
      variance: {
        spread: spreadVariance,
        total: totalVariance
      },
      sharpMoneyIndicator: sharpIndicator,
      marketEfficiencyScore: marketEfficiency,
      sourcesAvailable: sources.length
    }
  }

  /**
   * Detect sharp money signals based on odds discrepancies
   */
  private detectSharpMoney(
    apiSports: OddsData | null,
    oddsApi: OddsData | null,
    sportsBlaze: OddsData | null
  ): 'sharp_home' | 'sharp_away' | 'neutral' | 'insufficient_data' {
    const sources = [apiSports, oddsApi, sportsBlaze].filter(Boolean) as OddsData[]
    
    if (sources.length < 2) return 'insufficient_data'

    const spreads = sources.map(s => s.spread).filter((s): s is number => s !== null)
    if (spreads.length < 2) return 'insufficient_data'

    const avg = this.average(spreads)
    
    // Check if any source differs significantly (1.5+ points)
    for (const source of sources) {
      if (source.spread !== null && Math.abs(source.spread - avg) > 1.5) {
        // Sharp books often move first - if one source shows different line
        return source.spread > avg ? 'sharp_away' : 'sharp_home'
      }
    }
    
    return 'neutral'
  }

  /**
   * Store odds snapshot for historical analysis
   */
  private async storeOddsSnapshot(comparison: OddsComparison): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) return

    try {
      await supabase.from('odds_snapshots').insert({
        game_id: comparison.gameId,
        timestamp: comparison.timestamp,
        // API-Sports
        api_sports_home: comparison.sources.apiSports?.homeOdds,
        api_sports_away: comparison.sources.apiSports?.awayOdds,
        api_sports_spread: comparison.sources.apiSports?.spread,
        api_sports_total: comparison.sources.apiSports?.total,
        // The Odds API
        odds_api_home: comparison.sources.oddsApi?.homeOdds,
        odds_api_away: comparison.sources.oddsApi?.awayOdds,
        odds_api_spread: comparison.sources.oddsApi?.spread,
        odds_api_total: comparison.sources.oddsApi?.total,
        // SportsBlaze
        sportsblaze_home: comparison.sources.sportsBlaze?.homeOdds,
        sportsblaze_away: comparison.sources.sportsBlaze?.awayOdds,
        sportsblaze_spread: comparison.sources.sportsBlaze?.spread,
        sportsblaze_total: comparison.sources.sportsBlaze?.total,
        // Consensus
        consensus_spread: comparison.consensus.spread,
        consensus_total: comparison.consensus.total,
        spread_variance: comparison.variance.spread,
        total_variance: comparison.variance.total,
        market_efficiency_score: comparison.marketEfficiencyScore,
        sharp_money_indicator: comparison.sharpMoneyIndicator
      })
    } catch (error) {
      console.error('[ODDS] Failed to store snapshot:', error)
    }
  }

  /**
   * Record a sharp money signal
   */
  async recordSharpSignal(
    gameId: string,
    direction: 'home' | 'away',
    strength: number,
    lineMove: number,
    reasoning: string
  ): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) return

    try {
      await supabase.from('sharp_signals').insert({
        game_id: gameId,
        signal_type: 'line_discrepancy',
        direction,
        strength,
        line_move: lineMove,
        reasoning
      })
    } catch (error) {
      console.error('[ODDS] Failed to record sharp signal:', error)
    }
  }

  // Utility methods
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length < 2) return 0
    const mean = this.average(numbers)
    return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
  }

  private mapSportToOddsApi(sport: string): string | null {
    const mapping: Record<string, string> = {
      'nba': 'basketball_nba',
      'nfl': 'americanfootball_nfl',
      'nhl': 'icehockey_nhl',
      'ncaaf': 'americanfootball_ncaaf',
      'ncaab': 'basketball_ncaab',
      'cfb': 'americanfootball_ncaaf',
      'cbb': 'basketball_ncaab'
    }
    return mapping[sport.toLowerCase()] || null
  }
}

/**
 * Calculate Information Asymmetry Index from odds comparison
 */
export function calculateInformationAsymmetry(comparison: OddsComparison): number {
  let IAI = 0

  // Sharp money indicator
  if (comparison.sharpMoneyIndicator === 'sharp_home') {
    IAI += 0.15
  } else if (comparison.sharpMoneyIndicator === 'sharp_away') {
    IAI -= 0.15
  }

  // Market efficiency (inefficient markets = more opportunity)
  if (comparison.marketEfficiencyScore < 0.7) {
    IAI += (0.7 - comparison.marketEfficiencyScore) * 0.2
  }

  // High variance between sources indicates uncertainty
  if (comparison.variance.spread > 1.0) {
    IAI *= 0.8 // Reduce confidence when sources disagree
  }

  return Math.max(-0.20, Math.min(0.20, IAI))
}


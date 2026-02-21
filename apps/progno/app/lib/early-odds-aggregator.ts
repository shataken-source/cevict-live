/**
 * Early Odds Aggregator
 *
 * Captures early odds (2-5 days out) from market-setting sportsbooks:
 * - DraftKings (NFL/NCAAF look-aheads)
 * - FanDuel (NBA/NHL/MLB props)
 * - BetOnline (sharp offshore)
 * - Circa Sports (NFL early lines)
 *
 * Strategy: Bet early when value exists, track line movement for potential
 * "line-move arb" opportunities when news causes big shifts.
 */

export interface EarlyOdds {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  gameDate: string
  capturedAt: string
  source: 'draftkings' | 'fanduel' | 'betonline' | 'circa' | 'action-network'
  odds: {
    homeML?: number
    awayML?: number
    spread?: number
    spreadOdds?: number
    total?: number
    overOdds?: number
    underOdds?: number
  }
}

export interface LineMovement {
  gameId: string
  earlyOdds: EarlyOdds
  currentOdds: EarlyOdds
  movement: {
    mlShift: number // Positive = home got more favorable
    spreadShift: number
    totalShift: number
  }
  significantMove: boolean // True if movement > threshold
}

export class EarlyOddsAggregator {
  private readonly SIGNIFICANT_ML_MOVE = 20 // 20 cents = significant
  private readonly SIGNIFICANT_SPREAD_MOVE = 1.0 // 1 point
  private readonly SIGNIFICANT_TOTAL_MOVE = 1.5 // 1.5 points

  /**
   * Fetch early odds from Action Network (free aggregator)
   * Action Network shows "Open" lines from multiple books
   */
  async fetchActionNetworkEarlyOdds(sport: string, daysAhead: number = 3): Promise<EarlyOdds[]> {
    // Action Network API endpoint (public, no key needed)
    // Format: https://api.actionnetwork.com/web/v1/scoreboard/{sport}?period=upcoming

    const sportMap: Record<string, string> = {
      'NFL': 'nfl',
      'NCAAF': 'ncaaf',
      'NBA': 'nba',
      'NHL': 'nhl',
      'MLB': 'mlb',
      'NCAAB': 'ncaab'
    }

    const apiSport = sportMap[sport] || sport.toLowerCase()
    const url = `https://api.actionnetwork.com/web/v1/scoreboard/${apiSport}?period=upcoming`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      if (!response.ok) {
        console.error(`Action Network API failed: ${response.status}`)
        return []
      }

      const data = await response.json()
      const earlyOdds: EarlyOdds[] = []
      const now = new Date()
      const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

      for (const game of data.games || []) {
        const gameDate = new Date(game.start_time)
        if (gameDate > maxDate) continue // Too far out

        const odds = game.odds?.[0] // First book's odds (usually the "open")
        if (!odds) continue

        earlyOdds.push({
          gameId: game.id,
          sport,
          homeTeam: game.teams.find((t: any) => t.is_home)?.display_name || '',
          awayTeam: game.teams.find((t: any) => !t.is_home)?.display_name || '',
          gameDate: game.start_time,
          capturedAt: new Date().toISOString(),
          source: 'action-network',
          odds: {
            homeML: odds.ml_home,
            awayML: odds.ml_away,
            spread: odds.spread_home,
            spreadOdds: odds.spread_home_line,
            total: odds.total,
            overOdds: odds.total_over_line,
            underOdds: odds.total_under_line
          }
        })
      }

      return earlyOdds
    } catch (error) {
      console.error('Error fetching Action Network odds:', error)
      return []
    }
  }

  /**
   * Fetch early odds from ESPN Hidden API (free, no key)
   * ESPN shows odds from multiple books including DraftKings, FanDuel
   */
  async fetchESPNEarlyOdds(sport: string, daysAhead: number = 3): Promise<EarlyOdds[]> {
    const sportMap: Record<string, string> = {
      'NFL': 'football/nfl',
      'NCAAF': 'football/college-football',
      'NBA': 'basketball/nba',
      'NHL': 'hockey/nhl',
      'MLB': 'baseball/mlb',
      'NCAAB': 'basketball/mens-college-basketball'
    }

    const apiSport = sportMap[sport]
    if (!apiSport) return []

    const url = `https://site.api.espn.com/apis/site/v2/sports/${apiSport}/scoreboard`

    try {
      const response = await fetch(url)
      if (!response.ok) return []

      const data = await response.json()
      const earlyOdds: EarlyOdds[] = []
      const now = new Date()
      const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

      for (const event of data.events || []) {
        const gameDate = new Date(event.date)
        if (gameDate > maxDate) continue

        const competition = event.competitions?.[0]
        if (!competition) continue

        const odds = competition.odds?.[0]
        if (!odds) continue

        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home')
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away')

        earlyOdds.push({
          gameId: event.id,
          sport,
          homeTeam: homeTeam?.team?.displayName || '',
          awayTeam: awayTeam?.team?.displayName || '',
          gameDate: event.date,
          capturedAt: new Date().toISOString(),
          source: 'action-network', // ESPN aggregates from multiple sources
          odds: {
            homeML: parseFloat(odds.homeTeamOdds?.moneyLine),
            awayML: parseFloat(odds.awayTeamOdds?.moneyLine),
            spread: parseFloat(odds.spread),
            total: parseFloat(odds.overUnder)
          }
        })
      }

      return earlyOdds
    } catch (error) {
      console.error('Error fetching ESPN odds:', error)
      return []
    }
  }

  /**
   * Compare early odds to current odds and detect significant line movement
   */
  detectLineMovement(earlyOdds: EarlyOdds, currentOdds: EarlyOdds): LineMovement {
    const mlShift = (currentOdds.odds.homeML || 0) - (earlyOdds.odds.homeML || 0)
    const spreadShift = (currentOdds.odds.spread || 0) - (earlyOdds.odds.spread || 0)
    const totalShift = (currentOdds.odds.total || 0) - (earlyOdds.odds.total || 0)

    const significantMove =
      Math.abs(mlShift) >= this.SIGNIFICANT_ML_MOVE ||
      Math.abs(spreadShift) >= this.SIGNIFICANT_SPREAD_MOVE ||
      Math.abs(totalShift) >= this.SIGNIFICANT_TOTAL_MOVE

    return {
      gameId: earlyOdds.gameId,
      earlyOdds,
      currentOdds,
      movement: {
        mlShift,
        spreadShift,
        totalShift
      },
      significantMove
    }
  }

  /**
   * Aggregate early odds from all sources
   */
  async aggregateEarlyOdds(sports: string[], daysAhead: number = 3): Promise<EarlyOdds[]> {
    const allOdds: EarlyOdds[] = []

    // Import The Odds API dynamically
    const { TheOddsAPI } = await import('./odds-sources/the-odds-api')
    const theOddsAPI = new TheOddsAPI()

    for (const sport of sports) {
      // Fetch from The Odds API (primary source)
      const oddsApiData = await theOddsAPI.fetchOdds(sport)
      allOdds.push(...oddsApiData)

      // Fetch from Action Network (fallback)
      const actionOdds = await this.fetchActionNetworkEarlyOdds(sport, daysAhead)
      allOdds.push(...actionOdds)

      // Fetch from ESPN (fallback)
      const espnOdds = await this.fetchESPNEarlyOdds(sport, daysAhead)
      allOdds.push(...espnOdds)

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Deduplicate by gameId, keeping the earliest capture
    const uniqueOdds = new Map<string, EarlyOdds>()
    for (const odds of allOdds) {
      const existing = uniqueOdds.get(odds.gameId)
      if (!existing || new Date(odds.capturedAt) < new Date(existing.capturedAt)) {
        uniqueOdds.set(odds.gameId, odds)
      }
    }

    return Array.from(uniqueOdds.values())
  }
}

/**
 * Injury & Breaking News Tracker
 * 
 * Uses ESPN Hidden API (free, no key required) to track:
 * - Player injuries and status changes
 * - Breaking news that moves lines
 * - Weather conditions for outdoor sports
 * 
 * Strategy: Catch news before odds adjust, identify line-move opportunities
 */

export interface InjuryReport {
  playerId: string
  playerName: string
  team: string
  sport: string
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'day-to-day'
  injury: string
  lastUpdate: string
  impactScore?: number // 0-100, higher = more impact on odds
}

export interface BreakingNews {
  id: string
  headline: string
  description: string
  sport: string
  teams: string[]
  publishedAt: string
  source: string
  oddsImpact: 'high' | 'medium' | 'low'
}

export interface WeatherConditions {
  gameId: string
  location: string
  temperature: number
  windSpeed: number
  windDirection: string
  precipitation: number
  conditions: string
  impactScore: number // 0-100, higher = more impact on totals
}

export class InjuryNewsTracker {
  private readonly ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'
  private readonly ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports'

  /**
   * Fetch injury reports from ESPN Hidden API
   */
  async fetchInjuries(sport: string): Promise<InjuryReport[]> {
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

    try {
      // Get all teams for the sport
      const teamsUrl = `${this.ESPN_BASE}/${apiSport}/teams`
      const teamsResponse = await fetch(teamsUrl)
      if (!teamsResponse.ok) return []

      const teamsData = await teamsResponse.json()
      const injuries: InjuryReport[] = []

      // Fetch roster for each team (includes injury status)
      for (const team of teamsData.sports?.[0]?.leagues?.[0]?.teams || []) {
        const teamId = team.team.id
        const teamName = team.team.displayName

        const rosterUrl = `${this.ESPN_BASE}/${apiSport}/teams/${teamId}?enable=roster`
        const rosterResponse = await fetch(rosterUrl)
        if (!rosterResponse.ok) continue

        const rosterData = await rosterResponse.json()

        // Check each player for injury status
        for (const athlete of rosterData.team?.athletes || []) {
          if (athlete.injuries && athlete.injuries.length > 0) {
            const injury = athlete.injuries[0]
            injuries.push({
              playerId: athlete.id,
              playerName: athlete.displayName,
              team: teamName,
              sport,
              status: this.normalizeStatus(injury.status),
              injury: injury.longComment || injury.details?.type || 'Unknown',
              lastUpdate: injury.date || new Date().toISOString(),
              impactScore: this.calculateImpactScore(athlete, injury)
            })
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      return injuries
    } catch (error) {
      console.error(`Error fetching ${sport} injuries:`, error)
      return []
    }
  }

  /**
   * Fetch breaking news from ESPN
   */
  async fetchBreakingNews(sport: string): Promise<BreakingNews[]> {
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

    try {
      const newsUrl = `${this.ESPN_BASE}/${apiSport}/news`
      const response = await fetch(newsUrl)
      if (!response.ok) return []

      const data = await response.json()
      const news: BreakingNews[] = []

      for (const article of data.articles || []) {
        // Filter for news that impacts odds
        const oddsKeywords = ['injury', 'out', 'suspended', 'trade', 'lineup', 'scratched', 'benched']
        const hasOddsImpact = oddsKeywords.some(keyword => 
          article.headline.toLowerCase().includes(keyword) ||
          article.description?.toLowerCase().includes(keyword)
        )

        if (!hasOddsImpact) continue

        news.push({
          id: article.id,
          headline: article.headline,
          description: article.description || '',
          sport,
          teams: article.categories?.filter((c: any) => c.type === 'team').map((c: any) => c.description) || [],
          publishedAt: article.published,
          source: 'ESPN',
          oddsImpact: this.assessOddsImpact(article.headline, article.description)
        })
      }

      return news.slice(0, 20) // Top 20 most recent
    } catch (error) {
      console.error(`Error fetching ${sport} news:`, error)
      return []
    }
  }

  /**
   * Fetch weather conditions for outdoor sports
   */
  async fetchWeatherConditions(gameId: string, location: string): Promise<WeatherConditions | null> {
    // For now, return null - would need weather API integration
    // Recommended: OpenWeatherMap API (free tier available)
    // Or scrape from ESPN game page which shows weather
    return null
  }

  /**
   * Calculate injury impact score (0-100)
   * Higher score = more likely to move the line
   */
  private calculateImpactScore(athlete: any, injury: any): number {
    let score = 50 // Base score

    // Position importance (QB, starting pitcher, etc.)
    const highImpactPositions = ['QB', 'P', 'SP', 'C', 'G']
    if (highImpactPositions.some(pos => athlete.position?.abbreviation === pos)) {
      score += 30
    }

    // Injury severity
    const status = this.normalizeStatus(injury.status)
    if (status === 'out') score += 20
    else if (status === 'doubtful') score += 10
    else if (status === 'questionable') score += 5

    // Recent performance (if available)
    if (athlete.statistics?.length > 0) {
      // Player has stats = likely starter
      score += 10
    }

    return Math.min(100, score)
  }

  /**
   * Normalize injury status across different ESPN formats
   */
  private normalizeStatus(status: string): InjuryReport['status'] {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('out')) return 'out'
    if (statusLower.includes('doubtful')) return 'doubtful'
    if (statusLower.includes('questionable')) return 'questionable'
    if (statusLower.includes('probable')) return 'probable'
    return 'day-to-day'
  }

  /**
   * Assess odds impact of news headline
   */
  private assessOddsImpact(headline: string, description: string): 'high' | 'medium' | 'low' {
    const text = `${headline} ${description}`.toLowerCase()

    // High impact keywords
    const highImpact = ['out for season', 'suspended', 'traded', 'fired', 'qb', 'starting pitcher']
    if (highImpact.some(keyword => text.includes(keyword))) {
      return 'high'
    }

    // Medium impact keywords
    const mediumImpact = ['out', 'doubtful', 'injury', 'benched', 'lineup change']
    if (mediumImpact.some(keyword => text.includes(keyword))) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Get all injury and news updates for multiple sports
   */
  async getAllUpdates(sports: string[]): Promise<{
    injuries: InjuryReport[]
    news: BreakingNews[]
  }> {
    const injuries: InjuryReport[] = []
    const news: BreakingNews[] = []

    for (const sport of sports) {
      const [sportInjuries, sportNews] = await Promise.all([
        this.fetchInjuries(sport),
        this.fetchBreakingNews(sport)
      ])

      injuries.push(...sportInjuries)
      news.push(...sportNews)

      // Rate limiting between sports
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Sort by impact/recency
    injuries.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0))
    news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    return { injuries, news }
  }
}

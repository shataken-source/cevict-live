/**
 * Team Statistics Fetcher
 * Fetches team performance metrics from various sources
 */

import { TeamStats } from '../../app/weekly-analyzer';

interface TeamStatsCache {
  [key: string]: {
    stats: TeamStats;
    updatedAt: Date;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class TeamStatsFetcher {
  private cache: TeamStatsCache = {};
  private sportsDataIOKey?: string;

  constructor() {
    this.sportsDataIOKey = process.env.SPORTSDATAIO_API_KEY;
  }

  /**
   * Get team statistics for a team
   */
  async getTeamStats(teamName: string, sport: string, season?: string): Promise<TeamStats | null> {
    const cacheKey = `${sport}_${teamName}_${season || 'current'}`;
    
    // Check cache
    if (this.cache[cacheKey]) {
      const cached = this.cache[cacheKey];
      const age = Date.now() - cached.updatedAt.getTime();
      if (age < CACHE_DURATION) {
        return cached.stats;
      }
    }

    // Fetch fresh data
    let stats: TeamStats | null = null;

    if (this.sportsDataIOKey) {
      stats = await this.fetchFromSportsDataIO(teamName, sport, season);
    } else {
      stats = await this.fetchFromFreeSources(teamName, sport);
    }

    if (stats) {
      this.cache[cacheKey] = {
        stats,
        updatedAt: new Date()
      };
    }

    return stats;
  }

  /**
   * Fetch from SportsDataIO (paid)
   */
  private async fetchFromSportsDataIO(teamName: string, sport: string, season?: string): Promise<TeamStats | null> {
    if (!this.sportsDataIOKey) return null;

    try {
      const sportKey = this.mapSportToSportsDataIO(sport);
      if (!sportKey) return null;

      // Fetch team stats
      const url = `https://api.sportsdata.io/v3/${sportKey}/scores/json/TeamSeasonStats/${season || '2024'}`;
      const res = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.sportsDataIOKey
        }
      });

      if (!res.ok) return null;

      const data = await res.json();
      const team = data.find((t: any) => 
        this.normalizeTeamName(t.Name || t.Team) === this.normalizeTeamName(teamName)
      );

      if (!team) return null;

      return this.parseSportsDataIOStats(team, sport);
    } catch (error) {
      console.error('[TeamStats] SportsDataIO fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch from free sources (ESPN scraping, etc.)
   */
  private async fetchFromFreeSources(teamName: string, sport: string): Promise<TeamStats | null> {
    // TODO: Implement ESPN scraping or other free sources
    // For now, return null and use defaults in prediction logic
    console.warn(`[TeamStats] Free source not implemented for ${teamName} (${sport})`);
    return null;
  }

  /**
   * Parse SportsDataIO response to TeamStats format
   */
  private parseSportsDataIOStats(data: any, sport: string): TeamStats {
    // This will vary by sport, implement sport-specific parsing
    return {
      recentForm: {
        last5Wins: data.Last5Wins || 0,
        last5Losses: data.Last5Losses || 0,
        last10Wins: data.Last10Wins || 0,
        last10Losses: data.Last10Losses || 0,
        currentStreak: data.StreakType === 'win' ? 'win' : 'loss',
        streakLength: data.StreakLength || 0
      },
      season: {
        wins: data.Wins || 0,
        losses: data.Losses || 0,
        pointsFor: data.PointsFor || 0,
        pointsAgainst: data.PointsAgainst || 0,
        pointsForPerGame: data.PointsForPerGame || 0,
        pointsAgainstPerGame: data.PointsAgainstPerGame || 0
      },
      homeAway: {
        homeWins: data.HomeWins || 0,
        homeLosses: data.HomeLosses || 0,
        awayWins: data.AwayWins || 0,
        awayLosses: data.AwayLosses || 0,
        homePointsFor: data.HomePointsFor || 0,
        homePointsAgainst: data.HomePointsAgainst || 0,
        awayPointsFor: data.AwayPointsFor || 0,
        awayPointsAgainst: data.AwayPointsAgainst || 0
      },
      ats: {
        wins: data.ATSWins || 0,
        losses: data.ATSLosses || 0,
        pushes: data.ATSPushes || 0,
        winPercentage: data.ATSWins + data.ATSLosses > 0 
          ? (data.ATSWins / (data.ATSWins + data.ATSLosses)) * 100 
          : 0
      },
      totals: {
        overs: data.Overs || 0,
        unders: data.Unders || 0,
        pushes: data.Pushes || 0,
        overPercentage: data.Overs + data.Unders > 0
          ? (data.Overs / (data.Overs + data.Unders)) * 100
          : 0
      },
      advanced: this.parseAdvancedMetrics(data, sport)
    };
  }

  /**
   * Parse advanced metrics (sport-specific)
   */
  private parseAdvancedMetrics(data: any, sport: string): TeamStats['advanced'] {
    switch (sport) {
      case 'NFL':
        return {
          dvoa: data.DVOA,
          epaPerPlay: data.EPAPerPlay,
          successRate: data.SuccessRate
        };
      case 'NBA':
        return {
          netRating: data.NetRating,
          offensiveRating: data.OffensiveRating,
          defensiveRating: data.DefensiveRating
        };
      case 'MLB':
        return {
          woba: data.wOBA,
          fip: data.FIP,
          teamWar: data.TeamWAR
        };
      case 'NHL':
        return {
          corsi: data.Corsi,
          fenwick: data.Fenwick,
          pdo: data.PDO
        };
      default:
        return undefined;
    }
  }

  /**
   * Map sport to SportsDataIO key
   */
  private mapSportToSportsDataIO(sport: string): string | null {
    const map: Record<string, string> = {
      'NFL': 'nfl',
      'NBA': 'nba',
      'MLB': 'mlb',
      'NHL': 'nhl',
      'NCAAF': 'cfb',
      'NCAAB': 'cbb'
    };
    return map[sport] || null;
  }

  /**
   * Normalize team name for matching
   */
  private normalizeTeamName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  }
}

export const teamStatsFetcher = new TeamStatsFetcher();


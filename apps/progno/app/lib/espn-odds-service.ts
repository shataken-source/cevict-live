/**
 * ESPN Odds Fallback Service
 * Fetches odds from ESPN when primary Odds API is incomplete
 */

interface EspnOddsData {
  spread?: {
    home: number;
    away: number;
    line: number;
  };
  total?: {
    line: number;
    over: number;
    under: number;
  };
  moneyline?: {
    home: number;
    away: number;
  };
  source: 'espn' | 'merged' | 'primary' | 'fallback';
  lastUpdated: string;
}

interface EspnEvent {
  id: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    status: {
      type: string;
    };
    competitors: Array<{
      id: string;
      homeAway: 'home' | 'away';
      team: {
        id: string;
        name: string;
        abbreviation: string;
      };
    }>;
    odds?: Array<{
      provider: {
        id: string;
        name: string;
      };
      homeTeamOdds?: {
        moneyLine?: number;
        spreadOdds?: number;
        pointSpread?: number;
        average?: number;
      };
      awayTeamOdds?: {
        moneyLine?: number;
        spreadOdds?: number;
        pointSpread?: number;
        average?: number;
      };
      overUnder?: number;
      overOdds?: number;
      underOdds?: number;
    }>;
  }>;
}

export class EspnOddsService {
  private static readonly ESPN_BASE_URL = 'https://site.api.espn.com/apis/v2/scoreboard';

  private static sportToEspnSport(sport: string): string {
    const mapping: Record<string, string> = {
      'nba': 'basketball/nba',
      'nfl': 'football/nfl',
      'nhl': 'hockey/nhl',
      'mlb': 'baseball/mlb',
      'ncaaf': 'football/college-football',
      'ncaab': 'basketball/mens-college-basketball',
      'wnba': 'basketball/wnba',
      'soccer': 'soccer',
      'tennis': 'tennis',
      'golf': 'golf',
    };
    return mapping[sport.toLowerCase()] || sport;
  }

  /**
   * Fetch odds for a specific date from ESPN
   */
  static async fetchOdds(
    sport: string,
    date: Date
  ): Promise<Map<string, EspnOddsData>> {
    try {
      const espnSport = this.sportToEspnSport(sport);
      const dateStr = date.toISOString().split('T')[0];

      // ESPN uses offset in days
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const url = `${this.ESPN_BASE_URL}/${espnSport}?dates=${dateStr.replace(/-/g, '')}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();
      const events: EspnEvent[] = data.events || [];

      const oddsMap = new Map<string, EspnOddsData>();

      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const odds = this.parseOddsFromCompetition(competition);
        if (odds) {
          oddsMap.set(event.id, odds);
        }
      }

      return oddsMap;
    } catch (error) {
      console.error('[ESPN Odds] Error fetching odds:', error);
      return new Map();
    }
  }

  /**
   * Parse odds from ESPN competition data
   */
  private static parseOddsFromCompetition(
    competition: EspnEvent['competitions'][0]
  ): EspnOddsData | null {
    const odds = competition.odds?.[0];
    if (!odds) return null;

    const result: EspnOddsData = {
      source: 'espn',
      lastUpdated: new Date().toISOString(),
    };

    // Parse moneyline
    if (odds.homeTeamOdds?.moneyLine && odds.awayTeamOdds?.moneyLine) {
      result.moneyline = {
        home: this.normalizeAmericanOdds(odds.homeTeamOdds.moneyLine),
        away: this.normalizeAmericanOdds(odds.awayTeamOdds.moneyLine),
      };
    }

    // Parse spread
    if (odds.homeTeamOdds?.pointSpread !== undefined) {
      result.spread = {
        home: this.normalizeAmericanOdds(odds.homeTeamOdds.spreadOdds || -110),
        away: this.normalizeAmericanOdds(odds.awayTeamOdds?.spreadOdds || -110),
        line: odds.homeTeamOdds.pointSpread,
      };
    }

    // Parse total
    if (odds.overUnder !== undefined) {
      result.total = {
        line: odds.overUnder,
        over: this.normalizeAmericanOdds(odds.overOdds || -110),
        under: this.normalizeAmericanOdds(odds.underOdds || -110),
      };
    }

    return result;
  }

  /**
   * Normalize odds to American format
   */
  private static normalizeAmericanOdds(odds: number): number {
    // ESPN sometimes returns decimal odds, convert to American
    if (odds > 0 && odds < 10) {
      // Likely decimal odds
      if (odds >= 2) {
        return Math.round((odds - 1) * 100);
      } else {
        return Math.round(-100 / (odds - 1));
      }
    }
    return odds;
  }

  /**
   * Merge ESPN odds with existing odds data
   * Only fills in missing data, doesn't overwrite existing
   */
  static mergeOdds(
    existing: Partial<EspnOddsData>,
    espnData: EspnOddsData
  ): EspnOddsData {
    return {
      source: 'merged',
      lastUpdated: new Date().toISOString(),
      moneyline: existing.moneyline || espnData.moneyline,
      spread: existing.spread || espnData.spread,
      total: existing.total || espnData.total,
    };
  }

  /**
   * Check if odds data is complete
   */
  static isComplete(odds: Partial<EspnOddsData>): boolean {
    return !!(
      odds.moneyline &&
      odds.spread &&
      odds.total
    );
  }

  /**
   * Get the best available odds by trying multiple sources
   */
  static async getBestOdds(
    sport: string,
    date: Date,
    primaryOdds?: Map<string, Partial<EspnOddsData>>
  ): Promise<Map<string, EspnOddsData>> {
    const result = new Map<string, EspnOddsData>();

    // Try ESPN first
    const espnOdds = await this.fetchOdds(sport, date);

    // Merge with primary odds if provided
    if (primaryOdds) {
      for (const [gameId, primary] of primaryOdds.entries()) {
        const espn = espnOdds.get(gameId);

        if (espn && !this.isComplete(primary)) {
          // Use merged data
          result.set(gameId, this.mergeOdds(primary, espn));
        } else if (this.isComplete(primary)) {
          // Primary is complete, use it
          result.set(gameId, primary as EspnOddsData);
        } else if (espn) {
          // Only ESPN has data
          result.set(gameId, espn);
        }
      }
    } else {
      // No primary odds, use ESPN only
      for (const [gameId, odds] of espnOdds.entries()) {
        result.set(gameId, odds);
      }
    }

    return result;
  }
}

export type { EspnOddsData, EspnEvent };

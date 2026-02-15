/**
 * PROGNO Historical Odds API - JavaScript/TypeScript SDK
 * 
 * Simple, type-safe client for accessing historical sports odds data
 */

export interface OddsData {
  id: string;
  external_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  game_date: string;
  home_moneyline: number | null;
  away_moneyline: number | null;
  home_spread: number | null;
  away_spread: number | null;
  spread_line: number | null;
  total_line: number | null;
  source: string;
}

export interface ApiResponse {
  meta: {
    sport: string;
    dateRange: { startDate: string; endDate: string };
    daysRequested: number;
    gamesReturned: number;
    tier: number;
    tierLimits: {
      requestsPerDay: number;
      maxDays: number;
      maxRecords: number;
      price: string;
    };
    responseTimeMs: number;
    timestamp: string;
  };
  data: OddsData[];
}

export interface SportsResponse {
  tier: number;
  tierLimits: {
    requestsPerDay: number;
    maxDays: number;
    maxRecords: number;
  };
  sports: {
    sport: string;
    firstDate: string;
    lastDate: string;
    totalGames: number;
  }[];
  totalGames: number;
}

export type Sport = 'nhl' | 'nba' | 'nfl' | 'mlb' | 'ncaab' | 'ncaaf' | 'nascar' | 'college-baseball';

export class PrognoOddsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://progno.app/api/historical-odds') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Get historical odds for a sport and date range
   */
  async getOdds(
    sport: Sport,
    startDate: string,
    endDate: string,
    options: { format?: 'json' | 'csv'; includeLines?: boolean } = {}
  ): Promise<ApiResponse> {
    const { format = 'json', includeLines = false } = options;
    
    const params = new URLSearchParams({
      sport,
      startDate,
      endDate,
      format,
      includeLines: includeLines.toString(),
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PrognoApiError(error.error || 'API request failed', response.status);
    }

    return response.json();
  }

  /**
   * Download odds as CSV
   */
  async getOddsCSV(
    sport: Sport,
    startDate: string,
    endDate: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      sport,
      startDate,
      endDate,
      format: 'csv',
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PrognoApiError(error.error || 'API request failed', response.status);
    }

    return response.blob();
  }

  /**
   * Get available sports and data stats
   */
  async getSports(): Promise<SportsResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new PrognoApiError(error.error || 'API request failed', response.status);
    }

    return response.json();
  }

  /**
   * Download all odds for a sport to a CSV file
   */
  async downloadToFile(
    sport: Sport,
    startDate: string,
    endDate: string,
    filename?: string
  ): Promise<void> {
    const blob = await this.getOddsCSV(sport, startDate, endDate);
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || `${sport}-odds-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export class PrognoApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'PrognoApiError';
    this.statusCode = statusCode;
  }
}

// Usage Examples:

// const client = new PrognoOddsClient('your_api_key');

// // Get NBA odds for January 2024
// const odds = await client.getOdds('nba', '2024-01-01', '2024-01-31');
// console.log(`Retrieved ${odds.meta.gamesReturned} games`);

// // Download as CSV
// await client.downloadToFile('nhl', '2024-01-01', '2024-01-31');

// // Check available sports
// const sports = await client.getSports();
// console.log(sports.sports);

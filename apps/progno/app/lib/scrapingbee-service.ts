/**
 * ScrapingBee Service
 * Web scraping via ScrapingBee API for data that isn't available through regular APIs
 */

export interface ScrapingBeeConfig {
  apiKey: string;
  premium: boolean;
  stealthProxy: boolean;
  countryCode?: string;
}

export interface ScrapingResult {
  url: string;
  status: number;
  data: string;
  extracted?: any;
  timestamp: string;
}

export class ScrapingBeeService {
  private apiKey: string;
  private baseUrl = 'https://app.scrapingbee.com/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Scrape a URL and return raw HTML
   */
  async scrapeUrl(url: string, options: {
    waitFor?: number;
    waitForSelector?: string;
    extractRules?: Record<string, string>;
    jsScenario?: any[];
    premiumProxy?: boolean;
    stealthProxy?: boolean;
    countryCode?: string;
  } = {}): Promise<ScrapingResult> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      url: url,
    });

    if (options.waitFor) params.append('wait', options.waitFor.toString());
    if (options.waitForSelector) params.append('wait_for', options.waitForSelector);
    if (options.premiumProxy) params.append('premium_proxy', 'true');
    if (options.stealthProxy) params.append('stealth_proxy', 'true');
    if (options.countryCode) params.append('country_code', options.countryCode);

    if (options.extractRules) {
      params.append('extract_rules', JSON.stringify(options.extractRules));
    }

    if (options.jsScenario) {
      params.append('js_scenario', JSON.stringify(options.jsScenario));
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`ScrapingBee error: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();
    let extracted = null;

    if (options.extractRules) {
      try {
        extracted = JSON.parse(data);
      } catch (e) {
        // If extraction fails, return raw HTML
      }
    }

    return {
      url,
      status: response.status,
      data,
      extracted,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scrape injury reports from various sources
   */
  async scrapeInjuryReports(sport: string, team?: string): Promise<any[]> {
    const sources: Record<string, string> = {
      nfl: 'https://www.nfl.com/injuries/',
      nba: 'https://www.nba.com/injury-report',
      nhl: 'https://www.nhl.com/injuries',
      mlb: 'https://www.mlb.com/injury-report',
    };

    const url = sources[sport.toLowerCase()];
    if (!url) return [];

    try {
      const result = await this.scrapeUrl(url, {
        waitFor: 2000,
        extractRules: {
          injuries: {
            selector: '.injury-row, .injury-item, [data-injury]',
            type: 'list',
            output: {
              player: 'string',
              team: 'string',
              status: 'string',
              injury: 'string',
              returnDate: 'string',
            },
          },
        },
      });

      return result.extracted?.injuries || [];
    } catch (e) {
      console.error(`[ScrapingBee] Failed to scrape injuries for ${sport}:`, e);
      return [];
    }
  }

  /**
   * Scrape weather data from weather.com or similar
   */
  async scrapeWeatherData(stadium: string, date: string): Promise<any> {
    // This would scrape specific weather sites for stadium locations
    const searchUrl = `https://weather.com/search?q=${encodeURIComponent(stadium)}`;

    try {
      const result = await this.scrapeUrl(searchUrl, {
        waitFor: 3000,
        extractRules: {
          temperature: '.CurrentConditions--tempValue--3KcTG, .temp',
          condition: '.CurrentConditions--phraseValue--2Z18W, .phrase',
          wind: '.Wind--windWrapper--3aqXJ, .wind',
          humidity: '.Humidity--humidityValue--3qdbh, .humidity',
          forecast: {
            selector: '.DailyForecast--DisclosureList--3GEdH li, .forecast-item',
            type: 'list',
            output: {
              day: 'string',
              high: 'string',
              low: 'string',
              condition: 'string',
            },
          },
        },
      });

      return result.extracted || null;
    } catch (e) {
      console.error(`[ScrapingBee] Failed to scrape weather for ${stadium}:`, e);
      return null;
    }
  }

  /**
   * Scrape lineup information
   */
  async scrapeLineups(sport: string, gameId: string): Promise<any> {
    // Example: ESPN lineups
    const url = `https://www.espn.com/${sport}/game/_/gameId/${gameId}`;

    try {
      const result = await this.scrapeUrl(url, {
        waitFor: 3000,
        extractRules: {
          homeLineup: {
            selector: '.lineup-home .lineup-player, .home-lineup .player',
            type: 'list',
            output: {
              name: 'string',
              position: 'string',
              status: 'string',
            },
          },
          awayLineup: {
            selector: '.lineup-away .lineup-player, .away-lineup .player',
            type: 'list',
            output: {
              name: 'string',
              position: 'string',
              status: 'string',
            },
          },
        },
      });

      return {
        home: result.extracted?.homeLineup || [],
        away: result.extracted?.awayLineup || [],
      };
    } catch (e) {
      console.error(`[ScrapingBee] Failed to scrape lineups:`, e);
      return { home: [], away: [] };
    }
  }

  /**
   * Scrape betting splits (public vs sharp money)
   */
  async scrapeBettingSplits(gameId: string): Promise<any> {
    // Could scrape sites like Action Network, VSiN, etc.
    const urls = [
      `https://www.actionnetwork.com/game/${gameId}`,
      `https://www.vsin.com/odds/`,
    ];

    for (const url of urls) {
      try {
        const result = await this.scrapeUrl(url, {
          waitFor: 3000,
          stealthProxy: true,
          extractRules: {
            publicMoney: '.public-bets, .public-money, [data-track="public-money"]',
            sharpMoney: '.sharp-bets, .sharp-money, [data-track="sharp-money"]',
            totalBets: '.total-bets, .bet-count',
          },
        });

        if (result.extracted?.publicMoney || result.extracted?.sharpMoney) {
          return result.extracted;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }
}

export default ScrapingBeeService;

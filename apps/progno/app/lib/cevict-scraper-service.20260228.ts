/**
 * CevictScraper Service
 * Uses the internal CevictScraper Playwright service instead of ScrapingBee
 * Server runs on localhost:3009
 */

export interface ScrapeResult {
  success: boolean;
  url: string;
  html?: string;
  text?: string;
  screenshot?: Buffer;
  error?: string;
  timestamp: string;
}

/** Optional API key for cevict-scraper when SCRAPER_API_KEY is set on the server */
const SCRAPER_API_KEY = () => process.env.CEVICT_SCRAPER_API_KEY || process.env.SCRAPER_API_KEY || '';

export class CevictScraperService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:3009', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey ?? SCRAPER_API_KEY();
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`;
      h['x-api-key'] = this.apiKey;
    }
    return h;
  }

  /**
   * Scrape a URL using CevictScraper
   */
  async scrape(url: string, options: {
    waitFor?: string | number;
    selector?: string;
    screenshot?: boolean;
    fullPage?: boolean;
    timeout?: number;
    retries?: number;
  } = {}): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          url,
          waitFor: options.waitFor || 2000,
          selector: options.selector,
          screenshot: options.screenshot,
          fullPage: options.fullPage,
          timeout: options.timeout || 30000,
          retries: options.retries || 3
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      return {
        success: false,
        url,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Scrape injury reports for a team using enhanced ESPN support
   * Uses table extraction and multiple parsing strategies
   */
  async scrapeInjuryReports(sport: string, team: string): Promise<Array<{
    player: string;
    position: string;
    status: string;
    injury: string;
  }>> {
    // Normalize sport key - handle baseball_ncaa -> cbb (college baseball, NOT college basketball)
    let sportKey = sport.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '');
    if (sportKey === 'ncaa' || sportKey === 'baseball_ncaa') {
      // NOTE: In this codebase "cbb" means college baseball (not college basketball).
      // College basketball uses "ncaab". This matches the Odds API sport mapping.
      sportKey = 'cbb';
    }

    // Map to injury report URLs
    const urls = this.getInjuryReportUrls(sportKey, team);

    for (const url of urls) {
      try {
        console.log(`[CevictScraper] Scraping injuries from: ${url}`);

        // Use the /extract-table endpoint for better table parsing
        const response = await fetch(`${this.baseUrl}/extract-table`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            url,
            selector: 'table',
            waitFor: 3000
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tableData && data.tableData.rows.length > 0) {
            console.log(`[CevictScraper] Found table with ${data.tableData.rowCount} rows`);

            // Parse table data into injury format
            const injuries = this.parseTableData(data.tableData, team);
            if (injuries.length > 0) {
              console.log(`[CevictScraper] Extracted ${injuries.length} injuries from table for ${team}`);
              return injuries;
            }
          }
        }

        // Fallback to regular scrape if table extraction fails
        const result = await this.scrape(url, {
          waitFor: 'table, .injury-report, .injuries, [data-testid="injury"], .roster, .player-list',
          timeout: 15000,
          retries: 2
        });

        if (result.success && result.text) {
          const injuries = this.parseInjuryData(result.html || result.text, team);
          if (injuries.length > 0) {
            console.log(`[CevictScraper] Found ${injuries.length} injuries for ${team} from HTML`);
            return injuries;
          }
        }
      } catch (error: any) {
        console.log(`[CevictScraper] Failed to scrape ${url}: ${error.message}`);
      }
    }

    return [];
  }

  /**
   * Parse table data into injury format
   */
  private parseTableData(tableData: { headers: string[]; rows: string[][]; rowCount: number }, team: string): Array<{
    player: string;
    position: string;
    status: string;
    injury: string;
  }> {
    const injuries: Array<{ player: string; position: string; status: string; injury: string }> = [];

    const headers = tableData.headers.map(h => h.toLowerCase());

    // Find column indices
    const playerIdx = headers.findIndex(h => h.includes('player') || h.includes('name'));
    const positionIdx = headers.findIndex(h => h.includes('position') || h.includes('pos'));
    const statusIdx = headers.findIndex(h => h.includes('status'));
    const injuryIdx = headers.findIndex(h => h.includes('injury') || h.includes('reason') || h.includes('type'));

    // If we have at least player and status columns
    if (playerIdx >= 0 && statusIdx >= 0) {
      for (const row of tableData.rows) {
        const player = row[playerIdx]?.trim();
        const position = positionIdx >= 0 ? row[positionIdx]?.trim() : 'Unknown';
        const status = row[statusIdx]?.trim() || 'unknown';
        const injury = injuryIdx >= 0 ? row[injuryIdx]?.trim() : 'Not specified';

        if (player && player.length > 2 && !player.toLowerCase().includes('player') && !player.toLowerCase().includes('name')) {
          injuries.push({
            player,
            position: this.normalizePosition(position),
            status: this.normalizeStatus(status.toLowerCase()),
            injury
          });
        }
      }
    }

    return injuries;
  }

  /**
   * Get potential URLs for injury reports
   */
  private getInjuryReportUrls(sport: string, team: string): string[] {
    const normalizedTeam = team.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const urls: string[] = [];

    switch (sport.toLowerCase()) {
      case 'nfl':
        urls.push(
          `https://www.espn.com/nfl/team/injuries/_/name/${this.getTeamAbbreviation(team, 'nfl')}`,
          `https://www.nfl.com/injuries/`,
          `https://www.pro-football-reference.com/teams/${normalizedTeam}/injuries.htm`
        );
        break;
      case 'nba':
        urls.push(
          `https://www.espn.com/nba/team/injuries/_/name/${this.getTeamAbbreviation(team, 'nba')}`,
          `https://official.nba.com/injury-report/`
        );
        break;
      case 'nhl':
        urls.push(
          `https://www.espn.com/nhl/team/injuries/_/name/${this.getTeamAbbreviation(team, 'nhl')}`,
          `https://www.nhl.com/injuries`
        );
        break;
      case 'mlb':
        urls.push(
          `https://www.espn.com/mlb/team/injuries/_/name/${this.getTeamAbbreviation(team, 'mlb')}`,
          `https://www.mlb.com/injury-report`
        );
        break;
      case 'ncaaf':
        {
          const id = this.getCollegeTeamId(team);
          if (id) {
            urls.push(
              `https://www.espn.com/college-football/team/injuries/_/id/${id}`
            );
          } else {
            console.log(`[CevictScraper] No ESPN college ID for ${team} (ncaaf), skipping ESPN injuries URL`);
          }
        }
        break;
      case 'ncaab':
        {
          const id = this.getCollegeTeamId(team);
          if (id) {
            urls.push(
              `https://www.espn.com/mens-college-basketball/team/injuries/_/id/${id}`
            );
          } else {
            console.log(`[CevictScraper] No ESPN college ID for ${team} (ncaab), skipping ESPN injuries URL`);
          }
        }
        break;
      case 'cbb':
        break;
    }

    return urls;
  }

  /**
   * Parse injury data from scraped text with enhanced ESPN support
   */
  private parseInjuryData(text: string, team: string): Array<{
    player: string;
    position: string;
    status: string;
    injury: string;
  }> {
    const injuries: Array<{
      player: string;
      position: string;
      status: string;
      injury: string;
    }> = [];

    const espnTablePattern = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
    const espnDivPattern = /<div[^>]*class="[^"]*injury[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<\/div>/gi;
    const genericPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s*[-–:]\s*(\w+)\s*[-–:]\s*(out|doubtful|questionable|probable)\s*[-–:]\s*([\w\s]+?)(?=\n|$|<)/gi;
    const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const textPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s+(QB|RB|WR|TE|OL|DL|LB|DB|K|P|SP|RP|C|1B|2B|3B|SS|LF|CF|RF|OF|DH|PG|SG|SF|PF|G|F|C|LW|RW)\s+(Out|Doubtful|Questionable|Probable)\s+([\w\s]+?)(?=\d{1,2}\/\d{1,2}|$|\n)/gi;

    let match;
    while ((match = espnTablePattern.exec(text)) !== null) {
      const player = match[1].trim();
      const position = match[2].trim();
      const status = match[3].trim().toLowerCase();
      const injury = match[4].trim();
      if (player && player.length > 2 && !player.includes('Player') && !player.includes('Name')) {
        injuries.push({
          player,
          position: this.normalizePosition(position),
          status: this.normalizeStatus(status),
          injury
        });
      }
    }
    while ((match = espnDivPattern.exec(text)) !== null) {
      const player = match[1].trim();
      const position = match[2].trim();
      const status = match[3].trim().toLowerCase();
      const injury = match[4].trim();
      if (player && player.length > 2) {
        injuries.push({
          player,
          position: this.normalizePosition(position),
          status: this.normalizeStatus(status),
          injury
        });
      }
    }
    while ((match = genericPattern.exec(text)) !== null) {
      const player = match[1].trim();
      const position = match[2].trim();
      const status = match[3].trim().toLowerCase();
      const injury = match[4].trim();
      if (player && player.length > 2 && !injuries.find(i => i.player === player)) {
        injuries.push({
          player,
          position: this.normalizePosition(position),
          status: this.normalizeStatus(status),
          injury
        });
      }
    }
    while ((match = textPattern.exec(cleanText)) !== null) {
      const player = match[1].trim();
      const position = match[2].trim();
      const status = match[3].trim().toLowerCase();
      const injury = match[4].trim();
      if (player && player.length > 2 && !injuries.find(i => i.player === player)) {
        injuries.push({
          player,
          position: this.normalizePosition(position),
          status: this.normalizeStatus(status),
          injury
        });
      }
    }

    return injuries;
  }

  private normalizeStatus(status: string): string {
    const s = status.toLowerCase().trim();
    if (s.includes('out')) return 'out';
    if (s.includes('doubt')) return 'doubtful';
    if (s.includes('quest')) return 'questionable';
    if (s.includes('prob')) return 'probable';
    return 'unknown';
  }

  private normalizePosition(pos: string): string {
    const normalized = pos.toUpperCase().trim();
    if (['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'].includes(normalized)) return normalized;
    if (['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'].includes(normalized)) return normalized === 'G' ? 'PG' : normalized === 'F' ? 'SF' : normalized;
    if (['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'OF'].includes(normalized)) return normalized === 'OF' ? 'LF' : normalized;
    if (['G', 'D', 'C', 'LW', 'RW', 'F'].includes(normalized)) return normalized === 'F' ? 'C' : normalized;
    return 'Unknown';
  }

  private getTeamAbbreviation(team: string, league: string): string {
    const abbreviations: Record<string, string> = {
      'Arizona Cardinals': 'ari', 'Atlanta Falcons': 'atl', 'Baltimore Ravens': 'bal',
      'Buffalo Bills': 'buf', 'Carolina Panthers': 'car', 'Chicago Bears': 'chi',
      'Cincinnati Bengals': 'cin', 'Cleveland Browns': 'cle', 'Dallas Cowboys': 'dal',
      'Denver Broncos': 'den', 'Detroit Lions': 'det', 'Green Bay Packers': 'gb',
      'Houston Texans': 'hou', 'Indianapolis Colts': 'ind', 'Jacksonville Jaguars': 'jax',
      'Kansas City Chiefs': 'kc', 'Las Vegas Raiders': 'lv', 'Los Angeles Chargers': 'lac',
      'Los Angeles Rams': 'lar', 'Miami Dolphins': 'mia', 'Minnesota Vikings': 'min',
      'New England Patriots': 'ne', 'New Orleans Saints': 'no', 'New York Giants': 'nyg',
      'New York Jets': 'nyj', 'Philadelphia Eagles': 'phi', 'Pittsburgh Steelers': 'pit',
      'San Francisco 49ers': 'sf', 'Seattle Seahawks': 'sea', 'Tampa Bay Buccaneers': 'tb',
      'Tennessee Titans': 'ten', 'Washington Commanders': 'wsh',
      'Atlanta Hawks': 'atl', 'Boston Celtics': 'bos', 'Brooklyn Nets': 'bkn',
      'Charlotte Hornets': 'cha', 'Chicago Bulls': 'chi', 'Cleveland Cavaliers': 'cle',
      'Dallas Mavericks': 'dal', 'Denver Nuggets': 'den', 'Detroit Pistons': 'det',
      'Golden State Warriors': 'gs', 'Houston Rockets': 'hou', 'Indiana Pacers': 'ind',
      'LA Clippers': 'lac', 'Los Angeles Lakers': 'lal', 'Memphis Grizzlies': 'mem',
      'Miami Heat': 'mia', 'Milwaukee Bucks': 'mil', 'Minnesota Timberwolves': 'min',
      'New Orleans Pelicans': 'no', 'New York Knicks': 'ny', 'Oklahoma City Thunder': 'okc',
      'Orlando Magic': 'orl', 'Philadelphia 76ers': 'phi', 'Phoenix Suns': 'phx',
      'Portland Trail Blazers': 'por', 'Sacramento Kings': 'sac', 'San Antonio Spurs': 'sa',
      'Toronto Raptors': 'tor', 'Utah Jazz': 'utah', 'Washington Wizards': 'wsh',
    };
    return abbreviations[team] || team.toLowerCase().substring(0, 3);
  }

  async scrapeBettingSplits(
    sport: string,
    _homeTeam: string,
    _awayTeam: string
  ): Promise<Array<{ market?: string; type?: string; publicPercentage?: number; moneyPercentage?: number; public?: number; money?: number; line?: number; tickets?: number; count?: number }>> {
    const slug = ({ nfl: 'nfl', nba: 'nba', mlb: 'mlb', nhl: 'nhl', ncaab: 'ncaab', ncaaf: 'ncaaf' } as Record<string, string>)[sport?.toLowerCase()] || sport?.toLowerCase() || 'nfl';
    try {
      const result = await this.scrape(`https://www.scoresandodds.com/${slug}`, {
        waitFor: 5000,
        timeout: 20000,
        retries: 1,
      });
      if (!result.success || !result.html) return [];
      const text = result.text || result.html.replace(/<[^>]+>/g, ' ');
      const splits: Array<{ market?: string; type?: string; publicPercentage?: number; moneyPercentage?: number; public?: number; money?: number; line?: number; tickets?: number; count?: number }> = [];
      const percentPairs = text.match(/(\d{1,3})%\s*\/\s*(\d{1,3})%/g);
      if (percentPairs && percentPairs.length >= 1) {
        const first = percentPairs[0].match(/(\d+)%\s*\/\s*(\d+)%/);
        if (first) {
          const publicPct = parseInt(first[1], 10);
          const moneyPct = parseInt(first[2], 10);
          splits.push({
            market: 'moneyline',
            type: 'moneyline',
            publicPercentage: publicPct,
            moneyPercentage: moneyPct,
            public: publicPct,
            money: moneyPct,
            tickets: 0,
            count: 0,
          });
        }
      }
      const singlePcts = text.match(/\b(\d{1,3})%\s*(?:tickets?|public|money|sharp)/gi) || [];
      if (splits.length === 0 && singlePcts.length >= 2) {
        const nums = singlePcts.slice(0, 2).map(s => parseInt(s.replace(/\D/g, ''), 10)).filter(n => n >= 0 && n <= 100);
        if (nums.length >= 2) {
          splits.push({
            market: 'moneyline',
            type: 'moneyline',
            publicPercentage: nums[0],
            moneyPercentage: nums[1],
            public: nums[0],
            money: nums[1],
            tickets: 0,
            count: 0,
          });
        }
      }
      if (splits.length === 0) {
        splits.push({
          market: 'moneyline',
          type: 'moneyline',
          publicPercentage: 50,
          moneyPercentage: 50,
          public: 50,
          money: 50,
          tickets: 0,
          count: 0,
        });
      }
      return splits;
    } catch (e) {
      console.log('[CevictScraper] scrapeBettingSplits failed:', (e as Error).message);
      return [];
    }
  }

  async scrapeLineups(
    sport: string,
    player: string
  ): Promise<Array<{ seasonAvg?: string; last5Avg?: string; recentAvg?: string; homeAvg?: string; awayAvg?: string; vsOpponent?: string[]; recentGames?: string[] }>> {
    try {
      const slug = ({ nfl: 'nfl', nba: 'nba', mlb: 'mlb', nhl: 'nhl' } as Record<string, string>)[sport?.toLowerCase()] || 'nba';
      const encoded = encodeURIComponent(player.replace(/\s+/g, '-'));
      const url = `https://www.espn.com/${slug}/player/_/search/${encoded}`;
      const result = await this.scrape(url, { waitFor: 3000, timeout: 15000, retries: 1 });
      if (!result.success || !result.text) return [];
      const text = result.text;
      const numbers = text.match(/\d+\.\d+/g) || [];
      const seasonAvg = numbers[0] || '0';
      const last5 = numbers[1] || numbers[0] || '0';
      return [{
        seasonAvg,
        last5Avg: last5,
        recentAvg: last5,
        homeAvg: seasonAvg,
        awayAvg: seasonAvg,
        vsOpponent: [],
        recentGames: [],
      }];
    } catch (e) {
      console.log('[CevictScraper] scrapeLineups failed:', (e as Error).message);
      return [];
    }
  }

  async scrapeWeatherData(
    city: string,
    _gameDate?: string
  ): Promise<{ temperature?: number; condition?: string; wind?: number; humidity?: number } | null> {
    try {
      const encoded = encodeURIComponent(city);
      const url = `https://wttr.in/${encoded}?format=j1`;
      const result = await this.scrape(url, { waitFor: 2000, timeout: 10000, retries: 1 });
      if (!result.success) return null;
      const raw = result.text || result.html || '';
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        const match = raw.match(/"temp_C":\s*([\d.-]+)/);
        if (match) data = { current_condition: [{ temp_C: match[1], weatherDesc: [{ value: 'Clear' }], windspeedKmph: '0', humidity: '50' }] };
      }
      if (!data?.current_condition?.[0]) return null;
      const c = data.current_condition[0];
      const tempC = parseFloat(c.temp_C ?? c.temp_F);
      const tempF = c.temp_F != null ? parseFloat(c.temp_F) : Math.round((tempC * 9) / 5 + 32);
      return {
        temperature: tempF,
        condition: (c.weatherDesc?.[0]?.value ?? c.condition ?? 'Clear').toString(),
        wind: parseInt(c.windspeedKmph ?? c.windspeedMiles ?? '0', 10),
        humidity: parseInt(c.humidity ?? '50', 10),
      };
    } catch (e) {
      console.log('[CevictScraper] scrapeWeatherData failed:', (e as Error).message);
      return null;
    }
  }

  private getCollegeTeamId(team: string): string {
    const ids: Record<string, string> = {
      'Alabama Crimson Tide': '333', 'Ohio State Buckeyes': '194',
      'Georgia Bulldogs': '61', 'Clemson Tigers': '228',
      'Michigan Wolverines': '130', 'Notre Dame Fighting Irish': '87',
      'Oklahoma Sooners': '201', 'Texas Longhorns': '251',
      'Florida Gators': '57', 'LSU Tigers': '99',
      'Penn State Nittany Lions': '213', 'USC Trojans': '30',
      'Oregon Ducks': '2483', 'Florida State Seminoles': '52',
      'Miami Hurricanes': '2390', 'Auburn Tigers': '2',
      'Wisconsin Badgers': '275', 'Texas A&M Aggies': '245',
      'Tennessee Volunteers': '2633', 'Nebraska Cornhuskers': '158',
      'Kentucky Wildcats': '96', 'UCLA Bruins': '26',
      'Duke Blue Devils': '150',
    };
    return ids[team] || '';
  }
}

export default CevictScraperService;

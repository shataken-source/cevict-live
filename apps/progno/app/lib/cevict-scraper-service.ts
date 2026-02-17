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

export class CevictScraperService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3009') {
    this.baseUrl = baseUrl;
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
        headers: { 'Content-Type': 'application/json' },
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
    // Normalize sport key - handle baseball_ncaa -> cbb
    let sportKey = sport.toLowerCase().replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '');
    if (sportKey === 'ncaa' || sportKey === 'baseball_ncaa') {
      sportKey = 'cbb'; // College baseball
    }

    // Map to injury report URLs
    const urls = this.getInjuryReportUrls(sportKey, team);

    for (const url of urls) {
      try {
        console.log(`[CevictScraper] Scraping injuries from: ${url}`);

        // Use the /extract-table endpoint for better table parsing
        const response = await fetch(`${this.baseUrl}/extract-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        urls.push(
          `https://www.espn.com/college-football/team/injuries/_/id/${this.getCollegeTeamId(team)}`,
          `https://www.ncaa.com/injury-reports`
        );
        break;
      case 'ncaab':
        urls.push(
          `https://www.espn.com/mens-college-basketball/team/injuries/_/id/${this.getCollegeTeamId(team)}`
        );
        break;
      case 'cbb': // College baseball
        urls.push(
          `https://www.ncaa.com/sports/baseball/teams/${normalizedTeam}`,
          `https://www.espn.com/college-baseball/team/injuries/_/id/${this.getCollegeTeamId(team)}`
        );
        break;
    }

    return urls;
  }

  /**
   * Parse injury data from scraped text with enhanced ESPN support
   * Uses multiple pattern matching strategies for different site formats
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

    // Strategy 1: ESPN injury table format (common on ESPN pages)
    // Look for table rows with player injury data
    const espnTablePattern = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;

    // Strategy 2: ESPN list format with divs
    const espnDivPattern = /<div[^>]*class="[^"]*injury[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<\/div>/gi;

    // Strategy 3: Generic player - position - status - injury pattern
    const genericPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s*[-–:]\s*(\w+)\s*[-–:]\s*(out|doubtful|questionable|probable)\s*[-–:]\s*([\w\s]+?)(?=\n|$|<)/gi;

    // Strategy 4: Pattern with HTML tags removed (for text content)
    const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const textPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\s+(QB|RB|WR|TE|OL|DL|LB|DB|K|P|SP|RP|C|1B|2B|3B|SS|LF|CF|RF|OF|DH|PG|SG|SF|PF|G|F|C|LW|RW)\s+(Out|Doubtful|Questionable|Probable)\s+([\w\s]+?)(?=\d{1,2}\/\d{1,2}|$|\n)/gi;

    // Try ESPN table pattern first
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

    // Try ESPN div pattern
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

    // Try generic pattern
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

    // Try text pattern on cleaned content
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

  /**
   * Normalize status to standard format
   */
  private normalizeStatus(status: string): string {
    const s = status.toLowerCase().trim();
    if (s.includes('out')) return 'out';
    if (s.includes('doubt')) return 'doubtful';
    if (s.includes('quest')) return 'questionable';
    if (s.includes('prob')) return 'probable';
    return 'unknown';
  }

  /**
   * Normalize position codes
   */
  private normalizePosition(pos: string): string {
    const normalized = pos.toUpperCase().trim();

    // NFL positions
    if (['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P'].includes(normalized)) {
      return normalized;
    }

    // NBA positions
    if (['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'].includes(normalized)) {
      return normalized === 'G' ? 'PG' : normalized === 'F' ? 'SF' : normalized;
    }

    // MLB positions
    if (['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'OF'].includes(normalized)) {
      return normalized === 'OF' ? 'LF' : normalized;
    }

    // NHL positions
    if (['G', 'D', 'C', 'LW', 'RW', 'F'].includes(normalized)) {
      return normalized === 'F' ? 'C' : normalized;
    }

    return 'Unknown';
  }

  /**
   * Get team abbreviation for ESPN URLs
   */
  private getTeamAbbreviation(team: string, league: string): string {
    // Common team abbreviations
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
      // NBA
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

  /**
   * Get ESPN college team ID
   */
  private getCollegeTeamId(team: string): string {
    // Major college programs - would need full mapping for all teams
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
      'Arizona State Sun Devils': '9', 'Texas Tech Red Raiders': '2641',
      'Oregon Ducks': '2483', 'Minnesota Golden Gophers': '135',
      'Virginia Tech Hokies': '259', 'Michigan St Spartans': '127',
      'Kansas St Wildcats': '2306', 'Baylor Bears': '239',
      'Georgia Bulldogs': '61', 'Iowa Hawkeyes': '66',
      'Nebraska Cornhuskers': '158', 'LSU Tigers': '99',
      'Texas Longhorns': '251', 'Kent State Golden Flashes': '2309',
      'Louisville Cardinals': '97', 'Xavier Musketeers': '2752',
      'South Carolina Upstate Spartans': '2534', 'Western Carolina Catamounts': '2697',
      'Duke Blue Devils': '150', 'Appalachian St Mountaineers': '2026',
      'Coastal Carolina Chanticleers': '324', 'Charleston Cougars': '232',
      'Clemson Tigers': '228', 'Charlotte 49ers': '2429',
      'East Tennessee St Buccaneers': '2016', 'Wake Forest Demon Deacons': '154',
      'High Point Panthers': '2272', 'SIU-Edwardsville Cougars': '79',
      'Illinois St Redbirds': '2280', 'Tennessee Tech Golden Eagles': '2635',
      'Lipscomb Bisons': '288', 'SE Missouri St Redhawks': '2540',
      'Saint Louis Billikens': '139', 'Samford Bulldogs': '2535',
      'Alabama Crimson Tide': '333', 'Ole Miss Rebels': '145',
      'Arkansas St Red Wolves': '2032', 'Mississippi St Bulldogs': '344',
      'Troy Trojans': '2653', 'Memphis Tigers': '235',
      'Arkansas-Little Rock Trojans': '2031', 'Davidson Wildcats': '218',
      'UNC Greensboro Spartans': '152', 'Wofford Terriers': '2747',
      'South Carolina Gamecocks': '2579', 'Bethune-Cookman Wildcats': '206',
      'Florida Int\'l Golden Panthers': '2229', 'North Florida Ospreys': '2450',
      'Charleston Southern Buccaneers': '2325', 'Jacksonville Dolphins': '256',
      'Florida St Seminoles': '52', 'Georgia Southern Eagles': '290',
      'Georgia Tech Yellow Jackets': '59', 'Lamar Cardinals': '2320',
      'Miami Hurricanes': '2390', 'UCF Knights': '2116',
      'Florida Atlantic Owls': '2226', 'Missouri Tigers': '142',
      'Stetson Hatters': '56', 'Florida Gators': '57',
      'Auburn Tigers': '2', 'Cincinnati Bearcats': '2132',
      'Nicholls St Colonels': '2447', 'South Alabama Jaguars': '6',
      'SE Louisiana Lions': '2545', 'Southern Miss Golden Eagles': '2572',
      'Baylor Bears': '239', 'Texas State Bobcats': '326',
      'Houston Baptist Huskies': '2277', 'Sam Houston St Bearkats': '2534',
      'UT Rio Grande Valley Vaqueros': '292', 'Texas Tech Red Raiders': '2641',
      'Dallas Baptist Patriots': '1001', 'Abilene Christian Wildcats': '2000',
      'Rice Owls': '242', 'Louisiana Ragin\' Cajuns': '309',
      'TCU Horned Frogs': '2628', 'UT-Arlington Mavericks': '250',
      'UCLA Bruins': '26', 'Tulane Green Wave': '2655',
      'Arizona St Sun Devils': '9', 'UConn Huskies': '41',
      'USC Trojans': '30', 'Loyola Marymount Lions': '2351',
      'Long Beach State Dirtbags': '2349', 'San Diego Toreros': '21',
    };

    return ids[team] || '';
  }
}

export default CevictScraperService;

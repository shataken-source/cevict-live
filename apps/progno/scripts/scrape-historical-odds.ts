/**
 * Historical Odds Scraper using ScrapingBee
 * Scrapes moneylines from BetExplorer, Oddsportal, and other odds archives
 */

import { writeFileSync } from 'fs';

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY || 'B87FHGJU3P90AHQTSS2S0ML9BRL5BGXV584D9SFZVO0JNZ82JE7JG3W5HUIN7ZCHX5RYJS37PSWBUL6K';

interface OddsData {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  source: string;
}

/**
 * Scrape odds using ScrapingBee
 */
async function scrapeWithScrapingBee(url: string, renderJs: boolean = true): Promise<string> {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(url)}&render_js=${renderJs}`;

  console.log(`Scraping: ${url}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Scraping failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Scrape NFL 2024 odds from BetExplorer
 * URL pattern: https://www.betexplorer.com/football/usa/nfl-2024-2025/
 */
export async function scrapeNFLOdds2024(): Promise<OddsData[]> {
  console.log('\n🏈 Scraping NFL 2024 odds...');

  const oddsData: OddsData[] = [];

  try {
    // BetExplorer NFL URL
    const url = 'https://www.betexplorer.com/football/usa/nfl-2024-2025/results/';
    const html = await scrapeWithScrapingBee(url, true);

    // Parse HTML for odds table
    // BetExplorer uses JavaScript-rendered tables
    const oddsRows = parseBetExplorerOdds(html);

    console.log(`Found ${oddsRows.length} NFL games with odds`);
    return oddsRows;
  } catch (error) {
    console.error('Failed to scrape NFL odds:', error);
    return generateEstimatedOdds('NFL');
  }
}

/**
 * Scrape MLB 2024 odds
 */
export async function scrapeMLBOdds2024(): Promise<OddsData[]> {
  console.log('\n⚾ Scraping MLB 2024 odds...');

  try {
    const url = 'https://www.betexplorer.com/baseball/usa/mlb-2024/results/';
    const html = await scrapeWithScrapingBee(url, true);
    const oddsRows = parseBetExplorerOdds(html);
    console.log(`Found ${oddsRows.length} MLB games with odds`);
    return oddsRows;
  } catch (error) {
    console.error('Failed to scrape MLB odds:', error);
    return generateEstimatedOdds('MLB');
  }
}

/**
 * Scrape NBA 2024 odds
 */
export async function scrapeNBAOdds2024(): Promise<OddsData[]> {
  console.log('\n🏀 Scraping NBA 2024 odds...');

  try {
    const url = 'https://www.betexplorer.com/basketball/usa/nba-2023-2024/results/';
    const html = await scrapeWithScrapingBee(url, true);
    const oddsRows = parseBetExplorerOdds(html);
    console.log(`Found ${oddsRows.length} NBA games with odds`);
    return oddsRows;
  } catch (error) {
    console.error('Failed to scrape NBA odds:', error);
    return generateEstimatedOdds('NBA');
  }
}

/**
 * Scrape NHL 2024 odds
 */
export async function scrapeNHLOdds2024(): Promise<OddsData[]> {
  console.log('\n🏒 Scraping NHL 2024 odds...');

  try {
    const url = 'https://www.betexplorer.com/hockey/usa/nhl-2023-2024/results/';
    const html = await scrapeWithScrapingBee(url, true);
    const oddsRows = parseBetExplorerOdds(html);
    console.log(`Found ${oddsRows.length} NHL games with odds`);
    return oddsRows;
  } catch (error) {
    console.error('Failed to scrape NHL odds:', error);
    return generateEstimatedOdds('NHL');
  }
}

/**
 * Parse BetExplorer odds HTML
 * Extracts game data from their JavaScript-rendered tables
 */
function parseBetExplorerOdds(html: string): OddsData[] {
  const odds: OddsData[] = [];

  // BetExplorer stores data in JavaScript variables or JSON
  // Look for patterns like: data-odd="1.85" or in script tags

  // Try to find JSON data embedded in the page
  const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      // Extract odds from the initial state
      return extractOddsFromJSON(data);
    } catch {
      // JSON parse failed, continue with regex parsing
    }
  }

  // Fallback: Parse HTML table structure
  // BetExplorer typically uses class names like "table-main__odds"
  const oddsPattern = /<td[^>]*class=["'][^"']*odds[^"']*["'][^>]*data-odd=["']([\d.]+)["'][^>]*>/g;
  const matches = html.matchAll(oddsPattern);

  for (const match of matches) {
    // Extract odds value
    const oddsValue = parseFloat(match[1]);
    if (!isNaN(oddsValue)) {
      // Would need to extract team names, dates from surrounding HTML
      // This is simplified - real implementation would be more complex
    }
  }

  return odds;
}

/**
 * Extract odds from parsed JSON data
 */
function extractOddsFromJSON(data: any): OddsData[] {
  const odds: OddsData[] = [];

  // Navigate the JSON structure based on BetExplorer's format
  // This varies by site version
  if (data.matches) {
    for (const match of data.matches) {
      odds.push({
        date: match.date || match.datetime,
        homeTeam: match.homeTeam?.name || match.home,
        awayTeam: match.awayTeam?.name || match.away,
        homeOdds: match.odds?.home || match.odds?.[0],
        awayOdds: match.odds?.away || match.odds?.[1],
        drawOdds: match.odds?.draw || match.odds?.[2],
        source: 'betexplorer'
      });
    }
  }

  return odds;
}

/**
 * Generate estimated odds based on point spreads
 * Used when scraping fails
 */
function generateEstimatedOdds(league: string): OddsData[] {
  console.log(`Generating estimated ${league} odds...`);

  const baseOdds: Record<string, { home: number; away: number }> = {
    'NFL': { home: -110, away: -110 },
    'MLB': { home: -110, away: -110 },
    'NBA': { home: -110, away: -110 },
    'NHL': { home: -110, away: -110 },
    'NCAAF': { home: -110, away: -110 },
    'NCAAB': { home: -110, away: -110 },
    'NASCAR': { home: 500, away: 500 }
  };

  const base = baseOdds[league] || { home: -110, away: -110 };

  // Return empty array - would need to be populated with actual game data
  return [];
}

/**
 * Merge odds data with full season results
 */
export function mergeOddsWithResults(
  results: any[],
  odds: OddsData[]
): any[] {
  return results.map(game => {
    // Find matching odds by team names and date
    const matchingOdds = odds.find(o =>
      (o.homeTeam === game.homeTeam || o.homeTeam.includes(game.homeTeam)) &&
      (o.awayTeam === game.awayTeam || o.awayTeam.includes(game.awayTeam)) &&
      o.date === game.date
    );

    if (matchingOdds) {
      return {
        ...game,
        homeOdds: matchingOdds.homeOdds,
        awayOdds: matchingOdds.awayOdds,
        drawOdds: matchingOdds.drawOdds,
        oddsSource: matchingOdds.source
      };
    }

    // No matching odds found, use default
    return {
      ...game,
      homeOdds: -110,
      awayOdds: -110,
      oddsSource: 'default'
    };
  });
}

// ==================== CLI ====================

async function main() {
  const league = process.argv[2]?.toUpperCase() || 'ALL';

  console.log('\n🔥 SCRAPINGBEE HISTORICAL ODDS SCRAPER');
  console.log(`League: ${league}\n`);

  const allOdds: Record<string, OddsData[]> = {};

  if (league === 'ALL' || league === 'NFL') {
    allOdds.nfl = await scrapeNFLOdds2024();
  }

  if (league === 'ALL' || league === 'MLB') {
    allOdds.mlb = await scrapeMLBOdds2024();
  }

  if (league === 'ALL' || league === 'NBA') {
    allOdds.nba = await scrapeNBAOdds2024();
  }

  if (league === 'ALL' || league === 'NHL') {
    allOdds.nhl = await scrapeNHLOdds2024();
  }

  // Save odds data
  for (const [key, data] of Object.entries(allOdds)) {
    if (data.length > 0) {
      const filename = `./${key.toLowerCase()}-2024-odds.json`;
      writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✅ Saved ${data.length} odds to ${filename}`);
    }
  }

  console.log('\n🎯 Odds scraping complete!');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

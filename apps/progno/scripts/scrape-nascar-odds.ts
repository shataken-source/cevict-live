/**
 * NASCAR Odds Scraper for Vegas Insider
 * Scrapes futures odds for NASCAR Cup Series, Xfinity, and Trucks
 */

import { writeFileSync } from 'fs';

interface DriverOdds {
  driver: string;
  odds: number; // American odds (+550, etc)
  impliedProbability: number; // Calculated from odds
}

interface NASCARMarket {
  market: string;
  race?: string;
  season: string;
  lastUpdated: string;
  drivers: DriverOdds[];
}

/**
 * Convert American odds to implied probability
 */
function americanOddsToProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Parse odds from text (e.g., "+550" -> 550)
 */
function parseOdds(oddsStr: string): number {
  const clean = oddsStr.trim().replace(/[+,]/g, '');
  return parseInt(clean, 10);
}

/**
 * Scrape NASCAR futures odds from Vegas Insider
 * Note: In production, use Puppeteer or similar to render the page
 * This is a skeleton for the scraper structure
 */
export async function scrapeNASCAROdds(): Promise<NASCARMarket[]> {
  const markets: NASCARMarket[] = [];

  try {
    // In production, fetch the actual page content
    // const response = await fetch('https://www.vegasinsider.com/auto-racing/odds/futures/');
    // const html = await response.text();

    // For now, return sample structure based on what we saw
    const cupSeriesChampionship: NASCARMarket = {
      market: 'NASCAR Cup Series Championship',
      season: '2026',
      lastUpdated: new Date().toISOString(),
      drivers: [
        { driver: 'Christopher Bell', odds: 550, impliedProbability: 0.154 },
        { driver: 'Kyle Larson', odds: 550, impliedProbability: 0.154 },
        { driver: 'William Byron', odds: 600, impliedProbability: 0.143 },
        { driver: 'Ryan Blaney', odds: 650, impliedProbability: 0.133 },
        { driver: 'Denny Hamlin', odds: 750, impliedProbability: 0.118 },
        { driver: 'Joey Logano', odds: 850, impliedProbability: 0.105 },
        { driver: 'Tyler Reddick', odds: 850, impliedProbability: 0.105 },
        { driver: 'Chase Elliott', odds: 1100, impliedProbability: 0.083 },
        { driver: 'Chase Briscoe', odds: 1800, impliedProbability: 0.053 },
        { driver: 'Kyle Busch', odds: 2200, impliedProbability: 0.043 },
        { driver: 'Ty Gibbs', odds: 2200, impliedProbability: 0.043 },
        { driver: 'Ross Chastain', odds: 2200, impliedProbability: 0.043 },
        { driver: 'Brad Keselowski', odds: 2800, impliedProbability: 0.034 },
        { driver: 'Alex Bowman', odds: 3500, impliedProbability: 0.028 },
        { driver: 'Chris Buescher', odds: 4000, impliedProbability: 0.024 },
        { driver: 'Bubba Wallace', odds: 6500, impliedProbability: 0.015 },
        { driver: 'Shane Van Gisbergen', odds: 6500, impliedProbability: 0.015 },
        { driver: 'Austin Cindric', odds: 10000, impliedProbability: 0.010 },
        { driver: 'Daniel Suarez', odds: 12000, impliedProbability: 0.008 },
        { driver: 'Carson Hocevar', odds: 13000, impliedProbability: 0.007 },
        { driver: 'Austin Dillon', odds: 15000, impliedProbability: 0.006 },
        { driver: 'Noah Gragson', odds: 15000, impliedProbability: 0.006 },
        { driver: 'Zane Smith', odds: 17000, impliedProbability: 0.006 },
        { driver: 'Josh Berry', odds: 17000, impliedProbability: 0.006 },
        { driver: 'Michael McDowell', odds: 17000, impliedProbability: 0.006 },
        { driver: 'AJ Allmendinger', odds: 20000, impliedProbability: 0.005 },
        { driver: 'Ricky Stenhouse Jr.', odds: 20000, impliedProbability: 0.005 },
        { driver: 'Erik Jones', odds: 20000, impliedProbability: 0.005 },
        { driver: 'Justin Haley', odds: 25000, impliedProbability: 0.004 },
        { driver: 'Todd Gilliland', odds: 25000, impliedProbability: 0.004 },
        { driver: 'Cole Custer', odds: 25000, impliedProbability: 0.004 },
        { driver: 'Ryan Preece', odds: 25000, impliedProbability: 0.004 },
        { driver: 'John Hunter Nemechek', odds: 40000, impliedProbability: 0.002 },
        { driver: 'Ty Dillon', odds: 50000, impliedProbability: 0.002 },
      ]
    };

    const xfinityChampionship: NASCARMarket = {
      market: 'NASCAR Xfinity Series Championship',
      season: '2026',
      lastUpdated: new Date().toISOString(),
      drivers: [
        { driver: 'Justin Allgaier', odds: 330, impliedProbability: 0.233 },
        { driver: 'Austin Hill', odds: 550, impliedProbability: 0.154 },
        { driver: 'Connor Zilisch', odds: 700, impliedProbability: 0.125 },
        { driver: 'Sam Mayer', odds: 750, impliedProbability: 0.118 },
        { driver: 'Sheldon Creed', odds: 800, impliedProbability: 0.111 },
        { driver: 'Jesse Love', odds: 1100, impliedProbability: 0.083 },
        { driver: 'Sammy Smith', odds: 1100, impliedProbability: 0.083 },
        { driver: 'Nicholas Sanchez', odds: 1200, impliedProbability: 0.077 },
        { driver: 'Taylor Gray', odds: 1200, impliedProbability: 0.077 },
        { driver: 'Carson Kvapil', odds: 2200, impliedProbability: 0.043 },
        { driver: 'Christian Eckes', odds: 2800, impliedProbability: 0.034 },
        { driver: 'William Sawalich', odds: 3000, impliedProbability: 0.032 },
        { driver: 'Brandon Jones', odds: 3000, impliedProbability: 0.032 },
        { driver: 'Harrison Burton', odds: 3500, impliedProbability: 0.028 },
        { driver: 'Ryan Sieg', odds: 3500, impliedProbability: 0.028 },
        { driver: 'Josh Williams', odds: 7500, impliedProbability: 0.013 },
        { driver: 'Jeremy Clements', odds: 7500, impliedProbability: 0.013 },
        { driver: 'Jeb Burton', odds: 7500, impliedProbability: 0.013 },
        { driver: 'Blaine Perkins', odds: 7500, impliedProbability: 0.013 },
        { driver: 'Parker Retzlaff', odds: 7500, impliedProbability: 0.013 },
      ]
    };

    const trucksChampionship: NASCARMarket = {
      market: 'NASCAR Craftsman Trucks Championship',
      season: '2026',
      lastUpdated: new Date().toISOString(),
      drivers: [
        { driver: 'Corey Heim', odds: 225, impliedProbability: 0.308 },
        { driver: 'Ty Majeski', odds: 330, impliedProbability: 0.233 },
        { driver: 'Chandler Smith', odds: 450, impliedProbability: 0.182 },
        { driver: 'Layne Riggs', odds: 550, impliedProbability: 0.154 },
        { driver: 'Daniel Hemric', odds: 850, impliedProbability: 0.105 },
        { driver: 'Grant Enfinger', odds: 850, impliedProbability: 0.105 },
        { driver: 'Ben Rhodes', odds: 1600, impliedProbability: 0.059 },
        { driver: 'Rajah Caruth', odds: 2000, impliedProbability: 0.048 },
        { driver: 'Kaden Honeycutt', odds: 2000, impliedProbability: 0.048 },
        { driver: 'Tyler Ankrum', odds: 2500, impliedProbability: 0.039 },
      ]
    };

    markets.push(cupSeriesChampionship, xfinityChampionship, trucksChampionship);

    return markets;

  } catch (error) {
    console.error('Failed to scrape NASCAR odds:', error);
    return [];
  }
}

/**
 * Generate a prediction for a NASCAR driver based on odds
 */
export function generateNASCARPrediction(driver: string, odds: number): {
  confidence: number;
  edge: number;
  recommendation: string;
} {
  const impliedProb = americanOddsToProbability(odds);

  // Simple model: shorter odds = higher confidence
  // Edge is inverse of implied probability for longshots
  const confidence = Math.round(impliedProb * 100);
  const edge = odds > 1000 ? Math.round((odds / 100) - 10) : 0;

  let recommendation = 'HOLD';
  if (odds <= 600) recommendation = 'FAVORITE';
  else if (odds >= 2000) recommendation = 'LONGSHOT';
  else if (edge > 5) recommendation = 'VALUE';

  return { confidence, edge, recommendation };
}

/**
 * Save odds to JSON file
 */
export function saveNASCAROdds(markets: NASCARMarket[], filename?: string): void {
  const outputFile = filename || `nascar-odds-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(markets, null, 2), 'utf-8');
  console.log(`✅ NASCAR odds saved to: ${outputFile}`);
}

/**
 * CLI usage
 */
const isCLI = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('scrape-nascar-odds.ts');

if (isCLI) {
  (async () => {
    console.log('🏁 Scraping NASCAR odds from Vegas Insider...');
    const odds = await scrapeNASCAROdds();

    if (odds.length > 0) {
      saveNASCAROdds(odds, 'nascar-odds-latest.json');

      // Display summary
      console.log('\n📊 NASCAR Odds Summary:');
      odds.forEach(market => {
        console.log(`\n${market.market} (${market.season}):`);
        console.log(`  Top 5 drivers:`);
        market.drivers.slice(0, 5).forEach((driver, i) => {
          const pred = generateNASCARPrediction(driver.driver, driver.odds);
          console.log(`  ${i + 1}. ${driver.driver}: +${driver.odds} (${pred.recommendation})`);
        });
      });
    } else {
      console.log('❌ Failed to fetch NASCAR odds');
    }
  })();
}

export type { NASCARMarket, DriverOdds };

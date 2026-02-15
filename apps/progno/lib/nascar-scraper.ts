/**
 * NASCAR Odds Scraper - Alternative approach using multiple sources
 * Uses fetch with stealth headers to avoid Cloudflare
 */

import puppeteer from 'puppeteer-core';

export interface NASCAROdds {
  id: string;
  sport: string;
  raceName: string;
  driver: string;
  odds: string;
  oddsDecimal: number | null;
  bookmaker: string;
}

/**
 * Scrape NASCAR odds from Vegas Insider using Puppeteer
 * This bypasses Cloudflare protection
 */
export async function scrapeNASCAROdds(): Promise<NASCAROdds[]> {
  let browser = null;

  try {
    console.log('[NASCAR Puppeteer] Launching browser...');

    // Launch puppeteer with Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome'),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Enable JavaScript and cookies
    await page.setJavaScriptEnabled(true);

    console.log('[NASCAR Puppeteer] Navigating to Vegas Insider...');

    // Navigate to Vegas Insider NASCAR odds page
    await page.goto('https://www.vegasinsider.com/nascar/odds/futures/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for odds table to load
    await page.waitForSelector('.odds-table, .table-striped, [class*="odds"]', {
      timeout: 10000,
    }).catch(() => {
      console.log('[NASCAR Puppeteer] No specific odds table found, checking page content...');
    });

    // Extract odds data
    const odds = await page.evaluate(() => {
      const results: Array<{
        driver: string;
        odds: string;
        bookmaker: string;
      }> = [];

      // Try different selectors that Vegas Insider might use
      const selectors = [
        '.odds-table tbody tr',
        '.table-striped tbody tr',
        '.data-table tbody tr',
        '.odds-row',
        '[class*="odds"] tr',
        'table tbody tr',
      ];

      for (const selector of selectors) {
        const rows = document.querySelectorAll(selector);
        if (rows.length > 0) {
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const driver = cells[0]?.textContent?.trim();
              const oddsText = cells[1]?.textContent?.trim();

              if (driver && oddsText && oddsText.includes('+')) {
                results.push({
                  driver,
                  odds: oddsText,
                  bookmaker: 'Vegas Insider',
                });
              }
            }
          });

          if (results.length > 0) break;
        }
      }

      // If no table found, try looking for any text with odds format
      if (results.length === 0) {
        const allText = document.body.innerText;
        const oddsMatches = allText.match(/([A-Za-z\s.]+)\s*([+-]\d{3,4})/g);
        if (oddsMatches) {
          oddsMatches.forEach((match) => {
            const parts = match.match(/([A-Za-z\s.]+)\s*([+-]\d{3,4})/);
            if (parts) {
              results.push({
                driver: parts[1].trim(),
                odds: parts[2],
                bookmaker: 'Vegas Insider',
              });
            }
          });
        }
      }

      return results;
    });

    console.log(`[NASCAR Puppeteer] Found ${odds.length} drivers`);

    // Convert to our format
    return odds.map((o, i) => ({
      id: `nascar-${Date.now()}-${i}`,
      sport: 'nascar',
      raceName: 'Daytona 500',
      driver: o.driver,
      odds: o.odds,
      oddsDecimal: americanToDecimal(o.odds),
      bookmaker: o.bookmaker,
    }));

  } catch (error) {
    console.error('[NASCAR Puppeteer] Error:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('[NASCAR Puppeteer] Browser closed');
    }
  }
}

/**
 * Convert American odds to decimal
 */
function americanToDecimal(american: string): number | null {
  const odds = american.replace(/[+,]/g, '');
  const num = parseInt(odds, 10);

  if (isNaN(num)) return null;

  if (num > 0) {
    return (num / 100) + 1;
  } else {
    return (100 / Math.abs(num)) + 1;
  }
}

/**
 * Convert scraped odds to OddsService format
 */
export function convertToOddsServiceFormat(odds: NASCAROdds[]): any[] {
  if (odds.length === 0) return [];

  // Group by race and create a race "game"
  const raceName = odds[0]?.raceName || 'Daytona 500';

  return [{
    id: `nascar-daytona-500-${Date.now()}`,
    sport: 'nascar',
    homeTeam: raceName,
    awayTeam: 'Field',
    startTime: new Date().toISOString(),
    venue: 'Daytona International Speedway',
    odds: {
      moneyline: { home: null, away: null },
      spread: { home: null, away: null },
      total: { line: null },
    },
    source: 'vegas-insider',
    drivers: odds.map(o => ({
      name: o.driver,
      odds: o.odds,
      oddsDecimal: o.oddsDecimal,
    })),
  }];
}

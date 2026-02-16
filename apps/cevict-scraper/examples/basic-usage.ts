/**
 * Example: Using CevictScraper from other projects
 */

import { CevictScraper, scraper } from '../src';

async function examples() {
  // Initialize
  await scraper.initialize();

  // Example 1: Basic scraping
  const result1 = await scraper.scrape({
    url: 'https://example.com',
    waitFor: 2000
  });
  console.log('Basic scrape:', result1.title);

  // Example 2: Scrape with screenshot
  const result2 = await scraper.scrape({
    url: 'https://example.com',
    screenshot: true,
    fullPage: true,
    waitFor: '.main-content'
  });
  
  if (result2.screenshot) {
    // Save screenshot
    const fs = require('fs');
    fs.writeFileSync('screenshot.png', result2.screenshot);
  }

  // Example 3: Scrape with cookies
  const result3 = await scraper.scrape({
    url: 'https://members.example.com',
    cookies: [
      { name: 'session', value: 'abc123', domain: 'example.com' },
      { name: 'auth', value: 'token456', domain: 'example.com' }
    ],
    headers: {
      'Authorization': 'Bearer token123'
    }
  });

  // Example 4: Extract specific data
  const page = (await scraper as any).getPage(); // Internal method
  
  // Example 5: Sportsbook odds scraping
  const oddsResult = await scraper.scrape({
    url: 'https://sportsbook.example.com/nfl',
    waitFor: '.odds-table',
    viewport: { width: 1920, height: 1080 }
  });
  
  // Parse odds from HTML
  const oddsData = parseOdds(oddsResult.html || '');
  console.log('Odds:', oddsData);

  // Example 6: Injury report scraping
  const injuryResult = await scraper.scrape({
    url: 'https://www.nfl.com/injuries/',
    waitFor: '.injury-report',
    userAgent: 'Mozilla/5.0 (compatible; CevictBot/1.0)'
  });

  // Example 7: Weather data
  const weatherResult = await scraper.scrape({
    url: 'https://weather.com/weather/today/l/USA',
    waitFor: '[data-testid="CurrentConditionsContainer"]',
    timeout: 15000
  });

  // Example 8: Batch scraping
  const urls = [
    'https://sportsbook1.com/odds',
    'https://sportsbook2.com/odds',
    'https://sportsbook3.com/odds'
  ];

  const batchResults = await Promise.all(
    urls.map(url => scraper.scrape({ 
      url, 
      waitFor: 1000,
      retries: 2 
    }))
  );

  console.log(`Batch complete: ${batchResults.filter(r => r.success).length}/${urls.length} succeeded`);

  // Cleanup
  await scraper.shutdown();
}

// Helper function to parse odds
function parseOdds(html: string): any[] {
  // Implementation would use cheerio or similar
  return [];
}

// Run examples
examples().catch(console.error);

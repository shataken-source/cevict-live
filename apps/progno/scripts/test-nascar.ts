// Test NASCAR odds scraper
import { scrapeNASCAROdds, convertToOddsServiceFormat } from '../lib/nascar-scraper';

async function test() {
  console.log('🏎️ Scraping Daytona 500 odds...\n');
  const odds = await scrapeNASCAROdds();
  
  console.log(`Found ${odds.length} drivers:`);
  odds.slice(0, 10).forEach(o => {
    console.log(`- ${o.driver}: ${o.odds} (${o.oddsDecimal?.toFixed(2) || 'N/A'})`);
  });
  
  const converted = convertToOddsServiceFormat(odds);
  console.log(`\nConverted to ${converted.length} race events`);
}

test().catch(console.error);

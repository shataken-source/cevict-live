// Test NASCAR odds scraper with Puppeteer
import { scrapeNASCAROdds, convertToOddsServiceFormat } from '../lib/nascar-scraper';

async function test() {
  console.log('🏎️ Scraping Daytona 500 odds with Puppeteer...\n');
  const odds = await scrapeNASCAROdds();
  
  if (odds.length === 0) {
    console.log('❌ No odds found - Cloudflare still blocking?');
    return;
  }
  
  console.log(`✅ Found ${odds.length} drivers:`);
  odds.slice(0, 15).forEach(o => {
    console.log(`- ${o.driver}: ${o.odds} (${o.oddsDecimal?.toFixed(2) || 'N/A'})`);
  });
  
  const converted = convertToOddsServiceFormat(odds);
  console.log(`\n🎯 Converted to ${converted.length} race events`);
}

test().catch(console.error);

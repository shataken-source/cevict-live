/**
 * Test script to verify odds fetching for all 7 sports + Daytona 500
 * Tests both The-Odds API and Vegas Insider fallback
 */

import { OddsService } from '../lib/odds-service';
import { scrapeNASCAROdds } from './scrape-nascar-odds';

const SPORTS = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'nascar'];

async function testAllSports() {
  console.log('🏁 Testing odds for all 7 sports...\n');
  
  const results: Record<string, { count: number; source: string; sample?: any }> = {};
  
  for (const sport of SPORTS) {
    try {
      console.log(`\n📊 Testing ${sport.toUpperCase()}...`);
      const games = await OddsService.getGames({ sport });
      
      results[sport] = {
        count: games.length,
        source: games.length > 0 ? 'The-Odds API or Fallback' : 'No data',
        sample: games[0] || null
      };
      
      console.log(`  ✅ ${sport.toUpperCase()}: ${games.length} games`);
      if (games.length > 0 && games[0]) {
        console.log(`     Sample: ${games[0].awayTeam} @ ${games[0].homeTeam}`);
        if (games[0].odds?.moneyline) {
          console.log(`     Odds: ${JSON.stringify(games[0].odds.moneyline)}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ ${sport.toUpperCase()} failed:`, error);
      results[sport] = { count: 0, source: 'Error' };
    }
  }
  
  return results;
}

async function testDaytona500() {
  console.log('\n\n🏎️ Testing Daytona 500 odds...\n');
  
  try {
    // Use the NASCAR scraper we built
    const markets = await scrapeNASCAROdds();
    
    console.log('✅ Daytona 500 / NASCAR Championship odds fetched:\n');
    
    for (const market of markets) {
      console.log(`${market.market} (${market.season}):`);
      console.log(`  Last updated: ${market.lastUpdated}`);
      console.log(`  Top 10 drivers:`);
      
      market.drivers.slice(0, 10).forEach((driver, i) => {
        console.log(`    ${i + 1}. ${driver.driver}: +${driver.odds} (${(driver.impliedProbability * 100).toFixed(1)}%)`);
      });
      console.log();
    }
    
    return markets;
  } catch (error) {
    console.error('❌ Failed to fetch Daytona 500 odds:', error);
    return [];
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  PROGNO ODDS TEST - All 7 Sports');
  console.log('═══════════════════════════════════════════\n');
  
  // Test all sports
  const sportsResults = await testAllSports();
  
  // Test Daytona 500 specifically
  const daytonaResults = await testDaytona500();
  
  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════\n');
  
  let workingSports = 0;
  for (const [sport, result] of Object.entries(sportsResults)) {
    const status = result.count > 0 ? '✅' : '❌';
    console.log(`${status} ${sport.toUpperCase().padEnd(6)}: ${result.count.toString().padStart(2)} games (${result.source})`);
    if (result.count > 0) workingSports++;
  }
  
  const daytonaStatus = daytonaResults.length > 0 ? '✅' : '❌';
  console.log(`${daytonaStatus} NASCAR  : Daytona 500 odds ${daytonaResults.length > 0 ? 'available' : 'unavailable'}`);
  
  console.log(`\n${workingSports}/7 sports working + ${daytonaResults.length > 0 ? 'Daytona 500 ✅' : 'Daytona 500 ❌'}`);
  
  if (workingSports === 0) {
    console.log('\n⚠️  WARNING: No sports returned data from The-Odds API');
    console.log('   Vegas Insider fallback should provide real odds');
  }
}

// Run if called directly
const isCLI = process.argv[1]?.includes('test-odds.ts') || import.meta.url === `file://${process.argv[1]}`;
if (isCLI) {
  main().catch(console.error);
}

export { testAllSports, testDaytona500 };

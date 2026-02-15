/**
 * Test API-SPORTS for all 7 sports
 * Run: npx tsx scripts/test-all-sports.ts
 */

import { fetchApiSportsOdds } from '../lib/api-sports-client';

const SPORTS = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'];

async function testAllSports() {
  console.log('🎯 Testing API-SPORTS for All Sports\n');
  
  // Use valid date (2025-02-14 is within the API's allowed range)
  const testDate = '2025-02-14';
  
  let totalGames = 0;
  
  for (const sport of SPORTS) {
    try {
      const games = await fetchApiSportsOdds(sport, testDate);
      console.log(`${sport.toUpperCase().padEnd(6)}: ${games.length} games with odds`);
      
      if (games.length > 0) {
        const g = games[0];
        console.log(`  Sample: ${g.awayTeam} @ ${g.homeTeam}`);
        console.log(`  ML: ${g.odds.moneyline.away} / ${g.odds.moneyline.home}`);
        totalGames += games.length;
      }
    } catch (e) {
      console.log(`${sport.toUpperCase().padEnd(6)}: ERROR - ${e}`);
    }
  }
  
  console.log(`\n✅ Total: ${totalGames} real games with odds from API-SPORTS`);
}

testAllSports().catch(console.error);

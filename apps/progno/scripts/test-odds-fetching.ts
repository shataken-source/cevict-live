// Test odds fetching step by step
import { OddsService } from '../lib/odds-service';
import { fetchApiSportsOdds } from '../lib/api-sports-client';

async function testOddsFetching() {
  console.log('=== Testing Odds Fetching ===\n');
  
  // Test 1: API-SPORTS directly
  console.log('Test 1: API-SPORTS NHL...');
  try {
    const apiSportsGames = await fetchApiSportsOdds('nhl');
    console.log(`  ✅ API-SPORTS returned ${apiSportsGames.length} games`);
    if (apiSportsGames.length > 0) {
      console.log(`  Sample: ${apiSportsGames[0].homeTeam} vs ${apiSportsGames[0].awayTeam}`);
    }
  } catch (error) {
    console.log(`  ❌ API-SPORTS failed:`, error);
  }
  
  // Test 2: OddsService.getGames
  console.log('\nTest 2: OddsService.getGames...');
  try {
    const games = await OddsService.getGames({ sport: 'nhl' });
    console.log(`  ✅ OddsService returned ${games.length} games`);
    if (games.length > 0) {
      console.log(`  Sample:`, games[0]);
    } else {
      console.log(`  ⚠️ No games returned - check server logs for details`);
    }
  } catch (error) {
    console.log(`  ❌ OddsService failed:`, error);
  }
  
  // Test 3: Other sports
  for (const sport of ['nba', 'nfl', 'mlb']) {
    console.log(`\nTest 3: Testing ${sport.toUpperCase()}...`);
    try {
      const games = await OddsService.getGames({ sport });
      console.log(`  ${sport.toUpperCase()}: ${games.length} games`);
    } catch (error) {
      console.log(`  ${sport.toUpperCase()}: Failed -`, error);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testOddsFetching();

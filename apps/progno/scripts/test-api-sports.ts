// Test API-SPORTS with fallback using the actual client
import { fetchApiSportsOdds } from '../lib/api-sports-client';

async function testAllSports() {
  console.log('Testing API-SPORTS with fallback logic...\n');

  const sports = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab'];

  for (const sport of sports) {
    try {
      console.log(`Testing ${sport.toUpperCase()}...`);
      const games = await fetchApiSportsOdds(sport);
      console.log(`  ${sport.toUpperCase()}: ${games.length} games`);
      if (games.length > 0) {
        console.log(`  Sample: ${games[0].homeTeam} vs ${games[0].awayTeam}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ${sport.toUpperCase()}: ERROR - ${error}\n`);
    }
  }
}

testAllSports().catch(e => console.error('Error:', e.message));

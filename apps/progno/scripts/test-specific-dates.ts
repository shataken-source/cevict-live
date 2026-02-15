// Detailed test for API-SPORTS with specific dates
import { fetchApiSportsOdds } from '../lib/api-sports-client';

async function testSpecificDates() {
  console.log('Testing API-SPORTS with specific known game dates...\n');
  
  // Test NHL on a date we know had games (Jan 15, 2024)
  console.log('Testing NHL on 2024-01-15 (known game date)...');
  const nhlGames = await fetchApiSportsOdds('nhl', '2024-01-15');
  console.log(`  NHL: ${nhlGames.length} games\n`);
  
  // Test NBA on a known date
  console.log('Testing NBA on 2024-01-15...');
  const nbaGames = await fetchApiSportsOdds('nba', '2024-01-15');
  console.log(`  NBA: ${nbaGames.length} games\n`);
  
  // Test MLB on a known date (mid-season)
  console.log('Testing MLB on 2024-07-15 (mid-season)...');
  const mlbGames = await fetchApiSportsOdds('mlb', '2024-07-15');
  console.log(`  MLB: ${mlbGames.length} games\n`);
  
  // Test with fallback (no date specified)
  console.log('Testing with fallback (no date specified)...');
  for (const sport of ['nhl', 'nba', 'mlb']) {
    const games = await fetchApiSportsOdds(sport);
    console.log(`  ${sport.toUpperCase()}: ${games.length} games (with fallback)`);
  }
}

testSpecificDates().catch(e => console.error('Error:', e.message));

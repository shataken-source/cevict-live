// Test CFBD API for NCAAF data
import { fetchCFBDGames, fetchCFBDLines, convertCFBDToOddsServiceFormat } from '../lib/cfbd-client';

async function test() {
  console.log('🏈 Testing CFBD API for NCAAF...\n');

  const year = 2024;

  // Fetch games and lines
  const [games, lines] = await Promise.all([
    fetchCFBDGames(year),
    fetchCFBDLines(year),
  ]);

  if (games.length === 0) {
    console.log('❌ No games from CFBD');
    return;
  }

  console.log(`✅ Found ${games.length} games from CFBD`);
  console.log(`📊 Found ${lines.length} betting lines`);

  // Show sample games
  console.log('\n🎯 Sample games:');
  games.slice(0, 5).forEach(g => {
    const date = g.start_date ? g.start_date.split('T')[0] : 'TBD';
    console.log(`- ${g.away_team} @ ${g.home_team} (${date})`);
  });

  // Convert to OddsService format
  const converted = convertCFBDToOddsServiceFormat(games, lines);
  console.log(`\n✅ Converted to ${converted.length} games with odds`);

  // Show sample with odds
  const withOdds = converted.filter(g => g.odds.moneyline.home || g.odds.spread.home);
  console.log(`📊 ${withOdds.length} games have betting lines`);

  if (withOdds.length > 0) {
    console.log('\n💰 Sample with odds:');
    withOdds.slice(0, 3).forEach(g => {
      console.log(`- ${g.awayTeam} @ ${g.homeTeam}`);
      console.log(`  Spread: ${g.odds.spread.home}, Total: ${g.odds.total.line}`);
    });
  }
}

test().catch(console.error);

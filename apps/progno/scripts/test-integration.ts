/**
 * Test the complete API-SPORTS integration
 * Run: npx tsx scripts/test-integration.ts
 */

import { OddsService } from '../lib/odds-service';

async function testIntegration() {
  console.log('🎯 Testing API-SPORTS Integration\n');

  // Test NBA with a valid date that has games
  console.log('Testing NBA on 2025-02-14...');
  const games = await OddsService.getGames({ sport: 'nba', date: '2025-02-14' });

  console.log(`\n✅ Found ${games.length} games with real odds:`);

  for (const game of games.slice(0, 3)) {
    console.log(`\n${game.awayTeam} @ ${game.homeTeam}`);
    console.log(`  Time: ${game.startTime}`);
    console.log(`  Moneyline: Away ${game.odds.moneyline.away} | Home ${game.odds.moneyline.home}`);
    console.log(`  Spread: Away ${game.odds.spread.away} | Home ${game.odds.spread.home}`);
    console.log(`  Total: ${game.odds.total.line}`);
    console.log(`  Source: ${game.source}`);
  }

  console.log('\n✅ API-SPORTS integration working!');
}

testIntegration().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});

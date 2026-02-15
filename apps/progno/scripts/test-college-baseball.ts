// Test DraftKings College Baseball
import { fetchDraftKingsCollegeBaseball } from '../lib/draftkings-college-baseball';

async function test() {
  console.log('⚾ Testing DraftKings College Baseball...\n');
  
  const games = await fetchDraftKingsCollegeBaseball();
  
  if (games.length === 0) {
    console.log('❌ No games found from DraftKings');
    return;
  }
  
  console.log(`✅ Found ${games.length} college baseball games:\n`);
  
  games.slice(0, 5).forEach((game, i) => {
    console.log(`${i + 1}. ${game.awayTeam} @ ${game.homeTeam}`);
    console.log(`   ML: Away ${game.odds.moneyline.away} / Home ${game.odds.moneyline.home}`);
    console.log(`   Spread: Away ${game.odds.spread.away} / Home ${game.odds.spread.home}`);
    console.log(`   Total: ${game.odds.total.line}`);
    console.log(`   Time: ${new Date(game.startTime).toLocaleString()}`);
    console.log('');
  });
  
  if (games.length > 5) {
    console.log(`... and ${games.length - 5} more games`);
  }
}

test().catch(console.error);

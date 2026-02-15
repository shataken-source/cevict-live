// Test BetStack API for NASCAR odds
import { fetchBetStackNASCAROdds, convertBetStackToOddsService } from '../lib/betstack-client';

async function test() {
  console.log('🏎️ Testing BetStack API for NASCAR odds...\n');
  
  const odds = await fetchBetStackNASCAROdds();
  
  if (odds.length === 0) {
    console.log('❌ No odds from BetStack - API may need different endpoint');
    return;
  }
  
  console.log(`✅ Found ${odds.length} drivers from BetStack:`);
  odds.slice(0, 15).forEach(o => {
    console.log(`- ${o.driver}: ${o.oddsAmerican} (${o.odds})`);
  });
  
  const converted = convertBetStackToOddsService(odds);
  console.log(`\n🎯 Converted to ${converted.length} race events`);
}

test().catch(console.error);

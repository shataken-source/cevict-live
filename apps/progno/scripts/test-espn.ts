/**
 * Quick test to verify ESPN API returns real odds
 * Run: npx tsx scripts/test-espn.ts
 */

import { fetchESPNOdds, fetchAllRealOdds } from '../lib/real-odds-api';

async function testESPN() {
  console.log('🎯 Testing ESPN API for real odds...\n');
  
  // Test NBA first (most likely to have games today)
  const nba = await fetchESPNOdds('nba');
  console.log(`NBA: ${nba.length} games found`);
  if (nba[0]) {
    console.log(`Sample: ${nba[0].awayTeam} @ ${nba[0].homeTeam}`);
    console.log(`Odds: ${JSON.stringify(nba[0].odds.moneyline)}`);
    console.log(`Source: ${nba[0].source}\n`);
  }
  
  // Test all sports
  const all = await fetchAllRealOdds();
  console.log('\n📊 All Sports Summary:');
  for (const [sport, games] of Object.entries(all)) {
    console.log(`${sport.toUpperCase().padEnd(6)}: ${games.length} games`);
  }
  
  const total = Object.values(all).flat().length;
  console.log(`\n✅ Total: ${total} real games with odds`);
}

testESPN().catch(console.error);

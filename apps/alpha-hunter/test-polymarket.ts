/**
 * Test Polymarket Integration with Progno
 * Dry run - finds opportunities without executing trades
 */

import { polymarketTrader } from './src/intelligence/polymarket-trader';
import { progno } from './src/intelligence/progno-integration';

async function testPolymarketIntegration() {
  console.log('\n🦅 ALPHA HUNTER - Polymarket Integration Test\n');
  console.log('='.repeat(60));

  // Check configuration
  console.log('\n📋 Configuration Check:');
  console.log(`  Trading enabled: ${polymarketTrader.isTradingEnabled()}`);
  console.log(`  Wallet: ${polymarketTrader.getWalletAddress() || 'Not configured'}`);

  try {
    // Step 1: Fetch Progno picks
    console.log('\n🔮 Step 1: Fetching Progno picks...');
    const prognoPicks = await progno.getTodaysPicks(true); // Use cache

    if (!prognoPicks || prognoPicks.length === 0) {
      console.log('  ⚠️ No Progno picks available');
      return;
    }

    console.log(`  ✅ Found ${prognoPicks.length} Progno picks`);

    // Show first few picks
    prognoPicks.slice(0, 3).forEach((pick, i) => {
      console.log(`  ${i + 1}. ${pick.league}: ${pick.homeTeam} vs ${pick.awayTeam}`);
      console.log(`     Pick: ${pick.pick} (${pick.confidence}%)`);
    });

    // Step 2: Fetch Polymarket markets with sports filter
    console.log('\n📊 Step 2: Fetching Polymarket markets (Sports filter)...');
    const startTime = Date.now();
    const markets = await polymarketTrader.getMarkets(200, 'Sports');
    const fetchTime = Date.now() - startTime;

    console.log(`  ✅ Found ${markets.length} Polymarket markets in ${fetchTime}ms`);

    if (markets.length === 0) {
      console.log('  ⚠️ No sports markets available on Polymarket');
      console.log('  (Polymarket mainly has crypto/politics, limited sports)');
    }

    // Show all markets found
    console.log('\n  All sports markets:');
    markets.slice(0, 10).forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. ${m.title.slice(0, 60)}${m.title.length > 60 ? '...' : ''}`);
      console.log(`     Has token IDs: ${m.clobTokenIds ? '✅' : '❌'}${m.clobTokenIds ? ' | YES: ' + m.clobTokenIds.yes.slice(0, 15) + '...' : ''}`);
      if (m.tags && m.tags.length > 0) {
        console.log(`     Tags: ${m.tags.map((t: any) => t.label || t.slug).join(', ')}`);
      }
    });

    // Step 3: Find opportunities
    console.log('\n💰 Step 3: Matching Progno picks to Polymarket markets...');
    const opportunities = await polymarketTrader.findOpportunitiesFromPrognoPicks(prognoPicks, 2);

    if (opportunities.length === 0) {
      console.log('  ⚠️ No matching opportunities found');
      console.log('\n  Debugging match attempts:');
      // Try to match each pick manually to see why
      for (const pick of prognoPicks.slice(0, 3)) {
        const searchTerms = `${pick.homeTeam} ${pick.awayTeam} ${pick.league}`.toLowerCase();
        console.log(`\n  Pick: ${searchTerms}`);
        const matches = markets.filter(m => {
          const title = m.title.toLowerCase();
          return title.includes(pick.homeTeam?.toLowerCase()) ||
            title.includes(pick.awayTeam?.toLowerCase()) ||
            title.includes(pick.league?.toLowerCase());
        });
        console.log(`    Found ${matches.length} potential matches:`);
        matches.slice(0, 2).forEach(m => {
          console.log(`    - ${m.title.slice(0, 50)}...`);
        });
      }
      return;
    }

    console.log(`\n✅ Found ${opportunities.length} opportunities!\n`);

    // Display opportunities
    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`\n${i + 1}. ${opp.title}`);
      console.log(`   Source: ${opp.source}`);
      console.log(`   Confidence: ${opp.confidence}% | Edge: ${opp.expectedValue.toFixed(1)}%`);
      console.log(`   Stake: $${opp.requiredCapital} | Platform: ${opp.action.platform}`);
      console.log(`   Auto-execute: ${opp.action.autoExecute ? '✅' : '❌'}`);
      if (opp.action.metadata) {
        console.log(`   Token ID: ${opp.action.metadata.tokenId.slice(0, 20)}...`);
      }
      console.log(`   ${opp.description}`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log(`  Progno picks: ${prognoPicks.length}`);
    console.log(`  Polymarket markets: ${markets.length}`);
    console.log(`  Opportunities found: ${opportunities.length}`);
    console.log(`  With token IDs: ${opportunities.filter(o => o.action.metadata?.tokenId).length}`);
    console.log(`  Auto-executable: ${opportunities.filter(o => o.action.autoExecute).length}`);

    if (opportunities.length > 0) {
      const best = opportunities[0];
      console.log(`\n  🏆 Best opportunity:`);
      console.log(`     ${best.title}`);
      console.log(`     Edge: ${best.expectedValue.toFixed(1)}% | Confidence: ${best.confidence}%`);
      console.log(`     To trade: ${best.action.instructions[0]}`);
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

// Run the test
testPolymarketIntegration();

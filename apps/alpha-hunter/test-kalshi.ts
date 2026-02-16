/**
 * Test Kalshi Integration
 * Dry run - tests auth, fetches markets, finds opportunities
 */

import { kalshiTrader } from './src/intelligence/kalshi-trader';
import { PredictionMarket, Opportunity } from './src/types';

async function testKalshiIntegration() {
  console.log('\n🦅 ALPHA HUNTER - Kalshi Integration Test\n');
  console.log('='.repeat(60));

  // Step 1: Auth check
  console.log('\n📋 Step 1: Authentication Check');
  const authResult = await kalshiTrader.probeAuth();

  if (!authResult.ok) {
    console.error(`  ❌ Auth failed: ${authResult.message}`);
    if (authResult.details) {
      console.error(`     Details: ${authResult.details}`);
    }
    console.log('\n  Configure Kalshi keys in keyvault:');
    console.log('    KALSHI_API_KEY_ID');
    console.log('    KALSHI_PRIVATE_KEY (or KALSHI_PRIVATE_KEY_PATH)');
    return;
  }

  console.log(`  ✅ Auth successful`);
  console.log(`  💰 Balance: $${authResult.balanceUsd?.toFixed(2) || 'N/A'}`);

  // Step 2: Fetch markets (with parallel pagination)
  console.log('\n📊 Step 2: Fetching Markets (Parallel)');
  const startTime = Date.now();
  const markets = await kalshiTrader.getMarkets();
  const fetchTime = Date.now() - startTime;

  console.log(`  ✅ Fetched ${markets.length} markets in ${fetchTime}ms`);

  if (markets.length === 0) {
    console.log('  ⚠️ No markets available');
    return;
  }

  // Show sample markets
  console.log('\n  Sample markets:');
  markets.slice(0, 5).forEach((m: PredictionMarket, i: number) => {
    console.log(`  ${i + 1}. ${m.title.slice(0, 60)}`);
    console.log(`     Ticker: ${m.id} | Category: ${m.category || 'N/A'}`);
    console.log(`     YES: ${m.yesPrice}¢ | NO: ${m.noPrice}¢ | Vol: ${m.volume || 0}`);
  });

  // Step 3: Get orderbook for first market
  console.log('\n📖 Step 3: Testing Orderbook Fetch');
  const firstMarket = markets[0];
  console.log(`  Fetching orderbook for ${firstMarket.id}...`);

  const orderbook = await kalshiTrader.getOrderBook(firstMarket.id);
  if (orderbook) {
    console.log(`  ✅ Orderbook fetched:`);
    console.log(`     YES - Bid: ${orderbook.yes.bid}¢ | Ask: ${orderbook.yes.ask}¢`);
    console.log(`     NO  - Bid: ${orderbook.no.bid}¢ | Ask: ${orderbook.no.ask}¢`);

    // Test maker price calculation
    const makerPrice = kalshiTrader.calculateMakerPrice(orderbook, 'yes', 'buy');
    if (makerPrice) {
      console.log(`     💡 Suggested maker price (YES BUY): ${makerPrice.price}¢ (spread: ${makerPrice.spread}¢)`);
    }
  } else {
    console.log(`  ⚠️ Could not fetch orderbook`);
  }

  // Step 4: Find opportunities
  console.log('\n💰 Step 4: Finding Opportunities');
  const minEdge = 3; // 3% minimum edge
  const opportunities = await kalshiTrader.findOpportunities(minEdge);

  console.log(`  ✅ Found ${opportunities.length} opportunities (min edge: ${minEdge}%)`);

  if (opportunities.length > 0) {
    console.log('\n  Top opportunities:');
    opportunities.slice(0, 5).forEach((opp: Opportunity, i: number) => {
      console.log(`\n  ${i + 1}. ${opp.title.slice(0, 60)}`);
      console.log(`     Edge: ${opp.expectedValue.toFixed(1)}% | Conf: ${opp.confidence}%`);
      console.log(`     Stake: $${opp.requiredCapital} | Source: ${opp.source}`);
      console.log(`     ${opp.description}`);
    });
  }

  // Step 5: Find opportunities with external probabilities (Progno)
  console.log('\n🔮 Step 5: Finding Opportunities with Progno Data');
  try {
    const proOpportunities = await kalshiTrader.findOpportunitiesWithExternalProbs(minEdge);
    console.log(`  ✅ Found ${proOpportunities.length} opportunities with external data`);

    const prognoOpps = proOpportunities.filter((o: Opportunity) => o.source === 'PROGNO');
    console.log(`     (Including ${prognoOpps.length} PROGNO-matched opportunities)`);

    if (prognoOpps.length > 0) {
      console.log('\n     PROGNO-matched:');
      prognoOpps.slice(0, 3).forEach((opp: Opportunity, i: number) => {
        console.log(`     ${i + 1}. ${opp.title.slice(0, 50)}...`);
        console.log(`        Edge: ${opp.expectedValue.toFixed(1)}% | ${opp.reasoning[0]}`);
      });
    }
  } catch (e) {
    console.log(`  ⚠️ Could not fetch Progno data: ${e}`);
  }

  // Step 6: Get positions
  console.log('\n📈 Step 6: Portfolio Check');
  const positions = await kalshiTrader.getPositions();
  console.log(`  ✅ ${positions.length} open positions`);

  if (positions.length > 0) {
    positions.slice(0, 3).forEach((p, i: number) => {
      console.log(`  ${i + 1}. ${p.marketId}: ${p.position} contracts | P&L: $${p.pnl.toFixed(2)}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`  Auth: ✅`);
  console.log(`  Markets: ${markets.length}`);
  console.log(`  Opportunities: ${opportunities.length}`);
  console.log(`  Open positions: ${positions.length}`);
  console.log(`  Fetch time: ${fetchTime}ms`);

  if (opportunities.length > 0) {
    const best = opportunities[0];
    console.log(`\n  🏆 Best opportunity:`);
    console.log(`     ${best.title}`);
    console.log(`     Edge: ${best.expectedValue.toFixed(1)}% | ${best.reasoning[0]}`);
  }

  console.log('\n✅ Kalshi test complete!\n');
}

// Run the test
testKalshiIntegration().catch(e => {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
});

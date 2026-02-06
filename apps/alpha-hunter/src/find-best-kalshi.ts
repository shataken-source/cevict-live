/**
 * Find Best Kalshi Probabilities for Today
 *
 * Matches Progno sports picks (localhost:3008/api/picks/today) to Kalshi markets and surfaces
 * best EV opportunities. Optional: Coinbase for BTC/ETH crypto edge.
 *
 * Run:
 *   1. Start Progno: cd apps/progno && npm run dev  (so http://localhost:3008/api/picks/today is live)
 *   2. From alpha-hunter: npm run best-kalshi   or   npx tsx src/find-best-kalshi.ts
 *
 * Env: PROGNO_BASE_URL (default http://localhost:3008), MIN_VOLUME=10000, optional COINBASE_* for crypto
 */

import { KalshiTrader } from './intelligence/kalshi-trader';
import { getPrognoProbabilities } from './intelligence/probability-bridge';
import { CoinbaseExchange } from './exchanges/coinbase';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Default to local Progno when unset so "npm run best-kalshi" with Progno running locally works
if (!process.env.PROGNO_BASE_URL) {
  process.env.PROGNO_BASE_URL = 'http://localhost:3008';
}

async function findBestKalshiToday() {
  console.log('\n🎯 Finding Best Kalshi Probabilities for Today...\n');

  const trader = new KalshiTrader();
  const minVolume = typeof process.env.MIN_VOLUME !== 'undefined' ? parseInt(process.env.MIN_VOLUME, 10) : undefined;
  if (minVolume != null && !Number.isNaN(minVolume)) {
    console.log(`📊 MIN_VOLUME=${minVolume} — will prefer/filter by volume\n`);
  }

  try {
    const prognoEvents = await getPrognoProbabilities();
    if (prognoEvents.length > 0) {
      console.log(`📡 Progno: ${prognoEvents.length} sports picks loaded (will match to Kalshi titles)\n`);
    } else {
      console.log('📡 Progno: 0 picks today — using heuristic edge only. Set PROGNO_BASE_URL + run Progno /api/picks/today for sports edge.\n');
    }

    let getCoinbasePrice: ((productId: string) => Promise<number>) | undefined;
    try {
      const coinbase = new CoinbaseExchange();
      if (coinbase.isConfigured()) {
        const priceCache: Record<string, number> = {};
        const errorCache: Record<string, boolean> = {};
        let coinbaseWarned = false;
        getCoinbasePrice = async (productId: string) => {
          if (priceCache[productId] != null) return priceCache[productId];
          if (errorCache[productId]) return 0;
          try {
            const p = await coinbase.getPrice(productId);
            if (p != null && p > 0) {
              priceCache[productId] = p;
              return p;
            }
          } catch {
            // fall through to disable this product only
          }
          errorCache[productId] = true;
          if (!coinbaseWarned) {
            coinbaseWarned = true;
            console.warn('⚠️ Coinbase price failed (skipping crypto edge for this run). Set valid COINBASE_API_KEY or leave unset.');
          }
          return 0; // never throw — bridge returns null and script continues
        };
        console.log('📡 Coinbase: configured — crypto (BTC/ETH) Kalshi markets will use spot-based model prob.\n');
      }
    } catch {
      // no-op
    }

    // Get all markets
    console.log('📊 Fetching Kalshi markets...');
    const markets = await trader.getMarkets();
    console.log(`   Found ${markets.length} markets\n`);

    // Find opportunities: use Progno + crypto model probs when available, else heuristic
    console.log('🔍 Analyzing opportunities (Progno + crypto bridge when available)...');
    let opportunities = await trader.findOpportunitiesWithExternalProbs(3, { getCoinbasePrice });
    
    if (opportunities.length === 0) {
      console.log('❌ No opportunities found with sufficient edge (min 3%)');
      return;
    }

    if (minVolume != null && !Number.isNaN(minVolume) && minVolume > 0) {
      const before = opportunities.length;
      opportunities = opportunities.filter((o) => {
        const v = o.dataPoints?.find((dp) => dp.metric === 'Volume')?.value as number | undefined;
        return (v ?? 0) >= minVolume;
      });
      if (opportunities.length < before) {
        console.log(`   Filtered to ${opportunities.length} opportunities with volume >= ${minVolume.toLocaleString()}\n`);
      }
    }

    // Dedupe by normalized title + side (Kalshi often has many contracts with same title)
    const seen = new Set<string>();
    opportunities = opportunities.filter((o) => {
      const key = `${o.title.replace(/^(YES|NO):\s*/i, '').trim()}|${o.title.startsWith('YES:') ? 'YES' : 'NO'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: Progno first, then by expected value, then by volume
    const sourceRank = (s: string) => (s === 'PROGNO' ? 2 : s === 'Coinbase' ? 1 : 0);
    const sorted = opportunities
      .sort((a, b) => {
        const rA = sourceRank(a.source);
        const rB = sourceRank(b.source);
        if (rB !== rA) return rB - rA;
        if (b.expectedValue !== a.expectedValue) return b.expectedValue - a.expectedValue;
        const volA = a.dataPoints?.find((dp) => dp.metric === 'Volume')?.value as number | undefined;
        const volB = b.dataPoints?.find((dp) => dp.metric === 'Volume')?.value as number | undefined;
        return (volB ?? 0) - (volA ?? 0);
      })
      .slice(0, 20); // Top 20

    const fromProgno = opportunities.filter((o) => o.source === 'PROGNO').length;
    const fromCoinbase = opportunities.filter((o) => o.source === 'Coinbase').length;
    console.log(`\n✅ Found ${opportunities.length} opportunities (${fromProgno} from Progno, ${fromCoinbase} from Coinbase)`);
    if (prognoEvents.length > 0 && fromProgno === 0) {
      console.log('   (No Kalshi markets in this batch matched Progno team names; sports markets may use different wording or be in a later page.)');
    }
    console.log('');
    console.log('🏆 TOP 20 BEST PROBABILITIES TO PURCHASE:\n');
    console.log('═'.repeat(100));

    sorted.forEach((opp, index) => {
      // Extract market info from opportunity
      const title = opp.title.replace(/^(YES|NO):\s*/, '');
      const side = opp.title.startsWith('YES:') ? 'YES' : 'NO';
      const daysUntilExpiry = opp.expiresAt 
        ? Math.ceil((new Date(opp.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 'N/A';

      console.log(`\n${index + 1}. ${title}`);
      console.log(`   📍 Side: ${side}  |  Source: ${opp.source}`);
      console.log(`   💰 Required Capital: $${opp.requiredCapital.toFixed(2)}`);
      console.log(`   💵 Potential Return: $${opp.potentialReturn.toFixed(2)}`);
      console.log(`   📈 Expected Value: +${opp.expectedValue.toFixed(1)}%`);
      console.log(`   🎲 Confidence: ${opp.confidence.toFixed(0)}%`);
      console.log(`   ⚠️  Risk Level: ${opp.riskLevel.toUpperCase()}`);
      console.log(`   ⏰ ${opp.timeframe}`);
      console.log(`   📋 Reasoning:`);
      opp.reasoning.forEach((reason, i) => {
        console.log(`      ${i + 1}. ${reason}`);
      });
      if (opp.dataPoints && opp.dataPoints.length > 0) {
        const volume = opp.dataPoints.find(dp => dp.metric === 'Volume');
        if (volume) {
          console.log(`   📊 Volume: ${volume.value.toLocaleString()}`);
        }
      }
    });

    console.log('\n' + '═'.repeat(100));
    console.log(`\n💡 Recommendation: Focus on opportunities with:`);
    console.log(`   • Edge > 5%`);
    console.log(`   • Confidence > 60%`);
    console.log(`   • Volume > 10,000`);
    console.log(`   • Expires within 30 days\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

// Run it
findBestKalshiToday().catch(console.error);


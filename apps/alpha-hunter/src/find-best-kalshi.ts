/**
 * Find Best Kalshi Probabilities for Today
 * Quick script to get today's best opportunities
 */

import { KalshiTrader } from './intelligence/kalshi-trader';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { Opportunity } from './types';

async function findBestKalshiToday() {
  console.log('\n🎯 Finding Best Kalshi Probabilities for Today...\n');

  const trader = new KalshiTrader();
  
  try {
    // Get all markets
    console.log('📊 Fetching Kalshi markets...');
    const markets = await trader.getMarkets();
    console.log(`   Found ${markets.length} markets\n`);

    // Find opportunities with edge
    console.log('🔍 Analyzing opportunities...');
    const opportunities = await trader.findOpportunities(3); // Minimum 3% edge
    
    if (opportunities.length === 0) {
      console.log('❌ No opportunities found with sufficient edge (min 3%)');
      return;
    }

    // Sort by expected value (best first)
    const sorted = opportunities
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 20); // Top 20

    console.log(`\n✅ Found ${opportunities.length} opportunities\n`);
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
      console.log(`   📍 Side: ${side}`);
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


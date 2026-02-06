/**
 * CEVICT FLEX KALSHI BOT
 * 
 * Uses PROGNO's 7-Dimensional Claude Effect to find the most probable
 * Kalshi markets and trade them for $250/day target.
 * 
 * The 7 Dimensions:
 * 1. SF (Sentiment Field) - Team emotional state
 * 2. NM (Narrative Momentum) - Story power detection
 * 3. IAI (Information Asymmetry Index) - Sharp money tracking
 * 4. CSI (Chaos Sensitivity Index) - Upset potential
 * 5. NIG (News Impact Grade) - Breaking news effect
 * 6. TRD (Temporal Recency Decay) - How recent is data
 * 7. EPD (External Pressure Differential) - Must-win scenarios
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'apps', 'alpha-hunter', '.env.local') });

import { KalshiTrader } from './intelligence/kalshi-trader';
import { PrognoIntegration } from './intelligence/progno-integration';
import { fundManager } from './fund-manager';
import Anthropic from '@anthropic-ai/sdk';

const DAILY_TARGET = 250;
const MIN_CONFIDENCE = 70; // Only trade on 70%+ confidence picks
const MAX_POSITIONS = 5;

interface CevictFlexPick {
  gameId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  confidence: number;
  expectedValue: number;
  claudeEffect: {
    SF: number;
    NM: number;
    IAI: number;
    CSI: number;
    NIG: number;
    TRD: number;
    EPD: number;
    total: number;
  };
  reasoning: string[];
}

class CevictFlexKalshiBot {
  private kalshi: KalshiTrader;
  private progno: PrognoIntegration;
  private claude: Anthropic | null;
  private dailyPnL = 0;
  private positions: any[] = [];

  constructor() {
    this.kalshi = new KalshiTrader();
    this.progno = new PrognoIntegration();
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  async initialize() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🎯 CEVICT FLEX KALSHI BOT - $250/DAY TARGET            ║
║                                                              ║
║  Powered by: 7-Dimensional Claude Effect                    ║
║  Strategy: PROGNO Picks → Kalshi Markets                    ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Check balances
    const kalshiBalance = await this.kalshi.getBalance();
    console.log(`💰 Kalshi Balance: $${kalshiBalance.toFixed(2)}\n`);

    if (kalshiBalance < 50) {
      console.log('⚠️  WARNING: Low balance. Need at least $50 to start trading.\n');
    }
  }

  async run() {
    await this.initialize();

    console.log('📊 Step 1: Fetching PROGNO picks with Claude Effect...\n');
    
    // Get today's picks from PROGNO (includes 7D Claude Effect)
    const prognoPicks = await this.progno.getTodaysPicks();
    
    if (prognoPicks.length === 0) {
      console.log('❌ No PROGNO picks available today');
      return;
    }

    console.log(`✅ Found ${prognoPicks.length} PROGNO picks\n`);

    // Filter for high-confidence picks
    const highConfidencePicks = prognoPicks.filter(
      p => p.confidence >= MIN_CONFIDENCE && p.expectedValue > 0
    );

    console.log(`🎯 High-confidence picks (${MIN_CONFIDENCE}%+): ${highConfidencePicks.length}\n`);

    if (highConfidencePicks.length === 0) {
      console.log('❌ No picks meet minimum confidence threshold');
      return;
    }

    // Sort by expected value (best first)
    const sortedPicks = highConfidencePicks.sort(
      (a, b) => b.expectedValue - a.expectedValue
    );

    console.log('🏆 TOP PICKS WITH CLAUDE EFFECT:\n');
    sortedPicks.slice(0, 10).forEach((pick, i) => {
      console.log(`${i + 1}. ${pick.league}: ${pick.pick}`);
      console.log(`   Confidence: ${pick.confidence}% | EV: +${pick.expectedValue.toFixed(1)}%`);
      console.log(`   ${pick.homeTeam} vs ${pick.awayTeam}`);
      console.log('');
    });

    console.log('📊 Step 2: Finding matching Kalshi markets...\n');

    // Get Kalshi markets
    const kalshiMarkets = await this.kalshi.getMarkets();
    console.log(`✅ Found ${kalshiMarkets.length} Kalshi markets\n`);

    // Match PROGNO picks to Kalshi markets
    const opportunities = await this.matchPicksToMarkets(sortedPicks, kalshiMarkets);

    if (opportunities.length === 0) {
      console.log('❌ No matching Kalshi markets found for PROGNO picks');
      return;
    }

    console.log(`✅ Found ${opportunities.length} trading opportunities\n`);

    // Display opportunities
    console.log('💎 TOP TRADING OPPORTUNITIES:\n');
    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.title}`);
      console.log(`   Confidence: ${opp.confidence}%`);
      console.log(`   Expected Value: +${opp.expectedValue.toFixed(1)}%`);
      console.log(`   Required Capital: $${opp.requiredCapital.toFixed(2)}`);
      console.log(`   Potential Return: $${opp.potentialReturn.toFixed(2)}`);
      console.log('');
    });

    // Execute trades (if auto-execute enabled)
    const autoExecute = process.env.AUTO_EXECUTE === 'true';
    
    if (autoExecute) {
      console.log('🤖 AUTO-EXECUTE ENABLED - Executing trades...\n');
      await this.executeTrades(opportunities);
    } else {
      console.log('⚠️  AUTO-EXECUTE DISABLED - Review opportunities above');
      console.log('   Set AUTO_EXECUTE=true in .env.local to enable automatic trading\n');
    }

    // Summary
    console.log('📊 SUMMARY:\n');
    console.log(`   PROGNO Picks: ${prognoPicks.length}`);
    console.log(`   High-Confidence: ${highConfidencePicks.length}`);
    console.log(`   Kalshi Opportunities: ${opportunities.length}`);
    console.log(`   Daily Target: $${DAILY_TARGET}`);
    console.log(`   Current P&L: $${this.dailyPnL.toFixed(2)}\n`);
  }

  async matchPicksToMarkets(
    picks: any[],
    markets: any[]
  ): Promise<any[]> {
    const opportunities: any[] = [];

    for (const pick of picks) {
      // Try to find a matching Kalshi market
      const matchingMarket = this.findMatchingMarket(pick, markets);

      if (matchingMarket) {
        // Calculate edge
        const marketPrice = matchingMarket.yesPrice || matchingMarket.noPrice;
        const ourPrediction = pick.confidence / 100;
        const marketProb = marketPrice / 100;
        const edge = (ourPrediction - marketProb) * 100;

        if (edge > 5) { // Minimum 5% edge
          opportunities.push({
            id: `cevict_flex_${pick.gameId}_${Date.now()}`,
            type: 'prediction_market',
            source: 'Cevict Flex + Kalshi',
            title: `${pick.league}: ${pick.pick}`,
            description: `PROGNO Claude Effect: ${pick.confidence}% vs Market: ${(marketProb * 100).toFixed(1)}%`,
            confidence: pick.confidence,
            expectedValue: edge,
            riskLevel: pick.confidence >= 80 ? 'low' : 'medium',
            timeframe: 'Today',
            requiredCapital: this.calculateStake(edge, marketPrice),
            potentialReturn: this.calculateReturn(edge, marketPrice),
            reasoning: [
              ...pick.reasoning,
              `Claude Effect Edge: +${edge.toFixed(1)}%`,
              `Market Price: ${marketPrice}¢`,
              `Our Prediction: ${(ourPrediction * 100).toFixed(1)}%`,
            ],
            dataPoints: [],
            action: {
              platform: 'kalshi',
              actionType: 'buy',
              amount: this.calculateStake(edge, marketPrice),
              target: `${matchingMarket.id} ${edge > 0 ? 'YES' : 'NO'}`,
              instructions: [
                `Buy ${matchingMarket.id} contracts`,
                `At price: ${marketPrice}¢ or better`,
              ],
              autoExecute: pick.confidence >= 75,
            },
            expiresAt: matchingMarket.expiresAt,
            createdAt: new Date().toISOString(),
            market: matchingMarket,
            pick: pick,
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  findMatchingMarket(pick: any, markets: any[]): any | null {
    // Simple matching: look for markets with team names or league
    const searchTerms = [
      pick.homeTeam.toLowerCase(),
      pick.awayTeam.toLowerCase(),
      pick.league.toLowerCase(),
    ];

    for (const market of markets) {
      const title = (market.title || '').toLowerCase();
      const ticker = (market.ticker || '').toLowerCase();

      for (const term of searchTerms) {
        if (title.includes(term) || ticker.includes(term)) {
          return market;
        }
      }
    }

    return null;
  }

  calculateStake(edge: number, price: number): number {
    // Kelly Criterion for prediction markets
    const prob = (price + edge) / 100;
    const odds = 100 / price - 1;
    const kelly = (prob * odds - (1 - prob)) / odds;

    // Use quarter Kelly, min $5, max $25
    return Math.min(Math.max(kelly * 0.25 * 100, 5), 25);
  }

  calculateReturn(edge: number, price: number): number {
    const stake = this.calculateStake(edge, price);
    const grossReturn = stake * (100 / price);
    const winnings = grossReturn - stake;
    const kalshiFee = winnings * 0.10; // 10% of winnings
    return grossReturn - kalshiFee;
  }

  async executeTrades(opportunities: any[]) {
    const maxTrades = Math.min(opportunities.length, MAX_POSITIONS);
    let tradesExecuted = 0;

    for (let i = 0; i < maxTrades && this.dailyPnL < DAILY_TARGET; i++) {
      const opp = opportunities[i];
      
      if (opp.action.autoExecute && opp.confidence >= 75) {
        try {
          console.log(`💰 Executing: ${opp.title}`);
          
          const trade = await this.kalshi.placeBet(
            opp.market.id,
            opp.action.target.includes('YES') ? 'yes' : 'no',
            opp.action.amount,
            opp.market.yesPrice || opp.market.noPrice
          );

          if (trade) {
            this.positions.push(trade);
            tradesExecuted++;
            console.log(`   ✅ Trade executed: $${opp.action.amount.toFixed(2)}\n`);
          }
        } catch (error) {
          console.log(`   ❌ Trade failed: ${error}\n`);
        }
      }
    }

    console.log(`\n✅ Executed ${tradesExecuted} trades\n`);
  }
}

// Run the bot
async function main() {
  const bot = new CevictFlexKalshiBot();
  await bot.run();
}

main().catch(console.error);


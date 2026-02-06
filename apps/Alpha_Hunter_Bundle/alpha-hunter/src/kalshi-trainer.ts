/**
 * Kalshi Autonomous Trader
 * AI-powered prediction market trading using PROGNO + Massager data
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
const rootDir = path.resolve(process.cwd(), '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { PrognoIntegration } from './intelligence/progno-integration';
import { fundManager } from './fund-manager';
import { dataAggregator } from './intelligence/data-aggregator';
import { marketLearner } from './intelligence/market-learner';

interface KalshiBet {
  id: string;
  marketId: string;
  marketTitle: string;
  side: 'yes' | 'no';
  contracts: number;
  entryPrice: number;
  currentPrice?: number;
  amount: number;
  aiConfidence: number;
  aiReasoning: string;
  timestamp: Date;
  status: 'open' | 'won' | 'lost' | 'pending';
  pnl?: number;
}

interface KalshiLearning {
  totalBets: number;
  wins: number;
  losses: number;
  totalPnL: number;
  bestBet: KalshiBet | null;
  worstBet: KalshiBet | null;
  categoryPerformance: Record<string, { wins: number; losses: number }>;
}

class KalshiAutonomousTrader {
  private kalshi: KalshiTrader;
  private progno: PrognoIntegration;
  private claude: Anthropic | null;
  private bets: KalshiBet[] = [];
  private learning: KalshiLearning;
  private isRunning = false;
  
  // Trading parameters - OPTIMIZED FOR PROFIT
  private maxBetSize = 25; // $25 max per bet (increased for higher returns)
  private minConfidence = 65; // Lowered to 65% to catch more opportunities
  private maxOpenBets = 8; // Increased to 8 concurrent bets
  private minEdge = 5; // Lowered to 5% edge to catch more opportunities
  private currentLearningMarket: string | null = null; // Market currently being learned

  constructor() {
    this.kalshi = new KalshiTrader();
    this.progno = new PrognoIntegration();
    this.claude = process.env.ANTHROPIC_API_KEY 
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    
    this.learning = {
      totalBets: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      bestBet: null,
      worstBet: null,
      categoryPerformance: {}
    };
  }

  async initialize(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       🎯 KALSHI AUTONOMOUS PREDICTION TRADER 🎯              ║
║                                                              ║
║  AI-Powered • PROGNO Data • Auto-Trading Prediction Markets  ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Check configuration
    const balance = await this.kalshi.getBalance();
    const isDemo = !process.env.KALSHI_API_KEY_ID;
    
    console.log(`💰 Kalshi Balance: $${balance.toFixed(2)} ${isDemo ? '(DEMO MODE)' : ''}`);
    console.log(`🧠 AI Brain: ${this.claude ? '✅ Claude connected' : '⚠️ No AI'}`);
    console.log(`📊 PROGNO: ✅ Connected`);
    console.log('');
  }

  async getPrognoIntelligence(): Promise<string> {
    try {
      const [picks, arbitrage] = await Promise.all([
        this.progno.getTodaysPicks(),
        this.progno.getArbitrageOpportunities(),
      ]);

      let intel = '📊 PROGNO INTELLIGENCE:\n';
      
      if (picks.length > 0) {
        intel += `Sports Picks: ${picks.length} available\n`;
        picks.slice(0, 3).forEach(p => {
          intel += `  - ${p.league}: ${p.pick} (${p.confidence}% conf)\n`;
        });
      }
      
      if (arbitrage.length > 0) {
        intel += `Arbitrage Opps: ${arbitrage.length} found\n`;
      }
      
      return intel;
    } catch {
      return 'PROGNO: Offline';
    }
  }

  async getMarketIntelligence(): Promise<string> {
    // Get current market conditions
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let intel = '📈 MARKET CONDITIONS:\n';
    
    // Time-based context
    if (hour >= 9 && hour <= 16 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      intel += '  - US Markets: OPEN (higher liquidity)\n';
    } else {
      intel += '  - US Markets: CLOSED\n';
    }
    
    // Day context
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      intel += '  - Weekend: Sports markets active\n';
    }
    
    // Get enhanced data from aggregator
    try {
      const fullData = await dataAggregator.getFullBriefing();
      intel += `  - Fear & Greed: ${fullData.market.fearGreedIndex.value} (${fullData.market.fearGreedIndex.classification})\n`;
      intel += `  - Trading Bias: ${fullData.tradingBias.toUpperCase()} (${fullData.confidence}% conf)\n`;
      if (fullData.news.majorEvents.length > 0) {
        intel += `  - ⚠️ Major Event: ${fullData.news.majorEvents[0].substring(0, 50)}...\n`;
      }
    } catch {
      intel += '  - Enhanced data: unavailable\n';
    }
    
    return intel;
  }

  async analyzeMarket(market: any): Promise<{
    shouldBet: boolean;
    side: 'yes' | 'no';
    confidence: number;
    reasoning: string;
    suggestedAmount: number;
  }> {
    if (!this.claude) {
      // Fallback without AI
      const edge = market.edge || 0;
      return {
        shouldBet: edge >= this.minEdge,
        side: market.yesPrice < 50 ? 'yes' : 'no',
        confidence: 50 + edge,
        reasoning: `Edge: ${edge}%`,
        suggestedAmount: 5
      };
    }

    const prognoIntel = await this.getPrognoIntelligence();
    const marketIntel = await this.getMarketIntelligence();
    
    // Get win rate for this category
    const categoryStats = this.learning.categoryPerformance[market.category] || { wins: 0, losses: 0 };
    const categoryWinRate = categoryStats.wins + categoryStats.losses > 0
      ? (categoryStats.wins / (categoryStats.wins + categoryStats.losses) * 100).toFixed(1)
      : 'N/A';

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are a prediction market expert. Analyze this Kalshi market:

═══════════════════════════════════════
MARKET: ${market.title}
Category: ${market.category}
YES Price: ${market.yesPrice}¢ | NO Price: ${market.noPrice}¢
Volume: $${market.volume?.toLocaleString() || 'N/A'}
Expires: ${market.expiresAt}
═══════════════════════════════════════

${prognoIntel}

${marketIntel}

MY LEARNING HISTORY:
- Total bets: ${this.learning.totalBets}
- Win rate: ${this.learning.totalBets > 0 ? (this.learning.wins / this.learning.totalBets * 100).toFixed(1) : 0}%
- ${market.category} win rate: ${categoryWinRate}%
- Total P&L: $${this.learning.totalPnL.toFixed(2)}

RULES:
- Max bet: $${this.maxBetSize}
- Min confidence: ${this.minConfidence}%
- Min edge required: ${this.minEdge}%
- I need real edge, not coin flips

Should I bet? Respond with JSON only:
{
  "shouldBet": true/false,
  "side": "yes" or "no",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "suggestedAmount": 5-10
}`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      
      return {
        shouldBet: json.shouldBet || false,
        side: json.side || 'yes',
        confidence: json.confidence || 50,
        reasoning: json.reasoning || 'AI analysis',
        suggestedAmount: Math.min(json.suggestedAmount || 5, this.maxBetSize)
      };
    } catch (err: any) {
      console.log(`   ⚠️ AI analysis failed: ${err.message.substring(0, 50)}`);
      return {
        shouldBet: false,
        side: 'yes',
        confidence: 0,
        reasoning: 'AI offline',
        suggestedAmount: 0
      };
    }
  }

  async placeBet(market: any, side: 'yes' | 'no', amount: number, confidence: number, reasoning: string): Promise<KalshiBet | null> {
    const price = side === 'yes' ? market.yesPrice : market.noPrice;
    const contracts = Math.floor(amount * 100 / price); // Convert $ amount to contracts
    
    console.log(`\n🎯 Placing ${side.toUpperCase()} bet on: ${market.title}`);
    console.log(`   Amount: $${amount} (${contracts} contracts @ ${price}¢)`);
    console.log(`   Confidence: ${confidence}%`);
    console.log(`   Reasoning: ${reasoning}`);
    
    const trade = await this.kalshi.placeBet(market.id, side, contracts, price);
    
    if (trade) {
      const bet: KalshiBet = {
        id: trade.id,
        marketId: market.id,
        marketTitle: market.title,
        side,
        contracts,
        entryPrice: price,
        amount,
        aiConfidence: confidence,
        aiReasoning: reasoning,
        timestamp: new Date(),
        status: 'open'
      };
      
      this.bets.push(bet);
      console.log(`   ✅ Bet placed! ID: ${trade.id}`);
      return bet;
    }
    
    console.log(`   ❌ Bet failed`);
    return null;
  }

  async checkOpenBets(): Promise<void> {
    const openBets = this.bets.filter(b => b.status === 'open');
    if (openBets.length === 0) return;
    
    console.log(`\n📋 OPEN BETS (${openBets.length}):`);
    
    // In production, we'd check Kalshi API for position updates
    // For now, just display them
    for (const bet of openBets) {
      console.log(`   🎯 ${bet.side.toUpperCase()}: ${bet.marketTitle.substring(0, 50)}...`);
      console.log(`      Entry: ${bet.entryPrice}¢ | Amount: $${bet.amount} | Conf: ${bet.aiConfidence}%`);
    }
  }

  async findKalshiMarketsForPrognoPicks(picks: any[]): Promise<any[]> {
    console.log('\n🔍 Searching Kalshi for markets matching PROGNO picks...');
    const allMarkets = await this.kalshi.getMarkets();
    const matchedMarkets: any[] = [];
    
    for (const pick of picks) {
      // Search for markets related to this game
      const searchTerms = [
        pick.homeTeam.toLowerCase(),
        pick.awayTeam.toLowerCase(),
        pick.league.toLowerCase(),
        pick.pick.toLowerCase(),
      ];
      
      const relevantMarkets = allMarkets.filter(m => {
        const titleLower = m.title.toLowerCase();
        return searchTerms.some(term => titleLower.includes(term));
      });
      
      if (relevantMarkets.length > 0) {
        console.log(`   ✅ Found ${relevantMarkets.length} Kalshi markets for: ${pick.homeTeam} vs ${pick.awayTeam}`);
        matchedMarkets.push(...relevantMarkets.map(m => ({
          ...m,
          prognoPick: pick,
          prognoConfidence: pick.confidence,
          prognoPickType: pick.pick,
        })));
      }
    }
    
    return matchedMarkets;
  }

  async runCycle(): Promise<void> {
    console.log('\n🔄 Starting Kalshi scan...\n');
    
    // Get current balance and update fund manager
    const balance = await this.kalshi.getBalance();
    const inPositions = this.bets.filter(b => b.status === 'open').reduce((sum, b) => sum + b.amount, 0);
    fundManager.updateKalshiBalance(balance - inPositions, inPositions);
    
    // Show unified fund status
    console.log(fundManager.getStatus());
    console.log(`\n💰 Kalshi Available: $${(balance - inPositions).toFixed(2)}`);
    
    // Check open bets
    await this.checkOpenBets();
    
    const openBets = this.bets.filter(b => b.status === 'open').length;
    if (openBets >= this.maxOpenBets) {
      console.log(`\n⚠️ Max open bets reached (${openBets}/${this.maxOpenBets}). Waiting...`);
      return;
    }
    
    // PRIORITY: Get PROGNO picks for tonight's games
    console.log('\n📊 Fetching PROGNO picks for tonight\'s games...');
    const prognoPicks = await this.progno.getTodaysPicks();
    console.log(`   Found ${prognoPicks.length} PROGNO picks`);
    
    if (prognoPicks.length > 0) {
      // Filter for high-confidence picks (65%+ for more opportunities)
      const highConfidencePicks = prognoPicks.filter(p => p.confidence >= 65);
      console.log(`   ${highConfidencePicks.length} high-confidence picks (65%+)`);
      
      if (highConfidencePicks.length > 0) {
        // Find matching Kalshi markets
        const matchedMarkets = await this.findKalshiMarketsForPrognoPicks(highConfidencePicks);
        
        if (matchedMarkets.length > 0) {
          // LEARN NEW MARKETS: Pick one market to become expert in
          if (!this.currentLearningMarket && matchedMarkets.length > 0) {
            const marketToLearn = matchedMarkets[0];
            console.log(`\n🧠 LEARNING NEW MARKET: ${marketToLearn.title}`);
            this.currentLearningMarket = marketToLearn.id;
            
            // Learn this market deeply
            const expertise = await marketLearner.learnKalshiMarket(
              marketToLearn.id,
              marketToLearn.title,
              marketToLearn.category || 'General'
            );
            
            console.log(`   ✅ Now expert on: ${marketToLearn.title} (${expertise.expertiseLevel}% expertise)`);
          }
          
          console.log(`\n🎯 Found ${matchedMarkets.length} Kalshi markets matching PROGNO picks!`);
          
          // Analyze and bet on PROGNO-backed markets (more aggressive)
          for (const market of matchedMarkets.slice(0, 5)) { // Max 5 bets per cycle
            const pick = market.prognoPick;
            console.log(`\n📊 PROGNO Pick: ${pick.pick} (${pick.confidence}% confidence)`);
            console.log(`   Kalshi Market: ${market.title}`);
            
            // Use expert knowledge if we've learned this market
            const expertData = marketLearner.getExpertData(market.id);
            if (expertData) {
              console.log(`   🧠 EXPERT MODE: Using learned expertise (${expertData.expertiseLevel}% expertise)`);
              console.log(`   📈 Key Insights: ${expertData.keyInsights.slice(0, 2).join(', ')}`);
              if (expertData.predictions.length > 0) {
                const topPrediction = expertData.predictions[0];
                console.log(`   🎯 Expert Prediction: ${topPrediction.outcome} (${topPrediction.probability}%)`);
              }
            }
            
            // Determine which side to bet based on PROGNO pick + expert data
            let side: 'yes' | 'no' = 'yes';
            let confidence = pick.confidence;
            
            // Boost confidence if we have expert data
            if (expertData && expertData.expertiseLevel >= 75) {
              confidence = Math.min(95, confidence + 10);
              console.log(`   ⚡ Confidence boosted by expert knowledge: ${confidence}%`);
            }
            
            // Map PROGNO pick to Kalshi side
            // If PROGNO says "Team wins" and market is "Will Team win?", bet YES
            // If PROGNO says "Over X" and market is "Will total be over X?", bet YES
            const pickLower = pick.pick.toLowerCase();
            const marketLower = market.title.toLowerCase();
            
            // Simple heuristic: if pick mentions team name and market asks about that team, bet YES
            if (pickLower.includes(pick.homeTeam.toLowerCase()) || pickLower.includes(pick.awayTeam.toLowerCase())) {
              // Check if market is asking about that team winning
              if (marketLower.includes('win') || marketLower.includes('beat')) {
                side = 'yes';
                confidence = pick.confidence;
              }
            }
            
            // Check with fund manager
            if (!fundManager.shouldTradeOnPlatform('kalshi', confidence)) {
              console.log(`   ⚠️ Fund manager: Kalshi over-allocated, skipping...`);
              continue;
            }
            
            // Calculate bet amount based on PROGNO confidence (more aggressive)
            const maxFromFunds = fundManager.getMaxTradeAmount('kalshi', this.maxBetSize);
            const betAmount = Math.min(
              Math.max(pick.confidence / 4, 10), // Scale with confidence, min $10 (increased)
              maxFromFunds
            );
            
            if (betAmount < 5) {
              console.log(`   ⚠️ Insufficient funds ($${betAmount.toFixed(2)})`);
              continue;
            }
            
            console.log(`   💰 Betting $${betAmount.toFixed(2)} on ${side.toUpperCase()} (PROGNO: ${pick.confidence}% confidence)`);
            await this.placeBet(market, side, betAmount, confidence, `PROGNO pick: ${pick.pick} - ${pick.reasoning?.join(', ') || 'AI analysis'}`);
            
            if (openBets + 1 >= this.maxOpenBets) break; // Stop if we hit max
          }
        } else {
          console.log(`   ⚠️ No matching Kalshi markets found for PROGNO picks`);
        }
      }
    }
    
    // Also check regular Kalshi markets (fallback)
    console.log('\n🔍 Scanning general Kalshi markets for opportunities...');
    const allMarkets = await this.kalshi.getMarkets();
    const marketsWithEdge = allMarkets.filter(m => {
      const yesEdge = m.aiPrediction && m.aiPrediction > m.yesPrice ? m.aiPrediction - m.yesPrice : 0;
      const noEdge = m.aiPrediction && m.aiPrediction < (100 - m.noPrice) ? (100 - m.aiPrediction) - m.noPrice : 0;
      return Math.max(yesEdge, noEdge) >= this.minEdge;
    });
    console.log(`   Found ${marketsWithEdge.length} potential opportunities`);
    
    // Analyze top opportunities with AI (only if we haven't used all bet slots)
    const remainingSlots = this.maxOpenBets - this.bets.filter(b => b.status === 'open').length;
    if (remainingSlots > 0 && marketsWithEdge.length > 0) {
      const marketsToAnalyze = marketsWithEdge.slice(0, Math.min(3, remainingSlots));
      
      for (const market of marketsToAnalyze) {
        console.log(`\n📊 Analyzing: ${market.title.substring(0, 60)}...`);
        
        const analysis = await this.analyzeMarket(market);
        
        console.log(`   AI Decision: ${analysis.shouldBet ? '✅ BET' : '❌ PASS'}`);
        console.log(`   Side: ${analysis.side.toUpperCase()} | Confidence: ${analysis.confidence}%`);
        console.log(`   Reasoning: ${analysis.reasoning}`);
        
        if (analysis.shouldBet && analysis.confidence >= this.minConfidence) {
          // Check with fund manager if we should trade on Kalshi
          if (!fundManager.shouldTradeOnPlatform('kalshi', analysis.confidence)) {
            console.log(`   ⚠️ Fund manager: Kalshi over-allocated, skipping...`);
            continue;
          }
          
          // Get max allowed from fund manager
          const maxFromFunds = fundManager.getMaxTradeAmount('kalshi', this.maxBetSize);
          const betAmount = Math.min(analysis.suggestedAmount, maxFromFunds);
          
          if (betAmount < 5) {
            console.log(`   ⚠️ Insufficient funds allocated to Kalshi ($${betAmount})`);
            continue;
          }
          
          await this.placeBet(market, analysis.side, betAmount, analysis.confidence, analysis.reasoning);
          break; // One bet per cycle
        }
      }
    }
    
    // Show learning stats
    await this.showStats();
  }

  async showStats(): Promise<void> {
    const winRate = this.learning.totalBets > 0
      ? (this.learning.wins / this.learning.totalBets * 100).toFixed(1)
      : '0.0';
    // Sync cumulative stats to fund manager
    const currentPnL = this.learning.totalPnL;
    const currentTrades = this.learning.totalBets;
    const currentWins = this.learning.wins;
    const currentLosses = this.learning.losses;

    // Calculate P&L delta (only update if changed)
    const kalshiStats = fundManager.getKalshiStats();
    const pnlDelta = currentPnL - kalshiStats.pnl;
    if (Math.abs(pnlDelta) > 0.01) {
      fundManager.updateKalshiStats(pnlDelta, pnlDelta > 0);
    }
    // Update fund manager with cumulative stats 
    const balance = await this.kalshi.getBalance();
    const inPositions = this.bets.filter(b => b.status === 'open').reduce((sum, b) => sum + b.amount, 0);
    fundManager.updateKalshiBalance(balance - inPositions, inPositions);
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                📊 KALSHI LEARNING PROGRESS 📊                ║
╠══════════════════════════════════════════════════════════════╣
║  Total Bets:    ${String(this.learning.totalBets).padEnd(10)}                             ║
║  Wins:          ${String(this.learning.wins).padEnd(10)} Losses: ${String(this.learning.losses).padEnd(10)}      ║
║  Win Rate:      ${(winRate + '%').padEnd(10)}                             ║
║  Total P&L:     ${(this.learning.totalPnL >= 0 ? '+' : '') + '$' + this.learning.totalPnL.toFixed(2)}                                   ║
║  Open Bets:     ${String(this.bets.filter(b => b.status === 'open').length).padEnd(10)}                             ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }

  async startTrading(intervalMinutes: number = 2): Promise<void> {
    console.log(`\n🚀 Starting Kalshi autonomous trading (every ${intervalMinutes} min)...`);
    console.log('   ⚡ AGGRESSIVE MODE: Higher bet sizes, more opportunities, faster scans');
    console.log('   💰 Target: Cover coding time + Claude API costs');
    console.log('   Press Ctrl+C to stop\n');
    
    this.isRunning = true;
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping Kalshi trader...');
      this.isRunning = false;
      await this.showStats();
      console.log('\n👋 Kalshi trading session ended.\n');
      process.exit(0);
    });
    
    // Run loop
    while (this.isRunning) {
      await this.runCycle();
      
      console.log(`\n⏳ Next scan in ${intervalMinutes} minutes...`);
      
      // Wait with countdown
      for (let i = intervalMinutes * 60; i > 0 && this.isRunning; i -= 30) {
        await new Promise(r => setTimeout(r, 30000));
        if (i > 30) console.log(`   ${Math.floor(i/60)}m ${i%60}s...`);
      }
    }
  }
}

// Main
async function main() {
  console.log('\n🎯 KALSHI AUTONOMOUS TRADER STARTING...\n');
  console.log('⚡ FULL SPEED AHEAD - AGGRESSIVE PROFIT MODE ⚡\n');
  
  const trader = new KalshiAutonomousTrader();
  await trader.initialize();
  await trader.startTrading(2); // Scan every 2 minutes for maximum opportunity capture
}

main().catch(console.error);

export { KalshiAutonomousTrader };



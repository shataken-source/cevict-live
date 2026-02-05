/**
 * KALSHI AUTO TRADER
 * Trades on Kalshi's ACTUAL markets: Politics, Economics, Crypto, Weather
 * Uses AI analysis to find edge and place bets automatically
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { KalshiTrader } from './intelligence/kalshi-trader';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  maxBetSize: 5,           // $5 max per bet
  minEdge: 3,              // Minimum 3% edge to bet (lowered to find more opportunities)
  minConfidence: 55,       // Minimum 55% confidence
  maxOpenBets: 5,          // Maximum 5 open positions
  categories: ['crypto', 'politics', 'economics', 'weather', 'fed'],
};

// ============================================================================
// TYPES
// ============================================================================

interface KalshiMarket {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  expiresAt: string;
}

interface MarketAnalysis {
  market: KalshiMarket;
  aiPrediction: number;  // 0-100% probability of YES
  marketPrice: number;   // Current YES price
  edge: number;          // Our edge (positive = bet YES, negative = bet NO)
  confidence: number;
  reasoning: string;
  recommendedSide: 'yes' | 'no' | 'pass';
  recommendedStake: number;
}

// ============================================================================
// AI MARKET ANALYZER
// ============================================================================

class MarketAnalyzer {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic();
    }
  }

  async analyzeMarket(market: KalshiMarket): Promise<MarketAnalysis> {
    const title = market.title.toLowerCase();
    let aiPrediction = market.yesPrice; // Default to market price
    let confidence = 50;
    let reasoning = '';

    // Category-specific analysis
    if (title.includes('bitcoin') || title.includes('btc') || title.includes('crypto')) {
      const analysis = await this.analyzeCrypto(market);
      aiPrediction = analysis.prediction;
      confidence = analysis.confidence;
      reasoning = analysis.reasoning;
    }
    else if (title.includes('fed') || title.includes('rate') || title.includes('fomc')) {
      const analysis = await this.analyzeFed(market);
      aiPrediction = analysis.prediction;
      confidence = analysis.confidence;
      reasoning = analysis.reasoning;
    }
    else if (title.includes('trump') || title.includes('biden') || title.includes('election') || title.includes('president')) {
      const analysis = await this.analyzePolitics(market);
      aiPrediction = analysis.prediction;
      confidence = analysis.confidence;
      reasoning = analysis.reasoning;
    }
    else if (title.includes('temperature') || title.includes('weather') || title.includes('rain')) {
      const analysis = await this.analyzeWeather(market);
      aiPrediction = analysis.prediction;
      confidence = analysis.confidence;
      reasoning = analysis.reasoning;
    }
    else {
      // Use Claude for unknown market types
      if (this.anthropic) {
        const analysis = await this.analyzeWithClaude(market);
        aiPrediction = analysis.prediction;
        confidence = analysis.confidence;
        reasoning = analysis.reasoning;
      } else {
        // Slight contrarian edge
        aiPrediction = market.yesPrice > 50 ? market.yesPrice - 3 : market.yesPrice + 3;
        confidence = 45;
        reasoning = 'No specific analysis available';
      }
    }

    // Calculate edge
    const yesEdge = aiPrediction - market.yesPrice;
    const noEdge = (100 - aiPrediction) - market.noPrice;

    let recommendedSide: 'yes' | 'no' | 'pass' = 'pass';
    let edge = 0;

    if (yesEdge > CONFIG.minEdge && confidence >= CONFIG.minConfidence) {
      recommendedSide = 'yes';
      edge = yesEdge;
    } else if (noEdge > CONFIG.minEdge && confidence >= CONFIG.minConfidence) {
      recommendedSide = 'no';
      edge = noEdge;
    }

    // Kelly criterion for stake
    const stake = this.calculateStake(edge, recommendedSide === 'yes' ? market.yesPrice : market.noPrice);

    return {
      market,
      aiPrediction,
      marketPrice: market.yesPrice,
      edge,
      confidence,
      reasoning,
      recommendedSide,
      recommendedStake: stake,
    };
  }

  private async analyzeCrypto(market: KalshiMarket): Promise<{ prediction: number; confidence: number; reasoning: string }> {
    const title = market.title.toLowerCase();

    // Fetch current BTC price context
    let btcPrice = 87000; // Default
    try {
      const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const data = await response.json();
      btcPrice = parseFloat(data.data.amount);
    } catch (e) {}

    // Analyze based on market type
    if (title.includes('above') || title.includes('over') || title.includes('higher')) {
      // Extract target price from title
      const priceMatch = title.match(/\$?([\d,]+)/);
      const targetPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 90000;

      // Current price vs target
      const priceDiff = (btcPrice - targetPrice) / targetPrice * 100;

      let prediction = market.yesPrice;
      let confidence = 60;

      if (btcPrice > targetPrice * 1.05) {
        // More than 5% above target - very likely to stay above
        prediction = Math.min(92, market.yesPrice + 15);
        confidence = 75;
      } else if (btcPrice > targetPrice) {
        // Already above - high probability stays above short term
        prediction = Math.min(85, market.yesPrice + 8);
        confidence = 68;
      } else if (priceDiff > -3) {
        // Within 3% - slight edge for YES
        prediction = market.yesPrice + 5;
        confidence = 58;
      } else if (priceDiff > -10) {
        // Within 10% - neutral
        prediction = market.yesPrice;
        confidence = 50;
      } else {
        // Far below target - edge for NO
        prediction = Math.max(10, market.yesPrice - 12);
        confidence = 65;
      }

      return {
        prediction,
        confidence,
        reasoning: `BTC at $${btcPrice.toLocaleString()}, target $${targetPrice.toLocaleString()} (${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%)`,
      };
    }

    if (title.includes('below') || title.includes('under') || title.includes('lower')) {
      const priceMatch = title.match(/\$?([\d,]+)/);
      const targetPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 80000;
      const priceDiff = (btcPrice - targetPrice) / targetPrice * 100;

      let prediction = market.yesPrice;
      let confidence = 60;

      if (btcPrice < targetPrice * 0.95) {
        prediction = Math.min(90, market.yesPrice + 12);
        confidence = 72;
      } else if (btcPrice < targetPrice) {
        prediction = Math.min(80, market.yesPrice + 6);
        confidence = 65;
      } else {
        prediction = Math.max(15, market.yesPrice - 10);
        confidence = 62;
      }

      return {
        prediction,
        confidence,
        reasoning: `BTC at $${btcPrice.toLocaleString()}, target $${targetPrice.toLocaleString()} (${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%)`,
      };
    }

    // Default crypto analysis - slight contrarian
    return {
      prediction: market.yesPrice > 50 ? market.yesPrice - 4 : market.yesPrice + 4,
      confidence: 55,
      reasoning: `BTC at $${btcPrice.toLocaleString()} - general crypto analysis`,
    };
  }

  private async analyzeFed(market: KalshiMarket): Promise<{ prediction: number; confidence: number; reasoning: string }> {
    const title = market.title.toLowerCase();

    // Fed rate decisions are usually well-priced by markets
    // Look for small edges based on recent data

    if (title.includes('cut') || title.includes('lower')) {
      // Rate cut predictions
      // Current environment: Fed is cautious, inflation still above target
      return {
        prediction: Math.min(market.yesPrice - 5, 40), // Slightly bearish on cuts
        confidence: 60,
        reasoning: 'Fed maintaining cautious stance, inflation above target',
      };
    }

    if (title.includes('hike') || title.includes('raise')) {
      // Rate hike predictions
      return {
        prediction: Math.min(market.yesPrice + 5, 30), // Low probability of hikes
        confidence: 65,
        reasoning: 'Rate hikes unlikely in current environment',
      };
    }

    return {
      prediction: market.yesPrice,
      confidence: 50,
      reasoning: 'Fed market - no clear edge',
    };
  }

  private async analyzePolitics(market: KalshiMarket): Promise<{ prediction: number; confidence: number; reasoning: string }> {
    // Political markets - look for overreactions to news
    const title = market.title.toLowerCase();

    // Be cautious with political predictions
    return {
      prediction: market.yesPrice + (Math.random() > 0.5 ? 2 : -2),
      confidence: 45,
      reasoning: 'Political markets are efficient - minimal edge available',
    };
  }

  private async analyzeWeather(market: KalshiMarket): Promise<{ prediction: number; confidence: number; reasoning: string }> {
    // Weather markets - could have edge with good data
    return {
      prediction: market.yesPrice,
      confidence: 50,
      reasoning: 'Weather prediction - need external data source',
    };
  }

  private async analyzeWithClaude(market: KalshiMarket): Promise<{ prediction: number; confidence: number; reasoning: string }> {
    if (!this.anthropic) {
      return { prediction: market.yesPrice, confidence: 45, reasoning: 'No AI available' };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Analyze this prediction market and give your probability estimate.

Market: "${market.title}"
Current YES price: ${market.yesPrice}¢
Current NO price: ${market.noPrice}¢
Expires: ${market.expiresAt}

Respond in JSON format only:
{"prediction": <number 0-100>, "confidence": <number 0-100>, "reasoning": "<brief explanation>"}`,
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text);

      return {
        prediction: json.prediction,
        confidence: json.confidence,
        reasoning: json.reasoning,
      };
    } catch (e) {
      return { prediction: market.yesPrice, confidence: 45, reasoning: 'AI analysis failed' };
    }
  }

  private calculateStake(edge: number, price: number): number {
    if (edge <= 0) return 0;

    // Quarter Kelly criterion
    const prob = (price + edge) / 100;
    const odds = 100 / price - 1;
    const kelly = (prob * odds - (1 - prob)) / odds;

    return Math.min(Math.max(kelly * 0.25 * 100, 1), CONFIG.maxBetSize);
  }
}

// ============================================================================
// MAIN AUTO TRADER
// ============================================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🎯 KALSHI AUTO TRADER 🎯                             ║
║                                                              ║
║  AI-Powered Prediction Market Trading                        ║
║  Categories: Crypto • Politics • Economics • Weather         ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const kalshi = new KalshiTrader();
  const analyzer = new MarketAnalyzer();

  // Check balance
  const balance = await kalshi.getBalance();
  console.log(`💰 Kalshi Balance: $${balance.toFixed(2)}\n`);

  if (balance < CONFIG.maxBetSize) {
    console.log('❌ Insufficient balance for trading.');
    return;
  }

  // Fetch all markets
  console.log('📡 Fetching Kalshi markets...\n');
  const markets = await kalshi.getMarkets();

  console.log(`📋 Found ${markets.length} open markets\n`);
  console.log('═'.repeat(60));

  // Analyze each market
  const opportunities: MarketAnalysis[] = [];

  for (const market of markets.slice(0, 30)) { // Analyze top 30 markets
    const analysis = await analyzer.analyzeMarket(market as KalshiMarket);

    if (analysis.recommendedSide !== 'pass') {
      opportunities.push(analysis);
    }

    // Show market analysis
    const icon = analysis.recommendedSide === 'pass' ? '⚪' :
                 analysis.recommendedSide === 'yes' ? '🟢' : '🔴';

    console.log(`\n${icon} ${market.title.substring(0, 60)}...`);
    console.log(`   Market: YES ${market.yesPrice}¢ / NO ${market.noPrice}¢`);
    console.log(`   AI Prediction: ${analysis.aiPrediction.toFixed(1)}% | Edge: ${analysis.edge > 0 ? '+' : ''}${analysis.edge.toFixed(1)}%`);
    console.log(`   ${analysis.reasoning}`);

    if (analysis.recommendedSide !== 'pass') {
      console.log(`   → BET ${analysis.recommendedSide.toUpperCase()} $${analysis.recommendedStake.toFixed(2)}`);
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`\n📊 SUMMARY: ${opportunities.length} betting opportunities found\n`);

  if (opportunities.length === 0) {
    console.log('No profitable opportunities found. Markets are efficient today.');
    return;
  }

  // Sort by edge
  opportunities.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));

  // Execute bets
  console.log('🎯 EXECUTING BETS:\n');

  let totalBet = 0;
  let betsPlaced = 0;

  for (const opp of opportunities) {
    if (betsPlaced >= CONFIG.maxOpenBets) {
      console.log('⚠️  Max open bets reached');
      break;
    }

    if (totalBet + opp.recommendedStake > balance * 0.5) {
      console.log('⚠️  Risk limit reached (50% of balance)');
      break;
    }

    console.log(`\n📍 ${opp.market.title.substring(0, 50)}...`);
    console.log(`   Side: ${opp.recommendedSide.toUpperCase()} | Stake: $${opp.recommendedStake.toFixed(2)} | Edge: +${opp.edge.toFixed(1)}%`);

    const price = opp.recommendedSide === 'yes' ? opp.market.yesPrice : opp.market.noPrice;

    const trade = await kalshi.placeLimitOrderUsd(
      opp.market.id,
      opp.recommendedSide as 'yes' | 'no',
      opp.recommendedStake,
      price + 3 // 3 cent slippage allowance
    );

    if (trade) {
      console.log(`   ✅ BET PLACED! Trade ID: ${trade.id}`);
      totalBet += opp.recommendedStake;
      betsPlaced++;
    } else {
      console.log(`   ❌ Failed to place bet`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`\n💰 TOTAL WAGERED: $${totalBet.toFixed(2)}`);
  console.log(`📊 BETS PLACED: ${betsPlaced}`);
  console.log(`💵 REMAINING BALANCE: $${(balance - totalBet).toFixed(2)}\n`);
}

main().catch(console.error);


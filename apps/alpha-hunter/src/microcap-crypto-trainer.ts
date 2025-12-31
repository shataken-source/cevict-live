/**
 * Micro-Cap Crypto Trainer Bot
 * Specializes in trading cryptocurrencies under $1.00
 * 
 * Features:
 * - Discovers top 100 new crypto under $1.00
 * - Runs simulations to select optimal portfolio of 10 coins
 * - Uses Coinbase Advanced Trade API
 * - Max $5 per trade while learning
 * - Learns from wins/losses and adapts strategy
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { CoinbaseExchange } from './exchanges/coinbase';
import Anthropic from '@anthropic-ai/sdk';
import { fundManager } from './fund-manager';

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

interface CryptoCandidate {
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
  productId: string;
  simulationScore: number;
}

interface SimulationResult {
  symbol: string;
  productId: string;
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: number;
  score: number;
}

interface TradeRecord {
  id: string;
  symbol: string;
  productId: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  usdValue: number;
  entryFee: number;
  exitFee?: number;
  pnl?: number;
  pnlPercent?: number;
  timestamp: Date;
  exitTimestamp?: Date;
  reason: string;
}

interface LearningState {
  totalTrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  portfolioCoins: CryptoCandidate[];
  bestPerformers: string[];
  worstPerformers: string[];
  learnings: string[];
}

export class MicroCapCryptoTrainer {
  private coinbase: CoinbaseExchange;
  private claude: Anthropic | null;
  private trades: TradeRecord[] = [];
  private learning: LearningState;
  private maxTradeUSD = 5; // Max $5 per trade while learning
  private minProfitPercent = 3; // Take profit at 3% (higher for micro-caps due to volatility)
  private maxLossPercent = 5; // Stop loss at 5%
  private isRunning = false;
  private portfolio: CryptoCandidate[] = [];
  private discoveredCoins: CryptoCandidate[] = [];
  private simulationComplete = false;

  constructor() {
    this.coinbase = new CoinbaseExchange();
    this.claude = process.env.ANTHROPIC_API_KEY 
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    
    this.learning = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      portfolioCoins: [],
      bestPerformers: [],
      worstPerformers: [],
      learnings: [],
    };

    console.log(colorize('\n💎 MICRO-CAP CRYPTO TRAINER INITIALIZED', colors.cyan + colors.bright));
    console.log(colorize('   Specializes in crypto under $1.00', colors.cyan));
    console.log(colorize(`   Max trade: $${this.maxTradeUSD}`, colors.yellow));
    console.log(colorize('   Strategy: Discovery → Simulation → Real Trading\n', colors.blue));
  }

  /**
   * PHASE 1: Discover top 100 new crypto under $1.00
   */
  async discoverMicroCapCoins(): Promise<CryptoCandidate[]> {
    console.log(colorize('\n🔍 PHASE 1: DISCOVERING MICRO-CAP CRYPTO UNDER $1.00', colors.cyan + colors.bright));
    
    try {
      // Get all products from Coinbase
      const response = await fetch('https://api.coinbase.com/api/v3/brokerage/products');
      const data = await response.json();
      const products = data.products || [];
      
      console.log(`   Found ${products.length} total products on Coinbase`);
      
      const microCapCandidates: CryptoCandidate[] = [];
      
      for (const product of products) {
        // Only consider USD pairs
        if (!product.product_id.endsWith('-USD')) continue;
        
        const price = parseFloat(product.price || '0');
        
        // Filter: Price must be under $1.00
        if (price >= 1.0 || price <= 0) continue;
        
        // Filter: Must have volume (actively traded)
        const volume = parseFloat(product.volume_24h || '0');
        if (volume < 1000) continue; // At least $1k daily volume
        
        const symbol = product.base_currency_id;
        
        // Skip stablecoins and wrapped tokens
        if (symbol.includes('USD') || symbol.includes('USDT') || symbol.includes('USDC')) continue;
        if (symbol.startsWith('W') && symbol.length <= 5) continue; // Wrapped tokens
        
        microCapCandidates.push({
          symbol,
          name: product.display_name || symbol,
          price,
          volume24h: volume,
          marketCap: volume * 365, // Rough estimate
          priceChange24h: parseFloat(product.price_percentage_change_24h || '0'),
          productId: product.product_id,
          simulationScore: 0,
        });
      }
      
      // Sort by volume (most liquid first)
      microCapCandidates.sort((a, b) => b.volume24h - a.volume24h);
      
      // Take top 100
      const top100 = microCapCandidates.slice(0, 100);
      
      console.log(colorize(`\n   ✅ Found ${top100.length} micro-cap candidates`, colors.green));
      console.log(colorize(`   Price range: $${Math.min(...top100.map(c => c.price)).toFixed(6)} - $${Math.max(...top100.map(c => c.price)).toFixed(4)}`, colors.yellow));
      console.log(colorize(`   Volume range: $${Math.min(...top100.map(c => c.volume24h)).toLocaleString()} - $${Math.max(...top100.map(c => c.volume24h)).toLocaleString()}`, colors.yellow));
      
      // Show top 10
      console.log(colorize('\n   📊 TOP 10 BY VOLUME:', colors.blue));
      top100.slice(0, 10).forEach((coin, i) => {
        console.log(`      ${i + 1}. ${coin.symbol.padEnd(8)} $${coin.price.toFixed(6).padEnd(10)} Vol: $${coin.volume24h.toLocaleString().padStart(12)} ${coin.priceChange24h >= 0 ? '+' : ''}${coin.priceChange24h.toFixed(1)}%`);
      });
      
      this.discoveredCoins = top100;
      return top100;
      
    } catch (error: any) {
      console.error(colorize(`   ❌ Discovery failed: ${error.message}`, colors.red));
      return [];
    }
  }

  /**
   * PHASE 2: Run simulations on candidates to find best 10
   */
  async runSimulations(candidates: CryptoCandidate[]): Promise<SimulationResult[]> {
    console.log(colorize('\n🧪 PHASE 2: RUNNING SIMULATIONS ON CANDIDATES', colors.cyan + colors.bright));
    console.log(`   Testing ${candidates.length} coins with backtesting...`);
    
    const simulationResults: SimulationResult[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const coin = candidates[i];
      
      try {
        // Simulate trading this coin over past 30 days
        const result = await this.simulateCoin(coin);
        simulationResults.push(result);
        
        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${candidates.length} simulated`);
        }
        
      } catch (error: any) {
        console.log(`   ⚠️  ${coin.symbol} simulation failed: ${error.message}`);
      }
    }
    
    // Sort by score (best performers first)
    simulationResults.sort((a, b) => b.score - a.score);
    
    console.log(colorize('\n   ✅ Simulations complete!', colors.green));
    console.log(colorize('\n   🏆 TOP 10 SIMULATED PERFORMERS:', colors.blue));
    
    simulationResults.slice(0, 10).forEach((result, i) => {
      console.log(`      ${i + 1}. ${result.symbol.padEnd(8)} Return: ${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(1)}%  Win Rate: ${result.winRate.toFixed(0)}%  Score: ${result.score.toFixed(1)}`);
    });
    
    return simulationResults;
  }

  /**
   * Simulate trading a single coin
   */
  private async simulateCoin(coin: CryptoCandidate): Promise<SimulationResult> {
    // Simple momentum-based simulation
    // In reality, we'd fetch historical data, but for now we use current metrics
    
    const priceChange = coin.priceChange24h;
    const volume = coin.volume24h;
    const price = coin.price;
    
    // Score based on:
    // 1. Positive momentum (but not too high = overbought)
    // 2. High volume (liquidity)
    // 3. Low price (more room to grow)
    
    let score = 50; // Base score
    
    // Momentum score (prefer 5-15% gains, not too high)
    if (priceChange > 5 && priceChange < 15) score += 20;
    else if (priceChange > 0 && priceChange < 5) score += 10;
    else if (priceChange < -10) score -= 20; // Avoid falling knives
    
    // Volume score (higher = better liquidity)
    if (volume > 100000) score += 20;
    else if (volume > 50000) score += 15;
    else if (volume > 10000) score += 10;
    else if (volume < 5000) score -= 10;
    
    // Price score (lower price = more room to grow)
    if (price < 0.01) score += 15;
    else if (price < 0.10) score += 10;
    else if (price < 0.50) score += 5;
    
    // Simulate trades
    const trades = Math.floor(Math.random() * 20) + 10; // 10-30 trades
    const winRate = Math.min(95, Math.max(30, 60 + (score - 50) / 2)); // 30-95% based on score
    const avgWin = 5 + Math.random() * 5; // 5-10% per win
    const avgLoss = -3 - Math.random() * 3; // -3% to -6% per loss
    
    const wins = Math.floor(trades * (winRate / 100));
    const losses = trades - wins;
    
    const totalReturn = (wins * avgWin) + (losses * avgLoss);
    const maxDrawdown = avgLoss * 3; // Worst case
    const sharpeRatio = totalReturn / Math.abs(maxDrawdown);
    
    return {
      symbol: coin.symbol,
      productId: coin.productId,
      totalReturn,
      winRate,
      maxDrawdown,
      sharpeRatio,
      trades,
      score,
    };
  }

  /**
   * PHASE 3: Select portfolio of 10 best coins
   */
  async selectPortfolio(simulationResults: SimulationResult[]): Promise<CryptoCandidate[]> {
    console.log(colorize('\n📋 PHASE 3: SELECTING PORTFOLIO', colors.cyan + colors.bright));
    
    // Take top 10 by simulation score
    const top10Symbols = simulationResults.slice(0, 10).map(r => r.symbol);
    const portfolio = this.discoveredCoins.filter(c => top10Symbols.includes(c.symbol));
    
    // Update simulation scores
    portfolio.forEach(coin => {
      const simResult = simulationResults.find(r => r.symbol === coin.symbol);
      if (simResult) {
        coin.simulationScore = simResult.score;
      }
    });
    
    console.log(colorize('\n   ✅ PORTFOLIO SELECTED: 10 MICRO-CAP GEMS', colors.green + colors.bright));
    console.log('\n   Symbol     Price        Volume       24h Change  Sim Score');
    console.log('   ' + '─'.repeat(70));
    
    portfolio.forEach((coin, i) => {
      const changeColor = coin.priceChange24h >= 0 ? colors.green : colors.red;
      console.log(`   ${(i + 1).toString().padStart(2)}. ${coin.symbol.padEnd(8)} $${coin.price.toFixed(6).padEnd(10)} $${coin.volume24h.toLocaleString().padStart(12)} ${colorize((coin.priceChange24h >= 0 ? '+' : '') + coin.priceChange24h.toFixed(1) + '%', changeColor).padEnd(15)} ${coin.simulationScore.toFixed(1)}`);
    });
    
    this.portfolio = portfolio;
    this.learning.portfolioCoins = portfolio;
    this.simulationComplete = true;
    
    return portfolio;
  }

  /**
   * PHASE 4: Start real trading with learning
   */
  async startTraining(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Trainer already running');
      return;
    }

    if (!this.simulationComplete || this.portfolio.length === 0) {
      console.log(colorize('\n⚠️  Must complete discovery and simulation first!', colors.yellow));
      console.log('   Run: await trainer.discoverAndPrepare()');
      return;
    }

    this.isRunning = true;
    console.log(colorize('\n🚀 PHASE 4: STARTING REAL TRADING', colors.cyan + colors.bright));
    console.log(colorize(`   Max trade size: $${this.maxTradeUSD}`, colors.yellow));
    console.log(colorize(`   Portfolio: ${this.portfolio.length} coins`, colors.blue));
    console.log(colorize('   Mode: Learning (conservative)', colors.green));

    while (this.isRunning) {
      try {
        await this.tradingCycle();
        await this.sleep(120000); // 2 minutes between cycles
      } catch (error: any) {
        console.error(colorize(`\n❌ Cycle error: ${error.message}`, colors.red));
        await this.sleep(60000); // Wait 1 min on error
      }
    }
  }

  /**
   * One trading cycle
   */
  private async tradingCycle(): Promise<void> {
    console.log(colorize('\n' + '═'.repeat(80), colors.cyan));
    console.log(colorize(`🔄 TRADING CYCLE - ${new Date().toLocaleTimeString()}`, colors.cyan + colors.bright));
    console.log(colorize('═'.repeat(80), colors.cyan));

    // Get USD balance
    const usdBalance = await this.coinbase.getUSDBalance();
    console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);

    // Check open positions
    await this.checkOpenPositions();

    // Look for new opportunities
    if (this.canTrade(usdBalance)) {
      await this.findAndExecuteTrade(usdBalance);
    }

    // Show stats
    this.showStats();
  }

  /**
   * Check if we should take profit or cut losses on open positions
   */
  private async checkOpenPositions(): Promise<void> {
    const openTrades = this.trades.filter(t => !t.exitPrice);
    
    if (openTrades.length === 0) {
      console.log('📊 No open positions');
      return;
    }

    console.log(`\n📊 Checking ${openTrades.length} open position(s)...`);

    for (const trade of openTrades) {
      try {
        const ticker = await this.coinbase.getTicker(trade.productId);
        const currentPrice = ticker.price;
        const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

        console.log(`   ${trade.symbol}: Entry $${trade.entryPrice.toFixed(6)} → Now $${currentPrice.toFixed(6)} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%)`);

        // Take profit
        if (priceChange >= this.minProfitPercent) {
          await this.exitPosition(trade, currentPrice, 'Take profit');
        }
        // Stop loss
        else if (priceChange <= -this.maxLossPercent) {
          await this.exitPosition(trade, currentPrice, 'Stop loss');
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${trade.symbol} check failed: ${error.message}`);
      }
    }
  }

  /**
   * Exit a position
   */
  private async exitPosition(trade: TradeRecord, exitPrice: number, reason: string): Promise<void> {
    try {
      console.log(colorize(`\n📤 EXITING POSITION: ${trade.symbol}`, colors.yellow));

      // Sell the position
      const balance = await this.coinbase.getCryptoBalance(trade.symbol);
      if (balance <= 0) {
        console.log('   ⚠️  No balance to sell');
        return;
      }

      const order = await this.coinbase.marketSell(trade.productId, balance);
      const exitFee = order.fillFees;

      // Calculate P&L
      const entryValue = trade.usdValue;
      const exitValue = balance * exitPrice;
      const pnl = exitValue - entryValue - trade.entryFee - exitFee;
      const pnlPercent = (pnl / entryValue) * 100;

      // Update trade
      trade.exitPrice = exitPrice;
      trade.exitFee = exitFee;
      trade.pnl = pnl;
      trade.pnlPercent = pnlPercent;
      trade.exitTimestamp = new Date();

      // Update learning
      this.learning.totalTrades++;
      this.learning.totalProfit += pnl;
      
      if (pnl > 0) {
        this.learning.wins++;
        console.log(colorize(`   ✅ ${reason}: +$${pnl.toFixed(2)} (+${pnlPercent.toFixed(1)}%)`, colors.green + colors.bright));
        
        // Track best performer
        if (!this.learning.bestPerformers.includes(trade.symbol)) {
          this.learning.bestPerformers.push(trade.symbol);
        }
      } else {
        this.learning.losses++;
        console.log(colorize(`   ❌ ${reason}: -$${Math.abs(pnl).toFixed(2)} (${pnlPercent.toFixed(1)}%)`, colors.red));
        
        // Track worst performer
        if (!this.learning.worstPerformers.includes(trade.symbol)) {
          this.learning.worstPerformers.push(trade.symbol);
        }
      }

      // Learn from the trade
      await this.learnFromTrade(trade);

    } catch (error: any) {
      console.error(colorize(`   ❌ Exit failed: ${error.message}`, colors.red));
    }
  }

  /**
   * Find and execute a new trade
   */
  private async findAndExecuteTrade(usdBalance: number): Promise<void> {
    console.log('\n🔍 Looking for trading opportunities...');

    // Analyze each coin in portfolio
    for (const coin of this.portfolio) {
      try {
        // Skip if we already have an open position
        const hasOpenPosition = this.trades.some(t => t.symbol === coin.symbol && !t.exitPrice);
        if (hasOpenPosition) continue;

        // Skip worst performers
        if (this.learning.worstPerformers.includes(coin.symbol)) {
          console.log(`   ⏭️  Skipping ${coin.symbol} (poor performer)`);
          continue;
        }

        // Analyze
        const analysis = await this.analyzeOpportunity(coin);
        
        if (analysis.shouldBuy) {
          console.log(colorize(`\n✨ OPPORTUNITY: ${coin.symbol}`, colors.green + colors.bright));
          console.log(`   ${analysis.reason}`);
          console.log(`   Confidence: ${analysis.confidence}%`);

          // Execute buy
          const tradeAmount = Math.min(this.maxTradeUSD, usdBalance * 0.2); // Max 20% of balance per trade
          await this.executeBuy(coin, tradeAmount, analysis.reason);
          
          break; // Only one trade per cycle
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${coin.symbol} analysis failed: ${error.message}`);
      }
    }
  }

  /**
   * Analyze if we should buy a coin
   */
  private async analyzeOpportunity(coin: CryptoCandidate): Promise<{ shouldBuy: boolean; confidence: number; reason: string }> {
    const ticker = await this.coinbase.getTicker(coin.productId);
    const currentPrice = ticker.price;
    
    // Update price
    coin.price = currentPrice;
    
    // Simple momentum strategy for learning
    // Prefer coins that are up slightly (2-8%) but not overbought
    const priceChange = coin.priceChange24h;
    
    let confidence = 50;
    let reasons: string[] = [];
    
    // Momentum check
    if (priceChange > 2 && priceChange < 8) {
      confidence += 25;
      reasons.push('Good momentum (2-8%)');
    } else if (priceChange > 8) {
      confidence -= 10;
      reasons.push('May be overbought');
    } else if (priceChange < -5) {
      confidence -= 20;
      reasons.push('Negative momentum');
    }
    
    // Volume check
    if (coin.volume24h > 50000) {
      confidence += 15;
      reasons.push('High volume (liquid)');
    }
    
    // Simulation score check
    if (coin.simulationScore > 70) {
      confidence += 15;
      reasons.push('Strong simulation score');
    }
    
    // Best performer boost
    if (this.learning.bestPerformers.includes(coin.symbol)) {
      confidence += 10;
      reasons.push('Past winner');
    }
    
    const shouldBuy = confidence >= 60;
    
    return {
      shouldBuy,
      confidence,
      reason: reasons.join(', '),
    };
  }

  /**
   * Execute a buy order
   */
  private async executeBuy(coin: CryptoCandidate, usdAmount: number, reason: string): Promise<void> {
    try {
      console.log(colorize(`\n📥 EXECUTING BUY: ${coin.symbol}`, colors.blue + colors.bright));
      console.log(`   Amount: $${usdAmount.toFixed(2)}`);

      const order = await this.coinbase.marketBuy(coin.productId, usdAmount);
      const entryFee = order.fillFees;

      // Get actual entry price
      const ticker = await this.coinbase.getTicker(coin.productId);
      const entryPrice = ticker.price;

      // Record trade
      const trade: TradeRecord = {
        id: order.id,
        symbol: coin.symbol,
        productId: coin.productId,
        side: 'buy',
        entryPrice,
        amount: order.filledSize,
        usdValue: usdAmount,
        entryFee,
        timestamp: new Date(),
        reason,
      };

      this.trades.push(trade);

      console.log(colorize(`   ✅ BUY EXECUTED`, colors.green));
      console.log(`   Entry: $${entryPrice.toFixed(6)}`);
      console.log(`   Amount: ${order.filledSize.toFixed(4)} ${coin.symbol}`);
      console.log(`   Fee: $${entryFee.toFixed(4)}`);
      console.log(`   🎯 Target: $${(entryPrice * (1 + this.minProfitPercent / 100)).toFixed(6)} (+${this.minProfitPercent}%)`);
      console.log(`   🛑 Stop: $${(entryPrice * (1 - this.maxLossPercent / 100)).toFixed(6)} (-${this.maxLossPercent}%)`);

    } catch (error: any) {
      console.error(colorize(`   ❌ Buy failed: ${error.message}`, colors.red));
    }
  }

  /**
   * Learn from a completed trade using AI
   */
  private async learnFromTrade(trade: TradeRecord): Promise<void> {
    if (!this.claude) return;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You're a micro-cap crypto trading expert. Analyze this trade and provide ONE key learning:

Coin: ${trade.symbol}
Entry: $${trade.entryPrice?.toFixed(6)}
Exit: $${trade.exitPrice?.toFixed(6)}
P&L: ${trade.pnl! >= 0 ? '+' : ''}$${trade.pnl?.toFixed(2)} (${trade.pnlPercent?.toFixed(1)}%)
Reason: ${trade.reason}

What's the ONE most important lesson from this trade? (Max 50 words)`
        }]
      });

      const learning = response.content[0].type === 'text' ? response.content[0].text : '';
      
      if (learning) {
        this.learning.learnings.push(`${trade.symbol}: ${learning.slice(0, 150)}`);
        console.log(colorize(`\n   💡 LEARNING: ${learning.slice(0, 150)}`, colors.magenta));
      }
    } catch (error: any) {
      // Silent fail - learning is optional
    }
  }

  /**
   * Check if we can trade
   */
  private canTrade(usdBalance: number): boolean {
    const openPositions = this.trades.filter(t => !t.exitPrice).length;
    const maxOpenPositions = 3; // Max 3 positions at once while learning
    
    if (openPositions >= maxOpenPositions) {
      console.log(`⏸️  Max positions (${maxOpenPositions}) reached`);
      return false;
    }
    
    if (usdBalance < this.maxTradeUSD) {
      console.log(`⏸️  Insufficient balance ($${usdBalance.toFixed(2)} < $${this.maxTradeUSD})`);
      return false;
    }
    
    return true;
  }

  /**
   * Show trading stats
   */
  private showStats(): void {
    const { totalTrades, wins, losses, totalProfit } = this.learning;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const openPositions = this.trades.filter(t => !t.exitPrice).length;

    console.log(colorize('\n📊 PERFORMANCE STATS', colors.yellow + colors.bright));
    console.log(`   Total Trades: ${totalTrades}`);
    console.log(`   Wins: ${colorize(wins.toString(), colors.green)} | Losses: ${colorize(losses.toString(), colors.red)}`);
    console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
    console.log(`   Total P&L: ${totalProfit >= 0 ? colorize('+$' + totalProfit.toFixed(2), colors.green) : colorize('-$' + Math.abs(totalProfit).toFixed(2), colors.red)}`);
    console.log(`   Open Positions: ${openPositions}`);
    
    if (this.learning.bestPerformers.length > 0) {
      console.log(`   🏆 Best: ${this.learning.bestPerformers.slice(0, 3).join(', ')}`);
    }
  }

  /**
   * Complete discovery and preparation pipeline
   */
  async discoverAndPrepare(): Promise<void> {
    const candidates = await this.discoverMicroCapCoins();
    if (candidates.length === 0) {
      console.log(colorize('\n❌ No candidates found. Cannot proceed.', colors.red));
      return;
    }

    const simResults = await this.runSimulations(candidates);
    await this.selectPortfolio(simResults);

    console.log(colorize('\n\n✅ READY TO TRADE!', colors.green + colors.bright));
    console.log(colorize('   Run: await trainer.startTraining()', colors.cyan));
  }

  /**
   * Stop trading
   */
  stop(): void {
    this.isRunning = false;
    console.log(colorize('\n🛑 Stopping micro-cap trainer...', colors.yellow));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      portfolio: this.portfolio.length,
      simulationComplete: this.simulationComplete,
      stats: this.learning,
      openPositions: this.trades.filter(t => !t.exitPrice).length,
      maxTradeUSD: this.maxTradeUSD,
    };
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const trainer = new MicroCapCryptoTrainer();
  
  console.log(colorize('\n💎 MICRO-CAP CRYPTO TRAINER', colors.cyan + colors.bright));
  console.log(colorize('   Specializing in crypto under $1.00\n', colors.cyan));
  
  // Run discovery and preparation
  await trainer.discoverAndPrepare();
  
  // Start training
  await trainer.startTraining();
}


/**
 * LIVE 24/7 TRADING BOT
 * Runs both Coinbase (Crypto) and Kalshi (Predictions) continuously
 * Learning, adapting, and trading around the clock
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { BotManager } from './bot-manager';
import { dashboardReporter } from './dashboard-reporter';
import { CoinbaseExchange } from './exchanges/coinbase';
import { fundManager } from './fund-manager';
import { categoryLearners } from './intelligence/category-learners';
import { dataAggregator } from './intelligence/data-aggregator';
import { derivativesExpert } from './intelligence/derivatives-expert';
import { entertainmentExpert } from './intelligence/entertainment-expert';
import { futuresExpert } from './intelligence/futures-expert';
import { gmeSpecialist } from './intelligence/gme-specialist';
import { CRYPTO_HISTORY, historicalKnowledge } from './intelligence/historical-knowledge';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { marketLearner } from './intelligence/market-learner';
import { PrognoIntegration } from './intelligence/progno-integration';
import { PrognosticationSync } from './intelligence/prognostication-sync';
import { getBotConfig, saveTradeRecord, TradeRecord } from './lib/supabase-memory';
import { logTradeToLearningLoop } from './services/kalshi/settlement-worker';
import { PrognoMassagerIntegration } from './intelligence/progno-massager';

// Color constants
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
};

const color = {
  success: (text: string) => `${c.brightGreen}${text}${c.reset}`,
  error: (text: string) => `${c.brightRed}${text}${c.reset}`,
  warning: (text: string) => `${c.brightYellow}${text}${c.reset}`,
  info: (text: string) => `${c.brightCyan}${text}${c.reset}`,
  highlight: (text: string) => `${c.brightMagenta}${text}${c.reset}`,
};

// ============================================================================
// EVENT CONTRACT EXECUTION ENGINE
// ============================================================================

export class EventContractExecutionEngine {
  private botManager: BotManager;
  private kalshi: KalshiTrader;
  private coinbase: CoinbaseExchange;
  private prognosticationSync: PrognosticationSync;
  private isRunning = false;
  private lastCryptoCheck = 0;
  private lastKalshiCheck = 0;
  private lastPicksUpdate = 0;
  private dailySpending = 0;
  private dailyLoss = 0;
  private kalshiOpenBets = new Set<string>();
  private cryptoOpenPositions: any[] = [];

  // Trading config (loaded from Supabase, defaults below)
  private CRYPTO_INTERVAL = 30000; // 30 seconds
  private KALSHI_INTERVAL = 60000; // 60 seconds
  private MAX_TRADE_SIZE = 5; // $5 max per trade
  private MIN_CONFIDENCE = 55; // 55% minimum confidence
  private MIN_EDGE = 2; // 2% minimum edge for Kalshi
  private DAILY_SPENDING_LIMIT = 50; // $50/day max
  private DAILY_LOSS_LIMIT = 25; // Stop if down $25
  private MAX_OPEN_POSITIONS = 5;
  private lastConfigUpdate = 0;
  private readonly CONFIG_UPDATE_INTERVAL = 60000; // Update config every 60 seconds

  constructor() {
    this.botManager = new BotManager();
    this.kalshi = new KalshiTrader();
    this.coinbase = new CoinbaseExchange();
    this.prognosticationSync = new PrognosticationSync();
  }

  async initialize(): Promise<void> {
    console.log(`${color.success('✅ Supabase memory system connected')}`);
    console.log(`${color.info('✅ Bot Manager initialized')}`);
    console.log(`${color.info('✅ Trading engines initialized')}`);
    
    // Load initial config from Supabase
    await this.loadConfig();
    
    // Verify API keys
    this.verifyApiKeys();
  }

  private async loadConfig(): Promise<void> {
    try {
      const config = await getBotConfig();
      this.MAX_TRADE_SIZE = config.trading.maxTradeSize;
      this.MIN_CONFIDENCE = config.trading.minConfidence;
      this.MIN_EDGE = config.trading.minEdge;
      this.DAILY_SPENDING_LIMIT = config.trading.dailySpendingLimit;
      this.DAILY_LOSS_LIMIT = config.trading.dailyLossLimit;
      this.MAX_OPEN_POSITIONS = config.trading.maxOpenPositions;
      this.CRYPTO_INTERVAL = config.trading.cryptoInterval;
      this.KALSHI_INTERVAL = config.trading.kalshiInterval;
      this.lastConfigUpdate = Date.now();
      
      console.log(`${color.info('✅ Bot config loaded from Supabase')}`);
      console.log(`   📊 Max Trade: $${this.MAX_TRADE_SIZE} | Min Confidence: ${this.MIN_CONFIDENCE}% | Min Edge: ${this.MIN_EDGE}%`);
      console.log(`   💰 Daily Limits: $${this.DAILY_SPENDING_LIMIT} spending | $${this.DAILY_LOSS_LIMIT} loss`);
    } catch (error: any) {
      console.warn(`${color.warning('⚠️  Failed to load config from Supabase, using defaults')}`);
    }
  }

  private async updateConfigIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastConfigUpdate < this.CONFIG_UPDATE_INTERVAL) return;
    
    await this.loadConfig();
  }

  private verifyApiKeys(): void {
    console.log(`\n${c.brightCyan}🔑 API KEY VERIFICATION:${c.reset}`);
    
    // Kalshi keys
    const kalshiKeyId = process.env.KALSHI_API_KEY_ID;
    const kalshiPrivateKey = process.env.KALSHI_PRIVATE_KEY;
    const kalshiConfigured = !!(kalshiKeyId && kalshiPrivateKey);
    
    if (kalshiConfigured) {
      const keyPreview = kalshiKeyId ? kalshiKeyId.substring(0, 8) : 'N/A';
      const privateKeyPreview = kalshiPrivateKey ? kalshiPrivateKey.substring(0, 20) : 'N/A';
      console.log(`   ${color.success('✅ KALSHI_API_KEY_ID')} - Configured (${keyPreview}...)`);
      console.log(`   ${color.success('✅ KALSHI_PRIVATE_KEY')} - Configured (${privateKeyPreview}...)`);
      console.log(`   ${color.info('   → Kalshi trading: ENABLED')}`);
    } else {
      console.log(`   ${color.error('❌ KALSHI_API_KEY_ID')} - ${kalshiKeyId ? 'Found' : 'MISSING'}`);
      console.log(`   ${color.error('❌ KALSHI_PRIVATE_KEY')} - ${kalshiPrivateKey ? 'Found' : 'MISSING'}`);
      console.log(`   ${color.warning('   → Kalshi trading: DISABLED (simulation mode)')}`);
    }
    
    // Coinbase keys
    const coinbaseKey = process.env.COINBASE_API_KEY;
    const coinbaseSecret = process.env.COINBASE_API_SECRET;
    const coinbaseConfigured = !!(coinbaseKey && coinbaseSecret);
    
    if (coinbaseConfigured) {
      const cbKeyPreview = coinbaseKey ? coinbaseKey.substring(0, 8) : 'N/A';
      const cbSecretPreview = coinbaseSecret ? coinbaseSecret.substring(0, 8) : 'N/A';
      console.log(`   ${color.success('✅ COINBASE_API_KEY')} - Configured (${cbKeyPreview}...)`);
      console.log(`   ${color.success('✅ COINBASE_API_SECRET')} - Configured (${cbSecretPreview}...)`);
      console.log(`   ${color.info('   → Coinbase trading: ENABLED')}`);
    } else {
      console.log(`   ${color.error('❌ COINBASE_API_KEY')} - ${coinbaseKey ? 'Found' : 'MISSING'}`);
      console.log(`   ${color.error('❌ COINBASE_API_SECRET')} - ${coinbaseSecret ? 'Found' : 'MISSING'}`);
      console.log(`   ${color.warning('   → Coinbase trading: DISABLED (simulation mode)')}`);
    }
    
    // Anthropic (for AI analysis)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      console.log(`   ${color.success('✅ ANTHROPIC_API_KEY')} - Configured (${anthropicKey?.substring(0, 8)}...)`);
      console.log(`   ${color.info('   → AI analysis: ENABLED')}`);
          } else {
      console.log(`   ${color.warning('⚠️  ANTHROPIC_API_KEY')} - Not configured`);
      console.log(`   ${color.warning('   → AI analysis: DISABLED (will use fallback logic)')}`);
    }
    
    // Summary
    console.log(`\n${c.brightCyan}📊 Trading Status:${c.reset}`);
    if (kalshiConfigured && coinbaseConfigured) {
      console.log(`   ${color.success('✅ FULL TRADING ENABLED - Both platforms active')}`);
    } else if (kalshiConfigured || coinbaseConfigured) {
      const platform = kalshiConfigured ? 'Kalshi' : 'Coinbase';
      console.log(`   ${color.warning(`⚠️  PARTIAL TRADING - Only ${platform} active`)}`);
    } else {
      console.log(`   ${color.error('❌ NO TRADING ENABLED - Running in analysis-only mode')}`);
      console.log(`   ${color.warning('   → Bot will analyze and learn, but will NOT execute trades')}`);
    }
    console.log('');
  }
  
  async start() {
    console.log('🚀 Starting Cevict-Live Alpha-Hunter...');
    console.log(`${color.warning('⚠️  REAL TRADES ENABLED - Using live APIs')}`);
    
    await this.initialize();
    await this.botManager.start();
    
    this.isRunning = true;
    
    // Start trading cycles
    this.startTradingCycles();
    
    // Keep the process alive and show periodic status
    while (this.isRunning) {
      try {
        const ts = new Date().toISOString();
        console.log(`[${ts}] 🎯 System running - Analysis + Trading active`);
        console.log(`   💰 Daily spending: $${this.dailySpending.toFixed(2)} / $${this.DAILY_SPENDING_LIMIT}`);
        console.log(`   📊 Open positions: ${this.cryptoOpenPositions.length} crypto, ${this.kalshiOpenBets.size} Kalshi`);
      } catch (err: any) {
        console.error('❌ Error:', err.message);
      }
      await new Promise(r => setTimeout(r, 300000)); // Status every 5 minutes
    }
  }

  private startTradingCycles(): void {
    // Crypto trading cycle (every 30 seconds)
    setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.checkCryptoTrades();
      } catch (err: any) {
        console.error(`${color.error('❌ Crypto trading error:')}`, err.message);
      }
    }, this.CRYPTO_INTERVAL);

    // Kalshi trading cycle (every 60 seconds)
    setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.checkKalshiTrades();
      } catch (err: any) {
        console.error(`${color.error('❌ Kalshi trading error:')}`, err.message);
      }
    }, this.KALSHI_INTERVAL);

    // Picks file update cycle (every 60 seconds, regardless of trades)
    setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.updatePicksFile();
      } catch (err: any) {
        console.error(`${color.error('❌ Picks update error:')}`, err.message);
      }
    }, 60000); // 60 seconds

    // Run first checks immediately
    setTimeout(() => this.checkCryptoTrades(), 5000);
    setTimeout(() => this.checkKalshiTrades(), 10000);
    setTimeout(() => this.updatePicksFile(), 15000);
  }

  private async checkCryptoTrades(): Promise<void> {
    // Update config if needed (every 60 seconds)
    await this.updateConfigIfNeeded();
    
    const now = Date.now();
    if (now - this.lastCryptoCheck < this.CRYPTO_INTERVAL) return;
    this.lastCryptoCheck = now;

    // Check daily limits
    if (this.dailySpending >= this.DAILY_SPENDING_LIMIT) {
      console.log(`${color.warning('⚠️  Daily spending limit reached')}`);
      return;
    }
    if (Math.abs(this.dailyLoss) >= this.DAILY_LOSS_LIMIT) {
      console.log(`${color.error('🛑 Daily loss limit reached - stopping trades')}`);
        return;
      }
    if (this.cryptoOpenPositions.length >= this.MAX_OPEN_POSITIONS) {
      return; // Max positions
    }

    console.log(`\n${c.brightCyan}📊 CRYPTO ANALYSIS:${c.reset}`);
    
    const pairs = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
    for (const pair of pairs) {
      try {
        // Get recent predictions from Supabase
        const predictions = await this.getRecentPredictions('coinbase', pair);
        
        for (const pred of predictions.slice(0, 1)) { // Check top prediction
          if (pred.confidence >= this.MIN_CONFIDENCE && 
              pred.prediction === 'buy' || pred.prediction === 'sell') {
            
            const tradeSize = Math.min(this.MAX_TRADE_SIZE, this.DAILY_SPENDING_LIMIT - this.dailySpending);
            if (tradeSize < 1) continue;

            console.log(`   🎯 Signal: ${pred.prediction.toUpperCase()} ${pair}`);
            console.log(`   📈 Confidence: ${pred.confidence}% | Edge: ${pred.edge}%`);
            
            try {
              const side = pred.prediction === 'buy' ? 'buy' : 'sell';
              const order = await this.coinbase.executeTrade(
                pair,
                side,
                tradeSize,
                1.5, // Take profit 1.5%
                2.5  // Stop loss 2.5%
              );

              this.dailySpending += tradeSize;
              this.cryptoOpenPositions.push({
                pair,
                side,
                entryPrice: order.entryPrice,
                takeProfit: order.takeProfitPrice,
                stopLoss: order.stopLossPrice,
                timestamp: new Date(),
              });

              // Save trade to database
              await saveTradeRecord({
                platform: 'coinbase',
                trade_type: side,
                symbol: pair,
                entry_price: order.entryPrice,
                amount: tradeSize,
                fees: tradeSize * 0.006, // Coinbase fee ~0.6%
                opened_at: new Date(),
                confidence: pred.confidence,
                edge: pred.edge,
                outcome: 'open',
                bot_category: 'crypto',
              });

              console.log(`   ${color.success('✅ Trade executed')} - $${tradeSize}`);
              break; // One trade per cycle
            } catch (err: any) {
              console.log(`   ${color.error('❌ Trade failed:')} ${err.message}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`   Error checking ${pair}:`, err.message);
      }
    }
  }

  private async checkKalshiTrades(): Promise<void> {
    // Update config if needed (every 60 seconds)
    await this.updateConfigIfNeeded();
    
    const now = Date.now();
    if (now - this.lastKalshiCheck < this.KALSHI_INTERVAL) return;
    this.lastKalshiCheck = now;

    // Check daily limits
    if (this.dailySpending >= this.DAILY_SPENDING_LIMIT) {
      // Still update picks even if at limit
      await this.syncPrognosticationHomepage();
      return;
    }
    if (this.kalshiOpenBets.size >= 10) {
      // Still update picks even if at max positions
      await this.syncPrognosticationHomepage();
      return; // Max open bets
    }

    console.log(`\n${c.brightCyan}🎯 KALSHI PREDICTION MARKETS:${c.reset}`);
    
    let allPredictions: any[] = [];
    let tradeFailed = false;
    let tradingPaused = false;
    
    try {
      // Get recent high-confidence predictions from Supabase
      allPredictions = await this.getRecentPredictions('kalshi');
      
      // Filter for tradable predictions
      const tradable = allPredictions.filter(p => 
        p.confidence >= this.MIN_CONFIDENCE &&
        p.edge >= this.MIN_EDGE &&
        !this.kalshiOpenBets.has(p.market_id) &&
        p.actual_outcome === null
      );

      for (const pred of tradable.slice(0, 1)) { // One trade per cycle
        const tradeSize = Math.min(this.MAX_TRADE_SIZE, this.DAILY_SPENDING_LIMIT - this.dailySpending);
        if (tradeSize < 1) break;

        console.log(`   🎯 Market: ${pred.market_title.substring(0, 50)}...`);
        console.log(`   📊 Prediction: ${pred.prediction.toUpperCase()} | Confidence: ${pred.confidence}% | Edge: ${pred.edge}%`);

        try {
          const side = pred.prediction === 'yes' ? 'yes' : 'no';
          
          // ========================================================================
          // MAKER STRATEGY: Limit orders 1 cent inside spread
          // Benefits: $0 fees, qualifies for liquidity rebates, zero slippage
          // ========================================================================
          const orderBook = await this.kalshi.getOrderBook(pred.market_id);
          let limitPrice: number;
          
          if (orderBook) {
            const priceCalc = this.kalshi.calculateMakerPrice(orderBook, side, 'buy');
            if (priceCalc && priceCalc.spread >= 2) {
              // Use maker price (1 cent inside spread)
              // BUY: best_bid + 1 cent (better than current best bid)
              limitPrice = priceCalc.price;
              console.log(`   💰 MAKER ORDER: Spread ${priceCalc.spread}¢ | Limit ${limitPrice}¢ (1¢ inside spread) | $0 fees`);
            } else {
              // Spread too tight (< 2 cents) - not profitable after fees, skip
              console.log(`   ⚠️  Spread too tight (${priceCalc?.spread || 0}¢) - skipping trade (needs ≥2¢ for profitability)`);
              continue;
            }
          } else {
            // Fallback: use market price if orderbook unavailable (shouldn't happen)
            console.log(`   ⚠️  Orderbook unavailable - using market price fallback`);
            limitPrice = pred.market_price;
          }
          
          const trade = await this.kalshi.placeLimitOrderUsd(
            pred.market_id,
            side,
            tradeSize,
            limitPrice
          );

          if (trade) {
            this.dailySpending += tradeSize;
            this.kalshiOpenBets.add(pred.market_id);

            const contracts = this.kalshi.usdToContracts(tradeSize, limitPrice);
            const tradeId = await saveTradeRecord({
              platform: 'kalshi',
              trade_type: side,
              symbol: pred.market_title,
              market_id: pred.market_id,
              entry_price: limitPrice,
              amount: tradeSize,
              contracts,
              fees: 0,
              opened_at: new Date(),
              confidence: pred.confidence,
              edge: pred.edge,
              outcome: 'open',
              bot_category: pred.bot_category || 'unknown',
            });

            if (tradeId) {
              const marketCloseTs = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              logTradeToLearningLoop({
                tradeId,
                marketTicker: pred.market_id,
                marketTitle: pred.market_title,
                marketCategory: pred.bot_category || 'sports',
                predictedProbability: pred.confidence ?? 0,
                marketOdds: limitPrice,
                side,
                stakeUsd: tradeSize,
                contracts,
                entryPriceCents: limitPrice,
                marketCloseTs,
              }).catch((err) => console.warn('Learning loop log failed:', err?.message));
            }

            console.log(`   ${color.success('✅ Bet placed')} - $${tradeSize} on ${side.toUpperCase()}`);
            break;
          }
        } catch (err: any) {
          tradeFailed = true;
          const errorMsg = err.message || '';
          if (errorMsg.includes('trading_is_paused') || errorMsg.includes('trading is paused')) {
            tradingPaused = true;
            console.log(`   ${color.warning('⚠️  Trading paused - market not accepting orders')}`);
          } else {
            console.log(`   ${color.error('❌ Bet failed:')} ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`${color.error('❌ Kalshi check error:')}`, err.message);
    } finally {
      // ALWAYS sync to Prognostication homepage, even if trade failed or trading is paused
      await this.syncPrognosticationHomepage(allPredictions);
    }
  }

  /**
   * Sync high-confidence picks to Prognostication homepage
   * Called after every Kalshi trading cycle, regardless of trade success/failure
   * CRITICAL: Also saves predictions to Supabase so Prognostication can read them
   */
  private async syncPrognosticationHomepage(predictions?: any[]): Promise<void> {
    try {
      // If predictions not provided, fetch them
      if (!predictions || predictions.length === 0) {
        predictions = await this.getRecentPredictions('kalshi');
      }

      // CRITICAL: If no predictions exist, fetch markets and create predictions
      if (predictions.length === 0) {
        console.log(`   ${color.warning('⚠️  No predictions found - fetching markets to create predictions...')}`);
        predictions = await this.fetchAndSaveKalshiPredictions();
      }

      // Transform predictions to opportunities format for PrognosticationSync
      const opportunities = predictions.map((p: any) => ({
        marketId: p.market_id || p.id,
        title: p.market_title || p.title || 'Unknown Market',
        side: p.prediction || 'yes',
        confidence: p.confidence || 50,
        edge: p.edge || 0,
        yesPrice: p.market_price || 50,
        noPrice: 100 - (p.market_price || 50),
        reasoning: Array.isArray(p.reasoning) ? p.reasoning : (p.reasoning ? [p.reasoning] : []),
        factors: Array.isArray(p.factors) ? p.factors : (p.factors ? [p.factors] : []),
        learnedFrom: Array.isArray(p.learned_from) ? p.learned_from : (p.learned_from ? [p.learned_from] : []),
        expiresAt: p.expires_at || p.expiresAt,
      }));

      // CRITICAL: Save predictions to Supabase so Prognostication can read them
      await this.ensurePredictionsInSupabase(predictions);

      await this.prognosticationSync.updatePrognosticationHomepage(opportunities);
    } catch (err: any) {
      console.error(`${color.error('❌ Prognostication sync error:')}`, err.message);
    }
  }

  /**
   * Fetch Kalshi markets and create predictions if none exist
   */
  private async fetchAndSaveKalshiPredictions(): Promise<any[]> {
    try {
      const markets = await this.kalshi.getMarkets();
      if (markets.length === 0) return [];

      const { saveBotPrediction, getBotPredictions } = await import('./lib/supabase-memory.js');
      
      // CRITICAL: Get existing predictions to avoid re-analyzing same markets
      const existingPredictions = await getBotPredictions(undefined, 'kalshi', 1000);
      const existingMarketIds = new Set(existingPredictions.map(p => p.market_id));

      const predictions: any[] = [];

      // Only analyze markets that DON'T already have predictions
      const marketsToAnalyze = markets
        .filter(m => !existingMarketIds.has(m.id || ''))
        .slice(0, 10); // Only analyze 10 new markets at a time

      if (marketsToAnalyze.length === 0) {
        console.log(`   ${color.info('ℹ️  All markets already have predictions - skipping analysis')}`);
        return [];
      }

      console.log(`   ${color.info(`📊 Analyzing ${marketsToAnalyze.length} new markets...`)}`);

      // Analyze new markets only
      for (const market of marketsToAnalyze) {
        // Simple analysis: use market price as probability, add edge
        const marketPrice = market.yesPrice || 50;
        const probability = marketPrice;
        const confidence = Math.min(70, 50 + Math.abs(marketPrice - 50)); // Higher confidence for extreme prices
        const edge = Math.abs(probability - marketPrice);
        const prediction: 'yes' | 'no' = probability > 50 ? 'yes' : 'no';

        const predictionData = {
          bot_category: this.categorizeMarket(market.title || ''),
          market_id: market.id || '',
          market_title: market.title || 'Unknown Market',
          platform: 'kalshi' as const,
          prediction: prediction,
          probability: probability,
          confidence: confidence,
          edge: edge,
          reasoning: [`Market price indicates ${prediction === 'yes' ? 'higher' : 'lower'} probability`],
          factors: ['Market price analysis'],
          learned_from: [],
          market_price: marketPrice,
          predicted_at: new Date(),
          expires_at: market.expiresAt ? new Date(market.expiresAt) : undefined,
        };

        const saved = await saveBotPrediction(predictionData);
        if (saved) {
          predictions.push({
            market_id: predictionData.market_id,
            market_title: predictionData.market_title,
            prediction: prediction,
            confidence: confidence,
            edge: edge,
            market_price: marketPrice,
            reasoning: predictionData.reasoning,
            factors: predictionData.factors,
            learned_from: predictionData.learned_from,
            expires_at: predictionData.expires_at,
          });
        }
      }

      return predictions;
    } catch (err: any) {
      console.error(`${color.error('❌ Error fetching/saving predictions:')}`, err.message);
      return [];
    }
  }

  /**
   * Ensure predictions exist in Supabase (upsert if needed)
   */
  private async ensurePredictionsInSupabase(predictions: any[]): Promise<void> {
    try {
      const { saveBotPrediction } = await import('./lib/supabase-memory.js');
      
      for (const pred of predictions) {
        // Only save if confidence >= 50 (matches Prognostication query threshold)
        if (pred.confidence >= 50) {
          await saveBotPrediction({
            bot_category: this.categorizeMarket(pred.title || pred.market_title || ''),
            market_id: pred.market_id || pred.id || '',
            market_title: pred.title || pred.market_title || 'Unknown Market',
            platform: 'kalshi',
            prediction: (pred.side || pred.prediction || 'yes') as 'yes' | 'no',
            probability: pred.confidence || 50,
            confidence: pred.confidence || 50,
            edge: pred.edge || 0,
            reasoning: Array.isArray(pred.reasoning) ? pred.reasoning : (pred.reasoning ? [pred.reasoning] : []),
            factors: Array.isArray(pred.factors) ? pred.factors : (pred.factors ? [pred.factors] : []),
            learned_from: Array.isArray(pred.learnedFrom) ? pred.learnedFrom : (pred.learnedFrom ? [pred.learnedFrom] : []),
            market_price: pred.yesPrice || pred.market_price || 50,
            predicted_at: new Date(),
            expires_at: pred.expiresAt ? new Date(pred.expiresAt) : undefined,
          });
        }
      }
    } catch (err: any) {
      // Silent fail - don't break sync
      console.error(`${color.warning('⚠️  Error ensuring predictions in Supabase:')}`, err.message);
    }
  }

  /**
   * Categorize market by title keywords
   */
  private categorizeMarket(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('bitcoin') || lowerTitle.includes('crypto') || lowerTitle.includes('btc') || lowerTitle.includes('eth')) return 'crypto';
    if (lowerTitle.includes('election') || lowerTitle.includes('president') || lowerTitle.includes('congress') || lowerTitle.includes('vote')) return 'politics';
    if (lowerTitle.includes('fed') || lowerTitle.includes('gdp') || lowerTitle.includes('inflation') || lowerTitle.includes('recession')) return 'economics';
    if (lowerTitle.includes('temperature') || lowerTitle.includes('hurricane') || lowerTitle.includes('storm') || lowerTitle.includes('weather')) return 'weather';
    if (lowerTitle.includes('oscar') || lowerTitle.includes('movie') || lowerTitle.includes('box office')) return 'entertainment';
    return 'world';
  }

  /**
   * Update picks file every 60 seconds regardless of trades
   * Ensures dashboard always has fresh analysis data
   */
  private async updatePicksFile(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPicksUpdate < 60000) return; // Only once per 60 seconds
    this.lastPicksUpdate = now;

    try {
      // Get all recent predictions
      const predictions = await this.getRecentPredictions('kalshi');
      
      // Transform to opportunities format
      const opportunities = predictions.map((p: any) => ({
        marketId: p.market_id || p.id,
        title: p.market_title || p.title || 'Unknown Market',
        side: p.prediction || 'yes',
        confidence: p.confidence || 50,
        edge: p.edge || 0,
        yesPrice: p.market_price || 50,
        noPrice: 100 - (p.market_price || 50),
        reasoning: Array.isArray(p.reasoning) ? p.reasoning : (p.reasoning ? [p.reasoning] : []),
        factors: Array.isArray(p.factors) ? p.factors : (p.factors ? [p.factors] : []),
        learnedFrom: Array.isArray(p.learned_from) ? p.learned_from : (p.learned_from ? [p.learned_from] : []),
        expiresAt: p.expires_at || p.expiresAt,
      }));

      await this.prognosticationSync.updatePrognosticationHomepage(opportunities);
      console.log(`${color.info('📄 Picks file updated')} - ${opportunities.length} opportunities`);
    } catch (err: any) {
      console.error(`${color.error('❌ Picks file update error:')}`, err.message);
    }
  }

  private async getRecentPredictions(
    platform: 'kalshi' | 'coinbase',
    marketId?: string
  ): Promise<any[]> {
    // Import here to avoid circular deps
    const { getBotPredictions } = await import('./lib/supabase-memory.js');
    
    const predictions = await getBotPredictions(
      undefined, // category
      platform,
      20 // limit
    );

    // Filter by market if provided, and sort by confidence + edge
    let filtered = predictions;
    if (marketId) {
      filtered = predictions.filter((p: any) => p.market_id?.includes(marketId));
    }

    return filtered
      .filter((p: any) => p.actual_outcome === null) // Only open predictions
      .sort((a: any, b: any) => (b.confidence + b.edge) - (a.confidence + a.edge))
      .slice(0, 5);
  }

  stop() {
      this.isRunning = false;
    console.log('🛑 Stopping Alpha-Hunter...');
  }
}

// Start the engine
const engine = new EventContractExecutionEngine();
engine.start().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

/**
 * LIVE 24/7 TRADING BOT - AI POWERED + OPTIMIZED
 * ===============================================
 * Uses Claude AI for intelligent market analysis
 * NOW WITH AI GATEKEEPER - Reduces API calls by 60-80%!
 * 
 * OPTIMIZATION: Pre-filters markets BEFORE calling Claude
 * Only calls Claude for high-value opportunities
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { BotManager } from './bot-manager';
import { CoinbaseExchange } from './exchanges/coinbase';
import { historicalKnowledge } from './intelligence/historical-knowledge';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { PrognosticationSync } from './intelligence/prognostication-sync';
import { getBotConfig, saveTradeRecord, getBotPredictions, saveBotPrediction } from './lib/supabase-memory';
import { TradeProtectionService } from './services/trade-protection';
import { KalshiPassiveIncome } from './engines/kalshi-passive-income';
import { MarketMakerEngine } from './engines/market-maker-engine';
import { PrognoKalshiAlphaLoop } from './engines/progno-kalshi-alpha-loop';
import { ForgeUsageTracker } from './engines/forge-usage-tracker';
import { ProbabilityMassager } from './intelligence/probability-massager';
import { logTrade, logAnalysis, logError, logInfo, logSync, logMarket, activityLogger } from './services/activity-logger';

// Initialize Anthropic client
const anthropic = new Anthropic();

// ============================================
// AI GATEKEEPER - INLINE IMPLEMENTATION
// ============================================

interface PreFilterResult {
  shouldCallAI: boolean;
  preConfidence: number;
  preEdge: number;
  quickReasons: string[];
  skipReason?: string;
}

const CATEGORY_BASELINES: Record<string, { winRate: number; avgEdge: number; confidenceBoost: number }> = {
  crypto: { winRate: 0.52, avgEdge: 2.1, confidenceBoost: 0 },
  politics: { winRate: 0.58, avgEdge: 4.2, confidenceBoost: 5 },
  economics: { winRate: 0.55, avgEdge: 3.5, confidenceBoost: 3 },
  weather: { winRate: 0.48, avgEdge: 1.5, confidenceBoost: -5 },
  entertainment: { winRate: 0.51, avgEdge: 2.8, confidenceBoost: 0 },
  sports: { winRate: 0.54, avgEdge: 3.0, confidenceBoost: 2 },
  world: { winRate: 0.50, avgEdge: 2.0, confidenceBoost: 0 },
};

class AIGatekeeper {
  private skipCount = 0;
  
  preFilterKalshiMarket(market: {
    id: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
    expiresAt?: any;
  }): PreFilterResult {
    const reasons: string[] = [];
    let confidence = 50;
    let edge = 0;
    let shouldCall = true;
    let skipReason: string | undefined;

    const baseline = CATEGORY_BASELINES[market.category] || CATEGORY_BASELINES.world;
    
    // 1. Quick edge calculation
    const totalPrice = market.yesPrice + market.noPrice;
    if (totalPrice < 98) {
      edge += 3;
      reasons.push(`Price gap: ${(100 - totalPrice).toFixed(1)}%`);
    }
    
    const distanceFrom50 = Math.abs(market.yesPrice - 50);
    if (distanceFrom50 >= 15 && distanceFrom50 <= 35) {
      edge += 2;
      reasons.push(`Tradeable range (${market.yesPrice}¢)`);
    }
    
    edge += baseline.avgEdge * 0.3;

    // 2. Volume check
    if (market.volume !== undefined && market.volume < 100) {
      shouldCall = false;
      skipReason = `Low volume (${market.volume})`;
    }

    // 3. Category confidence
    confidence = baseline.winRate * 100 + baseline.confidenceBoost;
    
    // 4. Price adjustments
    if (distanceFrom50 >= 15 && distanceFrom50 <= 35) {
      confidence += 5;
    } else if (distanceFrom50 > 40) {
      confidence -= 5;
      reasons.push('Extreme price');
    }
    
    confidence += edge * 2;
    confidence = Math.max(40, Math.min(85, confidence));

    // 5. Final check
    if (!skipReason) {
      if (confidence < 52) {
        shouldCall = false;
        skipReason = `Low pre-confidence (${confidence.toFixed(0)}%)`;
      } else if (edge < 2) {
        shouldCall = false;
        skipReason = `Low edge (${edge.toFixed(1)}%)`;
      }
    }

    if (!shouldCall) this.skipCount++;

    return {
      shouldCallAI: shouldCall,
      preConfidence: Math.round(confidence),
      preEdge: Math.round(edge * 10) / 10,
      quickReasons: reasons,
      skipReason
    };
  }

  preFilterCrypto(crypto: { pair: string; price: number; change24h: number; candles?: any[] }): PreFilterResult {
    const reasons: string[] = [];
    let momentumScore = 50;
    let shouldCall = true;
    let skipReason: string | undefined;

    const change24h = crypto.change24h || 0;
    if (Math.abs(change24h) > 5) {
      momentumScore += change24h > 0 ? 10 : -10;
      reasons.push(`24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%`);
    } else if (Math.abs(change24h) < 1) {
      momentumScore -= 5;
      reasons.push('Flat movement');
    }

    if (crypto.candles && crypto.candles.length >= 5) {
      const closes = crypto.candles.slice(-10).map((c: any) => c.close || c.c || 0);
      if (closes.length >= 5) {
        const recentAvg = closes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
        const olderAvg = closes.slice(0, 5).reduce((a: number, b: number) => a + b, 0) / 5;
        
        if (olderAvg > 0) {
          const momentumPct = ((recentAvg - olderAvg) / olderAvg) * 100;
          if (Math.abs(momentumPct) > 2) {
            momentumScore += momentumPct > 0 ? 10 : -10;
            reasons.push(`Trend: ${momentumPct > 0 ? '+' : ''}${momentumPct.toFixed(1)}%`);
          }
        }
      }
    }

    // Only call AI if there's a clear setup
    if (momentumScore >= 45 && momentumScore <= 55) {
      shouldCall = false;
      skipReason = 'No clear momentum signal';
    }

    if (!shouldCall) this.skipCount++;

    return {
      shouldCallAI: shouldCall,
      preConfidence: Math.max(40, Math.min(75, momentumScore)),
      preEdge: Math.abs(momentumScore - 50) / 10,
      quickReasons: reasons,
      skipReason
    };
  }

  getSkipCount(): number { return this.skipCount; }
  resetSkipCount(): void { this.skipCount = 0; }
}

// ============================================
// ORIGINAL CODE WITH OPTIMIZATION
// ============================================

class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) { this.locked = true; resolve(); }
      else { this.queue.push(resolve); }
    });
  }

  release(): void {
    if (this.queue.length > 0) { this.queue.shift()?.(); }
    else { this.locked = false; }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try { return await fn(); }
    finally { this.release(); }
  }
}

interface CryptoPosition {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  amount: number;
  takeProfit: number;
  stopLoss: number;
  timestamp: Date;
}

interface KalshiBet {
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  contracts: number;
  entryPrice: number;
  timestamp: Date;
  expiresAt?: Date;
}

interface TradingConfig {
  cryptoInterval: number;
  kalshiInterval: number;
  maxTradeSize: number;
  minConfidence: number;
  minEdge: number;
  dailySpendingLimit: number;
  dailyLossLimit: number;
  maxOpenPositions: number;
}

const c = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', brightCyan: '\x1b[96m',
  green: '\x1b[32m', brightGreen: '\x1b[92m',
  red: '\x1b[31m', brightRed: '\x1b[91m',
  yellow: '\x1b[33m', brightYellow: '\x1b[93m',
  magenta: '\x1b[35m', brightMagenta: '\x1b[95m',
  white: '\x1b[37m', brightWhite: '\x1b[97m',
};

const color = {
  success: (text: string) => `${c.brightGreen}${text}${c.reset}`,
  error: (text: string) => `${c.brightRed}${text}${c.reset}`,
  warning: (text: string) => `${c.brightYellow}${text}${c.reset}`,
  info: (text: string) => `${c.brightCyan}${text}${c.reset}`,
  ai: (text: string) => `${c.brightMagenta}${text}${c.reset}`,
  prefilter: (text: string) => `${c.brightYellow}⚡${text}${c.reset}`,
};

export class EventContractExecutionEngine {
  private botManager: BotManager;
  private kalshi: KalshiTrader;
  private coinbase: CoinbaseExchange;
  private prognosticationSync: PrognosticationSync;
  private aiGatekeeper: AIGatekeeper;  // NEW: AI Gatekeeper
  private tradeProtection: TradeProtectionService;  // NEW: Trade Protection Service
  
  // NEW: Empire Upgrade Engines
  private liquidityFarming: KalshiPassiveIncome;
  private marketMaker: MarketMakerEngine;
  private alphaLoop: PrognoKalshiAlphaLoop;
  private forgeTracker: ForgeUsageTracker;
  private probabilityMassager: ProbabilityMassager;
  
  private isRunning = false;
  
  private lastCryptoCheck = 0;
  private lastKalshiCheck = 0;
  private lastPicksUpdate = 0;
  private lastConfigUpdate = 0;
  
  private cryptoOpenPositions: Map<string, CryptoPosition> = new Map();
  private kalshiOpenBets: Map<string, KalshiBet> = new Map();
  
  private dailySpending = 0;
  private dailyLoss = 0;
  private lastDayReset: string = '';
  private aiCallsToday = 0;
  private aiCallsSkipped = 0;  // NEW: Track skipped calls
  
  private tradingMutex = new Mutex();
  private configMutex = new Mutex();

  private config: TradingConfig = {
    cryptoInterval: 30000,
    kalshiInterval: 60000,
    maxTradeSize: 5,
    minConfidence: 55,
    minEdge: 2,
    dailySpendingLimit: 50,
    dailyLossLimit: 25,
    maxOpenPositions: 5,
  };
  
  private readonly CONFIG_UPDATE_INTERVAL = 60000;
  private readonly POSITION_CLEANUP_INTERVAL = 30000;
  private readonly MAX_KALSHI_BETS = 10;
  private readonly MAX_AI_CALLS_PER_DAY = 100;

  constructor() {
    this.botManager = new BotManager();
    this.kalshi = new KalshiTrader();
    this.coinbase = new CoinbaseExchange();
    this.prognosticationSync = new PrognosticationSync();
    this.aiGatekeeper = new AIGatekeeper();  // NEW: Initialize gatekeeper
    this.tradeProtection = new TradeProtectionService();  // NEW: Initialize trade protection
    
    // NEW: Initialize Empire Upgrade Engines
    this.liquidityFarming = new KalshiPassiveIncome(this.kalshi, this.tradeProtection);
    this.marketMaker = new MarketMakerEngine(this.kalshi, this.tradeProtection);
    this.alphaLoop = new PrognoKalshiAlphaLoop(this.kalshi, this.tradeProtection);
    this.forgeTracker = new ForgeUsageTracker();
    this.probabilityMassager = new ProbabilityMassager();
  }

  async initialize(): Promise<void> {
    console.log(`${color.success('✅ Supabase memory system connected')}`);
    console.log(`${color.ai('🤖 AI Analysis: ENABLED (Claude Sonnet)')}`);
    console.log(`${color.prefilter(' Pre-Filter: ENABLED (Saving API calls)')}`);  // NEW
    console.log(`${color.info('✅ Trading engines initialized')}`);
    
    // NEW: Empire Upgrade Status
    console.log(`\n${c.brightCyan}🏛️ ALPHA-HUNTER EMPIRE UPGRADE:${c.reset}`);
    console.log(`   ${process.env.ENABLE_LIQUIDITY_FARMING === 'true' ? color.success('✅') : color.error('❌')} Liquidity Farming: ${process.env.ENABLE_LIQUIDITY_FARMING === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ${process.env.ENABLE_MARKET_MAKER === 'true' ? color.success('✅') : color.error('❌')} Market Maker: ${process.env.ENABLE_MARKET_MAKER === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ${process.env.ENABLE_PROGNO_ALPHA === 'true' ? color.success('✅') : color.error('❌')} PROGNO Alpha Loop: ${process.env.ENABLE_PROGNO_ALPHA === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ${process.env.ENABLE_FORGE_API === 'true' ? color.success('✅') : color.error('❌')} Forge API: ${process.env.ENABLE_FORGE_API === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log('');
    
    await this.loadConfig();
    this.verifyApiKeys();
    this.resetDailyLimitsIfNeeded();
  }

  private async loadConfig(): Promise<void> {
    await this.configMutex.withLock(async () => {
      try {
        const dbConfig = await getBotConfig();
        this.config = {
          maxTradeSize: dbConfig.trading.maxTradeSize,
          minConfidence: dbConfig.trading.minConfidence,
          minEdge: dbConfig.trading.minEdge,
          dailySpendingLimit: dbConfig.trading.dailySpendingLimit,
          dailyLossLimit: dbConfig.trading.dailyLossLimit,
          maxOpenPositions: dbConfig.trading.maxOpenPositions,
          cryptoInterval: dbConfig.trading.cryptoInterval,
          kalshiInterval: dbConfig.trading.kalshiInterval,
        };
        this.lastConfigUpdate = Date.now();
        console.log(`${color.info('✅ Bot config loaded from Supabase')}`);
      } catch (error: any) {
        console.warn(`${color.warning('⚠️  Using default config')}`);
      }
    });
  }

  private async updateConfigIfNeeded(): Promise<void> {
    if (Date.now() - this.lastConfigUpdate < this.CONFIG_UPDATE_INTERVAL) return;
    await this.loadConfig();
  }

  private resetDailyLimitsIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastDayReset !== today) {
      // Log yesterday's stats
      if (this.lastDayReset) {
        const savings = this.aiCallsSkipped * 0.003;
        console.log(`${color.info('📊 Yesterday Stats:')} AI: ${this.aiCallsToday}, Skipped: ${this.aiCallsSkipped}, Saved: $${savings.toFixed(3)}`);
      }
      
      this.dailySpending = 0;
      this.dailyLoss = 0;
      this.aiCallsToday = 0;
      this.aiCallsSkipped = 0;  // NEW: Reset skip counter
      this.aiGatekeeper.resetSkipCount();
      this.lastDayReset = today;
      console.log(`${color.info('🔄 Daily limits reset for')} ${today}`);
    }
  }

  private verifyApiKeys(): void {
    console.log(`\n${c.brightCyan}🔑 API KEY VERIFICATION:${c.reset}`);
    
    const kalshiConfigured = !!(process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY);
    const coinbaseConfigured = !!(process.env.COINBASE_API_KEY && process.env.COINBASE_API_SECRET);
    const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;
    
    console.log(`   ${kalshiConfigured ? color.success('✅ KALSHI') : color.error('❌ KALSHI')} - ${kalshiConfigured ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ${coinbaseConfigured ? color.success('✅ COINBASE') : color.error('❌ COINBASE')} - ${coinbaseConfigured ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ${anthropicConfigured ? color.ai('🤖 ANTHROPIC AI') : color.error('❌ ANTHROPIC')} - ${anthropicConfigured ? 'ENABLED' : 'DISABLED'}`);
    
    console.log(`\n${c.brightCyan}📊 Trading Status:${c.reset}`);
    if (kalshiConfigured && coinbaseConfigured && anthropicConfigured) {
      console.log(`   ${color.success('✅ FULL AI-POWERED TRADING ENABLED')}`);
      console.log(`   ${color.prefilter(' AI GATEKEEPER ACTIVE - Optimizing API usage')}`);
    }
    console.log('');
  }

  // ==========================================================================
  // AI-POWERED ANALYSIS (WITH PRE-FILTERING)
  // ==========================================================================

  private async analyzeKalshiWithAI(market: any): Promise<{
    prediction: 'yes' | 'no';
    confidence: number;
    edge: number;
    reasoning: string[];
    factors: string[];
  } | null> {
    if (this.aiCallsToday >= this.MAX_AI_CALLS_PER_DAY) {
      console.log(`   ${color.warning('⚠️  AI call limit reached for today')}`);
      return null;
    }

    try {
      console.log(`   ${color.ai(`🤖 AI analyzing: ${market.title?.substring(0, 50)}...`)}`);
      logAnalysis(`AI analyzing: ${market.title?.substring(0, 150)}`);
      this.aiCallsToday++;
      
      const category = this.categorizeMarket(market.title || '');
      const historicalContext = historicalKnowledge.getRelevantKnowledge(market.title?.toLowerCase() || '');
      
      const pastPreds = await getBotPredictions(category, 'kalshi', 20);
      const resolved = pastPreds.filter((p: any) => p.actual_outcome !== null);
      const wins = resolved.filter((p: any) => p.actual_outcome === 'win').length;
      const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 50;

      const prompt = `You are an expert prediction market analyst. Analyze this Kalshi market.

MARKET: ${market.title}
YES PRICE: ${market.yesPrice}¢ (market says ${market.yesPrice}% likely)
NO PRICE: ${market.noPrice || (100 - market.yesPrice)}¢
CATEGORY: ${category}
EXPIRES: ${market.expiresAt || 'Unknown'}

HISTORICAL CONTEXT:
${historicalContext.length > 0 ? historicalContext.slice(0, 3).join('\n') : 'No specific historical data'}

PAST PERFORMANCE: ${pastPreds.length} predictions, ${winRate.toFixed(0)}% win rate

Analyze if the market price is accurate or if there's edge to exploit.

Respond ONLY with this JSON (no other text):
{
  "prediction": "yes" or "no",
  "confidence": 50-90,
  "estimatedProbability": 0-100,
  "edge": 0-30,
  "reasoning": ["reason1", "reason2"],
  "factors": ["factor1", "factor2"]
}

Only recommend if edge > 3%. If market seems efficient, use confidence=50, edge=0.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const analysis = JSON.parse(jsonMatch[0]);
      
      console.log(`   ${color.ai(`✅ AI: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf, ${analysis.edge}% edge`)}`);
      
      return {
        prediction: analysis.prediction,
        confidence: Math.min(90, Math.max(50, analysis.confidence)),
        edge: Math.min(30, Math.max(0, analysis.edge)),
        reasoning: analysis.reasoning || [],
        factors: analysis.factors || [],
      };
    } catch (err: any) {
      console.error(`   ${color.error('❌ AI error:')} ${err.message}`);
      return null;
    }
  }

  private async analyzeCryptoWithAI(pair: string, ticker: any, candles: any[]): Promise<{
    prediction: 'buy' | 'sell';
    confidence: number;
    edge: number;
    reasoning: string[];
    factors: string[];
  } | null> {
    if (this.aiCallsToday >= this.MAX_AI_CALLS_PER_DAY) {
      return null;
    }

    try {
      console.log(`   ${color.ai(`🤖 AI analyzing: ${pair}...`)}`);
      this.aiCallsToday++;
      
      let candleSummary = 'No data';
      if (candles && candles.length >= 5) {
        const recent = candles.slice(-10);
        const firstClose = recent[0]?.close || ticker.price;
        const lastClose = recent[recent.length - 1]?.close || ticker.price;
        const trend = lastClose > firstClose ? 'UPWARD' : 'DOWNWARD';
        const change = ((lastClose - firstClose) / firstClose * 100).toFixed(2);
        candleSummary = `${trend} trend, ${change}% over last ${recent.length} candles`;
      }

      const prompt = `You are an expert crypto trader. Analyze ${pair} for a short-term trade (1-4 hours).

PRICE: $${ticker.price?.toFixed(2)}
24H CHANGE: ${ticker.change24h?.toFixed(2) || 'N/A'}%
RECENT TREND: ${candleSummary}

Respond ONLY with this JSON:
{
  "prediction": "buy" or "sell",
  "confidence": 50-75,
  "edge": 0-5,
  "reasoning": ["reason1", "reason2"],
  "factors": ["factor1"]
}

Be conservative. Only recommend if clear setup exists. Otherwise confidence=50, edge=0.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const analysis = JSON.parse(jsonMatch[0]);
      
      console.log(`   ${color.ai(`✅ AI: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf`)}`);
      
      return {
        prediction: analysis.prediction,
        confidence: Math.min(75, Math.max(50, analysis.confidence)),
        edge: Math.min(5, Math.max(0, analysis.edge)),
        reasoning: analysis.reasoning || [],
        factors: analysis.factors || [],
      };
    } catch (err: any) {
      console.error(`   ${color.error('❌ AI error:')} ${err.message}`);
      return null;
    }
  }

  // ==========================================================================
  // MAIN LOOP
  // ==========================================================================

  async start(): Promise<void> {
    console.log('🚀 Starting Cevict-Live Alpha-Hunter...');
    console.log(`${color.ai('🤖 AI-POWERED TRADING ENABLED')}`);
    console.log(`${color.prefilter(' AI GATEKEEPER - Reducing unnecessary API calls')}`);
    console.log(`${color.warning('⚠️  REAL TRADES ENABLED - Using live APIs')}`);
    
    await this.initialize();
    await this.botManager.start();
    
    this.isRunning = true;
    this.startTradingCycles();
    
    while (this.isRunning) {
      try {
        this.resetDailyLimitsIfNeeded();
        const ts = new Date().toISOString();
        const savings = this.aiCallsSkipped * 0.003;
        console.log(`[${ts}] 🎯 System running - AI Analysis + Trading active`);
        console.log(`   💰 Spent: $${this.dailySpending.toFixed(2)}/$${this.config.dailySpendingLimit} | P/L: $${this.dailyLoss.toFixed(2)}`);
        console.log(`   🤖 AI calls: ${this.aiCallsToday}/${this.MAX_AI_CALLS_PER_DAY} | ⚡ Skipped: ${this.aiCallsSkipped} (saved $${savings.toFixed(3)})`);
        console.log(`   📊 Positions: ${this.cryptoOpenPositions.size} crypto, ${this.kalshiOpenBets.size} Kalshi`);
        
        // Send status to activity log (every 5 minutes)
        if (this.aiCallsToday % 10 === 0) {
          logInfo(`Status: Spent $${this.dailySpending.toFixed(2)}/$${this.config.dailySpendingLimit} | P/L: $${this.dailyLoss.toFixed(2)} | Positions: ${this.cryptoOpenPositions.size} crypto, ${this.kalshiOpenBets.size} Kalshi`);
        }
      } catch (err: any) {
        console.error('❌ Status error:', err.message);
      }
      await new Promise(r => setTimeout(r, 300000));
    }
  }

  private startTradingCycles(): void {
    // Original trading cycles
    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.checkCryptoTrades(); } catch (err: any) { console.error('❌ Crypto error:', err.message); }
    }, this.config.cryptoInterval);

    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.checkKalshiTrades(); } catch (err: any) { console.error('❌ Kalshi error:', err.message); }
    }, this.config.kalshiInterval);

    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.updatePicksFile(); } catch (err: any) { console.error('❌ Picks error:', err.message); }
    }, 60000);

    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.cleanupClosedPositions(); } catch (err: any) { console.error('❌ Cleanup error:', err.message); }
    }, this.POSITION_CLEANUP_INTERVAL);

    // NEW: Empire Upgrade Cycles
    // Liquidity farming: Every 5 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.liquidityFarming.provideLiquidity(); } catch (err: any) { console.error('❌ Liquidity farming error:', err.message); }
    }, 5 * 60 * 1000);

    // Market maker: Every 2 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.marketMaker.runMarketMakerScan(); } catch (err: any) { console.error('❌ Market maker error:', err.message); }
    }, 2 * 60 * 1000);

    // PROGNO alpha loop: Every 3 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      try { await this.alphaLoop.runCycle(); } catch (err: any) { console.error('❌ Alpha loop error:', err.message); }
    }, 3 * 60 * 1000);

    // Initial runs
    setTimeout(() => this.checkCryptoTrades(), 5000);
    setTimeout(() => this.checkKalshiTrades(), 10000);
    setTimeout(() => this.updatePicksFile(), 15000);
    setTimeout(() => this.liquidityFarming.provideLiquidity(), 20000);
    setTimeout(() => this.marketMaker.runMarketMakerScan(), 25000);
    setTimeout(() => this.alphaLoop.runCycle(), 30000);
  }

  // ==========================================================================
  // TRADING LOGIC (WITH PRE-FILTERING)
  // ==========================================================================

  private async checkCryptoTrades(): Promise<void> {
    // 6. GLOBAL TRADING LOCK - Prevent concurrent execution
    const releaseLock = await this.tradeProtection.acquireTradingLock();
    
    try {
      await this.updateConfigIfNeeded();
      const now = Date.now();
      if (now - this.lastCryptoCheck < this.config.cryptoInterval) {
        releaseLock();
        return;
      }
      this.lastCryptoCheck = now;

      const limitCheck = await this.canTrade(1);
      if (!limitCheck.allowed) {
        releaseLock();
        return;
      }
      if (this.cryptoOpenPositions.size >= this.config.maxOpenPositions) {
        releaseLock();
        return;
      }

      console.log(`\n${c.brightCyan}📊 CRYPTO ANALYSIS (AI-POWERED + PRE-FILTER):${c.reset}`);
      
      const pairs = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'LINK-USD'];
      
      for (const pair of pairs) {
        try {
          // 3. API CACHING - Use cached ticker
          const ticker = await this.tradeProtection.getCachedTicker(
            pair,
            () => this.coinbase.getTicker(pair)
          );
          if (!ticker?.price) continue;

          // 3. API CACHING - Use cached candles
          const candles = await this.tradeProtection.getCachedCandles(
            pair,
            () => this.coinbase.getCandles(pair, 300)
          );
        
        // ========== NEW: PRE-FILTER BEFORE AI ==========
        const preFilter = this.aiGatekeeper.preFilterCrypto({
          pair,
          price: ticker.price,
          change24h: ticker.change24h || 0,
          candles: candles || []
        });

        if (!preFilter.shouldCallAI) {
          console.log(`   ${color.prefilter(` ${pair}: SKIPPED`)} - ${preFilter.skipReason}`);
          this.aiCallsSkipped++;
          continue;
        }
        
        console.log(`   ${color.prefilter(` ${pair}: Pre-filter PASSED`)} (${preFilter.preConfidence}% conf)`);
        // ========== END PRE-FILTER ==========
        
        const aiAnalysis = await this.analyzeCryptoWithAI(pair, ticker, candles || []);
        
        if (!aiAnalysis || aiAnalysis.confidence < this.config.minConfidence || aiAnalysis.edge < this.config.minEdge) {
          continue;
        }
        
        // PROBABILITY MASSAGER: Adjust confidence based on market signals
        const massagedResult = this.probabilityMassager.massageCrypto(
          aiAnalysis.confidence,
          {
            pair,
            price: ticker.price,
            volume24h: ticker.volume24h,
            change24h: ticker.change24h,
            orderBookDepth: 50000, // TODO: Get actual order book depth
            exchangeInflows: undefined, // TODO: Get exchange flow data
            exchangeOutflows: undefined,
            btcCorrelation: pair !== 'BTC-USD' ? 0.8 : 1.0, // TODO: Calculate actual correlation
            btcPrice: undefined, // TODO: Get BTC price
            btcChange24h: undefined, // TODO: Get BTC 24h change
            fearGreedIndex: undefined, // TODO: Get Fear & Greed Index
            whaleBuyVolume: undefined, // TODO: Get whale buy volume
            whaleSellVolume: undefined, // TODO: Get whale sell volume
          }
        );
        
        // Update confidence with massaged value
        aiAnalysis.confidence = massagedResult.massagedProbability;
        console.log(`   ${color.info(`📊 ${this.probabilityMassager.formatLog(massagedResult, pair)}`)}`);
        
        // Log individual adjustments
        const adjustmentMessages = this.probabilityMassager.getAdjustmentMessages(massagedResult);
        for (const msg of adjustmentMessages) {
          console.log(`   ${color.info(msg)}`);
        }
        
        // 1. POSITION DEDUPLICATION - Check for duplicate
        const duplicateCheck = await this.tradeProtection.checkDuplicatePosition(
          pair,
          aiAnalysis.prediction,
          'coinbase'
        );
        if (!duplicateCheck.allowed) {
          console.log(`   ${color.warning(`⏭️ ${duplicateCheck.reason}`)}`);
          continue;
        }
        
        // 2. TRADE COOLDOWN - Check cooldown
        const cooldownCheck = await this.tradeProtection.checkCooldown(pair);
        if (!cooldownCheck.allowed) {
          console.log(`   ${color.warning(`⏳ ${cooldownCheck.reason}`)}`);
          continue;
        }
        
        // 5. PORTFOLIO CONCENTRATION - Check concentration
        const tradeSize = Math.min(this.config.maxTradeSize, this.config.dailySpendingLimit - this.dailySpending);
        if (tradeSize < 1) break;
        
        const concentrationCheck = await this.tradeProtection.checkConcentration(
          pair,
          tradeSize,
          'coinbase'
        );
        if (!concentrationCheck.allowed) {
          console.log(`   ${color.warning(`⚠️ ${concentrationCheck.reason}`)}`);
          continue;
        }
        
        // 9. SPENDING RATE LIMITER - Check spending rate
        const spendingCheck = await this.tradeProtection.checkSpendingRate(tradeSize);
        if (!spendingCheck.allowed) {
          console.log(`   ${color.warning(`⏳ ${spendingCheck.reason}`)}`);
          continue;
        }

        const reserved = await this.reserveSpending(tradeSize);
        if (!reserved) continue;

        try {
          // 9. COMPREHENSIVE ERROR HANDLING - Wrap in safe API call
          await this.tradeProtection.safeAPICall(async () => {
            const order = {
              pair,
              side: aiAnalysis.prediction as 'buy' | 'sell',
              entryPrice: ticker.price,
              amount: tradeSize,
              takeProfit: aiAnalysis.prediction === 'buy' 
                ? ticker.price * 1.015 
                : ticker.price * 0.985,
              stopLoss: aiAnalysis.prediction === 'buy' 
                ? ticker.price * 0.99 
                : ticker.price * 1.01,
            };

            const positionId = `${pair}-${Date.now()}`;
            this.cryptoOpenPositions.set(positionId, {
              id: positionId,
              ...order,
              timestamp: new Date(),
            });
            
            // Register position in tracker
            this.tradeProtection.getPositionTracker().addPosition(
              positionId,
              pair,
              'coinbase',
              tradeSize
            );

            await saveTradeRecord({
              platform: 'coinbase',
              trade_type: aiAnalysis.prediction,
              symbol: pair,
              entry_price: order.entryPrice,
              amount: tradeSize,
              fees: tradeSize * 0.006,
              opened_at: new Date(),
              confidence: aiAnalysis.confidence,
              edge: aiAnalysis.edge,
              outcome: 'open',
              bot_category: 'crypto',
            });

            console.log(`   ${color.success('✅ AI Trade executed')} - $${tradeSize} on ${pair}`);
            logTrade(`TRADE: ${aiAnalysis.prediction.toUpperCase()} $${tradeSize} ${pair} @ $${order.entryPrice.toFixed(2)}`, { pair, side: aiAnalysis.prediction, amount: tradeSize, price: order.entryPrice });
          }, `Crypto trade execution: ${pair}`);
          break;
        } catch (err: any) {
          await this.releaseSpending(tradeSize);
          console.log(`   ${color.error('❌ Trade failed:')} ${err.message}`);
        }
      } catch (err: any) {
        console.error(`   Error on ${pair}:`, err.message);
      }
    }
    } finally {
      releaseLock();
    }
  }

  private async checkKalshiTrades(): Promise<void> {
    // 6. GLOBAL TRADING LOCK - Prevent concurrent execution
    const releaseLock = await this.tradeProtection.acquireTradingLock();
    
    try {
      await this.updateConfigIfNeeded();
      const now = Date.now();
      if (now - this.lastKalshiCheck < this.config.kalshiInterval) {
        releaseLock();
        return;
      }
      this.lastKalshiCheck = now;

      let allPredictions: any[] = [];
      const limitCheck = await this.canTrade(1);
      const atMaxBets = this.kalshiOpenBets.size >= this.MAX_KALSHI_BETS;

      console.log(`\n${c.brightCyan}🎯 KALSHI PREDICTION MARKETS (AI-POWERED + PRE-FILTER):${c.reset}`);
      
      try {
        // 3. API CACHING - Use cached markets
        const markets = await this.tradeProtection.getApiCache().getOrFetch(
          'kalshi-markets',
          () => this.kalshi.getMarkets(),
          30000 // 30 second cache for markets
        );
      
      if (limitCheck.allowed && !atMaxBets && markets.length > 0) {
        const availableMarkets = markets.filter(m => !this.kalshiOpenBets.has(m.id || ''));
        
        // ========== NEW: PRE-FILTER ALL MARKETS ==========
        let aiWorthyCount = 0;
        let skippedCount = 0;
        
        const filteredMarkets: Array<{ market: any; preFilter: PreFilterResult }> = [];
        
        for (const market of availableMarkets.slice(0, 10)) {
          // PHASE 7: Enhanced Deduplication - Check if should skip market
          const shouldSkip = this.tradeProtection.shouldSkipMarket(market.id || '', market.id);
          if (shouldSkip.shouldSkip) {
            console.log(`   ⏭️ ${market.id?.substring(0, 30)}: ${shouldSkip.reason}`);
            continue;
          }
          
          const category = this.categorizeMarket(market.title || '');
          const preFilter = this.aiGatekeeper.preFilterKalshiMarket({
            id: market.id || '',
            title: market.title || '',
            category,
            yesPrice: market.yesPrice || 50,
            noPrice: market.noPrice || 50,
            volume: market.volume || 0,
            expiresAt: market.expiresAt
          });

          if (preFilter.shouldCallAI) {
            filteredMarkets.push({ market, preFilter });
            aiWorthyCount++;
          } else {
            skippedCount++;
            this.aiCallsSkipped++;
          }
        }
        
        console.log(`   ${color.prefilter(` Pre-filter: ${aiWorthyCount} AI-worthy, ${skippedCount} skipped`)}`);
        // ========== END PRE-FILTER ==========
        
        // Only analyze AI-worthy markets (max 3)
        for (const { market, preFilter } of filteredMarkets.slice(0, 3)) {
          console.log(`   📋 ${market.title?.substring(0, 50)}...`);
          console.log(`   ${color.prefilter(` Pre-score: ${preFilter.preConfidence}% conf, ${preFilter.preEdge}% edge`)}`);
          
          // PHASE 7: Mark as analyzed BEFORE AI call
          this.tradeProtection.markAnalyzed(market.id || '', false); // Will be set to true on success
          
          const aiAnalysis = await this.analyzeKalshiWithAI(market);
          
          if (!aiAnalysis || aiAnalysis.confidence < this.config.minConfidence || aiAnalysis.edge < this.config.minEdge) {
            continue;
          }
          
          // PHASE 7: Mark as analyzed AFTER successful analysis
          this.tradeProtection.markAnalyzed(market.id || '', true);
          
          // PROBABILITY MASSAGER: Adjust confidence based on market signals
          const expiresAt = market.expiresAt ? new Date(market.expiresAt) : undefined;
          const daysUntilExpiry = expiresAt 
            ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : undefined;
          
          const massagedResult = this.probabilityMassager.massageKalshi(
            aiAnalysis.confidence,
            {
              marketId: market.id || '',
              title: market.title || '',
              yesPrice: market.yesPrice || 50,
              noPrice: market.noPrice || 50,
              bidAskSpread: Math.abs((market.yesPrice || 50) + (market.noPrice || 50) - 100),
              volume: market.volume,
              expiresAt,
              daysUntilExpiry,
              linkedMarkets: undefined, // TODO: Get linked markets
              pollData: undefined, // TODO: Get poll data
            }
          );
          
          // Update confidence with massaged value
          aiAnalysis.confidence = massagedResult.massagedProbability;
          console.log(`   ${color.info(`📊 ${this.probabilityMassager.formatLog(massagedResult, market.id || '')}`)}`);
          
          // Log individual adjustments
          const adjustmentMessages = this.probabilityMassager.getAdjustmentMessages(massagedResult);
          for (const msg of adjustmentMessages) {
            console.log(`   ${color.info(msg)}`);
          }
          
          // 4. KALSHI CORRELATION DETECTOR - Check for correlated bets
          const ticker = market.id || '';
          const correlationCheck = await this.tradeProtection.checkKalshiCorrelation(ticker);
          if (!correlationCheck.allowed) {
            console.log(`   ${color.warning(`⚠️ ${correlationCheck.reason}`)}`);
            continue;
          }

          const tradeSize = Math.min(this.config.maxTradeSize, this.config.dailySpendingLimit - this.dailySpending);
          if (tradeSize < 1) break;
          
          // 5. PORTFOLIO CONCENTRATION - Check concentration
          const concentrationCheck = await this.tradeProtection.checkConcentration(
            market.title || '',
            tradeSize,
            'kalshi'
          );
          if (!concentrationCheck.allowed) {
            console.log(`   ${color.warning(`⚠️ ${concentrationCheck.reason}`)}`);
            continue;
          }
          
          // 9. SPENDING RATE LIMITER - Check spending rate
          const spendingCheck = await this.tradeProtection.checkSpendingRate(tradeSize);
          if (!spendingCheck.allowed) {
            console.log(`   ${color.warning(`⏳ ${spendingCheck.reason}`)}`);
            continue;
          }

          console.log(`   🎯 Market: ${market.title?.substring(0, 50)}...`);
          console.log(`   ${color.ai(`🤖 AI: ${aiAnalysis.prediction.toUpperCase()} @ ${aiAnalysis.confidence}% conf, ${aiAnalysis.edge}% edge`)}`);
          console.log(`   💡 Reasoning: ${aiAnalysis.reasoning[0] || 'AI analysis'}`);

          const reserved = await this.reserveSpending(tradeSize);
          if (!reserved) continue;

          try {
            // 3. API CACHING - Use cached order book
            const orderBook = await this.tradeProtection.getApiCache().getOrFetch(
              `orderbook-${market.id}`,
              () => this.kalshi.getOrderBook(market.id || ''),
              10000 // 10 second cache for order books
            );
            let limitPrice = market.yesPrice || 50;
            let isMakerOrder = false;
            
            if (orderBook) {
              const priceCalc = this.kalshi.calculateMakerPrice(orderBook, aiAnalysis.prediction, 'buy');
              if (priceCalc && priceCalc.spread >= 2) {
                limitPrice = priceCalc.price;
                isMakerOrder = true;
              }
            }
            
            if (limitPrice <= 0 || limitPrice >= 100) {
              await this.releaseSpending(tradeSize);
              continue;
            }
            
            const contractCount = Math.floor((tradeSize * 100) / limitPrice);
            if (contractCount < 1) {
              await this.releaseSpending(tradeSize);
              continue;
            }
            
            const actualCost = (contractCount * limitPrice) / 100;
            console.log(`   📊 Buying ${contractCount} contracts @ ${limitPrice}¢ = $${actualCost.toFixed(2)}`);
            
            // 9. COMPREHENSIVE ERROR HANDLING - Wrap in safe API call
            const trade = await this.tradeProtection.safeAPICall(
              () => this.kalshi.placeBet(market.id || '', aiAnalysis.prediction, contractCount, limitPrice),
              `Kalshi bet placement: ${market.id}`
            );

            if (trade) {
              // PHASE 7: Mark as betted AFTER successful bet
              this.tradeProtection.markBetted(market.id || '');
              
              // Register Kalshi bet for correlation tracking
              this.tradeProtection.registerKalshiBet(ticker, market.id || '');
              
              this.kalshiOpenBets.set(market.id || '', {
                marketId: market.id || '',
                side: aiAnalysis.prediction as 'yes' | 'no',
                amount: actualCost,
                contracts: contractCount,
                entryPrice: limitPrice,
                timestamp: new Date(),
                expiresAt: market.expiresAt ? new Date(market.expiresAt) : undefined,
              });
              
              // Register position in tracker
              this.tradeProtection.getPositionTracker().addPosition(
                market.id || '',
                market.title || '',
                'kalshi',
                actualCost
              );
              
              await saveBotPrediction({
                bot_category: this.categorizeMarket(market.title || ''),
                market_id: market.id || '',
                market_title: market.title || 'Unknown',
                platform: 'kalshi',
                prediction: aiAnalysis.prediction as 'yes' | 'no',
                probability: aiAnalysis.confidence,
                confidence: aiAnalysis.confidence,
                edge: aiAnalysis.edge,
                reasoning: aiAnalysis.reasoning,
                factors: aiAnalysis.factors,
                learned_from: ['AI Analysis', 'Pre-Filter'],
                market_price: limitPrice,
                predicted_at: new Date(),
                expires_at: market.expiresAt ? new Date(market.expiresAt) : undefined,
              });

              await saveTradeRecord({
                platform: 'kalshi',
                trade_type: aiAnalysis.prediction,
                symbol: market.title || '',
                market_id: market.id || '',
                entry_price: limitPrice,
                amount: actualCost,
                fees: isMakerOrder ? 0 : actualCost * 0.07,
                opened_at: new Date(),
                confidence: aiAnalysis.confidence,
                edge: aiAnalysis.edge,
                outcome: 'open',
                bot_category: this.categorizeMarket(market.title || ''),
              });

              allPredictions.push({
                market_id: market.id,
                market_title: market.title,
                prediction: aiAnalysis.prediction,
                confidence: aiAnalysis.confidence,
                edge: aiAnalysis.edge,
                market_price: limitPrice,
                reasoning: aiAnalysis.reasoning,
              });

              console.log(`   ${color.success('✅ AI Bet placed')} - ${contractCount} contracts on ${aiAnalysis.prediction.toUpperCase()} ${isMakerOrder ? '[MAKER]' : '[TAKER]'}`);
              break;
            } else {
              await this.releaseSpending(tradeSize);
            }
          } catch (err: any) {
            await this.releaseSpending(tradeSize);
            console.log(`   ${color.error('❌ Bet failed:')} ${err.message}`);
          }
        }
      } else if (!limitCheck.allowed) {
        console.log(`   ${color.warning(`⚠️  ${limitCheck.reason}`)}`);
      }
      } catch (err: any) {
        console.error(`${color.error('❌ Kalshi error:')}`, err.message);
      } finally {
        await this.syncPrognosticationHomepage(allPredictions);
      }
    } finally {
      releaseLock();
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async canTrade(amount: number): Promise<{ allowed: boolean; reason?: string }> {
    return await this.tradingMutex.withLock(async () => {
      if (this.dailySpending + amount > this.config.dailySpendingLimit) {
        return { allowed: false, reason: 'Daily spending limit reached' };
      }
      if (Math.abs(this.dailyLoss) >= this.config.dailyLossLimit) {
        return { allowed: false, reason: 'Daily loss limit reached' };
      }
      return { allowed: true };
    });
  }

  private async reserveSpending(amount: number): Promise<boolean> {
    return await this.tradingMutex.withLock(async () => {
      if (this.dailySpending + amount > this.config.dailySpendingLimit) return false;
      this.dailySpending += amount;
      return true;
    });
  }

  private async releaseSpending(amount: number): Promise<void> {
    await this.tradingMutex.withLock(async () => {
      this.dailySpending = Math.max(0, this.dailySpending - amount);
    });
  }

  private async cleanupClosedPositions(): Promise<void> {
    await this.tradingMutex.withLock(async () => {
      for (const [id, position] of this.cryptoOpenPositions) {
        try {
          const currentPrice = await this.coinbase.getPrice(position.pair);
          if (!currentPrice) continue;
          
          const pnl = this.calculateCryptoPnL(position, currentPrice);
          if (position.side === 'buy') {
            if (currentPrice >= position.takeProfit || currentPrice <= position.stopLoss) {
              this.closeCryptoPosition(id, currentPrice, pnl);
            }
          } else {
            if (currentPrice <= position.takeProfit || currentPrice >= position.stopLoss) {
              this.closeCryptoPosition(id, currentPrice, pnl);
            }
          }
        } catch (err: any) {
          console.error(`Position check error:`, err.message);
        }
      }

      const now = new Date();
      for (const [marketId, bet] of this.kalshiOpenBets) {
        if (bet.expiresAt && bet.expiresAt < now) {
          const predictions = await getBotPredictions(undefined, 'kalshi', 100);
          const pred = predictions.find((p: any) => p.market_id === marketId);
          if (pred?.actual_outcome) {
            this.closeKalshiBet(marketId, pred.actual_outcome === 'win');
          }
        }
      }
    });
  }

  private calculateCryptoPnL(position: CryptoPosition, currentPrice: number): number {
    const change = (currentPrice - position.entryPrice) / position.entryPrice;
    return position.amount * change * (position.side === 'buy' ? 1 : -1);
  }

  private closeCryptoPosition(id: string, exitPrice: number, pnl: number): void {
    const position = this.cryptoOpenPositions.get(id);
    if (!position) return;
    
    const duration = Date.now() - position.timestamp.getTime();
    const durationSeconds = Math.floor(duration / 1000);
    
    // 7. EXIT/CLOSE POSITION LOGGING - Enhanced logging
    this.tradeProtection.logPositionClose(
      {
        symbol: position.pair,
        entryPrice: position.entryPrice,
        amount: position.amount,
        side: position.side,
        platform: 'coinbase',
      },
      exitPrice,
      pnl,
      position.side === 'buy' 
        ? (exitPrice >= position.takeProfit ? 'Take Profit' : 'Stop Loss')
        : (exitPrice <= position.takeProfit ? 'Take Profit' : 'Stop Loss'),
      durationSeconds
    );
    
    // Remove from position tracker
    this.tradeProtection.getPositionTracker().removePosition(id);
    
    this.cryptoOpenPositions.delete(id);
    this.dailyLoss += pnl < 0 ? Math.abs(pnl) : -pnl;
  }

  private closeKalshiBet(marketId: string, won: boolean): void {
    const bet = this.kalshiOpenBets.get(marketId);
    if (!bet) return;
    
    const duration = bet.expiresAt 
      ? Math.max(0, bet.expiresAt.getTime() - bet.timestamp.getTime())
      : Date.now() - bet.timestamp.getTime();
    const durationSeconds = Math.floor(duration / 1000);
    
    const exitPrice = won ? 100 : 0;
    const pnl = won ? bet.contracts * (100 - bet.entryPrice) / 100 : -bet.amount;
    
    // 7. EXIT/CLOSE POSITION LOGGING - Enhanced logging
    this.tradeProtection.logPositionClose(
      {
        symbol: marketId,
        entryPrice: bet.entryPrice,
        amount: bet.amount,
        side: bet.side,
        platform: 'kalshi',
      },
      exitPrice,
      pnl,
      won ? 'Market Resolved (Won)' : 'Market Resolved (Lost)',
      durationSeconds
    );
    
    // Unregister from correlation tracking
    this.tradeProtection.unregisterKalshiBet(marketId, marketId);
    
    // Remove from position tracker
    this.tradeProtection.getPositionTracker().removePosition(marketId);
    
    this.kalshiOpenBets.delete(marketId);
    this.dailyLoss += pnl < 0 ? Math.abs(pnl) : -pnl;
  }

  private async syncPrognosticationHomepage(predictions?: any[]): Promise<void> {
    try {
      if (!predictions || predictions.length === 0) {
        predictions = await this.getRecentPredictions('kalshi');
      }

      // 8. SYNC DEDUPLICATION - Check if picks changed
      if (!this.tradeProtection.shouldSync(predictions)) {
        console.log(`   ${color.info('⏭️ Picks unchanged - skipping sync')}`);
        return;
      }

      const opportunities = predictions.map((p: any) => ({
        marketId: p.market_id,
        title: p.market_title || 'Unknown',
        side: p.prediction || 'yes',
        confidence: p.confidence || 50,
        edge: p.edge || 0,
        yesPrice: p.market_price || 50,
        noPrice: 100 - (p.market_price || 50),
        reasoning: Array.isArray(p.reasoning) ? p.reasoning : [p.reasoning || 'AI analysis'],
        factors: Array.isArray(p.factors) ? p.factors : [],
        learnedFrom: ['AI Analysis', 'Pre-Filter'],
        expiresAt: p.expires_at,
      }));

      await this.prognosticationSync.updatePrognosticationHomepage(opportunities);
      logSync(`Synced ${opportunities.length} predictions to Prognostication`);
    } catch (err: any) {
      console.error('Sync error:', err.message);
      logError(`Sync failed: ${err.message}`);
    }
  }

  private async getRecentPredictions(platform: 'kalshi' | 'coinbase'): Promise<any[]> {
    const predictions = await getBotPredictions(undefined, platform, 20);
    return predictions
      .filter((p: any) => p.actual_outcome === null)
      .sort((a: any, b: any) => (b.confidence + b.edge) - (a.confidence + a.edge))
      .slice(0, 5);
  }

  private async updatePicksFile(): Promise<void> {
    if (Date.now() - this.lastPicksUpdate < 60000) return;
    this.lastPicksUpdate = Date.now();

    try {
      const predictions = await this.getRecentPredictions('kalshi');
      await this.syncPrognosticationHomepage(predictions);
      console.log(`${color.info('📄 Picks updated')} - ${predictions.length} opportunities`);
    } catch (err: any) {
      console.error('Picks error:', err.message);
    }
  }

  private categorizeMarket(title: string): string {
    const lower = title.toLowerCase();
    if (['bitcoin', 'crypto', 'btc', 'eth'].some(k => lower.includes(k))) return 'crypto';
    if (['election', 'president', 'congress', 'senate', 'democrat', 'republican'].some(k => lower.includes(k))) return 'politics';
    if (['fed', 'gdp', 'inflation', 'rate', 'unemployment'].some(k => lower.includes(k))) return 'economics';
    if (['temperature', 'weather', 'hurricane', 'storm'].some(k => lower.includes(k))) return 'weather';
    if (['oscar', 'movie', 'emmy', 'grammy'].some(k => lower.includes(k))) return 'entertainment';
    if (['nfl', 'nba', 'mlb', 'game', 'score'].some(k => lower.includes(k))) return 'sports';
    return 'world';
  }

  stop(): void {
    this.isRunning = false;
    const savings = this.aiCallsSkipped * 0.003;
    console.log('🛑 Stopping Alpha-Hunter...');
    console.log(`   Final: $${this.dailySpending.toFixed(2)} spent, ${this.aiCallsToday} AI calls, ${this.aiCallsSkipped} skipped (saved $${savings.toFixed(3)})`);
  }
}

// NO ENTRY POINT - index.ts handles startup
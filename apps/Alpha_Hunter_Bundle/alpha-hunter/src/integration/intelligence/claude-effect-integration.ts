/**
 * CLAUDE EFFECT INTEGRATION
 * =========================
 * Integrates the 7-Layer Claude Effect Engine and
 * Cursor Effect Bot (self-learning) with the live trader
 * 
 * This replaces the simple AI calls with the full
 * 7-layer analysis framework.
 */

import { ClaudeEffectEngine, getClaudeEffectEngine, ClaudeEffectResult, MarketData } from './claude-effect-engine';
import { CursorEffectBot, getCursorEffectBot } from './cursor-effect-bot';

// Integration state
let claudeEffect: ClaudeEffectEngine | null = null;
let cursorBot: CursorEffectBot | null = null;
let isInitialized = false;

// Stats tracking
interface ClaudeEffectStats {
  totalAnalyses: number;
  avgAnalysisTime: number;
  avgConfidence: number;
  layerHits: Record<string, number>;
  predictions: {
    yes: number;
    no: number;
    buy: number;
    sell: number;
  };
}

const stats: ClaudeEffectStats = {
  totalAnalyses: 0,
  avgAnalysisTime: 0,
  avgConfidence: 0,
  layerHits: {},
  predictions: { yes: 0, no: 0, buy: 0, sell: 0 },
};

/**
 * Initialize the Claude Effect system
 */
export async function initializeClaudeEffect(): Promise<void> {
  if (isInitialized) return;

  console.log('\n🧠 ═══════════════════════════════════════════');
  console.log('🧠 INITIALIZING CLAUDE EFFECT SYSTEM');
  console.log('🧠 ═══════════════════════════════════════════\n');

  try {
    // Initialize Cursor Effect Bot (loads learned weights)
    cursorBot = await getCursorEffectBot();
    const learnedWeights = cursorBot.getWeights();
    
    console.log('   ✅ Cursor Effect Bot initialized');
    console.log('   📊 Learned weights loaded');

    // Initialize Claude Effect Engine with learned weights
    claudeEffect = getClaudeEffectEngine(learnedWeights);
    
    console.log('   ✅ Claude Effect Engine initialized');
    console.log('   🧠 7 Layers ready:');
    console.log('      L1: Sentiment Field (SF)');
    console.log('      L2: Narrative Momentum (NM)');
    console.log('      L3: Information Asymmetry (IAI)');
    console.log('      L4: Chaos Sensitivity (CSI)');
    console.log('      L5: Network Influence (NIG)');
    console.log('      L6: Temporal Relevance (TRD)');
    console.log('      L7: Emergent Patterns (EPD)');

    // Start periodic learning (every 6 hours)
    cursorBot.startPeriodicLearning(6);
    console.log('   🔄 Periodic learning: Every 6 hours');

    isInitialized = true;
    console.log('\n🧠 ═══════════════════════════════════════════\n');
  } catch (err: any) {
    console.error(`   ❌ Claude Effect init failed: ${err.message}`);
    throw err;
  }
}

/**
 * Analyze a Kalshi market using full 7-Layer Claude Effect
 */
export async function analyzeKalshiWithClaudeEffect(market: {
  id: string;
  title: string;
  yesPrice: number;
  noPrice?: number;
  volume?: number;
  expiresAt?: string;
  category?: string;
}): Promise<{
  prediction: 'yes' | 'no';
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  layers?: any[];
} | null> {
  if (!isInitialized) {
    await initializeClaudeEffect();
  }

  if (!claudeEffect) {
    console.error('   ❌ Claude Effect not initialized');
    return null;
  }

  try {
    // Reset AI counter for this market
    claudeEffect.resetAICounter();

    // Prepare market data
    const marketData: MarketData = {
      id: market.id,
      title: market.title,
      category: market.category || categorizeMarket(market.title),
      yesPrice: market.yesPrice,
      noPrice: market.noPrice || (100 - market.yesPrice),
      volume: market.volume,
      expiresAt: market.expiresAt,
    };

    // Run 7-Layer analysis
    const result = await claudeEffect.analyze(marketData);

    // Update stats
    updateStats(result);

    // Record prediction for learning
    if (cursorBot) {
      await cursorBot.recordPrediction(
        market.id,
        market.title,
        'kalshi',
        marketData.category,
        result,
        market.expiresAt
      );
    }

    // Return in format compatible with existing code
    return {
      prediction: result.prediction as 'yes' | 'no',
      confidence: result.finalConfidence,
      edge: result.edge,
      reasoning: result.reasoning,
      factors: result.layers.map(l => `${l.layer}: ${l.signal} (${l.score})`),
      layers: result.layers,
    };
  } catch (err: any) {
    console.error(`   ❌ Claude Effect analysis failed: ${err.message}`);
    return null;
  }
}

/**
 * Analyze crypto using full 7-Layer Claude Effect
 */
export async function analyzeCryptoWithClaudeEffect(
  pair: string,
  price: number,
  change24h: number,
  candles?: any[]
): Promise<{
  prediction: 'buy' | 'sell';
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  layers?: any[];
} | null> {
  if (!isInitialized) {
    await initializeClaudeEffect();
  }

  if (!claudeEffect) {
    console.error('   ❌ Claude Effect not initialized');
    return null;
  }

  try {
    claudeEffect.resetAICounter();

    // Extract historical prices from candles
    const historicalPrices = candles?.slice(-20).map(c => c.close || c.c || 0) || [];

    const marketData: MarketData = {
      id: pair,
      title: `${pair} Price Analysis`,
      category: 'crypto',
      price,
      change24h,
      historicalPrices,
    };

    const result = await claudeEffect.analyze(marketData);

    updateStats(result);

    if (cursorBot) {
      await cursorBot.recordPrediction(
        pair,
        `${pair} @ $${price.toFixed(2)}`,
        'coinbase',
        'crypto',
        result
      );
    }

    return {
      prediction: result.prediction as 'buy' | 'sell',
      confidence: result.finalConfidence,
      edge: result.edge,
      reasoning: result.reasoning,
      factors: result.layers.map(l => `${l.layer}: ${l.signal} (${l.score})`),
      layers: result.layers,
    };
  } catch (err: any) {
    console.error(`   ❌ Claude Effect crypto analysis failed: ${err.message}`);
    return null;
  }
}

/**
 * Record trade outcome for learning
 */
export async function recordTradeOutcome(
  marketId: string,
  won: boolean,
  profitLoss: number
): Promise<void> {
  if (!cursorBot) return;

  await cursorBot.recordOutcomeByMarket(
    marketId,
    won ? 'win' : 'loss',
    profitLoss
  );
}

/**
 * Force a learning cycle
 */
export async function triggerLearning(): Promise<void> {
  if (!cursorBot) {
    console.warn('   ⚠️ Cursor Bot not initialized');
    return;
  }

  const newWeights = await cursorBot.forceLearning();
  
  // Update Claude Effect Engine with new weights
  if (claudeEffect) {
    claudeEffect.updateWeights(newWeights);
  }
}

/**
 * Get Claude Effect statistics
 */
export function getClaudeEffectStats(): ClaudeEffectStats & {
  cursorStats?: any;
} {
  return {
    ...stats,
    cursorStats: cursorBot ? cursorBot.getStats() : undefined,
  };
}

/**
 * Get current weights
 */
export function getCurrentWeights(): any {
  return claudeEffect?.getWeights() || null;
}

/**
 * Update stats from analysis
 */
function updateStats(result: ClaudeEffectResult): void {
  stats.totalAnalyses++;
  
  // Rolling average for analysis time
  stats.avgAnalysisTime = (stats.avgAnalysisTime * (stats.totalAnalyses - 1) + result.analysisTime) / stats.totalAnalyses;
  
  // Rolling average for confidence
  stats.avgConfidence = (stats.avgConfidence * (stats.totalAnalyses - 1) + result.finalConfidence) / stats.totalAnalyses;

  // Track predictions
  if (result.prediction in stats.predictions) {
    stats.predictions[result.prediction as keyof typeof stats.predictions]++;
  }

  // Track layer signal hits
  result.layers.forEach(layer => {
    const key = layer.layer;
    if (layer.signal !== 'neutral') {
      stats.layerHits[key] = (stats.layerHits[key] || 0) + 1;
    }
  });
}

/**
 * Categorize market from title
 */
function categorizeMarket(title: string): string {
  const lower = title.toLowerCase();
  if (['bitcoin', 'crypto', 'btc', 'eth', 'sol'].some(k => lower.includes(k))) return 'crypto';
  if (['election', 'president', 'congress', 'senate', 'democrat', 'republican', 'trump', 'biden'].some(k => lower.includes(k))) return 'politics';
  if (['fed', 'gdp', 'inflation', 'rate', 'unemployment', 'cpi', 'fomc'].some(k => lower.includes(k))) return 'economics';
  if (['temperature', 'weather', 'hurricane', 'storm', 'rain'].some(k => lower.includes(k))) return 'weather';
  if (['oscar', 'movie', 'emmy', 'grammy', 'film', 'box office'].some(k => lower.includes(k))) return 'entertainment';
  if (['nfl', 'nba', 'mlb', 'nhl', 'game', 'score', 'win', 'playoff'].some(k => lower.includes(k))) return 'sports';
  return 'world';
}

// =============================================
// REPLACEMENT FUNCTIONS FOR LIVE TRADER
// =============================================

/**
 * Drop-in replacement for analyzeKalshiWithAI
 * Use this in live-trader-24-7.ts
 */
export const analyzeKalshiWithAI = analyzeKalshiWithClaudeEffect;

/**
 * Drop-in replacement for analyzeCryptoWithAI
 * Use this in live-trader-24-7.ts
 */
export const analyzeCryptoWithAI = async (
  pair: string,
  ticker: { price: number; change24h?: number },
  candles?: any[]
) => {
  return analyzeCryptoWithClaudeEffect(
    pair,
    ticker.price,
    ticker.change24h || 0,
    candles
  );
};

// Export everything
export {
  ClaudeEffectEngine,
  CursorEffectBot,
  getClaudeEffectEngine,
  getCursorEffectBot,
};

export default {
  initialize: initializeClaudeEffect,
  analyzeKalshi: analyzeKalshiWithClaudeEffect,
  analyzeCrypto: analyzeCryptoWithClaudeEffect,
  recordOutcome: recordTradeOutcome,
  triggerLearning,
  getStats: getClaudeEffectStats,
  getWeights: getCurrentWeights,
};

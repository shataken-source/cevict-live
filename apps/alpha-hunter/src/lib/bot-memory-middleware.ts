/**
 * Bot Memory Middleware
 * Automatically saves bot predictions and trades to Supabase
 * Use this wrapper around bot operations to enable persistent memory
 */

import { supabaseMemory, BotPrediction, TradeRecord, BotLearning, BotMetrics } from './supabase-memory';

export class BotMemoryMiddleware {
  private isEnabled: boolean;

  constructor() {
    // Check if Supabase is configured
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.isEnabled = !!hasSupabase;

    if (this.isEnabled) {
      console.log('   💾 Bot Memory System: ENABLED (Supabase connected)');
    } else {
      console.log('   ⚠️ Bot Memory System: DISABLED (Supabase not configured)');
    }
  }

  /**
   * Save a bot prediction
   */
  async savePrediction(prediction: {
    botCategory: string;
    marketId: string;
    marketTitle: string;
    platform: 'kalshi' | 'coinbase';
    prediction: 'yes' | 'no' | 'buy' | 'sell';
    probability: number;
    confidence: number;
    edge: number;
    reasoning: string[];
    factors: string[];
    learnedFrom: string[];
    marketPrice: number;
    expiresAt?: Date;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const botPrediction: BotPrediction = {
        bot_category: prediction.botCategory,
        market_id: prediction.marketId,
        market_title: prediction.marketTitle,
        platform: prediction.platform,
        prediction: prediction.prediction,
        probability: prediction.probability,
        confidence: prediction.confidence,
        edge: prediction.edge,
        reasoning: prediction.reasoning,
        factors: prediction.factors,
        learned_from: prediction.learnedFrom,
        market_price: prediction.marketPrice,
        predicted_at: new Date(),
        expires_at: prediction.expiresAt,
      };

      await supabaseMemory.saveBotPrediction(botPrediction);
    } catch (e) {
      console.error('Failed to save prediction to Supabase:', e);
    }
  }

  /**
   * Save a trade record
   */
  async saveTrade(trade: {
    platform: 'kalshi' | 'coinbase';
    tradeType: 'buy' | 'sell' | 'yes' | 'no';
    symbol: string;
    marketId?: string;
    entryPrice: number;
    amount: number;
    fees: number;
    botCategory?: string;
    confidence?: number;
    edge?: number;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const tradeRecord: TradeRecord = {
        platform: trade.platform,
        trade_type: trade.tradeType,
        symbol: trade.symbol,
        market_id: trade.marketId,
        entry_price: trade.entryPrice,
        amount: trade.amount,
        fees: trade.fees,
        opened_at: new Date(),
        bot_category: trade.botCategory,
        confidence: trade.confidence,
        edge: trade.edge,
        outcome: 'open',
      };

      await supabaseMemory.saveTradeRecord(tradeRecord);
    } catch (e) {
      console.error('Failed to save trade to Supabase:', e);
    }
  }

  /**
   * Update trade outcome when it closes
   */
  async updateTradeOutcome(trade: {
    marketId: string;
    exitPrice: number;
    pnl: number;
    outcome: 'win' | 'loss';
  }): Promise<void> {
    if (!this.isEnabled) return;

    // Note: This requires a more complex query - implement if needed
    // For now, we just save new trades and let analytics handle outcomes
  }

  /**
   * Save a learning pattern
   */
  async savePattern(pattern: {
    botCategory: string;
    patternType: 'winning_pattern' | 'losing_pattern' | 'market_insight';
    description: string;
    confidence: number;
    successRate: number;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const learning: BotLearning = {
        bot_category: pattern.botCategory,
        pattern_type: pattern.patternType,
        pattern_description: pattern.description,
        confidence: pattern.confidence,
        times_observed: 1,
        success_rate: pattern.successRate,
        learned_at: new Date(),
      };

      await supabaseMemory.saveBotLearning(learning);
    } catch (e) {
      console.error('Failed to save pattern to Supabase:', e);
    }
  }

  /**
   * Update bot metrics
   */
  async updateMetrics(metrics: {
    botCategory: string;
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    totalPnl: number;
    avgEdge: number;
    avgConfidence: number;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const botMetrics: BotMetrics = {
        bot_category: metrics.botCategory,
        total_predictions: metrics.totalPredictions,
        correct_predictions: metrics.correctPredictions,
        accuracy: metrics.accuracy,
        total_pnl: metrics.totalPnl,
        avg_edge: metrics.avgEdge,
        avg_confidence: metrics.avgConfidence,
        last_updated: new Date(),
      };

      await supabaseMemory.updateBotMetrics(botMetrics);
    } catch (e) {
      console.error('Failed to update metrics in Supabase:', e);
    }
  }

  /**
   * Get bot's historical performance on similar markets
   */
  async getHistoricalPerformance(botCategory: string, marketKeywords: string[]): Promise<{
    accuracy: number;
    avgEdge: number;
    totalPredictions: number;
  }> {
    if (!this.isEnabled) {
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    try {
      return await supabaseMemory.getBotHistoricalPerformance(botCategory, marketKeywords);
    } catch (e) {
      console.error('Failed to get historical performance:', e);
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }
  }

  /**
   * Load bot's previous patterns
   */
  async loadPatterns(botCategory: string): Promise<string[]> {
    if (!this.isEnabled) return [];

    try {
      const learnings = await supabaseMemory.getBotLearnings(botCategory, 20);
      return learnings.map(l => l.pattern_description);
    } catch (e) {
      console.error('Failed to load patterns:', e);
      return [];
    }
  }
}

// Singleton instance
export const botMemory = new BotMemoryMiddleware();


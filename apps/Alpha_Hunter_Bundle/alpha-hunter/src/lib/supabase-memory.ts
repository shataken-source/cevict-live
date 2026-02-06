/**
 * Supabase Memory System for AI Trading Bots
 * Persistent storage for predictions, trades, and learning data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let supabaseClient: SupabaseClient | null = null;
let isInitialized = false;
let hasWarnedAboutMissingKeys = false;
let hasWarnedAboutInvalidKey = false;
let hasWarnedAboutAuthError = false;

// Helper to check if error is an auth error and log only once
function handleSupabaseError(error: any, context: string): void {
  const errorMessage = error?.message || String(error);
  const isAuthError = errorMessage.includes('Invalid API key') || 
                      errorMessage.includes('JWT') || 
                      errorMessage.includes('authentication') ||
                      errorMessage.includes('401');
  
  if (isAuthError && !hasWarnedAboutAuthError) {
    console.warn(`⚠️ Supabase authentication error (${context}) - check SUPABASE_SERVICE_ROLE_KEY in .env.local`);
    hasWarnedAboutAuthError = true;
  } else if (!isAuthError) {
    // Only log non-auth errors (and only once per type)
    console.error(`Error in ${context}:`, error);
  }
  // Auth errors are silently ignored after first warning
}

function getClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  // Don't spam warnings
  if (isInitialized) return null;
  isInitialized = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check for missing or placeholder keys
  if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
    if (!hasWarnedAboutMissingKeys) {
      console.warn('⚠️ Supabase not configured (URL or key missing/placeholder) - using JSON-only memory');
      hasWarnedAboutMissingKeys = true;
    }
    return null;
  }

  try {
    supabaseClient = createClient(url, key);
    console.log('✅ Supabase memory system connected');
    return supabaseClient;
  } catch (error) {
    if (!hasWarnedAboutInvalidKey) {
      console.warn('⚠️ Failed to connect to Supabase - using JSON-only memory');
      hasWarnedAboutInvalidKey = true;
    }
    return null;
  }
}

// ============================================================================
// BOT PREDICTIONS
// ============================================================================

export interface BotPrediction {
  id?: string;
  bot_category: string; // crypto, politics, economics, etc.
  market_id: string;
  market_title: string;
  platform: 'kalshi' | 'coinbase';
  prediction: 'yes' | 'no' | 'buy' | 'sell';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  learned_from: string[];
  market_price: number;
  predicted_at: Date;
  expires_at?: Date;
  actual_outcome?: 'win' | 'loss' | null;
  pnl?: number;
}

export async function saveBotPrediction(prediction: BotPrediction): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    // CRITICAL: Check for existing prediction to prevent duplicates
    // Find the most recent open prediction for this market_id + platform
    const { data: existing, error: checkError } = await client
      .from('bot_predictions')
      .select('id, confidence, predicted_at')
      .eq('market_id', prediction.market_id)
      .eq('platform', prediction.platform)
      .is('actual_outcome', null) // Only check open predictions
      .order('predicted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing prediction:', checkError);
    }

    // If exists, decide whether to update or skip
    if (existing) {
      const existingConfidence = existing.confidence || 0;
      const existingDate = new Date(existing.predicted_at || 0);
      const newDate = prediction.predicted_at;

      // Only update if new prediction is better (higher confidence OR same confidence but more recent)
      if (prediction.confidence < existingConfidence) {
        return true; // Keep existing, don't update
      }
      if (prediction.confidence === existingConfidence && newDate <= existingDate) {
        return true; // Keep existing if same confidence but not newer
      }

      // Update existing prediction
      const { error: updateError } = await client
        .from('bot_predictions')
        .update({
          bot_category: prediction.bot_category,
          market_title: prediction.market_title,
          prediction: prediction.prediction,
          probability: prediction.probability,
          confidence: prediction.confidence,
          edge: prediction.edge,
          reasoning: prediction.reasoning,
          factors: prediction.factors,
          learned_from: prediction.learned_from,
          market_price: prediction.market_price,
          predicted_at: prediction.predicted_at.toISOString(),
          expires_at: prediction.expires_at?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating prediction:', updateError);
        return false;
      }
      return true;
    }

    // No existing prediction - insert new one
    const { error: insertError } = await client
      .from('bot_predictions')
      .insert({
        bot_category: prediction.bot_category,
        market_id: prediction.market_id,
        market_title: prediction.market_title,
        platform: prediction.platform,
        prediction: prediction.prediction,
        probability: prediction.probability,
        confidence: prediction.confidence,
        edge: prediction.edge,
        reasoning: prediction.reasoning,
        factors: prediction.factors,
        learned_from: prediction.learned_from,
        market_price: prediction.market_price,
        predicted_at: prediction.predicted_at.toISOString(),
        expires_at: prediction.expires_at?.toISOString(),
        actual_outcome: prediction.actual_outcome,
        pnl: prediction.pnl,
      });

    if (insertError) {
      console.error('Error inserting prediction:', insertError);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception saving prediction:', e);
    return false;
  }
}

export async function getBotPredictions(
  category?: string,
  platform?: 'kalshi' | 'coinbase',
  limit = 100
): Promise<BotPrediction[]> {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from('bot_predictions')
      .select('*')
      .order('predicted_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('bot_category', category);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'getBotPredictions');
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      predicted_at: new Date(d.predicted_at),
      expires_at: d.expires_at ? new Date(d.expires_at) : undefined,
    }));
  } catch (e) {
    console.error('Exception fetching bot predictions:', e);
    return [];
  }
}

// ============================================================================
// TRADING HISTORY
// ============================================================================

export interface TradeRecord {
  id?: string;
  platform: 'kalshi' | 'coinbase';
  trade_type: 'buy' | 'sell' | 'yes' | 'no';
  symbol: string;
  market_id?: string;
  entry_price: number;
  exit_price?: number;
  amount: number;
  pnl?: number;
  fees: number;
  opened_at: Date;
  closed_at?: Date;
  bot_category?: string;
  confidence?: number;
  edge?: number;
  outcome?: 'win' | 'loss' | 'open';
}

export async function saveTradeRecord(trade: TradeRecord): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('trade_history')
      .insert({
        platform: trade.platform,
        trade_type: trade.trade_type,
        symbol: trade.symbol,
        market_id: trade.market_id,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        amount: trade.amount,
        pnl: trade.pnl,
        fees: trade.fees,
        opened_at: trade.opened_at.toISOString(),
        closed_at: trade.closed_at?.toISOString(),
        bot_category: trade.bot_category,
        confidence: trade.confidence,
        edge: trade.edge,
        outcome: trade.outcome,
      });

    if (error) {
      handleSupabaseError(error, 'saveTradeRecord');
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception saving trade record:', e);
    return false;
  }
}

export async function getTradeHistory(
  platform?: 'kalshi' | 'coinbase',
  limit = 100
): Promise<TradeRecord[]> {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from('trade_history')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      opened_at: new Date(d.opened_at),
      closed_at: d.closed_at ? new Date(d.closed_at) : undefined,
    }));
  } catch (e) {
    console.error('Exception fetching trade history:', e);
    return [];
  }
}

// ============================================================================
// BOT LEARNING DATA
// ============================================================================

export interface BotLearning {
  id?: string;
  bot_category: string;
  pattern_type: string; // 'winning_pattern', 'losing_pattern', 'market_insight'
  pattern_description: string;
  confidence: number;
  times_observed: number;
  success_rate: number;
  learned_at: Date;
  last_seen?: Date;
  metadata?: any;
}

export async function saveBotLearning(learning: BotLearning): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    // Check if pattern already exists
    const { data: existing } = await client
      .from('bot_learnings')
      .select('*')
      .eq('bot_category', learning.bot_category)
      .eq('pattern_description', learning.pattern_description)
      .single();

    if (existing) {
      // Update existing pattern
      const { error } = await client
        .from('bot_learnings')
        .update({
          times_observed: existing.times_observed + 1,
          success_rate: (existing.success_rate * existing.times_observed + learning.success_rate) / (existing.times_observed + 1),
          last_seen: new Date().toISOString(),
          confidence: learning.confidence,
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating bot learning:', error);
        return false;
      }
    } else {
      // Insert new pattern
      const { error } = await client
        .from('bot_learnings')
        .insert({
          bot_category: learning.bot_category,
          pattern_type: learning.pattern_type,
          pattern_description: learning.pattern_description,
          confidence: learning.confidence,
          times_observed: 1,
          success_rate: learning.success_rate,
          learned_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          metadata: learning.metadata,
        });

      if (error) {
        console.error('Error inserting bot learning:', error);
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error('Exception saving bot learning:', e);
    return false;
  }
}

export async function getBotLearnings(
  category?: string,
  limit = 50
): Promise<BotLearning[]> {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from('bot_learnings')
      .select('*')
      .order('success_rate', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('bot_category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bot learnings:', error);
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      learned_at: new Date(d.learned_at),
      last_seen: d.last_seen ? new Date(d.last_seen) : undefined,
    }));
  } catch (e) {
    console.error('Exception fetching bot learnings:', e);
    return [];
  }
}

// ============================================================================
// BOT PERFORMANCE METRICS
// ============================================================================

export interface BotMetrics {
  bot_category: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  total_pnl: number;
  avg_edge: number;
  avg_confidence: number;
  best_pattern?: string;
  last_updated: Date;
}

export async function updateBotMetrics(metrics: BotMetrics): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('bot_metrics')
      .upsert({
        bot_category: metrics.bot_category,
        total_predictions: metrics.total_predictions,
        correct_predictions: metrics.correct_predictions,
        accuracy: metrics.accuracy,
        total_pnl: metrics.total_pnl,
        avg_edge: metrics.avg_edge,
        avg_confidence: metrics.avg_confidence,
        best_pattern: metrics.best_pattern,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'bot_category',
      });

    if (error) {
      console.error('Error updating bot metrics:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception updating bot metrics:', e);
    return false;
  }
}

export async function getBotMetrics(category?: string): Promise<BotMetrics[]> {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from('bot_metrics')
      .select('*')
      .order('accuracy', { ascending: false });

    if (category) {
      query = query.eq('bot_category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bot metrics:', error);
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      last_updated: new Date(d.last_updated),
    }));
  } catch (e) {
    console.error('Exception fetching bot metrics:', e);
    return [];
  }
}

// ============================================================================
// HELPER: Get bot's historical success on similar markets
// ============================================================================

export async function getBotHistoricalPerformance(
  category: string,
  marketKeywords: string[]
): Promise<{ accuracy: number; avgEdge: number; totalPredictions: number }> {
  const client = getClient();
  if (!client) return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };

  try {
    // Build a query to find similar past predictions
    let query = client
      .from('bot_predictions')
      .select('*')
      .eq('bot_category', category)
      .not('actual_outcome', 'is', null);

    // Filter by keywords in market title
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching historical performance:', error);
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    if (!data || data.length === 0) {
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    // Filter by keywords
    const relevantPredictions = data.filter(p =>
      marketKeywords.some(kw => p.market_title.toLowerCase().includes(kw.toLowerCase()))
    );

    if (relevantPredictions.length === 0) {
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    const correctPredictions = relevantPredictions.filter(p => p.actual_outcome === 'win').length;
    const avgEdge = relevantPredictions.reduce((sum, p) => sum + p.edge, 0) / relevantPredictions.length;

    return {
      accuracy: (correctPredictions / relevantPredictions.length) * 100,
      avgEdge,
      totalPredictions: relevantPredictions.length,
    };
  } catch (e) {
    console.error('Exception fetching historical performance:', e);
    return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
  }
}

export const supabaseMemory = {
  saveBotPrediction,
  getBotPredictions,
  saveTradeRecord,
  getTradeHistory,
  saveBotLearning,
  getBotLearnings,
  updateBotMetrics,
  getBotMetrics,
  getBotHistoricalPerformance,
};

/**
 * Fetch bot configuration from Supabase
 * Returns default config if Supabase is unavailable or config doesn't exist
 */
export async function getBotConfig(): Promise<{
  trading: {
    maxTradeSize: number;
    minConfidence: number;
    minEdge: number;
    dailySpendingLimit: number;
    dailyLossLimit: number;
    maxOpenPositions: number;
    cryptoInterval: number;
    kalshiInterval: number;
  };
  picks: {
    maxPicksDisplay: number;
    minConfidenceDisplay: number;
  };
}> {
  const client = getClient();
  if (!client) {
    // Return defaults if Supabase unavailable (OPTIMAL VALUES from backtest)
    return {
      trading: {
        maxTradeSize: 10,        // OPTIMAL: was 5
        minConfidence: 70,       // OPTIMAL: was 55
        minEdge: 2,
        dailySpendingLimit: 100, // OPTIMAL: was 50
        dailyLossLimit: 750,     // OPTIMAL: was 25
        maxOpenPositions: 5,
        cryptoInterval: 30000,
        kalshiInterval: 60000,
      },
      picks: {
        maxPicksDisplay: 20,
        minConfidenceDisplay: 50,
      },
    };
  }

  try {
    // Fetch trading config
    const { data: tradingConfig, error: tradingError } = await client
      .from('bot_config')
      .select('config_value')
      .eq('config_key', 'trading')
      .single();

    // Fetch picks config
    const { data: picksConfig, error: picksError } = await client
      .from('bot_config')
      .select('config_value')
      .eq('config_key', 'picks')
      .single();

    // Merge with defaults (OPTIMAL VALUES from backtest)
    const trading = tradingConfig?.config_value || {
      maxTradeSize: 10,        // OPTIMAL: was 5
      minConfidence: 70,       // OPTIMAL: was 55
      minEdge: 2,
      dailySpendingLimit: 100, // OPTIMAL: was 50
      dailyLossLimit: 750,     // OPTIMAL: was 25
      maxOpenPositions: 5,
      cryptoInterval: 30000,
      kalshiInterval: 60000,
    };

    const picks = picksConfig?.config_value || {
      maxPicksDisplay: 20,
      minConfidenceDisplay: 50,
    };

    return { trading, picks };
  } catch (error: any) {
    // Return defaults on error (OPTIMAL VALUES from backtest)
    console.warn('⚠️ Failed to fetch bot config from Supabase, using defaults:', error.message);
    return {
      trading: {
        maxTradeSize: 10,        // OPTIMAL: was 5
        minConfidence: 70,       // OPTIMAL: was 55
        minEdge: 2,
        dailySpendingLimit: 100, // OPTIMAL: was 50
        dailyLossLimit: 750,     // OPTIMAL: was 25
        maxOpenPositions: 5,
        cryptoInterval: 30000,
        kalshiInterval: 60000,
      },
      picks: {
        maxPicksDisplay: 20,
        minConfidenceDisplay: 50,
      },
    };
  }
}


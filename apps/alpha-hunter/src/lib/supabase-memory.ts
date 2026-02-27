/**
 * Supabase Memory System for AI Trading Bots
 * Persistent storage for predictions, trades, and learning data
 *
 * FUND-GRADE SQL SCHEMA REQUIREMENTS:
 *
 * -- 1. Unique constraint to prevent race condition duplicates
 * CREATE UNIQUE INDEX unique_open_prediction
 * ON bot_predictions (market_id, platform)
 * WHERE actual_outcome IS NULL;
 *
 * -- 2. Indexes for performance at scale
 * CREATE INDEX idx_predictions_category ON bot_predictions(bot_category);
 * CREATE INDEX idx_predictions_market ON bot_predictions(market_id);
 * CREATE INDEX idx_predictions_platform_outcome ON bot_predictions(platform, actual_outcome);
 * CREATE INDEX idx_trade_history_platform ON trade_history(platform);
 * CREATE INDEX idx_trade_history_outcome ON trade_history(outcome);
 * CREATE INDEX idx_trade_history_closed ON trade_history(closed_at) WHERE outcome IN ('win', 'loss');
 * CREATE INDEX idx_metrics_category ON bot_metrics(bot_category);
 * CREATE INDEX idx_learning_category ON bot_learnings(bot_category);
 * CREATE INDEX idx_learning_pattern ON bot_learnings(bot_category, pattern_description);
 *
 * -- 3. Check constraints for data integrity (PostgreSQL 12+)
 * ALTER TABLE bot_predictions
 *   ADD CONSTRAINT chk_probability_range CHECK (probability >= 0 AND probability <= 1),
 *   ADD CONSTRAINT chk_confidence_range CHECK (confidence >= 0 AND confidence <= 100),
 *   ADD CONSTRAINT chk_edge_range CHECK (edge >= -1 AND edge <= 1);
 *
 * -- 4. For transaction safety, consider RPC for trade closing:
 * -- CREATE OR REPLACE FUNCTION close_trade_with_metrics(...)
 *
 * TODO: Add capital ledger tracking (daily spend, drawdown, exposure)
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
let networkErrorCount = 0;
let lastNetworkErrorTime = 0;
const NETWORK_ERROR_THROTTLE_MS = 30000; // Only log network errors every 30 seconds

// Helper to check if error is an auth error and log only once
function handleSupabaseError(error: any, context: string): void {
  const errorMessage = error?.message || String(error);
  const errorDetails = error?.details || String(error);

  // Detect network/DNS failures
  const isNetworkError = errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('getaddrinfo') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorDetails.includes('ENOTFOUND') ||
    errorDetails.includes('getaddrinfo');

  const isAuthError = errorMessage.includes('Invalid API key') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('401');

  if (isNetworkError) {
    networkErrorCount++;
    const now = Date.now();
    // Only log network errors every 30 seconds to reduce spam
    if (now - lastNetworkErrorTime > NETWORK_ERROR_THROTTLE_MS) {
      console.error(`🌐 Network connectivity issue (${context}): Cannot reach Supabase`);
      console.error(`   Error: ${errorMessage}`);
      console.error(`   Total network errors: ${networkErrorCount} (checking internet connection, DNS, firewall)`);
      lastNetworkErrorTime = now;
    }
  } else if (isAuthError && !hasWarnedAboutAuthError) {
    console.warn(`⚠️ Supabase authentication error (${context}) - check SUPABASE_SERVICE_ROLE_KEY in .env.local`);
    hasWarnedAboutAuthError = true;
  } else if (!isAuthError && !isNetworkError) {
    // Only log non-auth, non-network errors
    console.error(`Error in ${context}:`, error);
  }
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
    // Show which Supabase project we're connected to (for debugging)
    const projectId = url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
    console.log(`✅ Supabase memory system connected (project: ${projectId})`);
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
  source?: string; // e.g. 'alpha-hunter'
  status?: string; // e.g. 'pending', 'settled'
}

export async function saveBotPrediction(prediction: BotPrediction): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  // CRITICAL: Validate probability scaling (must be 0-1, not 0-100)
  if (prediction.probability < 0 || prediction.probability > 1) {
    console.error(`❌ REJECTED: probability ${prediction.probability} out of bounds (must be 0-1)`);
    return false;
  }

  // Validate confidence scaling (must be 0-100)
  if (prediction.confidence < 0 || prediction.confidence > 100) {
    console.error(`❌ REJECTED: confidence ${prediction.confidence} out of bounds (must be 0-100)`);
    return false;
  }

  // Validate edge is reasonable (-1 to 1)
  if (prediction.edge < -1 || prediction.edge > 1) {
    console.error(`❌ REJECTED: edge ${prediction.edge} out of bounds`);
    return false;
  }

  try {
    // Use upsert with conflict resolution instead of manual check+update
    // Requires SQL: CREATE UNIQUE INDEX unique_open_prediction ON bot_predictions (market_id, platform) WHERE actual_outcome IS NULL;
    const { error: upsertError } = await client
      .from('bot_predictions')
      .upsert({
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
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'market_id,platform',
        ignoreDuplicates: false // Update on conflict
      });

    if (upsertError) {
      // If upsert failed due to missing unique constraint, fall back to manual logic
      if (upsertError.code === '23505' || upsertError.message?.includes('duplicate')) {
        console.warn(`⚠️ Duplicate prediction detected, attempting update...`);

        // Find existing and decide whether to update
        const { data: existing } = await client
          .from('bot_predictions')
          .select('id, confidence, predicted_at')
          .eq('market_id', prediction.market_id)
          .eq('platform', prediction.platform)
          .is('actual_outcome', null)
          .order('predicted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const existingConfidence = existing.confidence || 0;
          if (prediction.confidence < existingConfidence) {
            return true; // Keep existing
          }

          // Update with better prediction
          const { error: updateError } = await client
            .from('bot_predictions')
            .update({
              confidence: prediction.confidence,
              probability: prediction.probability,
              edge: prediction.edge,
              market_price: prediction.market_price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          return !updateError;
        }
      }

      console.error('Error saving prediction:', upsertError);
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
  contracts?: number;
  pnl?: number;
  fees: number;
  opened_at: Date;
  closed_at?: Date;
  bot_category?: string;
  confidence?: number;
  edge?: number;
  outcome?: 'win' | 'loss' | 'open';
}

export async function saveTradeRecord(trade: TradeRecord): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('trade_history')
      .insert({
        platform: trade.platform,
        trade_type: trade.trade_type,
        symbol: trade.symbol,
        market_id: trade.market_id,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        amount: trade.amount,
        contracts: trade.contracts,
        pnl: trade.pnl,
        fees: trade.fees,
        opened_at: trade.opened_at.toISOString(),
        closed_at: trade.closed_at?.toISOString(),
        bot_category: trade.bot_category,
        confidence: trade.confidence,
        edge: trade.edge,
        outcome: trade.outcome,
      })
      .select('id')
      .single();

    if (error) {
      handleSupabaseError(error, 'saveTradeRecord');
      return null;
    }

    return data?.id ?? null;
  } catch (e) {
    console.error('Exception saving trade record:', e);
    return null;
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

export async function getOpenTradeRecords(
  platform: 'kalshi' | 'coinbase',
  limit = 200
): Promise<TradeRecord[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('trade_history')
      .select('*')
      .eq('platform', platform)
      .eq('outcome', 'open')
      .order('opened_at', { ascending: true })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'getOpenTradeRecords');
      return [];
    }

    // DEBUG: Log if we get unexpected results
    if (data && data.length > 10) {
      console.log(`   ⚠️  getOpenTradeRecords: Found ${data.length} open positions (unexpectedly high)`);
      // Check for positions that might have closed_at but still marked open
      const shouldBeClosed = data.filter((d: any) => d.closed_at && d.outcome === 'open');
      if (shouldBeClosed.length > 0) {
        console.log(`   ⚠️  Found ${shouldBeClosed.length} positions with closed_at but outcome='open'`);
      }
    }

    return (data || []).map(d => ({
      ...d,
      opened_at: new Date(d.opened_at),
      closed_at: d.closed_at ? new Date(d.closed_at) : undefined,
    }));
  } catch (e) {
    console.error('Exception fetching open trade records:', e);
    return [];
  }
}

export async function closeTradeRecord(
  tradeId: string,
  updates: Pick<TradeRecord, 'outcome' | 'pnl' | 'exit_price' | 'closed_at'> & { contracts?: number }
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('trade_history')
      .update({
        outcome: updates.outcome,
        pnl: updates.pnl,
        exit_price: updates.exit_price,
        closed_at: updates.closed_at?.toISOString(),
        contracts: updates.contracts,
      })
      .eq('id', tradeId);

    if (error) {
      handleSupabaseError(error, 'closeTradeRecord');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception closing trade record:', e);
    return false;
  }
}

export async function markBotPredictionsResolved(
  platform: 'kalshi' | 'coinbase',
  marketId: string,
  outcome: 'win' | 'loss',
  pnl?: number
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('bot_predictions')
      .update({
        actual_outcome: outcome,
        pnl: pnl,
      })
      .eq('platform', platform)
      .eq('market_id', marketId)
      .is('actual_outcome', null);

    if (error) {
      handleSupabaseError(error, 'markBotPredictionsResolved');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception marking predictions resolved:', e);
    return false;
  }
}

export interface StrategyParams {
  platform: 'kalshi' | 'coinbase';
  bot_category: string;
  min_confidence: number;
  min_edge: number;
  max_trade_usd: number;
  daily_spending_limit: number;
  max_open_positions: number;
  updated_at?: Date;
}

export async function getStrategyParams(
  platform: 'kalshi' | 'coinbase',
  botCategory: string
): Promise<StrategyParams | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('bot_strategy_params')
      .select('*')
      .eq('platform', platform)
      .eq('bot_category', botCategory)
      .single();

    if (error) {
      // DEBUG: Log why query failed
      if (error.code === 'PGRST116') {
        // No rows returned - category doesn't exist
        console.log(`   ⚠️  getStrategyParams: Category '${botCategory}' not found for platform '${platform}'`);
      } else {
        console.error(`   ❌ getStrategyParams error for ${platform}/${botCategory}:`, error);
        handleSupabaseError(error, `getStrategyParams(${platform}, ${botCategory})`);
      }
      return null;
    }
    if (!data) {
      console.log(`   ⚠️  getStrategyParams: No data returned for ${platform}/${botCategory}`);
      return null;
    }

    return {
      platform: data.platform,
      bot_category: data.bot_category,
      min_confidence: Number(data.min_confidence),
      min_edge: Number(data.min_edge),
      max_trade_usd: Number(data.max_trade_usd),
      daily_spending_limit: Number(data.daily_spending_limit),
      max_open_positions: Number(data.max_open_positions),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  } catch {
    return null;
  }
}

export async function upsertStrategyParams(params: StrategyParams): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('bot_strategy_params')
      .upsert(
        {
          platform: params.platform,
          bot_category: params.bot_category,
          min_confidence: params.min_confidence,
          min_edge: params.min_edge,
          max_trade_usd: params.max_trade_usd,
          daily_spending_limit: params.daily_spending_limit,
          max_open_positions: params.max_open_positions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'platform,bot_category' }
      );

    if (error) {
      handleSupabaseError(error, 'upsertStrategyParams');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception upserting strategy params:', e);
    return false;
  }
}

export async function getRecentClosedTradeRecords(
  platform: 'kalshi' | 'coinbase',
  limit = 500
): Promise<TradeRecord[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('trade_history')
      .select('*')
      .eq('platform', platform)
      .in('outcome', ['win', 'loss'])
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) {
      handleSupabaseError(error, 'getRecentClosedTradeRecords');
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      opened_at: new Date(d.opened_at),
      closed_at: d.closed_at ? new Date(d.closed_at) : undefined,
    }));
  } catch (e) {
    console.error('Exception fetching recent closed trades:', e);
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
      // FIX: Don't double-average. Track cumulative stats properly.
      // New success rate = (wins + new_result) / (total_observations + 1)
      const newObservations = existing.times_observed + 1;
      const currentWins = Math.round(existing.success_rate * existing.times_observed);
      const newWins = currentWins + (learning.success_rate >= 0.5 ? 1 : 0); // Treat >=50% as win
      const newSuccessRate = newWins / newObservations;

      const { error } = await client
        .from('bot_learnings')
        .update({
          times_observed: newObservations,
          success_rate: newSuccessRate,
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
    // FIX: Use SQL filtering with ilike instead of loading entire table
    // Build OR condition for keyword matching at database level
    const keywordConditions = marketKeywords
      .filter(kw => kw.length >= 3) // Only use meaningful keywords
      .map(kw => `market_title.ilike.%${kw}%`)
      .join(',');

    if (!keywordConditions) {
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    // Query with SQL filtering - only fetch relevant records
    const { data, error } = await client
      .from('bot_predictions')
      .select('*')
      .eq('bot_category', category)
      .not('actual_outcome', 'is', null)
      .or(keywordConditions);

    if (error) {
      console.error('Error fetching historical performance:', error);
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    if (!data || data.length === 0) {
      return { accuracy: 0, avgEdge: 0, totalPredictions: 0 };
    }

    const correctPredictions = data.filter(p => p.actual_outcome === 'win').length;
    const avgEdge = data.reduce((sum, p) => sum + p.edge, 0) / data.length;

    return {
      accuracy: (correctPredictions / data.length) * 100,
      avgEdge,
      totalPredictions: data.length,
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
  getOpenTradeRecords,
  closeTradeRecord,
  markBotPredictionsResolved,
  getStrategyParams,
  upsertStrategyParams,
  getRecentClosedTradeRecords,
  saveBotLearning,
  getBotLearnings,
  updateBotMetrics,
  getBotMetrics,
  getBotHistoricalPerformance,
  getSupabaseClient: getClient, // Alias for compatibility
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
    // Return defaults if Supabase unavailable
    return {
      trading: {
        maxTradeSize: 5,
        minConfidence: 55,
        minEdge: 2,
        dailySpendingLimit: 50,
        dailyLossLimit: 25,
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

    if (tradingError) {
      console.error(`❌ getBotConfig error:`, tradingError);
      handleSupabaseError(tradingError, 'getBotConfig(trading)');
    }

    // Fetch picks config
    const { data: picksConfig, error: picksError } = await client
      .from('bot_config')
      .select('config_value')
      .eq('config_key', 'picks')
      .single();

    if (picksError && picksError.code !== 'PGRST116') {
      // PGRST116 = no rows, which is OK for picks
      console.error(`❌ getBotConfig(picks) error:`, picksError);
    }

    // Merge with defaults
    const trading = tradingConfig?.config_value || {
      maxTradeSize: 5,
      minConfidence: 55,
      minEdge: 2,
      dailySpendingLimit: 50,
      dailyLossLimit: 25,
      maxOpenPositions: 5,
      cryptoInterval: 30000,
      kalshiInterval: 60000,
    };

    // DEBUG: Log what we actually got
    if (!tradingConfig) {
      console.warn(`⚠️  getBotConfig: No trading config found in database, using defaults (dailySpendingLimit: ${trading.dailySpendingLimit})`);
    } else {
      const dbLimit = tradingConfig.config_value?.dailySpendingLimit;
      if (dbLimit && dbLimit !== trading.dailySpendingLimit) {
        console.log(`   ✅ getBotConfig: Using database value dailySpendingLimit: ${dbLimit}`);
      }
    }

    const picks = picksConfig?.config_value || {
      maxPicksDisplay: 20,
      minConfidenceDisplay: 50,
    };

    return { trading, picks };
  } catch (error: any) {
    // Return defaults on error
    console.error('❌ getBotConfig exception:', error);
    return {
      trading: {
        maxTradeSize: 5,
        minConfidence: 55,
        minEdge: 2,
        dailySpendingLimit: 50,
        dailyLossLimit: 25,
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


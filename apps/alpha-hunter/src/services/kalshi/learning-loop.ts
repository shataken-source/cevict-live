/**
 * Kalshi Learning Loop Service
 * Integrates with the NEW kalshi_learning_data migration
 * Logs trades, retrieves calibration, applies learned probabilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

const alphaRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials missing for Learning Loop');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface KalshiLearningData {
  trade_id: string;
  market_ticker: string;
  market_category: string; // 'sports', 'politics', 'economics', etc.
  predicted_probability: number; // 0-100
  market_odds: number; // cents (0-100)
  edge: number; // predicted - market
  side: 'yes' | 'no';
  stake_usd: number;
  contracts: number;
  opened_at: Date;
  market_close_ts?: Date;
  actual_outcome?: 'yes' | 'no' | null;
  pnl_usd?: number;
  settled_at?: Date;
}

export interface KalshiCalibration {
  category: string;
  total_trades: number;
  settled_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  roi: number;
  sharpe_ratio: number;
  avg_edge: number;
  is_calibrated: boolean; // true after 100+ settled trades
  last_updated: Date;
}

// ============================================================================
// LOG TRADE TO LEARNING DATABASE
// ============================================================================

/**
 * Log a Kalshi trade to kalshi_learning_data table (schema matches 20260208_kalshi_learning_loop.sql)
 * Called immediately after placing an order. Use trade_history.id as tradeId so settlement can update by same id.
 */
export async function logKalshiTrade(params: {
  tradeId: string;
  marketTicker: string;
  marketTitle?: string;
  marketCategory: string;
  predictedProbability: number; // 0-100 scale (will store as 0-1 in DB)
  marketOdds: number; // cents 0-100 (will store as market_probability 0-1)
  side: 'yes' | 'no';
  stakeUsd: number;
  contracts: number;
  entryPriceCents: number;
  marketCloseTs: Date; // required by migration
}): Promise<boolean> {
  try {
    const client = getClient();
    const predProb01 = Math.min(1, Math.max(0, params.predictedProbability / 100));
    const marketProb01 = Math.min(1, Math.max(0, params.marketOdds / 100));
    const edge = predProb01 - marketProb01;
    const now = new Date();

    const { error } = await client.from('kalshi_learning_data').insert({
      trade_id: params.tradeId,
      market_ticker: params.marketTicker,
      market_title: params.marketTitle ?? params.marketTicker,
      market_category: params.marketCategory,
      predicted_probability: predProb01,
      market_probability: marketProb01,
      edge,
      position: params.side.toUpperCase(),
      entry_price: params.entryPriceCents,
      contracts: params.contracts,
      investment: params.stakeUsd,
      trade_opened_at: now.toISOString(),
      market_close_time: params.marketCloseTs.toISOString(),
    });

    if (error) {
      console.error('❌ Error logging Kalshi trade to learning database:', error);
      return false;
    }

    console.log(`✅ Logged trade ${params.tradeId} to Kalshi Learning Loop`);
    return true;
  } catch (e: any) {
    console.error('❌ Exception logging Kalshi trade:', e.message);
    return false;
  }
}

// ============================================================================
// UPDATE TRADE WITH ACTUAL OUTCOME
// ============================================================================

/**
 * Update trade record with actual outcome after settlement
 * Trigger in migration will auto-update kalshi_calibration table
 */
export async function updateKalshiTradeOutcome(params: {
  tradeId: string;
  actualOutcome: 'yes' | 'no';
  pnlUsd: number;
}): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client
      .from('kalshi_learning_data')
      .update({
        actual_outcome: params.actualOutcome === 'yes',
        profit_loss: params.pnlUsd,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('trade_id', params.tradeId);

    if (error) {
      console.error(`❌ Error updating trade outcome for ${params.tradeId}:`, error);
      return false;
    }

    console.log(`✅ Updated trade ${params.tradeId}: ${params.actualOutcome} (${params.pnlUsd > 0 ? '+' : ''}${params.pnlUsd.toFixed(2)})`);
    return true;
  } catch (e: any) {
    console.error('❌ Exception updating trade outcome:', e.message);
    return false;
  }
}

// ============================================================================
// GET CALIBRATION FOR CATEGORY
// ============================================================================

/**
 * Retrieve calibration data for a specific market category
 * Returns null if category not found or < 100 settled trades (not calibrated yet)
 */
export async function getKalshiCalibration(category: string): Promise<KalshiCalibration | null> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('kalshi_calibration')
      .select('*')
      .eq('category', category)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows - category hasn't been traded yet
        return null;
      }
      console.error(`❌ Error fetching calibration for ${category}:`, error);
      return null;
    }

    if (!data) return null;

    return {
      category: data.category,
      total_trades: data.total_trades,
      settled_trades: data.settled_trades,
      wins: data.wins,
      losses: data.losses,
      win_rate: Number(data.win_rate || 0),
      total_pnl: Number(data.total_pnl || 0),
      roi: Number(data.roi || 0),
      sharpe_ratio: Number(data.sharpe_ratio || 0),
      avg_edge: Number(data.avg_edge || 0),
      is_calibrated: data.is_calibrated || false,
      last_updated: new Date(data.last_updated),
    };
  } catch (e: any) {
    console.error('❌ Exception fetching calibration:', e.message);
    return null;
  }
}

// ============================================================================
// GET CALIBRATION ADJUSTMENT (Learned Edge)
// ============================================================================

/**
 * Use PostgreSQL function to get calibration adjustment for a predicted probability
 * If category is calibrated (100+ trades), returns learned edge adjustment
 * Otherwise returns 0 (use synthetic edge)
 */
export async function getCalibrationAdjustment(
  category: string,
  predictedProbability: number
): Promise<number> {
  try {
    const client = getClient();

    const { data, error } = await client.rpc('get_kalshi_calibration_adjustment', {
      p_category: category,
      p_predicted_prob: predictedProbability,
    });

    if (error) {
      console.error(`❌ Error getting calibration adjustment:`, error);
      return 0;
    }

    return Number(data || 0);
  } catch (e: any) {
    console.error('❌ Exception getting calibration adjustment:', e.message);
    return 0;
  }
}

// ============================================================================
// GET ALL CALIBRATIONS (For Dashboard)
// ============================================================================

/**
 * Retrieve all category calibrations for dashboard display
 * Only returns categories with > 0 trades
 */
export async function getAllKalshiCalibrations(): Promise<KalshiCalibration[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('kalshi_calibration')
      .select('*')
      .gt('total_trades', 0)
      .order('roi', { ascending: false });

    if (error) {
      console.error('❌ Error fetching all calibrations:', error);
      return [];
    }

    if (!data) return [];

    return data.map(d => ({
      category: d.category,
      total_trades: d.total_trades,
      settled_trades: d.settled_trades,
      wins: d.wins,
      losses: d.losses,
      win_rate: Number(d.win_rate || 0),
      total_pnl: Number(d.total_pnl || 0),
      roi: Number(d.roi || 0),
      sharpe_ratio: Number(d.sharpe_ratio || 0),
      avg_edge: Number(d.avg_edge || 0),
      is_calibrated: d.is_calibrated || false,
      last_updated: new Date(d.last_updated),
    }));
  } catch (e: any) {
    console.error('❌ Exception fetching all calibrations:', e.message);
    return [];
  }
}

// ============================================================================
// GET RECENT TRADES (For Dashboard)
// ============================================================================

/**
 * Get recent trades for a category (for learning loop dashboard)
 */
export async function getRecentKalshiTrades(
  category?: string,
  limit = 50
): Promise<KalshiLearningData[]> {
  try {
    const client = getClient();

    let query = client
      .from('kalshi_learning_data')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('market_category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching recent trades:', error);
      return [];
    }

    if (!data) return [];

    return data.map(d => ({
      trade_id: d.trade_id,
      market_ticker: d.market_ticker,
      market_category: d.market_category,
      predicted_probability: d.predicted_probability,
      market_odds: d.market_odds,
      edge: d.edge,
      side: d.side,
      stake_usd: Number(d.stake_usd),
      contracts: d.contracts,
      opened_at: new Date(d.opened_at),
      market_close_ts: d.market_close_ts ? new Date(d.market_close_ts) : undefined,
      actual_outcome: d.actual_outcome,
      pnl_usd: d.pnl_usd ? Number(d.pnl_usd) : undefined,
      settled_at: d.settled_at ? new Date(d.settled_at) : undefined,
    }));
  } catch (e: any) {
    console.error('❌ Exception fetching recent trades:', e.message);
    return [];
  }
}

// ============================================================================
// INTEGRATION HELPER: Apply Learned Edge to Market
// ============================================================================

/**
 * Apply learned calibration to a market
 * If category is calibrated (100+ trades), adjusts predicted probability
 * Otherwise uses original (synthetic) prediction
 */
export async function applyLearnedEdge(
  category: string,
  syntheticProbability: number,
  marketOdds: number
): Promise<{
  adjustedProbability: number;
  edge: number;
  source: 'synthetic' | 'learned';
  calibrationStats?: KalshiCalibration;
}> {
  const calibration = await getKalshiCalibration(category);

  // Not calibrated yet - use synthetic
  if (!calibration || !calibration.is_calibrated) {
    const edge = syntheticProbability - marketOdds;
    return {
      adjustedProbability: syntheticProbability,
      edge,
      source: 'synthetic',
    };
  }

  // Calibrated - apply learned adjustment
  const adjustment = await getCalibrationAdjustment(category, syntheticProbability);
  const adjustedProbability = Math.max(1, Math.min(99, syntheticProbability + adjustment));
  const edge = adjustedProbability - marketOdds;

  return {
    adjustedProbability,
    edge,
    source: 'learned',
    calibrationStats: calibration,
  };
}

// ============================================================================
// EXPORT ALL LEARNING FUNCTIONS
// ============================================================================

export const kalshiLearningLoop = {
  logKalshiTrade,
  updateKalshiTradeOutcome,
  getKalshiCalibration,
  getCalibrationAdjustment,
  getAllKalshiCalibrations,
  getRecentKalshiTrades,
  applyLearnedEdge,
};

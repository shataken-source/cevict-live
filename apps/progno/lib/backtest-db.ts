/**
 * Backtesting Database Service
 * Handles saving/retrieving game outcomes, line movement, and prediction factors
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: any = null;
let hasWarnedAboutConfig = false;

function getClient() {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    return supabaseClient;
  } catch (error) {
    console.warn('[Backtest DB] Supabase not available:', error);
    return null;
  }
}

// ============== GAME OUTCOMES ==============

export interface GameOutcome {
  external_id: string;
  sport: string;
  sport_key?: string;
  home_team?: string;
  away_team?: string;
  game_date: string;
  commence_time?: string;
  home_score?: number;
  away_score?: number;
  winner?: 'home' | 'away' | 'push';
  total_points?: number;
  completed?: boolean;
  completed_at?: string;
  source?: string;
}

export async function saveGameOutcome(outcome: GameOutcome): Promise<{ id: string } | null> {
  const client = getClient();
  if (!client) {
    console.warn('[Backtest DB] Database not configured');
    return null;
  }

  try {
    // Calculate winner if scores provided
    if (outcome.home_score !== undefined && outcome.away_score !== undefined) {
      if (outcome.home_score > outcome.away_score) outcome.winner = 'home';
      else if (outcome.away_score > outcome.home_score) outcome.winner = 'away';
      else outcome.winner = 'push';
      
      outcome.total_points = outcome.home_score + outcome.away_score;
      outcome.completed = true;
      outcome.completed_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('game_outcomes')
      .upsert({
        ...outcome,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'external_id,sport,game_date',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Backtest DB] Error saving game outcome:', error);
      return null;
    }

    return { id: data.id };
  } catch (error) {
    console.error('[Backtest DB] Exception saving game outcome:', error);
    return null;
  }
}

export async function getGameOutcome(externalId: string, sport: string, gameDate: string): Promise<any | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('game_outcomes')
      .select('*')
      .eq('external_id', externalId)
      .eq('sport', sport.toLowerCase())
      .eq('game_date', gameDate)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    return null;
  }
}

// ============== ODDS LINE MOVEMENT ==============

export interface OddsLineSnapshot {
  external_id: string;
  sport: string;
  game_date: string;
  snapshot_type: 'opening' | 'morning' | 'afternoon' | 'closing' | 'custom';
  home_moneyline?: number;
  away_moneyline?: number;
  home_spread?: number;
  away_spread?: number;
  spread_line?: number;
  over_line?: number;
  under_line?: number;
  total_line?: number;
  odds_data?: any;
  hours_before_game?: number;
  bookmaker?: string;
  market_count?: number;
}

export async function saveOddsSnapshot(snapshot: OddsLineSnapshot): Promise<{ id: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('odds_line_movement')
      .upsert({
        ...snapshot,
        sport: snapshot.sport.toLowerCase(),
        snapshot_at: new Date().toISOString(),
      }, {
        onConflict: 'external_id,sport,game_date,snapshot_type,bookmaker',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Backtest DB] Error saving odds snapshot:', error);
      return null;
    }

    return { id: data.id };
  } catch (error) {
    console.error('[Backtest DB] Exception saving odds snapshot:', error);
    return null;
  }
}

export async function getLineMovement(
  externalId: string,
  sport: string,
  gameDate: string
): Promise<any[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('odds_line_movement')
      .select('*')
      .eq('external_id', externalId)
      .eq('sport', sport.toLowerCase())
      .eq('game_date', gameDate)
      .order('snapshot_at', { ascending: true });

    if (error) {
      console.error('[Backtest DB] Error fetching line movement:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

// ============== PREDICTION FACTORS ==============

export interface PredictionFactors {
  prediction_id: string;
  model_version?: string;
  algorithm_name?: string;
  factors?: Record<string, number>; // Feature weights
  key_metrics?: Record<string, any>; // Key data points
  data_sources?: string[];
  odds_snapshot_id?: string;
  confidence_breakdown?: Record<string, number>;
}

export async function savePredictionFactors(factors: PredictionFactors): Promise<{ id: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('prediction_factors')
      .insert({
        prediction_id: factors.prediction_id,
        model_version: factors.model_version || '1.0',
        algorithm_name: factors.algorithm_name || 'cevict-flex',
        factors: factors.factors || {},
        key_metrics: factors.key_metrics || {},
        data_sources: factors.data_sources || [],
        odds_snapshot_id: factors.odds_snapshot_id,
        confidence_breakdown: factors.confidence_breakdown || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Backtest DB] Error saving prediction factors:', error);
      return null;
    }

    return { id: data.id };
  } catch (error) {
    console.error('[Backtest DB] Exception saving prediction factors:', error);
    return null;
  }
}

export async function getPredictionFactors(predictionId: string): Promise<any | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('prediction_factors')
      .select('*')
      .eq('prediction_id', predictionId)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    return null;
  }
}

// ============== GRADING PREDICTIONS ==============

export interface GradePredictionInput {
  prediction_id: string;
  result: 'win' | 'loss' | 'push';
  profit: number;
  game_outcome_id?: string;
  odds_at_prediction?: number;
}

export async function gradePrediction(input: GradePredictionInput): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('progno_predictions')
      .update({
        result: input.result,
        profit: input.profit,
        game_outcome_id: input.game_outcome_id,
        odds_at_prediction: input.odds_at_prediction,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.prediction_id);

    if (error) {
      console.error('[Backtest DB] Error grading prediction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Backtest DB] Exception grading prediction:', error);
    return false;
  }
}

// ============== BACKTEST QUERIES ==============

export async function getGradedPredictions(filters: {
  sport?: string;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
  modelVersion?: string;
}): Promise<any[]> {
  const client = getClient();
  if (!client) return [];

  try {
    let query = client
      .from('backtest_ready_predictions')
      .select('*');

    if (filters.sport) {
      query = query.eq('sport', filters.sport);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.minConfidence) {
      query = query.gte('confidence', filters.minConfidence);
    }
    if (filters.modelVersion) {
      query = query.eq('model_version', filters.modelVersion);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Backtest DB] Error fetching graded predictions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

export async function calculateWinRate(filters: {
  sport?: string;
  startDate?: string;
  endDate?: string;
  minConfidence?: number;
}): Promise<{
  total_predictions: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  total_profit: number;
  avg_confidence: number;
} | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .rpc('calculate_win_rate', {
        sport_filter: filters.sport || null,
        start_date: filters.startDate || null,
        end_date: filters.endDate || null,
        min_confidence: filters.minConfidence || 0,
        model_version_filter: null,
      });

    if (error) {
      console.error('[Backtest DB] Error calculating win rate:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('[Backtest DB] Exception calculating win rate:', error);
    return null;
  }
}

// ============== BATCH OPERATIONS ==============

export async function batchSaveGameOutcomes(outcomes: GameOutcome[]): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  let saved = 0;
  for (const outcome of outcomes) {
    const result = await saveGameOutcome(outcome);
    if (result) saved++;
  }
  return saved;
}

export async function batchGradePredictions(grades: GradePredictionInput[]): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  let graded = 0;
  for (const grade of grades) {
    const success = await gradePrediction(grade);
    if (success) graded++;
  }
  return graded;
}

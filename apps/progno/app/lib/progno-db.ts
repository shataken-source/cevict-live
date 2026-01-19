/**
 * PROGNO Database Helper
 * Provides easy functions to save and retrieve predictions from the database
 */

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
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    return supabaseClient;
  } catch (error) {
    console.warn('[PROGNO DB] Supabase not available:', error);
    return null;
  }
}

export interface PredictionInput {
  prediction_type: string; // 'sports', 'weather', 'travel', 'anything', etc.
  category?: string; // 'NFL', 'NBA', 'hurricane', etc.
  question: string;
  context?: string;
  prediction_data: any; // JSON object with prediction-specific data
  confidence: number; // 0-100
  edge_pct?: number;
  risk_level?: 'low' | 'medium' | 'high';
  source?: string; // 'weekly-analyzer', 'anything-predictor', etc.
  user_id?: string;
  notes?: string;
}

export interface OutcomeInput {
  status: 'correct' | 'incorrect' | 'partial' | 'cancelled';
  outcome_data: any; // JSON object with actual outcome
  is_correct?: boolean;
  accuracy_score?: number; // 0-100
  confidence_accuracy?: number;
  profit?: number;
  outcome_type?: string;
  outcome_source?: string;
  outcome_notes?: string;
}

/**
 * Save a prediction to the database
 */
export async function savePrediction(input: PredictionInput): Promise<{ id: string } | null> {
  const client = getClient();
  if (!client) {
    if (!hasWarnedAboutConfig) {
      console.warn('[PROGNO DB] Database not configured (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required). Predictions will not be saved to database.');
      hasWarnedAboutConfig = true;
    }
    return null;
  }

  try {
    const { data, error } = await client
      .from('progno_predictions')
      .insert({
        prediction_type: input.prediction_type,
        category: input.category || null,
        question: input.question,
        context: input.context || null,
        prediction_data: input.prediction_data,
        confidence: Math.max(0, Math.min(100, input.confidence)),
        edge_pct: input.edge_pct || null,
        risk_level: input.risk_level || null,
        source: input.source || null,
        user_id: input.user_id || null,
        notes: input.notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[PROGNO DB] Save error:', error);
      return null;
    }

    // Send SMS notification if this is a sports prediction and admin phone is configured
    if (input.prediction_type === 'sports' && data.id) {
      try {
        const adminPhone = process.env.ADMIN_PHONE_NUMBER;
        const prognosticationUrl = process.env.PROGNOSTICATION_URL || process.env.NEXT_PUBLIC_PROGNOSTICATION_URL;

        if (adminPhone && prognosticationUrl) {
          const predictionData = input.prediction_data as any;
          const gameData = predictionData?.gameData || {};
          const prediction = predictionData?.prediction || {};
          const completeAnalysis = predictionData?.completeAnalysis || {};
          const wagerAnalysis = completeAnalysis?.wagerAnalysis || {};

          // Extract recommendedWager from multiple possible locations
          // Priority: wagerAnalysis.recommendedWager > prediction.stake > betSizeInfo.recommendedWager
          const recommendedWager =
            wagerAnalysis?.recommendedWager ||
            prediction?.stake ||
            predictionData?.betSizeInfo?.recommendedWager ||
            completeAnalysis?.prediction?.recommendedWager ||
            null;

          // Extract confidence from multiple possible locations
          // Priority: input.confidence (already validated) > completeAnalysis > prediction
          const confidenceValue =
            input.confidence ||
            (completeAnalysis?.prediction?.confidencePercentage) ||
            (prediction?.confidence ? Math.round(prediction.confidence * 100) : null) ||
            null;

          // Extract edge from multiple possible locations
          const edgeValue =
            input.edge_pct ||
            completeAnalysis?.prediction?.edgePercentage ||
            prediction?.edge ||
            null;

          // Call Prognostication SMS notification endpoint
          fetch(`${prognosticationUrl.replace(/\/+$/, '')}/api/sms/notify-pick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: adminPhone,
              gameId: data.id,
              game: `${gameData.awayTeam || ''} @ ${gameData.homeTeam || ''}`,
              homeTeam: gameData.homeTeam,
              awayTeam: gameData.awayTeam,
              pick: prediction.predictedWinner || prediction.recommendedBet?.side || completeAnalysis?.prediction?.predictedWinner || 'TBD',
              confidence: confidenceValue || input.confidence,
              edge: edgeValue || input.edge_pct || 0,
              odds: gameData.odds,
              spread: gameData.odds?.spread,
              total: gameData.odds?.total,
              gameTime: gameData.date,
              gameDate: gameData.date,
              sport: gameData.sport || gameData.league,
              league: gameData.league,
              recommendedWager: recommendedWager,
              betReasoning: input.notes || completeAnalysis?.analysis?.reasoning?.join('; ') || null,
              predictedScore: prediction.predictedScore || completeAnalysis?.prediction?.predictedScore || null,
            }),
          }).catch((err) => {
            console.warn('[PROGNO DB] Failed to send SMS notification:', err.message);
          });
        }
      } catch (err: any) {
        // Don't fail prediction save if SMS fails
        console.warn('[PROGNO DB] SMS notification error:', err.message);
      }
    }

    return { id: data.id };
  } catch (error: any) {
    console.error('[PROGNO DB] Save exception:', error);
    return null;
  }
}

/**
 * Record an outcome for a prediction
 */
export async function recordOutcome(
  predictionId: string,
  outcome: OutcomeInput
): Promise<boolean> {
  const client = getClient();
  if (!client) {
    // Only warn once to avoid spam during simulations
    if (!hasWarnedAboutConfig) {
      console.warn('[PROGNO DB] Database not configured (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required). Outcomes will not be recorded to database.');
      hasWarnedAboutConfig = true;
    }
    return false;
  }

  try {
    const updates: any = {
      status: outcome.status,
      outcome_data: outcome.outcome_data,
      outcome_recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (outcome.is_correct !== undefined) updates.is_correct = outcome.is_correct;
    if (outcome.accuracy_score !== undefined) updates.accuracy_score = outcome.accuracy_score;
    if (outcome.confidence_accuracy !== undefined) updates.confidence_accuracy = outcome.confidence_accuracy;
    if (outcome.profit !== undefined) updates.profit = outcome.profit;

    const { error: updateError } = await client
      .from('progno_predictions')
      .update(updates)
      .eq('id', predictionId);

    if (updateError) {
      console.error('[PROGNO DB] Update error:', updateError);
      return false;
    }

    // Also create an outcome record
    const { error: outcomeError } = await client
      .from('progno_outcomes')
      .insert({
        prediction_id: predictionId,
        outcome_type: outcome.outcome_type || 'manual_entry',
        outcome_data: outcome.outcome_data,
        source: outcome.outcome_source || 'api',
        notes: outcome.outcome_notes || null,
      });

    if (outcomeError) {
      console.error('[PROGNO DB] Outcome record error:', outcomeError);
      // Don't fail if outcome record fails, update was successful
    }

    return true;
  } catch (error: any) {
    console.error('[PROGNO DB] Record outcome exception:', error);
    return false;
  }
}

/**
 * Get win percentage and stats
 */
export async function getWinPercentage(filters?: {
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  win_percentage: number;
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
} | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    let query = client.from('progno_predictions').select('*');

    if (filters?.type) {
      query = query.eq('prediction_type', filters.type);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data: predictions, error } = await query;

    if (error || !predictions) {
      return null;
    }

    const total = predictions.length;
    const completed = predictions.filter(
      (p: any) => p.status !== 'pending' && p.status !== 'cancelled'
    ).length;
    const correct = predictions.filter((p: any) => p.is_correct === true).length;
    const incorrect = predictions.filter((p: any) => p.is_correct === false).length;
    const pending = predictions.filter((p: any) => p.status === 'pending').length;

    const winPercentage = completed > 0 ? (correct / completed) * 100 : 0;

    return {
      win_percentage: Math.round(winPercentage * 100) / 100,
      total,
      correct,
      incorrect,
      pending,
    };
  } catch (error: any) {
    console.error('[PROGNO DB] Get win percentage error:', error);
    return null;
  }
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}

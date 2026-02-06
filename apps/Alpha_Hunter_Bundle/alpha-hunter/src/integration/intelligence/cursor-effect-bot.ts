/**
 * CURSOR EFFECT BOT v1.0
 * ======================
 * Self-Learning System for Claude Effect Engine
 * 
 * This bot:
 * 1. Tracks all predictions and their layer contributions
 * 2. Records actual outcomes when markets resolve
 * 3. Adjusts layer weights based on what's working
 * 4. Runs periodic training cycles
 * 5. Stores learning history in Supabase
 * 
 * The "Cursor Effect" = AI that improves itself by learning from results
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LayerWeights, DEFAULT_WEIGHTS, LayerResult, ClaudeEffectResult } from './claude-effect-engine';

// Types
interface PredictionRecord {
  id: string;
  market_id: string;
  market_title: string;
  platform: 'kalshi' | 'coinbase';
  category: string;
  
  // Prediction details
  prediction: 'yes' | 'no' | 'buy' | 'sell';
  final_score: number;
  final_confidence: number;
  edge: number;
  
  // Layer contributions
  layer_scores: Record<string, number>;
  layer_signals: Record<string, string>;
  layer_confidences: Record<string, number>;
  
  // Weights used
  weights_used: LayerWeights;
  
  // Timestamps
  predicted_at: string;
  expires_at?: string;
  
  // Outcome (filled later)
  actual_outcome?: 'win' | 'loss' | null;
  resolved_at?: string;
  profit_loss?: number;
}

interface LayerPerformance {
  layer: string;
  total_predictions: number;
  correct_when_bullish: number;
  total_bullish: number;
  correct_when_bearish: number;
  total_bearish: number;
  avg_score_on_wins: number;
  avg_score_on_losses: number;
  accuracy: number;
  suggested_weight_change: number;
}

interface LearningCycle {
  id: string;
  cycle_number: number;
  started_at: string;
  completed_at?: string;
  predictions_analyzed: number;
  old_weights: LayerWeights;
  new_weights: LayerWeights;
  performance_delta: number;
  notes: string[];
}

export class CursorEffectBot {
  private supabase: SupabaseClient;
  private currentWeights: LayerWeights;
  private isRunning = false;
  private cycleNumber = 0;

  // Learning parameters
  private readonly MIN_SAMPLES_FOR_LEARNING = 20;
  private readonly MAX_WEIGHT_CHANGE_PER_CYCLE = 0.05; // 5% max change
  private readonly LEARNING_RATE = 0.1;
  private readonly MOMENTUM = 0.9;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.currentWeights = { ...DEFAULT_WEIGHTS };
  }

  /**
   * Initialize the bot - load last known weights
   */
  async initialize(): Promise<void> {
    console.log('🤖 Cursor Effect Bot initializing...');
    
    try {
      // Load latest weights from database
      const { data: latestCycle } = await this.supabase
        .from('cursor_effect_cycles')
        .select('*')
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      if (latestCycle?.new_weights) {
        this.currentWeights = latestCycle.new_weights;
        this.cycleNumber = latestCycle.cycle_number;
        console.log(`   ✅ Loaded weights from cycle ${this.cycleNumber}`);
      } else {
        console.log('   📝 Using default weights (no history found)');
      }
      
      // Ensure tables exist
      await this.ensureTablesExist();
      
      console.log('   ✅ Cursor Effect Bot ready');
      console.log(`   📊 Current weights:`, this.currentWeights);
    } catch (err: any) {
      console.warn(`   ⚠️ Init warning: ${err.message}`);
      console.log('   📝 Using default weights');
    }
  }

  /**
   * Ensure required database tables exist
   */
  private async ensureTablesExist(): Promise<void> {
    // Tables should be created via Supabase migrations
    // This is a placeholder for the expected schema
    const requiredTables = [
      'cursor_effect_predictions',
      'cursor_effect_cycles',
      'cursor_effect_layer_stats'
    ];
    
    console.log(`   📋 Expected tables: ${requiredTables.join(', ')}`);
  }

  /**
   * Record a new prediction with all layer data
   */
  async recordPrediction(
    marketId: string,
    marketTitle: string,
    platform: 'kalshi' | 'coinbase',
    category: string,
    result: ClaudeEffectResult,
    expiresAt?: string
  ): Promise<string | null> {
    try {
      const record: PredictionRecord = {
        id: `ce_${marketId}_${Date.now()}`,
        market_id: marketId,
        market_title: marketTitle,
        platform,
        category,
        prediction: result.prediction,
        final_score: result.finalScore,
        final_confidence: result.finalConfidence,
        edge: result.edge,
        layer_scores: {},
        layer_signals: {},
        layer_confidences: {},
        weights_used: result.weights,
        predicted_at: new Date().toISOString(),
        expires_at: expiresAt,
        actual_outcome: null,
      };

      // Extract layer data
      result.layers.forEach(layer => {
        const key = this.getLayerKey(layer.layer);
        record.layer_scores[key] = layer.score;
        record.layer_signals[key] = layer.signal;
        record.layer_confidences[key] = layer.confidence;
      });

      const { error } = await this.supabase
        .from('cursor_effect_predictions')
        .insert(record);

      if (error) {
        console.warn(`   ⚠️ Failed to record prediction: ${error.message}`);
        return null;
      }

      console.log(`   📝 Cursor Effect: Recorded prediction ${record.id}`);
      return record.id;
    } catch (err: any) {
      console.warn(`   ⚠️ Record error: ${err.message}`);
      return null;
    }
  }

  /**
   * Update a prediction with actual outcome
   */
  async recordOutcome(
    predictionId: string,
    outcome: 'win' | 'loss',
    profitLoss: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cursor_effect_predictions')
        .update({
          actual_outcome: outcome,
          resolved_at: new Date().toISOString(),
          profit_loss: profitLoss,
        })
        .eq('id', predictionId);

      if (error) {
        console.warn(`   ⚠️ Failed to record outcome: ${error.message}`);
        return;
      }

      console.log(`   ✅ Cursor Effect: Recorded ${outcome} for ${predictionId}`);
      
      // Check if we should trigger learning
      await this.checkLearningTrigger();
    } catch (err: any) {
      console.warn(`   ⚠️ Outcome error: ${err.message}`);
    }
  }

  /**
   * Update outcome by market ID (easier for integration)
   */
  async recordOutcomeByMarket(
    marketId: string,
    outcome: 'win' | 'loss',
    profitLoss: number
  ): Promise<void> {
    try {
      // Find the prediction
      const { data: predictions } = await this.supabase
        .from('cursor_effect_predictions')
        .select('id')
        .eq('market_id', marketId)
        .is('actual_outcome', null)
        .order('predicted_at', { ascending: false })
        .limit(1);

      if (predictions && predictions.length > 0) {
        await this.recordOutcome(predictions[0].id, outcome, profitLoss);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Market outcome error: ${err.message}`);
    }
  }

  /**
   * Check if we have enough data to trigger learning
   */
  private async checkLearningTrigger(): Promise<void> {
    try {
      const { count } = await this.supabase
        .from('cursor_effect_predictions')
        .select('*', { count: 'exact', head: true })
        .not('actual_outcome', 'is', null)
        .gte('predicted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (count && count >= this.MIN_SAMPLES_FOR_LEARNING) {
        console.log(`   🧠 Cursor Effect: ${count} resolved predictions - triggering learning...`);
        await this.runLearningCycle();
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Learning trigger check failed: ${err.message}`);
    }
  }

  /**
   * Run a full learning cycle
   */
  async runLearningCycle(): Promise<LayerWeights> {
    console.log('\n🧠 ═══════════════════════════════════════');
    console.log('🧠 CURSOR EFFECT: Starting Learning Cycle');
    console.log('🧠 ═══════════════════════════════════════\n');

    const startTime = Date.now();
    const notes: string[] = [];
    
    try {
      // 1. Fetch resolved predictions
      const { data: predictions } = await this.supabase
        .from('cursor_effect_predictions')
        .select('*')
        .not('actual_outcome', 'is', null)
        .order('predicted_at', { ascending: false })
        .limit(500);

      if (!predictions || predictions.length < this.MIN_SAMPLES_FOR_LEARNING) {
        notes.push(`Insufficient data: ${predictions?.length || 0} samples`);
        console.log(`   ⚠️ Not enough data for learning (${predictions?.length || 0} < ${this.MIN_SAMPLES_FOR_LEARNING})`);
        return this.currentWeights;
      }

      console.log(`   📊 Analyzing ${predictions.length} resolved predictions...`);
      notes.push(`Analyzed ${predictions.length} predictions`);

      // 2. Calculate layer performance
      const layerPerformance = this.calculateLayerPerformance(predictions);
      
      // 3. Log performance
      console.log('\n   📈 Layer Performance:');
      layerPerformance.forEach(lp => {
        const emoji = lp.suggested_weight_change > 0 ? '⬆️' : lp.suggested_weight_change < 0 ? '⬇️' : '➡️';
        console.log(`      ${emoji} ${lp.layer}: ${(lp.accuracy * 100).toFixed(1)}% accuracy (${lp.total_predictions} samples)`);
      });

      // 4. Calculate new weights
      const oldWeights = { ...this.currentWeights };
      const newWeights = this.calculateNewWeights(layerPerformance);

      // 5. Calculate performance delta
      const wins = predictions.filter((p: any) => p.actual_outcome === 'win').length;
      const performanceDelta = wins / predictions.length;
      notes.push(`Win rate: ${(performanceDelta * 100).toFixed(1)}%`);

      // 6. Log weight changes
      console.log('\n   🔧 Weight Updates:');
      const layerNames: (keyof LayerWeights)[] = [
        'sentimentField', 'narrativeMomentum', 'informationAsymmetry',
        'networkInfluence', 'emergentPatterns', 'baseAnalysis'
      ];
      
      layerNames.forEach(layer => {
        const change = newWeights[layer] - oldWeights[layer];
        if (Math.abs(change) > 0.001) {
          const emoji = change > 0 ? '⬆️' : '⬇️';
          console.log(`      ${emoji} ${layer}: ${(oldWeights[layer] * 100).toFixed(1)}% → ${(newWeights[layer] * 100).toFixed(1)}%`);
          notes.push(`${layer}: ${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%`);
        }
      });

      // 7. Update current weights
      this.currentWeights = newWeights;
      this.cycleNumber++;

      // 8. Save cycle to database
      const cycle: Partial<LearningCycle> = {
        id: `cycle_${Date.now()}`,
        cycle_number: this.cycleNumber,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        predictions_analyzed: predictions.length,
        old_weights: oldWeights,
        new_weights: newWeights,
        performance_delta: performanceDelta,
        notes,
      };

      await this.supabase
        .from('cursor_effect_cycles')
        .insert(cycle);

      // 9. Save layer stats
      for (const lp of layerPerformance) {
        await this.supabase
          .from('cursor_effect_layer_stats')
          .insert({
            cycle_id: cycle.id,
            layer: lp.layer,
            accuracy: lp.accuracy,
            total_predictions: lp.total_predictions,
            correct_bullish: lp.correct_when_bullish,
            total_bullish: lp.total_bullish,
            correct_bearish: lp.correct_when_bearish,
            total_bearish: lp.total_bearish,
            suggested_change: lp.suggested_weight_change,
          });
      }

      const duration = Date.now() - startTime;
      console.log(`\n   ✅ Learning cycle ${this.cycleNumber} complete in ${duration}ms`);
      console.log('🧠 ═══════════════════════════════════════\n');

      return newWeights;
    } catch (err: any) {
      console.error(`   ❌ Learning cycle failed: ${err.message}`);
      return this.currentWeights;
    }
  }

  /**
   * Calculate performance metrics for each layer
   */
  private calculateLayerPerformance(predictions: any[]): LayerPerformance[] {
    const layers = ['sf', 'nm', 'iai', 'csi', 'nig', 'trd', 'epd'];
    const layerNames: Record<string, string> = {
      sf: 'Sentiment Field',
      nm: 'Narrative Momentum',
      iai: 'Information Asymmetry',
      csi: 'Chaos Sensitivity',
      nig: 'Network Influence',
      trd: 'Temporal Relevance',
      epd: 'Emergent Patterns',
    };

    return layers.map(layer => {
      let correctBullish = 0;
      let totalBullish = 0;
      let correctBearish = 0;
      let totalBearish = 0;
      let scoreOnWins: number[] = [];
      let scoreOnLosses: number[] = [];

      predictions.forEach((pred: any) => {
        const signal = pred.layer_signals?.[layer];
        const score = pred.layer_scores?.[layer] || 50;
        const won = pred.actual_outcome === 'win';

        if (signal === 'bullish') {
          totalBullish++;
          if (won) correctBullish++;
        } else if (signal === 'bearish') {
          totalBearish++;
          if (won) correctBearish++;
        }

        if (won) {
          scoreOnWins.push(score);
        } else {
          scoreOnLosses.push(score);
        }
      });

      const totalSignals = totalBullish + totalBearish;
      const correctSignals = correctBullish + correctBearish;
      const accuracy = totalSignals > 0 ? correctSignals / totalSignals : 0.5;

      const avgScoreWins = scoreOnWins.length > 0 
        ? scoreOnWins.reduce((a, b) => a + b, 0) / scoreOnWins.length 
        : 50;
      const avgScoreLosses = scoreOnLosses.length > 0 
        ? scoreOnLosses.reduce((a, b) => a + b, 0) / scoreOnLosses.length 
        : 50;

      // Suggest weight change based on performance
      let suggestedChange = 0;
      if (accuracy > 0.55) {
        suggestedChange = Math.min(this.MAX_WEIGHT_CHANGE_PER_CYCLE, (accuracy - 0.5) * this.LEARNING_RATE);
      } else if (accuracy < 0.45) {
        suggestedChange = Math.max(-this.MAX_WEIGHT_CHANGE_PER_CYCLE, (accuracy - 0.5) * this.LEARNING_RATE);
      }

      return {
        layer: layerNames[layer] || layer,
        total_predictions: predictions.length,
        correct_when_bullish: correctBullish,
        total_bullish: totalBullish,
        correct_when_bearish: correctBearish,
        total_bearish: totalBearish,
        avg_score_on_wins: avgScoreWins,
        avg_score_on_losses: avgScoreLosses,
        accuracy,
        suggested_weight_change: suggestedChange,
      };
    });
  }

  /**
   * Calculate new weights based on layer performance
   */
  private calculateNewWeights(performance: LayerPerformance[]): LayerWeights {
    const newWeights = { ...this.currentWeights };

    // Map layer names to weight keys
    const layerToWeight: Record<string, keyof LayerWeights> = {
      'Sentiment Field': 'sentimentField',
      'Narrative Momentum': 'narrativeMomentum',
      'Information Asymmetry': 'informationAsymmetry',
      'Network Influence': 'networkInfluence',
      'Emergent Patterns': 'emergentPatterns',
    };

    // Apply suggested changes
    performance.forEach(lp => {
      const weightKey = layerToWeight[lp.layer];
      if (weightKey && weightKey in newWeights) {
        const currentWeight = newWeights[weightKey];
        const change = lp.suggested_weight_change * this.MOMENTUM;
        
        // Apply change with bounds
        newWeights[weightKey] = Math.max(0.05, Math.min(0.35, currentWeight + change));
      }
    });

    // Normalize weights to sum to ~0.80 (leaving 0.20 for modifiers)
    const additiveKeys: (keyof LayerWeights)[] = [
      'sentimentField', 'narrativeMomentum', 'informationAsymmetry',
      'networkInfluence', 'emergentPatterns', 'baseAnalysis'
    ];
    
    const sum = additiveKeys.reduce((s, k) => s + newWeights[k], 0);
    const targetSum = 0.80;
    
    if (sum > 0) {
      const scale = targetSum / sum;
      additiveKeys.forEach(k => {
        newWeights[k] = Math.round(newWeights[k] * scale * 1000) / 1000;
      });
    }

    return newWeights;
  }

  /**
   * Get layer key from full name
   */
  private getLayerKey(layerName: string): string {
    if (layerName.includes('Sentiment')) return 'sf';
    if (layerName.includes('Narrative')) return 'nm';
    if (layerName.includes('Asymmetry')) return 'iai';
    if (layerName.includes('Chaos')) return 'csi';
    if (layerName.includes('Network')) return 'nig';
    if (layerName.includes('Temporal')) return 'trd';
    if (layerName.includes('Pattern')) return 'epd';
    return layerName.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Get current optimized weights
   */
  getWeights(): LayerWeights {
    return { ...this.currentWeights };
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<{
    totalPredictions: number;
    resolvedPredictions: number;
    winRate: number;
    cyclesCompleted: number;
    lastCycleAt: string | null;
  }> {
    try {
      const { count: total } = await this.supabase
        .from('cursor_effect_predictions')
        .select('*', { count: 'exact', head: true });

      const { data: resolved } = await this.supabase
        .from('cursor_effect_predictions')
        .select('actual_outcome')
        .not('actual_outcome', 'is', null);

      const wins = resolved?.filter((r: any) => r.actual_outcome === 'win').length || 0;
      const resolvedCount = resolved?.length || 0;

      const { data: lastCycle } = await this.supabase
        .from('cursor_effect_cycles')
        .select('completed_at')
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      return {
        totalPredictions: total || 0,
        resolvedPredictions: resolvedCount,
        winRate: resolvedCount > 0 ? wins / resolvedCount : 0,
        cyclesCompleted: this.cycleNumber,
        lastCycleAt: lastCycle?.completed_at || null,
      };
    } catch {
      return {
        totalPredictions: 0,
        resolvedPredictions: 0,
        winRate: 0,
        cyclesCompleted: 0,
        lastCycleAt: null,
      };
    }
  }

  /**
   * Manual trigger for learning cycle
   */
  async forceLearning(): Promise<LayerWeights> {
    console.log('🧠 Cursor Effect: Force-triggering learning cycle...');
    return await this.runLearningCycle();
  }

  /**
   * Start periodic learning (run every N hours)
   */
  startPeriodicLearning(intervalHours: number = 6): void {
    if (this.isRunning) {
      console.log('   ⚠️ Periodic learning already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    console.log(`🤖 Cursor Effect: Starting periodic learning (every ${intervalHours}h)`);

    setInterval(async () => {
      if (this.isRunning) {
        await this.runLearningCycle();
      }
    }, intervalMs);
  }

  /**
   * Stop periodic learning
   */
  stopPeriodicLearning(): void {
    this.isRunning = false;
    console.log('🤖 Cursor Effect: Stopped periodic learning');
  }
}

// Singleton instance
let cursorBotInstance: CursorEffectBot | null = null;

export async function getCursorEffectBot(): Promise<CursorEffectBot> {
  if (!cursorBotInstance) {
    cursorBotInstance = new CursorEffectBot();
    await cursorBotInstance.initialize();
  }
  return cursorBotInstance;
}

export default CursorEffectBot;

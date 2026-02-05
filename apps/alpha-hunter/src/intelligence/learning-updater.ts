/**
 * Learning Updater
 *
 * Reads settled outcomes from Supabase and adjusts trading parameters per category.
 * This is intentionally conservative: it tightens after losses and loosens after
 * sustained wins, all within strict bounds.
 */

import { getBotPredictions, updateBotMetrics } from "../lib/supabase-memory";
import {
  getRecentClosedTradeRecords,
  getStrategyParams,
  upsertStrategyParams,
  saveBotLearning,
} from "../lib/supabase-memory";

type Bounds = {
  minConfidence: { min: number; max: number };
  minEdge: { min: number; max: number };
  maxTradeUsd: { min: number; max: number };
  dailySpendingLimit: { min: number; max: number };
  maxOpenPositions: { min: number; max: number };
};

const DEFAULT_BOUNDS: Bounds = {
  minConfidence: { min: 50, max: 85 },
  minEdge: { min: 1, max: 10 },
  maxTradeUsd: { min: 1, max: 25 },
  dailySpendingLimit: { min: 5, max: 250 },
  maxOpenPositions: { min: 1, max: 20 },
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export class LearningUpdater {
  private bounds: Bounds;

  constructor(bounds: Bounds = DEFAULT_BOUNDS) {
    this.bounds = bounds;
  }

  private async updateMetricsForCategory(category: string): Promise<void> {
    const preds = await getBotPredictions(category, "kalshi", 500);
    const completed = preds.filter(p => p.actual_outcome !== null);
    if (completed.length === 0) return;

    const wins = completed.filter(p => p.actual_outcome === "win").length;
    const total = completed.length;
    const accuracy = (wins / total) * 100;
    const totalPnl = completed.reduce((sum, p) => sum + Number(p.pnl || 0), 0);
    const avgEdge = completed.reduce((sum, p) => sum + Number(p.edge || 0), 0) / total;
    const avgConfidence = completed.reduce((sum, p) => sum + Number(p.confidence || 0), 0) / total;

    await updateBotMetrics({
      bot_category: category,
      total_predictions: total,
      correct_predictions: wins,
      accuracy,
      total_pnl: totalPnl,
      avg_edge: avgEdge,
      avg_confidence: avgConfidence,
      last_updated: new Date(),
    });
  }

  /**
   * Adjust strategy params for a category based on recent trade outcomes.
   */
  private async adjustStrategyForCategory(category: string): Promise<void> {
    const recentTrades = await getRecentClosedTradeRecords("kalshi", 500);
    const catTrades = recentTrades.filter(t => (t.bot_category || "unknown") === category);
    if (catTrades.length < 10) return; // not enough signal

    const sample = catTrades.slice(0, 100);
    const wins = sample.filter(t => t.outcome === "win").length;
    const losses = sample.filter(t => t.outcome === "loss").length;
    const winRate = (wins / (wins + losses)) * 100;
    const pnl = sample.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

    const current =
      (await getStrategyParams("kalshi", category)) || {
        platform: "kalshi" as const,
        bot_category: category,
        min_confidence: 55,
        min_edge: 2,
        max_trade_usd: 5,
        daily_spending_limit: 50,
        max_open_positions: 5,
      };

    let nextMinConfidence = current.min_confidence;
    let nextMinEdge = current.min_edge;
    let nextMaxTradeUsd = current.max_trade_usd;

    // Conservative adaptation:
    // - If negative PnL or low win rate: tighten filters + reduce size
    // - If positive PnL and strong win rate: cautiously loosen + increase size
    if (pnl < 0 || winRate < 45) {
      nextMinConfidence += 2;
      nextMinEdge += 0.5;
      nextMaxTradeUsd -= 1;
      await saveBotLearning({
        bot_category: category,
        pattern_type: "losing_pattern",
        pattern_description: "threshold_adjustment:tighten",
        confidence: clamp(60 + (45 - winRate), 50, 90),
        times_observed: 1,
        success_rate: clamp(winRate, 0, 100),
        learned_at: new Date(),
        metadata: { winRate, pnl, sampleSize: sample.length },
      });
    } else if (pnl > 0 && winRate > 55) {
      nextMinConfidence -= 1;
      nextMinEdge -= 0.25;
      nextMaxTradeUsd += 1;
      await saveBotLearning({
        bot_category: category,
        pattern_type: "winning_pattern",
        pattern_description: "threshold_adjustment:loosen",
        confidence: clamp(50 + (winRate - 50), 50, 90),
        times_observed: 1,
        success_rate: clamp(winRate, 0, 100),
        learned_at: new Date(),
        metadata: { winRate, pnl, sampleSize: sample.length },
      });
    } else {
      // No change; still update metrics elsewhere
      return;
    }

    // Apply bounds
    nextMinConfidence = clamp(nextMinConfidence, this.bounds.minConfidence.min, this.bounds.minConfidence.max);
    nextMinEdge = clamp(nextMinEdge, this.bounds.minEdge.min, this.bounds.minEdge.max);
    nextMaxTradeUsd = clamp(nextMaxTradeUsd, this.bounds.maxTradeUsd.min, this.bounds.maxTradeUsd.max);

    await upsertStrategyParams({
      platform: "kalshi",
      bot_category: category,
      min_confidence: nextMinConfidence,
      min_edge: nextMinEdge,
      max_trade_usd: nextMaxTradeUsd,
      daily_spending_limit: clamp(
        current.daily_spending_limit,
        this.bounds.dailySpendingLimit.min,
        this.bounds.dailySpendingLimit.max
      ),
      max_open_positions: clamp(
        current.max_open_positions,
        this.bounds.maxOpenPositions.min,
        this.bounds.maxOpenPositions.max
      ),
    });
  }

  async runOnce(): Promise<void> {
    // 1) Update bot_metrics from outcomes (predictions table)
    const categories = [
      "crypto",
      "politics",
      "economics",
      "entertainment",
      "sports",
      "weather",
      "technology",
      "health",
      "world",
      "companies",
      "financials",
      "climate",
      "culture",
      "unknown",
    ];

    for (const cat of categories) {
      await this.updateMetricsForCategory(cat);
      await this.adjustStrategyForCategory(cat);
    }
  }
}


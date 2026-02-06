/**
 * REJECTION TRACKER
 * Tracks predictions we rejected and checks if they would have won
 */

import { createClient } from '@supabase/supabase-js';

interface RejectedPrediction {
  id: string;
  market_id: string;
  market_title: string;
  category: string;
  predicted_side: 'yes' | 'no';
  confidence: number;
  edge: number;
  rejection_reason: string;
  thresholds: {
    confidence_required: number;
    edge_required: number;
  };
  market_price_at_rejection: number;
  predicted_at: Date;
}

export class RejectionTracker {
  private supabase: any;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Record a rejected prediction for later analysis
   */
  async recordRejection(prediction: {
    market_id: string;
    market_title: string;
    category: string;
    predicted_side: 'yes' | 'no';
    confidence: number;
    edge: number;
    market_price: number;
    rejection_reason: 'low_confidence' | 'low_edge' | 'duplicate' | 'daily_limit' | 'position_limit' | 'other';
    thresholds: { confidence_required: number; edge_required: number };
    reasoning?: string[];
    factors?: string[];
  }): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('bot_predictions').insert({
        market_id: prediction.market_id,
        market_title: prediction.market_title,
        category: prediction.category,
        predicted_side: prediction.predicted_side,
        confidence: prediction.confidence,
        edge: prediction.edge,
        market_price: prediction.market_price,
        was_rejected: true,
        rejection_reason: prediction.rejection_reason,
        rejection_thresholds: prediction.thresholds,
        reasoning: prediction.reasoning,
        factors: prediction.factors,
        predicted_at: new Date().toISOString(),
        // These will be filled in later when market resolves
        actual_outcome: null,
        would_have_won: null,
        missed_profit: null,
      });

      console.log(`   📝 Recorded rejection: ${prediction.market_title.substring(0, 40)}...`);
    } catch (error) {
      console.error('Failed to record rejection:', error);
    }
  }

  /**
   * Check resolved markets and update rejection outcomes
   */
  async updateRejectionOutcomes(): Promise<{
    updated: number;
    wouldHaveWon: number;
    missedProfit: number;
  }> {
    if (!this.supabase) return { updated: 0, wouldHaveWon: 0, missedProfit: 0 };

    // Get rejections without outcomes
    const { data: pendingRejections } = await this.supabase
      .from('bot_predictions')
      .select('*')
      .eq('was_rejected', true)
      .is('would_have_won', null)
      .order('predicted_at', { ascending: true })
      .limit(100);

    if (!pendingRejections?.length) {
      return { updated: 0, wouldHaveWon: 0, missedProfit: 0 };
    }

    let updated = 0;
    let wouldHaveWon = 0;
    let missedProfit = 0;

    for (const rejection of pendingRejections) {
      // Check if market has resolved (would need Kalshi API or market resolution data)
      const resolution = await this.checkMarketResolution(rejection.market_id);
      
      if (resolution) {
        const won = (rejection.predicted_side === 'yes' && resolution.outcome === 'yes') ||
                    (rejection.predicted_side === 'no' && resolution.outcome === 'no');
        
        // Calculate what profit would have been
        // If we bet $5 at the rejected price...
        const betSize = 5;
        const profit = won 
          ? betSize * (1 - rejection.market_price / 100) - (betSize * 0.006) // Win minus fees
          : -betSize - (betSize * 0.006); // Loss plus fees

        await this.supabase
          .from('bot_predictions')
          .update({
            actual_outcome: won ? 'win' : 'loss',
            would_have_won: won,
            missed_profit: won ? profit : 0,
          })
          .eq('id', rejection.id);

        updated++;
        if (won) {
          wouldHaveWon++;
          missedProfit += profit;
        }
      }
    }

    console.log(`\n📊 REJECTION OUTCOMES UPDATED:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Would have won: ${wouldHaveWon}`);
    console.log(`   Missed profit: $${missedProfit.toFixed(2)}`);

    return { updated, wouldHaveWon, missedProfit };
  }

  /**
   * Check if a market has resolved (placeholder - needs real implementation)
   */
  private async checkMarketResolution(marketId: string): Promise<{ outcome: 'yes' | 'no' } | null> {
    if (!this.supabase) return null;
    
    // TODO: Implement actual market resolution check via Kalshi API
    // For now, check if we have resolution data in our database
    
    const { data } = await this.supabase
      .from('market_resolutions')
      .select('outcome')
      .eq('market_id', marketId)
      .single();

    return data;
  }

  /**
   * Get rejection statistics by category
   */
  async getRejectionStats(category?: string): Promise<{
    category: string;
    totalRejections: number;
    resolvedRejections: number;
    wouldHaveWon: number;
    winRate: number;
    missedProfit: number;
    avgRejectedConfidence: number;
    avgRejectedEdge: number;
    topRejectionReasons: { reason: string; count: number }[];
  }[]> {
    if (!this.supabase) return [];

    let query = this.supabase
      .from('bot_predictions')
      .select('*')
      .eq('was_rejected', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: rejections } = await query;
    if (!rejections?.length) return [];

    // Group by category
    const byCategory = new Map<string, typeof rejections>();
    for (const r of rejections) {
      const cat = r.category || 'unknown';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(r);
    }

    const stats = [];
    for (const [cat, catRejections] of byCategory) {
      const resolved = catRejections.filter(r => r.would_have_won !== null);
      const winners = resolved.filter(r => r.would_have_won);
      
      // Count rejection reasons
      const reasonCounts = new Map<string, number>();
      for (const r of catRejections) {
        const reason = r.rejection_reason || 'unknown';
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }

      stats.push({
        category: cat,
        totalRejections: catRejections.length,
        resolvedRejections: resolved.length,
        wouldHaveWon: winners.length,
        winRate: resolved.length > 0 ? (winners.length / resolved.length) * 100 : 0,
        missedProfit: winners.reduce((sum, r) => sum + (r.missed_profit || 0), 0),
        avgRejectedConfidence: catRejections.reduce((sum, r) => sum + (r.confidence || 0), 0) / catRejections.length,
        avgRejectedEdge: catRejections.reduce((sum, r) => sum + (r.edge || 0), 0) / catRejections.length,
        topRejectionReasons: Array.from(reasonCounts.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      });
    }

    return stats;
  }
}

export const rejectionTracker = new RejectionTracker();


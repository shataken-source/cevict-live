/**
 * Prognostication Homepage Sync
 *
 * Pushes high-confidence Kalshi probabilities to the Prognostication homepage
 * after every market analysis cycle (even if no trades are executed).
 */

import * as fs from 'fs';
import * as path from 'path';
import { syncToPrognostication } from '../services/trade-safety';
import { saveBotPrediction, BotPrediction } from '../lib/supabase-memory';

export interface KalshiPickForPrognostication {
  marketId: string;
  title: string;
  category: string;
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  learnedFrom: string[];
  yesPrice: number;
  noPrice: number;
  expiresAt?: Date;
  amount?: number;
}

export interface PrognostationUpdate {
  timestamp: string;
  picks: KalshiPickForPrognostication[];
  stats: {
    totalMarkets: number;
    highConfidencePicks: number;
    avgEdge: number;
    avgConfidence: number;
  };
}

export class PrognosticationSync {
  private prognoBaseUrl: string;
  private prognoApiKey: string;
  private lastUpdate: Date | null = null;
  private minConfidence: number = 60; // Minimum confidence to post
  private minEdge: number = 2.0; // Minimum edge to post

  constructor() {
    this.prognoBaseUrl = (process.env.PROGNOSTICATION_URL || 'https://prognostication.com').replace(/\/$/, '');
    this.prognoApiKey = process.env.PROGNO_INTERNAL_API_KEY || '';
  }

  /**
   * Push high-confidence Kalshi picks to Prognostication homepage
   * This runs after EVERY analysis cycle, not just when trades execute
   */
  async updatePrognosticationHomepage(allOpportunities: any[]): Promise<void> {
    try {
      console.log('\n📡 Syncing high-confidence picks to Prognostication homepage...');

      // Filter for high-confidence opportunities
      const highConfidencePicks = allOpportunities
        .filter(opp => opp.confidence >= this.minConfidence && opp.edge >= this.minEdge)
        .sort((a, b) => b.edge - a.edge)
        .slice(0, 20); // Top 20 picks

      if (highConfidencePicks.length === 0) {
        console.log('   ℹ️  No high-confidence picks to sync this cycle');
        return;
      }

      // Transform to Prognostication format
      const picks: KalshiPickForPrognostication[] = highConfidencePicks.map(opp => ({
        marketId: opp.marketId || opp.id || 'unknown',
        title: opp.title || opp.market || 'Unknown Market',
        category: this.categorizeMarket(opp.title || ''),
        prediction: opp.side === 'yes' ? 'yes' : 'no',
        probability: opp.confidence || 50,
        confidence: opp.confidence || 50,
        edge: opp.edge || 0,
        reasoning: opp.reasoning || [],
        factors: opp.factors || [],
        learnedFrom: opp.learnedFrom || [],
        yesPrice: opp.yesPrice || 50,
        noPrice: opp.noPrice || 50,
        expiresAt: opp.expiresAt ? new Date(opp.expiresAt) : undefined,
      }));

      const update: PrognostationUpdate = {
        timestamp: new Date().toISOString(),
        picks,
        stats: {
          totalMarkets: allOpportunities.length,
          highConfidencePicks: picks.length,
          avgEdge: picks.reduce((sum, p) => sum + p.edge, 0) / picks.length,
          avgConfidence: picks.reduce((sum, p) => sum + p.confidence, 0) / picks.length,
        },
      };

      // BUG #8: Deduplication - Only sync if not recently synced
      // Use first pick's marketId as sync key (or use a hash of all picks)
      const syncKey = picks.length > 0 ? picks[0].marketId : 'batch';
      const syncResult = await syncToPrognostication(
        { ticker: syncKey, picks: picks.map(p => p.marketId) },
        async () => {
          // Write to local file for prognostication to read
          await this.writePicksFile(update);
          // POST to Prognostication API
          await this.postToPrognosticationAPI(picks);
          // Write to Supabase so Prognostication can read from bot_predictions
          await this.savePicksToSupabase(picks);
          this.lastUpdate = new Date();
        }
      );

      if (!syncResult.synced && syncResult.reason) {
        console.log(`   ⏭️ Sync skipped: ${syncResult.reason}`);
        return;
      }

      console.log(`   ✅ Synced ${picks.length} picks to Prognostication (avg edge: ${update.stats.avgEdge.toFixed(1)}%)`);
    } catch (error: any) {
      console.error('   ❌ Failed to sync to Prognostication:', error.message);
    }
  }

  /**
   * Write picks to local JSON file that Prognostication reads
   */
  private async writePicksFile(update: PrognostationUpdate): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), '.kalshi-picks.json');
      fs.writeFileSync(filePath, JSON.stringify(update, null, 2), 'utf8');
      console.log(`   📄 Wrote picks to ${filePath}`);
    } catch (error: any) {
      console.error(`   ⚠️  Failed to write picks file: ${error.message}`);
    }
  }

  /**
   * POST picks to Prognostication API endpoint
   */
  private async postToPrognosticationAPI(picks: KalshiPickForPrognostication[]): Promise<void> {
    if (!this.prognoApiKey) {
      console.log('   ⚠️  PROGNO_INTERNAL_API_KEY not set — skipping API post');
      return;
    }
    try {
      const batchId = `alpha-kalshi-${Date.now()}`;
      const payload = {
        tier: 'elite',
        picks: picks.map(p => ({
          game_id: p.marketId,
          sport: p.category?.toUpperCase() || 'KALSHI',
          home_team: '',
          away_team: '',
          pick: p.prediction === 'yes' ? p.title : `NO: ${p.title}`,
          confidence: p.confidence,
          odds: null,
          expected_value: p.edge,
          edge: p.edge,
          analysis: p.reasoning.join(' '),
        })),
        batchId,
        timestamp: new Date().toISOString(),
        source: 'alpha-hunter',
        checksum: batchId,
      };

      const response = await fetch(`${this.prognoBaseUrl}/api/webhooks/progno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-progno-api-key': this.prognoApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log(`   🌐 Posted ${picks.length} Kalshi picks to Prognostication (processed: ${data.processed})`);
    } catch (error: any) {
      console.log(`   ⚠️  Prognostication API unavailable: ${error.message} (file fallback active)`);
    }
  }

  /**
   * Write picks to Supabase bot_predictions table for Prognostication to read
   */
  private async savePicksToSupabase(picks: KalshiPickForPrognostication[]): Promise<void> {
    try {
      let saved = 0;
      for (const pick of picks) {
        const prediction: BotPrediction = {
          market_id: pick.marketId,
          market_title: pick.title,
          prediction: pick.prediction,
          probability: pick.probability,
          confidence: pick.confidence,
          edge: pick.edge,
          reasoning: pick.reasoning,
          factors: pick.factors,
          learned_from: pick.learnedFrom,
          platform: 'kalshi',
          market_price: pick.yesPrice,
          bot_category: pick.category,
          source: 'alpha-hunter',
          status: 'pending',
          predicted_at: new Date()
        };
        const result = await saveBotPrediction(prediction);
        if (result) saved++;
      }
      console.log(`   💾 Saved ${saved}/${picks.length} picks to Supabase bot_predictions`);
    } catch (error: any) {
      console.log(`   ⚠️  Supabase save failed: ${error.message}`);
    }
  }

  /**
   * Categorize market by keywords
   */
  private categorizeMarket(title: string): string {
    const lowerTitle = title.toLowerCase();

    const categories: { [key: string]: string[] } = {
      politics: ['election', 'president', 'congress', 'senate', 'vote', 'political', 'democrat', 'republican', 'biden', 'trump'],
      sports: ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'hockey', 'champion', 'playoffs', 'super bowl'],
      economics: ['fed', 'gdp', 'inflation', 'interest rate', 'unemployment', 'recession', 'stock', 'market crash'],
      weather: ['temperature', 'hurricane', 'storm', 'rain', 'snow', 'climate', 'el nino', 'la nina', 'forecast'],
      entertainment: ['oscar', 'emmy', 'grammy', 'box office', 'movie', 'album', 'netflix', 'streaming', 'actor', 'singer'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'blockchain', 'nft'],
      world: ['china', 'russia', 'war', 'conflict', 'nuclear', 'treaty', 'un', 'nato', 'peace'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lowerTitle.includes(kw))) {
        return category;
      }
    }

    return 'world'; // Default category
  }

  /**
   * Get time since last update
   */
  getLastUpdateAge(): string {
    if (!this.lastUpdate) return 'Never';
    const seconds = Math.floor((Date.now() - this.lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}


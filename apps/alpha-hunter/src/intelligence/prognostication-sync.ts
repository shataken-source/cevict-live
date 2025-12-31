/**
 * Prognostication Homepage Sync
 * 
 * Pushes high-confidence Kalshi probabilities to the Prognostication homepage
 * after every market analysis cycle (even if no trades are executed).
 */

import * as fs from 'fs';
import * as path from 'path';

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
    // Prognostication API endpoint (runs on port 3002 by default)
    this.prognoBaseUrl = process.env.PROGNOSTICATION_URL || 'http://localhost:3002';
    this.prognoApiKey = process.env.PROGNO_INTERNAL_API_KEY || 'dev-key-12345';
  }

  /**
   * Push ALL analyzed Kalshi picks to Prognostication homepage
   * FREE FOR EVERYONE - Sharing all predictions to help fine-tune logic
   * This runs after EVERY analysis cycle, regardless of trade execution
   */
  async updatePrognosticationHomepage(allOpportunities: any[]): Promise<void> {
    try {
      console.log('\n📡 Syncing ALL predictions to Prognostication homepage (free for everyone)...');

      // UPDATED: Share ALL analyzed opportunities (removed confidence/edge filters)
      // This allows users to see all predictions and helps us fine-tune the logic
      const allPicks = allOpportunities
        .filter(opp => opp.confidence > 0 && opp.title) // Only basic validation
        .sort((a, b) => (b.confidence * b.edge) - (a.confidence * a.edge)) // Sort by confidence * edge
        .slice(0, 50); // Top 50 picks (increased from 20)

      if (allPicks.length === 0) {
        console.log('   ℹ️  No predictions to sync this cycle');
        return;
      }

      // Transform to Prognostication format
      const picks: KalshiPickForPrognostication[] = allPicks.map(opp => ({
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

      // Count high-confidence picks for stats
      const highConfidencePicks = picks.filter(p => p.confidence >= 60 && p.edge >= 2.0);

      const update: PrognostationUpdate = {
        timestamp: new Date().toISOString(),
        picks,
        stats: {
          totalMarkets: allOpportunities.length,
          highConfidencePicks: highConfidencePicks.length, // Count of high-confidence only
          avgEdge: picks.reduce((sum, p) => sum + p.edge, 0) / picks.length,
          avgConfidence: picks.reduce((sum, p) => sum + p.confidence, 0) / picks.length,
        },
      };

      // Write to local file for prognostication to read
      await this.writePicksFile(update);

      // POST to Prognostication API
      await this.postToPrognosticationAPI(picks);

      this.lastUpdate = new Date();
      console.log(`   ✅ Synced ${picks.length} predictions to Prognostication (${highConfidencePicks.length} high-confidence)`);
      console.log(`   📊 Avg edge: ${update.stats.avgEdge.toFixed(1)}% | Avg confidence: ${update.stats.avgConfidence.toFixed(1)}%`);
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
    try {
      const response = await fetch(`${this.prognoBaseUrl}/api/kalshi/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.prognoApiKey,
        },
        body: JSON.stringify({
          picks,
          source: 'alpha-hunter',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`   🌐 Posted to Prognostication API: ${data.received} picks received`);
    } catch (error: any) {
      // Don't fail if API is down, we already wrote to file
      console.log(`   ⚠️  Prognostication API unavailable: ${error.message} (file fallback active)`);
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


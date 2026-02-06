/**
 * PROGNOSTICATION SYNC - UNIFIED PREDICTION FEED
 * 
 * Pushes ALL AI predictions (Crypto + Kalshi) to the Prognostication homepage
 * in real-time. This powers the live dashboard showing:
 * - Crypto trading signals (BTC, ETH, SOL, etc.)
 * - Kalshi prediction market picks
 * - Confidence levels, edge calculations, and reasoning
 * 
 * Syncs after EVERY analysis cycle, not just when trades execute.
 */

import * as fs from 'fs';
import * as path from 'path';

// ==========================================================================
// TYPES
// ==========================================================================

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

export interface CryptoPickForPrognostication {
  pair: string;
  prediction: 'buy' | 'sell' | 'hold';
  confidence: number;
  edge: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string[];
  factors: string[];
  timeframe: string;
  timestamp: Date;
}

export interface UnifiedPick {
  id: string;
  platform: 'kalshi' | 'coinbase';
  title: string;
  category: string;
  prediction: string;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  metadata: {
    // Kalshi-specific
    yesPrice?: number;
    noPrice?: number;
    expiresAt?: Date;
    // Crypto-specific
    currentPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
    timeframe?: string;
  };
  timestamp: Date;
}

export interface PrognosticationUpdate {
  timestamp: string;
  version: string;
  kalshiPicks: KalshiPickForPrognostication[];
  cryptoPicks: CryptoPickForPrognostication[];
  unifiedPicks: UnifiedPick[];
  stats: {
    totalPicks: number;
    kalshiCount: number;
    cryptoCount: number;
    avgConfidence: number;
    avgEdge: number;
    highConfidenceCount: number;
  };
  systemStatus: {
    aiEnabled: boolean;
    kalshiConnected: boolean;
    coinbaseConnected: boolean;
    lastUpdate: string;
  };
}

// ==========================================================================
// SYNC CLASS
// ==========================================================================

export class PrognosticationSync {
  private prognoBaseUrl: string;
  private prognoApiKey: string;
  private lastUpdate: Date | null = null;
  private minConfidence: number = 55;
  private minEdge: number = 1.5;
  private updateHistory: { timestamp: Date; pickCount: number }[] = [];

  constructor() {
    this.prognoBaseUrl = process.env.PROGNOSTICATION_URL || 'http://localhost:3005';
    this.prognoApiKey = process.env.PROGNO_INTERNAL_API_KEY || 'dev-key-12345';
  }

  /**
   * MAIN SYNC METHOD
   * Accepts unified opportunities from both platforms and syncs to Prognostication
   */
  async updatePrognosticationHomepage(allOpportunities: any[]): Promise<void> {
    try {
      console.log('\n📡 Syncing predictions to Prognostication...');

      // Separate by platform
      const kalshiOpps = allOpportunities.filter(o => o.platform === 'kalshi');
      const cryptoOpps = allOpportunities.filter(o => o.platform === 'coinbase' || o.category === 'crypto');

      // Filter for high-confidence
      const filteredKalshi = kalshiOpps
        .filter(o => o.confidence >= this.minConfidence && o.edge >= this.minEdge)
        .sort((a, b) => b.edge - a.edge)
        .slice(0, 20);

      const filteredCrypto = cryptoOpps
        .filter(o => o.confidence >= this.minConfidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);

      if (filteredKalshi.length === 0 && filteredCrypto.length === 0) {
        console.log('   ℹ️  No high-confidence picks to sync this cycle');
        return;
      }

      // Transform to Prognostication format
      const kalshiPicks: KalshiPickForPrognostication[] = filteredKalshi.map(this.transformKalshiPick.bind(this));
      const cryptoPicks: CryptoPickForPrognostication[] = filteredCrypto.map(this.transformCryptoPick.bind(this));
      const unifiedPicks: UnifiedPick[] = [
        ...kalshiPicks.map(p => this.toUnifiedPick(p, 'kalshi')),
        ...cryptoPicks.map(p => this.toUnifiedPick(p, 'coinbase')),
      ].sort((a, b) => b.edge - a.edge);

      // Calculate stats
      const allPicks = [...kalshiPicks, ...cryptoPicks];
      const avgConfidence = allPicks.length > 0
        ? allPicks.reduce((sum, p) => sum + p.confidence, 0) / allPicks.length
        : 0;
      const avgEdge = allPicks.length > 0
        ? allPicks.reduce((sum, p) => sum + p.edge, 0) / allPicks.length
        : 0;

      const update: PrognosticationUpdate = {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        kalshiPicks,
        cryptoPicks,
        unifiedPicks,
        stats: {
          totalPicks: unifiedPicks.length,
          kalshiCount: kalshiPicks.length,
          cryptoCount: cryptoPicks.length,
          avgConfidence,
          avgEdge,
          highConfidenceCount: unifiedPicks.filter(p => p.confidence >= 70).length,
        },
        systemStatus: {
          aiEnabled: true,
          kalshiConnected: !!process.env.KALSHI_API_KEY_ID,
          coinbaseConnected: !!process.env.COINBASE_API_KEY,
          lastUpdate: new Date().toISOString(),
        },
      };

      // Write to multiple locations
      await Promise.all([
        this.writePicksFile(update),
        this.writeUnifiedFile(update),
        this.postToPrognosticationAPI(update),
      ]);

      this.lastUpdate = new Date();
      this.updateHistory.push({ timestamp: this.lastUpdate, pickCount: unifiedPicks.length });
      
      // Keep only last 100 updates in history
      if (this.updateHistory.length > 100) {
        this.updateHistory = this.updateHistory.slice(-100);
      }

      console.log(`   ✅ Synced ${kalshiPicks.length} Kalshi + ${cryptoPicks.length} Crypto picks`);
      console.log(`   📊 Avg confidence: ${avgConfidence.toFixed(1)}% | Avg edge: ${avgEdge.toFixed(1)}%`);
    } catch (error: any) {
      console.error('   ❌ Sync error:', error.message);
    }
  }

  /**
   * Transform raw Kalshi opportunity to typed pick
   */
  private transformKalshiPick(opp: any): KalshiPickForPrognostication {
    return {
      marketId: opp.marketId || opp.id || 'unknown',
      title: opp.title || opp.market || 'Unknown Market',
      category: this.categorizeMarket(opp.title || ''),
      prediction: opp.side === 'yes' || opp.prediction === 'yes' ? 'yes' : 'no',
      probability: opp.probability || opp.confidence || 50,
      confidence: opp.confidence || 50,
      edge: opp.edge || 0,
      reasoning: Array.isArray(opp.reasoning) ? opp.reasoning : [opp.reasoning || 'AI analysis'],
      factors: Array.isArray(opp.factors) ? opp.factors : [],
      learnedFrom: opp.learnedFrom || ['AI Analysis'],
      yesPrice: opp.yesPrice || 50,
      noPrice: opp.noPrice || 50,
      expiresAt: opp.expiresAt ? new Date(opp.expiresAt) : undefined,
    };
  }

  /**
   * Transform raw Crypto opportunity to typed pick
   */
  private transformCryptoPick(opp: any): CryptoPickForPrognostication {
    const prediction = opp.prediction || opp.side;
    const predictionNormalized = 
      prediction === 'buy' || prediction === 'yes' ? 'buy' :
      prediction === 'sell' || prediction === 'no' ? 'sell' : 'hold';

    return {
      pair: opp.marketId || opp.pair || opp.symbol || 'BTC-USD',
      prediction: predictionNormalized,
      confidence: opp.confidence || 50,
      edge: opp.edge || 0,
      currentPrice: this.extractPrice(opp.reasoning, 'Current') || opp.currentPrice || 0,
      targetPrice: this.extractPrice(opp.reasoning, 'Target') || opp.targetPrice || 0,
      stopLoss: opp.stopLoss || 0,
      reasoning: Array.isArray(opp.reasoning) ? opp.reasoning : [opp.reasoning || 'AI analysis'],
      factors: Array.isArray(opp.factors) ? opp.factors : [],
      timeframe: opp.timeframe || '1-4 hours',
      timestamp: new Date(),
    };
  }

  /**
   * Convert any pick to unified format
   */
  private toUnifiedPick(pick: KalshiPickForPrognostication | CryptoPickForPrognostication, platform: 'kalshi' | 'coinbase'): UnifiedPick {
    if (platform === 'kalshi') {
      const p = pick as KalshiPickForPrognostication;
      return {
        id: p.marketId,
        platform: 'kalshi',
        title: p.title,
        category: p.category,
        prediction: p.prediction,
        confidence: p.confidence,
        edge: p.edge,
        reasoning: p.reasoning,
        factors: p.factors,
        metadata: {
          yesPrice: p.yesPrice,
          noPrice: p.noPrice,
          expiresAt: p.expiresAt,
        },
        timestamp: new Date(),
      };
    } else {
      const p = pick as CryptoPickForPrognostication;
      return {
        id: p.pair,
        platform: 'coinbase',
        title: `${p.pair}: ${p.prediction.toUpperCase()} Signal`,
        category: 'crypto',
        prediction: p.prediction,
        confidence: p.confidence,
        edge: p.edge,
        reasoning: p.reasoning,
        factors: p.factors,
        metadata: {
          currentPrice: p.currentPrice,
          targetPrice: p.targetPrice,
          stopLoss: p.stopLoss,
          timeframe: p.timeframe,
        },
        timestamp: p.timestamp,
      };
    }
  }

  /**
   * Extract price from reasoning array
   */
  private extractPrice(reasoning: any[], prefix: string): number {
    if (!Array.isArray(reasoning)) return 0;
    for (const r of reasoning) {
      if (typeof r === 'string' && r.includes(prefix)) {
        const match = r.match(/\$([0-9,]+\.?\d*)/);
        if (match) {
          return parseFloat(match[1].replace(',', ''));
        }
      }
    }
    return 0;
  }

  /**
   * Write main picks file (JSON)
   */
  private async writePicksFile(update: PrognosticationUpdate): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), '.kalshi-picks.json');
      fs.writeFileSync(filePath, JSON.stringify(update, null, 2), 'utf8');
    } catch (error: any) {
      console.error(`   ⚠️  Failed to write picks file: ${error.message}`);
    }
  }

  /**
   * Write unified picks file for web consumption
   */
  private async writeUnifiedFile(update: PrognosticationUpdate): Promise<void> {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      const filePath = path.join(publicDir, 'ai-predictions.json');
      
      // Create web-friendly format
      const webFormat = {
        lastUpdate: update.timestamp,
        predictions: update.unifiedPicks.map(p => ({
          id: p.id,
          platform: p.platform,
          title: p.title,
          category: p.category,
          signal: p.prediction.toUpperCase(),
          confidence: p.confidence,
          edge: p.edge,
          reasoning: p.reasoning.slice(0, 3),
          ...p.metadata,
        })),
        stats: update.stats,
        status: update.systemStatus,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(webFormat, null, 2), 'utf8');
    } catch (error: any) {
      // Silent fail - public dir might not exist in all environments
    }
  }

  /**
   * POST to Prognostication API
   */
  private async postToPrognosticationAPI(update: PrognosticationUpdate): Promise<void> {
    try {
      const response = await fetch(`${this.prognoBaseUrl}/api/predictions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.prognoApiKey,
        },
        body: JSON.stringify({
          kalshiPicks: update.kalshiPicks,
          cryptoPicks: update.cryptoPicks,
          unifiedPicks: update.unifiedPicks,
          stats: update.stats,
          source: 'alpha-hunter-v2',
          timestamp: update.timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`   🌐 API sync: ${data.received || data.count || 'OK'}`);
    } catch (error: any) {
      // Try legacy endpoint
      try {
        await fetch(`${this.prognoBaseUrl}/api/kalshi/picks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.prognoApiKey,
          },
          body: JSON.stringify({
            picks: update.kalshiPicks,
            cryptoPicks: update.cryptoPicks,
            source: 'alpha-hunter',
            timestamp: update.timestamp,
          }),
        });
      } catch {
        // Silent fail - file fallback is active
      }
    }
  }

  /**
   * Categorize market by title
   */
  private categorizeMarket(title: string): string {
    const lower = title.toLowerCase();
    
    const categories: Record<string, string[]> = {
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'solana', 'blockchain'],
      politics: ['election', 'president', 'congress', 'senate', 'democrat', 'republican', 'biden', 'trump', 'vote'],
      economics: ['fed', 'gdp', 'inflation', 'rate', 'unemployment', 'recession', 'jobs', 'cpi'],
      weather: ['temperature', 'hurricane', 'storm', 'rain', 'snow', 'climate', 'forecast'],
      sports: ['nfl', 'nba', 'mlb', 'nhl', 'football', 'basketball', 'playoffs', 'championship'],
      entertainment: ['oscar', 'emmy', 'grammy', 'movie', 'album', 'netflix', 'box office'],
      technology: ['ai', 'openai', 'google', 'apple', 'tesla', 'microsoft', 'earnings'],
      world: ['china', 'russia', 'war', 'conflict', 'nuclear', 'treaty', 'un', 'nato'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return category;
      }
    }

    return 'world';
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    lastUpdate: string;
    updateCount: number;
    avgPicksPerUpdate: number;
    recentUpdates: { timestamp: Date; pickCount: number }[];
  } {
    return {
      lastUpdate: this.lastUpdate?.toISOString() || 'Never',
      updateCount: this.updateHistory.length,
      avgPicksPerUpdate: this.updateHistory.length > 0
        ? this.updateHistory.reduce((sum, u) => sum + u.pickCount, 0) / this.updateHistory.length
        : 0,
      recentUpdates: this.updateHistory.slice(-10),
    };
  }

  /**
   * Force sync from database
   */
  async forceSyncFromDatabase(): Promise<void> {
    // This would pull from Supabase and re-sync
    // Useful for recovery or manual refresh
    console.log('📡 Force sync triggered...');
  }
}

// Export singleton
export const prognosticationSync = new PrognosticationSync();

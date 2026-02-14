/**
 * Enhanced Odds Aggregator Service
 * Multi-source odds aggregation with cross-validation and discrepancy detection
 */

import { EspnOddsService } from './espn-odds-service';

export interface OddsSource {
  name: string;
  weight: number;
  reliability: number;
  lastUpdated: string;
  status: 'active' | 'degraded' | 'down';
}

export interface AggregatedOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  moneyline: {
    home: number;
    away: number;
    consensus: number;
    bestHome: { source: string; odds: number };
    bestAway: { source: string; odds: number };
    discrepancy: number;
  };
  spread?: {
    line: number;
    home: number;
    away: number;
    consensus: number;
  };
  total?: {
    line: number;
    over: number;
    under: number;
    consensus: number;
  };
  sources: string[];
  reliability: number;
  lastUpdated: string;
}

export class EnhancedOddsAggregator {
  private sources: Map<string, OddsSource> = new Map();
  private readonly DISCREPANCY_THRESHOLD = 3; // 3% difference triggers alert

  constructor() {
    this.initializeSources();
  }

  private initializeSources() {
    this.sources.set('odds-api', {
      name: 'Odds API',
      weight: 0.4,
      reliability: 0.95,
      lastUpdated: new Date().toISOString(),
      status: 'active',
    });
    this.sources.set('espn', {
      name: 'ESPN',
      weight: 0.3,
      reliability: 0.90,
      lastUpdated: new Date().toISOString(),
      status: 'active',
    });
    this.sources.set('pinnacle', {
      name: 'Pinnacle',
      weight: 0.3,
      reliability: 0.98,
      lastUpdated: new Date().toISOString(),
      status: 'active',
    });
  }

  /**
   * Fetch and aggregate odds from all sources
   */
  async aggregateOdds(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string
  ): Promise<AggregatedOdds> {
    const oddsData: Map<string, any> = new Map();

    // Fetch from all active sources
    for (const [sourceId, source] of this.sources.entries()) {
      if (source.status === 'down') continue;

      try {
        const odds = await this.fetchFromSource(sourceId, sport, gameId);
        if (odds) {
          oddsData.set(sourceId, odds);
        }
      } catch (e) {
        console.warn(`[Odds Aggregator] ${source.name} failed:`, e);
        source.status = 'degraded';
      }
    }

    // Aggregate results
    return this.computeConsensus(gameId, sport, homeTeam, awayTeam, gameTime, oddsData);
  }

  /**
   * Fetch odds from specific source
   */
  private async fetchFromSource(sourceId: string, sport: string, gameId: string): Promise<any> {
    switch (sourceId) {
      case 'espn':
        const espnOdds = await EspnOddsService.fetchOdds(sport, new Date());
        return espnOdds.get(gameId);
      case 'odds-api':
        // This would call the existing odds-service
        return null;
      case 'pinnacle':
        // Direct Pinnacle API integration would go here
        return null;
      default:
        return null;
    }
  }

  /**
   * Compute consensus odds from multiple sources
   */
  private computeConsensus(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    gameTime: string,
    oddsData: Map<string, any>
  ): AggregatedOdds {
    const sources: string[] = [];
    const moneylineData: Array<{ source: string; home: number; away: number }> = [];

    for (const [sourceId, odds] of oddsData.entries()) {
      if (odds?.moneyline) {
        sources.push(sourceId);
        moneylineData.push({
          source: sourceId,
          home: odds.moneyline.home,
          away: odds.moneyline.away,
        });
      }
    }

    // Calculate weighted consensus
    let totalWeight = 0;
    let weightedHome = 0;
    let weightedAway = 0;
    let bestHome = { source: '', odds: -Infinity };
    let bestAway = { source: '', odds: -Infinity };

    for (const data of moneylineData) {
      const source = this.sources.get(data.source);
      if (!source) continue;

      const weight = source.weight * source.reliability;
      totalWeight += weight;
      weightedHome += data.home * weight;
      weightedAway += data.away * weight;

      // Track best odds for each side
      if (data.home > bestHome.odds) {
        bestHome = { source: data.source, odds: data.home };
      }
      if (data.away > bestAway.odds) {
        bestAway = { source: data.source, odds: data.away };
      }
    }

    const consensusHome = totalWeight > 0 ? weightedHome / totalWeight : 0;
    const consensusAway = totalWeight > 0 ? weightedAway / totalWeight : 0;

    // Calculate discrepancy between sources
    const homeRange = Math.max(...moneylineData.map(m => m.home)) - Math.min(...moneylineData.map(m => m.home));
    const awayRange = Math.max(...moneylineData.map(m => m.away)) - Math.min(...moneylineData.map(m => m.away));
    const discrepancy = Math.max(homeRange, awayRange);

    // Log discrepancy alert if significant
    if (discrepancy > this.DISCREPANCY_THRESHOLD) {
      console.warn(`[Odds Aggregator] Significant discrepancy detected for ${gameId}: ${discrepancy.toFixed(2)} points`);
    }

    return {
      gameId,
      sport,
      homeTeam,
      awayTeam,
      gameTime,
      moneyline: {
        home: Math.round(consensusHome),
        away: Math.round(consensusAway),
        consensus: Math.round((consensusHome + consensusAway) / 2),
        bestHome,
        bestAway,
        discrepancy,
      },
      sources,
      reliability: totalWeight,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Detect arbitrage opportunities across sources
   */
  detectArbitrage(odds: AggregatedOdds): { exists: boolean; profitPercent: number } {
    if (!odds.moneyline.bestHome || !odds.moneyline.bestAway) {
      return { exists: false, profitPercent: 0 };
    }

    const probHome = this.americanToImpliedProb(odds.moneyline.bestHome.odds);
    const probAway = this.americanToImpliedProb(odds.moneyline.bestAway.odds);
    const totalProb = probHome + probAway;

    if (totalProb < 1) {
      return {
        exists: true,
        profitPercent: (1 / totalProb - 1) * 100,
      };
    }

    return { exists: false, profitPercent: 0 };
  }

  private americanToImpliedProb(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }
}

export default EnhancedOddsAggregator;

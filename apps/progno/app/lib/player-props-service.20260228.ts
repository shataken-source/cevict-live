/**
 * Player Props Prediction Service
 * Player-specific predictions for props betting.
 * Uses CevictScraper (cevict-scraper) instead of ScrapingBee.
 */

import { CevictScraperService } from './cevict-scraper-service';

export interface PlayerProp {
  player: string;
  team: string;
  sport: string;
  propType: 'points' | 'rebounds' | 'assists' | 'passing_yards' | 'rushing_yards' | 'receiving_yards' | 'touchdowns';
  line: number;
  overOdds: number;
  underOdds: number;
  prediction: 'over' | 'under';
  confidence: number;
  edge: number;
  recentAverage: number;
  matchupRating: number;
}

export interface PlayerStats {
  player: string;
  seasonAverage: number;
  last5Average: number;
  homeAwaySplit: { home: number; away: number };
  vsOpponentHistory: number[];
  recentForm: 'hot' | 'cold' | 'neutral';
}

export class PlayerPropsService {
  private scraper: CevictScraperService;

  constructor(cevictScraperUrl: string, apiKey?: string) {
    this.scraper = new CevictScraperService(cevictScraperUrl, apiKey);
  }

  /**
   * Predict player props for a game
   */
  async predictPlayerProps(
    sport: string,
    homeTeam: string,
    awayTeam: string,
    availableProps: Array<{
      player: string;
      propType: PlayerProp['propType'];
      line: number;
      overOdds: number;
      underOdds: number;
    }>
  ): Promise<PlayerProp[]> {
    const predictions: PlayerProp[] = [];

    for (const prop of availableProps) {
      // Fetch player stats
      const stats = await this.fetchPlayerStats(sport, prop.player, prop.propType);
      
      if (!stats) continue;

      // Calculate prediction
      const prediction = this.calculatePropPrediction(stats, prop, sport);
      
      if (prediction.confidence >= 60) {
        predictions.push(prediction);
      }
    }

    return predictions.sort((a, b) => b.edge - a.edge);
  }

  /**
   * Fetch player statistics
   */
  private async fetchPlayerStats(
    sport: string,
    player: string,
    statType: PlayerProp['propType']
  ): Promise<PlayerStats | null> {
    try {
      const lineupData = await this.scraper.scrapeLineups(sport, player);
      
      if (!lineupData || lineupData.length === 0) {
        return null;
      }

      const playerData = lineupData[0];
      
      return {
        player,
        seasonAverage: parseFloat(playerData.seasonAvg || 0),
        last5Average: parseFloat(playerData.last5Avg || playerData.recentAvg || 0),
        homeAwaySplit: {
          home: parseFloat(playerData.homeAvg || playerData.seasonAvg || 0),
          away: parseFloat(playerData.awayAvg || playerData.seasonAvg || 0),
        },
        vsOpponentHistory: (playerData.vsOpponent || []).map((s: string) => parseFloat(s)),
        recentForm: this.assessForm(playerData.recentGames || []),
      };
    } catch (error) {
      console.error(`[PlayerProps] Error fetching stats for ${player}:`, error);
      return null;
    }
  }

  /**
   * Calculate prop prediction
   */
  private calculatePropPrediction(
    stats: PlayerStats,
    prop: { player: string; propType: PlayerProp['propType']; line: number; overOdds: number; underOdds: number },
    sport: string
  ): PlayerProp {
    const { seasonAverage, last5Average, vsOpponentHistory, recentForm } = stats;
    
    // Weight recent performance more heavily
    const weightedAvg = (seasonAverage * 0.3) + (last5Average * 0.5) + 
      (vsOpponentHistory.length > 0 ? 
        (vsOpponentHistory.reduce((a, b) => a + b, 0) / vsOpponentHistory.length) * 0.2 : 
        seasonAverage * 0.2);

    // Determine prediction
    const predictedOver = weightedAvg > prop.line;
    const difference = Math.abs(weightedAvg - prop.line);
    const edge = (difference / prop.line) * 100;

    // Calculate confidence
    let confidence = 50;
    
    // Base confidence on edge
    confidence += Math.min(20, edge * 2);
    
    // Form adjustment
    if (recentForm === 'hot') confidence += 10;
    if (recentForm === 'cold') confidence -= 10;

    // Historical consistency
    const consistency = this.calculateConsistency([seasonAverage, last5Average, ...vsOpponentHistory]);
    confidence += (consistency - 0.5) * 20;

    return {
      player: prop.player,
      team: '', // Would be populated from lineup data
      sport,
      propType: prop.propType,
      line: prop.line,
      overOdds: prop.overOdds,
      underOdds: prop.underOdds,
      prediction: predictedOver ? 'over' : 'under',
      confidence: Math.min(95, Math.max(50, Math.round(confidence))),
      edge: Math.round(edge * 10) / 10,
      recentAverage: Math.round(last5Average * 10) / 10,
      matchupRating: this.calculateMatchupRating(vsOpponentHistory, prop.line),
    };
  }

  /**
   * Assess player form
   */
  private assessForm(recentGames: number[]): PlayerStats['recentForm'] {
    if (recentGames.length < 3) return 'neutral';
    
    const recent3 = recentGames.slice(-3);
    const older3 = recentGames.slice(-6, -3);
    
    if (older3.length === 0) return 'neutral';
    
    const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const olderAvg = older3.reduce((a, b) => a + b, 0) / older3.length;
    
    if (recentAvg > olderAvg * 1.15) return 'hot';
    if (recentAvg < olderAvg * 0.85) return 'cold';
    return 'neutral';
  }

  /**
   * Calculate consistency score (0-1)
   */
  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0.5;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (lower is more consistent)
    const cv = mean > 0 ? stdDev / mean : 1;
    
    // Convert to 0-1 score (1 = very consistent)
    return Math.max(0, Math.min(1, 1 - cv));
  }

  /**
   * Calculate matchup rating
   */
  private calculateMatchupRating(vsOpponentHistory: number[], line: number): number {
    if (vsOpponentHistory.length === 0) return 5;
    
    const overs = vsOpponentHistory.filter(h => h > line).length;
    const hitRate = overs / vsOpponentHistory.length;
    
    // Scale to 1-10
    return Math.round(hitRate * 10);
  }

  /**
   * Find best player props for a slate
   */
  async findBestProps(
    sport: string,
    date: string,
    minEdge: number = 8,
    minConfidence: number = 65
  ): Promise<PlayerProp[]> {
    // This would integrate with odds API to get available props
    // For now, returns placeholder structure
    console.log(`[PlayerProps] Finding best props for ${sport} on ${date}`);
    
    // Placeholder - real implementation would fetch from odds API
    return [];
  }

  /**
   * Build same-game parlay from props
   */
  buildSGP(
    props: PlayerProp[],
    maxLegs: number = 3,
    minConfidence: number = 60
  ): Array<{
    legs: PlayerProp[];
    combinedConfidence: number;
    correlation: 'high' | 'medium' | 'low';
  }> {
    // Filter high-confidence props
    const qualified = props.filter(p => p.confidence >= minConfidence);
    
    if (qualified.length < 2) return [];

    const combinations: Array<{ legs: PlayerProp[]; combinedConfidence: number; correlation: 'high' | 'medium' | 'low' }> = [];

    // Generate 2-leg and 3-leg combinations
    for (let i = 0; i < qualified.length; i++) {
      for (let j = i + 1; j < qualified.length; j++) {
        const legs = [qualified[i], qualified[j]];
        const correlation = this.assessCorrelation(legs);
        
        // Only include positively correlated legs
        if (correlation !== 'high') {
          const avgConfidence = (qualified[i].confidence + qualified[j].confidence) / 2;
          combinations.push({
            legs,
            combinedConfidence: Math.round(avgConfidence - 5), // Parlay penalty
            correlation,
          });
        }

        // Add 3rd leg if allowed
        if (maxLegs >= 3) {
          for (let k = j + 1; k < qualified.length; k++) {
            const threeLegs = [qualified[i], qualified[j], qualified[k]];
            const threeCorr = this.assessCorrelation(threeLegs);
            
            if (threeCorr !== 'high') {
              const threeAvg = (qualified[i].confidence + qualified[j].confidence + qualified[k].confidence) / 3;
              combinations.push({
                legs: threeLegs,
                combinedConfidence: Math.round(threeAvg - 10), // Higher parlay penalty
                correlation: threeCorr,
              });
            }
          }
        }
      }
    }

    return combinations
      .filter(c => c.combinedConfidence >= minConfidence)
      .sort((a, b) => b.combinedConfidence - a.combinedConfidence);
  }

  /**
   * Assess correlation between props
   */
  private assessCorrelation(props: PlayerProp[]): 'high' | 'medium' | 'low' {
    // Same player props are highly correlated
    const players = new Set(props.map(p => p.player));
    if (players.size < props.length) return 'high';

    // Complementary stats (e.g., QB passing + WR receiving) are positively correlated
    const types = props.map(p => p.propType);
    
    // Check for negative correlation scenarios
    const hasPoints = types.some(t => t === 'points');
    const hasRebounds = types.some(t => t === 'rebounds');
    const hasAssists = types.some(t => t === 'assists');
    
    // Points + Assists can be negatively correlated in some cases
    if (hasPoints && hasAssists && types.length === 2) {
      return 'medium';
    }

    return 'low';
  }
}

export default PlayerPropsService;

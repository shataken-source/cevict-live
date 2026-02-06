/**
 * Sports Probability Engine
 * Uses existing progno prediction engine to calculate probabilities for Kalshi/Polymarket markets
 * Focus: Sports events only
 */

import { PredictionEngine } from '../prediction-engine';
import type { GameData } from '../prediction-engine';

export interface SportsMarket {
  id: string;
  platform: 'kalshi' | 'polymarket';
  question: string;
  description?: string;
  sport: string;
  league?: string;
  teams?: {
    home: string;
    away: string;
  };
  eventType: 'game_winner' | 'total' | 'spread' | 'player_prop' | 'team_prop' | 'other';
  eventDate: string;
  marketData: any; // Platform-specific market data
}

export interface ProbabilityPrediction {
  marketId: string;
  platform: 'kalshi' | 'polymarket';
  question: string;
  ourProbability: number; // 0-1, our calculated probability
  marketProbability: number; // 0-1, current market price
  edge: number; // Our prob - Market prob (positive = value)
  confidence: number; // 0-1, confidence in our prediction
  recommendation: 'YES' | 'NO' | 'PASS';
  reasoning: string[];
  factors: {
    statistical: number; // Weight of statistical analysis
    situational: number; // Weight of situational factors
    marketSentiment: number; // Weight of market sentiment
  };
  riskLevel: 'low' | 'medium' | 'high';
  optimalStake?: number; // Kelly criterion or fixed percentage
}

export class SportsProbabilityEngine {
  private predictionEngine: PredictionEngine;

  constructor() {
    this.predictionEngine = new PredictionEngine();
  }

  /**
   * Calculate probability for a sports market
   */
  async calculateProbability(market: SportsMarket): Promise<ProbabilityPrediction> {
    // Extract game data from market
    const gameData = this.extractGameData(market);
    
    if (!gameData) {
      // Fallback for non-game markets (player props, etc.)
      return this.calculateGenericProbability(market);
    }

    // Use existing prediction engine
    const prediction = await this.predictionEngine.predict(gameData);
    
    // Get market probability
    const marketProb = this.getMarketProbability(market);
    
    // Calculate edge
    const ourProb = prediction.confidence / 100; // Convert to 0-1
    const edge = ourProb - marketProb;
    
    // Determine recommendation
    let recommendation: 'YES' | 'NO' | 'PASS' = 'PASS';
    if (edge > 0.05 && prediction.confidence > 60) {
      recommendation = 'YES';
    } else if (edge < -0.05 && prediction.confidence > 60) {
      recommendation = 'NO';
    }

    // Build reasoning
    const reasoning = this.buildReasoning(prediction, market, edge);

    // Assess risk
    const riskLevel = this.assessRisk(prediction, market, edge);

    // Calculate optimal stake (Kelly criterion with safety factor)
    const optimalStake = this.calculateOptimalStake(edge, prediction.confidence);

    return {
      marketId: market.id,
      platform: market.platform,
      question: market.question,
      ourProbability: ourProb,
      marketProbability: marketProb,
      edge,
      confidence: prediction.confidence / 100,
      recommendation,
      reasoning,
      factors: {
        statistical: 0.6, // Heavy weight on stats
        situational: 0.3, // Situational factors
        marketSentiment: 0.1, // Market sentiment
      },
      riskLevel,
      optimalStake,
    };
  }

  /**
   * Extract game data from market for prediction engine
   */
  private extractGameData(market: SportsMarket): GameData | null {
    if (!market.teams || market.eventType !== 'game_winner') {
      return null;
    }

    // Try to extract odds from market data
    const odds = this.extractOdds(market);
    
    return {
      homeTeam: market.teams.home,
      awayTeam: market.teams.away,
      league: market.league || market.sport.toUpperCase(),
      sport: market.sport,
      date: market.eventDate,
      odds: odds || {
        home: -110,
        away: -110,
        spread: 0,
        total: 0,
      },
    };
  }

  /**
   * Extract odds from market data
   */
  private extractOdds(market: SportsMarket): GameData['odds'] | null {
    if (market.platform === 'kalshi') {
      const kalshiData = market.marketData;
      if (kalshiData.yes_bid && kalshiData.no_bid) {
        // Convert Kalshi prices (cents) to American odds
        const yesProb = kalshiData.yes_bid / 100;
        const noProb = kalshiData.no_bid / 100;
        
        return {
          home: this.probabilityToAmericanOdds(yesProb),
          away: this.probabilityToAmericanOdds(noProb),
          spread: 0,
          total: 0,
        };
      }
    } else if (market.platform === 'polymarket') {
      const polyData = market.marketData;
      if (polyData.outcomes && polyData.outcomes.length >= 2) {
        const yesProb = polyData.outcomes[0].price;
        const noProb = polyData.outcomes[1].price;
        
        return {
          home: this.probabilityToAmericanOdds(yesProb),
          away: this.probabilityToAmericanOdds(noProb),
          spread: 0,
          total: 0,
        };
      }
    }
    
    return null;
  }

  /**
   * Convert probability to American odds
   */
  private probabilityToAmericanOdds(prob: number): number {
    if (prob >= 0.5) {
      return Math.round(-100 * prob / (1 - prob));
    } else {
      return Math.round(100 * (1 - prob) / prob);
    }
  }

  /**
   * Get current market probability
   */
  private getMarketProbability(market: SportsMarket): number {
    if (market.platform === 'kalshi') {
      const kalshiData = market.marketData;
      const midPrice = (kalshiData.yes_bid + kalshiData.yes_ask) / 2;
      return midPrice / 100; // Convert cents to probability
    } else if (market.platform === 'polymarket') {
      const polyData = market.marketData;
      const yesOutcome = polyData.outcomes?.find((o: any) => 
        o.title.toLowerCase().includes('yes') || o.id === '0'
      );
      return yesOutcome?.price || 0.5;
    }
    
    return 0.5; // Default
  }

  /**
   * Calculate probability for non-game markets (player props, etc.)
   */
  private async calculateGenericProbability(market: SportsMarket): Promise<ProbabilityPrediction> {
    // For non-game markets, use simpler heuristics
    const marketProb = this.getMarketProbability(market);
    
    // Default: slight edge detection based on market inefficiency
    const ourProb = marketProb; // No strong edge without game data
    const edge = 0;
    
    return {
      marketId: market.id,
      platform: market.platform,
      question: market.question,
      ourProbability: ourProb,
      marketProbability: marketProb,
      edge,
      confidence: 0.5, // Lower confidence for non-game markets
      recommendation: 'PASS',
      reasoning: ['Insufficient data for non-game market analysis'],
      factors: {
        statistical: 0.3,
        situational: 0.4,
        marketSentiment: 0.3,
      },
      riskLevel: 'high',
    };
  }

  /**
   * Build reasoning for prediction
   */
  private buildReasoning(
    prediction: any,
    market: SportsMarket,
    edge: number
  ): string[] {
    const reasoning: string[] = [];
    
    if (prediction.predictedWinner) {
      reasoning.push(`Predicted winner: ${prediction.predictedWinner}`);
    }
    
    if (prediction.confidence) {
      reasoning.push(`Confidence: ${prediction.confidence}%`);
    }
    
    if (edge > 0) {
      reasoning.push(`Value detected: Market is underpricing by ${(edge * 100).toFixed(1)}%`);
    } else if (edge < 0) {
      reasoning.push(`Market appears overpriced by ${Math.abs(edge * 100).toFixed(1)}%`);
    }
    
    if (prediction.edge) {
      reasoning.push(`Statistical edge: ${prediction.edge}%`);
    }
    
    return reasoning;
  }

  /**
   * Assess risk level
   */
  private assessRisk(
    prediction: any,
    market: SportsMarket,
    edge: number
  ): 'low' | 'medium' | 'high' {
    const confidence = prediction.confidence || 50;
    const absEdge = Math.abs(edge);
    
    if (confidence > 70 && absEdge > 0.1) {
      return 'low';
    } else if (confidence > 60 && absEdge > 0.05) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Calculate optimal stake using Kelly criterion with safety factor
   */
  private calculateOptimalStake(edge: number, confidence: number): number {
    if (edge <= 0) {
      return 0; // No bet if no edge
    }
    
    // Kelly fraction = (bp - q) / b
    // Where b = odds, p = win prob, q = lose prob
    // Simplified: Kelly = edge / (1 - our_prob)
    const ourProb = confidence / 100;
    const kellyFraction = edge / (1 - ourProb);
    
    // Apply safety factor (use 1/4 Kelly for conservative approach)
    const safeKelly = kellyFraction * 0.25;
    
    // Cap at 5% of bankroll
    return Math.min(safeKelly, 0.05);
  }
}

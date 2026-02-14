/**
 * Betting Splits Monitor Service
 * Tracks public vs sharp money distribution to identify fade opportunities
 */

import { ScrapingBeeService } from './scrapingbee-service';

export interface BettingSplit {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  market: 'spread' | 'moneyline' | 'total';
  line: number;
  publicPercentage: number; // % of public on this side
  moneyPercentage: number; // % of money on this side
  ticketCount: number;
  sharpIndicator: 'sharp' | 'public' | 'neutral';
  recommendation: 'fade_public' | 'follow_sharp' | 'neutral';
}

export interface SplitsAnalysis {
  publicBias: 'home' | 'away' | 'over' | 'under' | 'none';
  sharpBias: 'home' | 'away' | 'over' | 'under' | 'none';
  fadeRecommendation?: {
    side: string;
    confidence: number;
    reasoning: string;
  };
  reverseLineMovement: boolean;
}

// Thresholds for analysis
const PUBLIC_SHARP_DIVERGENCE_THRESHOLD = 15; // % difference
const SHARP_MONEY_THRESHOLD = 60; // % of money indicates sharp action
const REVERSE_LINE_MOVEMENT_THRESHOLD = 2; // Points

export class BettingSplitsMonitor {
  private scraper: ScrapingBeeService;

  constructor(scrapingBeeApiKey: string) {
    this.scraper = new ScrapingBeeService(scrapingBeeApiKey);
  }

  /**
   * Fetch betting splits for a specific game
   */
  async fetchGameSplits(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    market: 'spread' | 'moneyline' | 'total'
  ): Promise<BettingSplit | null> {
    try {
      const splits = await this.scraper.scrapeBettingSplits(sport, homeTeam, awayTeam);
      
      if (!splits || splits.length === 0) {
        return null;
      }

      // Find the split matching our market
      const matchingSplit = splits.find((s: any) => 
        s.market?.toLowerCase() === market || 
        s.type?.toLowerCase() === market
      ) || splits[0]; // Fallback to first split

      const publicPct = parseInt(matchingSplit.publicPercentage || matchingSplit.public || 50);
      const moneyPct = parseInt(matchingSplit.moneyPercentage || matchingSplit.money || 50);

      return {
        gameId,
        sport,
        homeTeam,
        awayTeam,
        market,
        line: parseFloat(matchingSplit.line || 0),
        publicPercentage: publicPct,
        moneyPercentage: moneyPct,
        ticketCount: parseInt(matchingSplit.tickets || matchingSplit.count || 0),
        sharpIndicator: this.identifySharpAction(publicPct, moneyPct),
        recommendation: this.generateRecommendation(publicPct, moneyPct),
      };
    } catch (error) {
      console.error('[SplitsMonitor] Error fetching splits:', error);
      return null;
    }
  }

  /**
   * Analyze splits to identify fade opportunities
   */
  analyzeSplits(splits: BettingSplit, lineMovement: number = 0): SplitsAnalysis {
    const publicFavoringHome = splits.publicPercentage > 50;
    const sharpFavoringHome = splits.moneyPercentage > 50;
    
    // Detect reverse line movement
    const publicBias = publicFavoringHome ? 'home' : 'away';
    const sharpBias = sharpFavoringHome ? 'home' : 'away';
    const reverseLineMovement = publicBias !== sharpBias && Math.abs(lineMovement) >= REVERSE_LINE_MOVEMENT_THRESHOLD;

    let analysis: SplitsAnalysis = {
      publicBias: publicFavoringHome ? 'home' : 'away',
      sharpBias: sharpFavoringHome ? 'home' : 'away',
      reverseLineMovement,
    };

    // Generate fade recommendation if public/sharp divergence is significant
    const divergence = Math.abs(splits.publicPercentage - splits.moneyPercentage);
    
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) {
      // Public is heavy on one side, sharp money on the other
      const fadeSide = splits.publicPercentage > 50 ? splits.awayTeam : splits.homeTeam;
      const sharpSide = splits.moneyPercentage > 50 ? splits.homeTeam : splits.awayTeam;
      
      analysis.fadeRecommendation = {
        side: fadeSide,
        confidence: Math.min(85, 60 + divergence / 3),
        reasoning: `Public ${splits.publicPercentage}% vs Sharp ${splits.moneyPercentage}% - Fade public on ${fadeSide}`,
      };
    }

    return analysis;
  }

  /**
   * Identify if sharp money is on this side
   */
  private identifySharpAction(publicPct: number, moneyPct: number): BettingSplit['sharpIndicator'] {
    const divergence = Math.abs(publicPct - moneyPct);
    
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) {
      return moneyPct > publicPct ? 'sharp' : 'public';
    }
    
    if (moneyPct >= SHARP_MONEY_THRESHOLD || moneyPct <= (100 - SHARP_MONEY_THRESHOLD)) {
      return 'sharp';
    }
    
    return 'neutral';
  }

  /**
   * Generate trading recommendation based on splits
   */
  private generateRecommendation(publicPct: number, moneyPct: number): BettingSplit['recommendation'] {
    const divergence = Math.abs(publicPct - moneyPct);
    
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) {
      return moneyPct > publicPct ? 'follow_sharp' : 'fade_public';
    }
    
    return 'neutral';
  }

  /**
   * Get all games with significant public/sharp divergence
   */
  async findFadeOpportunities(
    games: Array<{
      gameId: string;
      sport: string;
      homeTeam: string;
      awayTeam: string;
      market?: 'spread' | 'moneyline' | 'total';
    }>
  ): Promise<Array<{
    game: any;
    split: BettingSplit;
    analysis: SplitsAnalysis;
    fadeConfidence: number;
  }>> {
    const opportunities = [];

    for (const game of games) {
      const split = await this.fetchGameSplits(
        game.gameId,
        game.sport,
        game.homeTeam,
        game.awayTeam,
        game.market || 'spread'
      );

      if (!split) continue;

      const analysis = this.analyzeSplits(split);
      
      if (analysis.fadeRecommendation) {
        opportunities.push({
          game,
          split,
          analysis,
          fadeConfidence: analysis.fadeRecommendation.confidence,
        });
      }
    }

    // Sort by confidence
    return opportunities.sort((a, b) => b.fadeConfidence - a.fadeConfidence);
  }

  /**
   * Check if we should fade a specific pick based on splits
   */
  shouldFadePick(
    pick: string,
    opponent: string,
    splits: BettingSplit
  ): { fade: boolean; confidence: number; reasoning: string } {
    const isHomeTeam = pick === splits.homeTeam;
    const publicOnPick = isHomeTeam ? splits.publicPercentage > 50 : splits.publicPercentage < 50;
    const sharpOnPick = isHomeTeam ? splits.moneyPercentage > 50 : splits.moneyPercentage < 50;
    
    // If public is heavy on our pick but sharp money is elsewhere
    if (publicOnPick && !sharpOnPick) {
      const divergence = Math.abs(splits.publicPercentage - splits.moneyPercentage);
      return {
        fade: true,
        confidence: Math.min(80, 50 + divergence / 2),
        reasoning: `Public ${publicOnPick ? splits.publicPercentage : 100 - splits.publicPercentage}% on ${pick} but only ${sharpOnPick ? splits.moneyPercentage : 100 - splits.moneyPercentage}% of money - potential fade`,
      };
    }

    return { fade: false, confidence: 0, reasoning: 'No fade signal' };
  }

  /**
   * Get contrarian pick - fade the public when divergence is extreme
   */
  getContrarianPick(splits: BettingSplit): {
    side: string;
    confidence: number;
    publicPercentage: number;
  } | null {
    // Only contrarian when public is >65% on one side
    if (splits.publicPercentage >= 65 || splits.publicPercentage <= 35) {
      const fadeSide = splits.publicPercentage > 50 ? splits.awayTeam : splits.homeTeam;
      const sharpAlignment = (splits.publicPercentage > 50 && splits.moneyPercentage < 50) ||
                             (splits.publicPercentage < 50 && splits.moneyPercentage > 50);
      
      if (sharpAlignment) {
        return {
          side: fadeSide,
          confidence: Math.min(75, 55 + Math.abs(splits.publicPercentage - 50) / 2),
          publicPercentage: splits.publicPercentage > 50 ? splits.publicPercentage : 100 - splits.publicPercentage,
        };
      }
    }

    return null;
  }
}

export default BettingSplitsMonitor;

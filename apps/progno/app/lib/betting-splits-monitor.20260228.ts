/**
 * Betting Splits Monitor Service
 * Tracks public vs sharp money distribution to identify fade opportunities.
 * Uses CevictScraper (cevict-scraper) instead of ScrapingBee.
 */

import { CevictScraperService } from './cevict-scraper-service';

export interface BettingSplit {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  market: 'spread' | 'moneyline' | 'total';
  line: number;
  publicPercentage: number;
  moneyPercentage: number;
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

const PUBLIC_SHARP_DIVERGENCE_THRESHOLD = 15;
const SHARP_MONEY_THRESHOLD = 60;
const REVERSE_LINE_MOVEMENT_THRESHOLD = 2;

export class BettingSplitsMonitor {
  private scraper: CevictScraperService;

  constructor(cevictScraperUrl: string, apiKey?: string) {
    this.scraper = new CevictScraperService(cevictScraperUrl, apiKey);
  }

  async fetchGameSplits(
    gameId: string,
    sport: string,
    homeTeam: string,
    awayTeam: string,
    market: 'spread' | 'moneyline' | 'total'
  ): Promise<BettingSplit | null> {
    try {
      const splits = await this.scraper.scrapeBettingSplits(sport, homeTeam, awayTeam);
      if (!splits || splits.length === 0) return null;
      const matchingSplit = splits.find((s: any) =>
        s.market?.toLowerCase() === market || s.type?.toLowerCase() === market
      ) || splits[0];
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

  analyzeSplits(splits: BettingSplit, lineMovement: number = 0): SplitsAnalysis {
    const publicFavoringHome = splits.publicPercentage > 50;
    const sharpFavoringHome = splits.moneyPercentage > 50;
    const publicBias = publicFavoringHome ? 'home' : 'away';
    const sharpBias = sharpFavoringHome ? 'home' : 'away';
    const reverseLineMovement = publicBias !== sharpBias && Math.abs(lineMovement) >= REVERSE_LINE_MOVEMENT_THRESHOLD;
    let analysis: SplitsAnalysis = { publicBias, sharpBias, reverseLineMovement };
    const divergence = Math.abs(splits.publicPercentage - splits.moneyPercentage);
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) {
      const fadeSide = splits.publicPercentage > 50 ? splits.awayTeam : splits.homeTeam;
      analysis.fadeRecommendation = {
        side: fadeSide,
        confidence: Math.min(85, 60 + divergence / 3),
        reasoning: `Public ${splits.publicPercentage}% vs Sharp ${splits.moneyPercentage}% - Fade public on ${fadeSide}`,
      };
    }
    return analysis;
  }

  private identifySharpAction(publicPct: number, moneyPct: number): BettingSplit['sharpIndicator'] {
    const divergence = Math.abs(publicPct - moneyPct);
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) return moneyPct > publicPct ? 'sharp' : 'public';
    if (moneyPct >= SHARP_MONEY_THRESHOLD || moneyPct <= (100 - SHARP_MONEY_THRESHOLD)) return 'sharp';
    return 'neutral';
  }

  private generateRecommendation(publicPct: number, moneyPct: number): BettingSplit['recommendation'] {
    const divergence = Math.abs(publicPct - moneyPct);
    if (divergence >= PUBLIC_SHARP_DIVERGENCE_THRESHOLD) return moneyPct > publicPct ? 'follow_sharp' : 'fade_public';
    return 'neutral';
  }

  async findFadeOpportunities(
    games: Array<{ gameId: string; sport: string; homeTeam: string; awayTeam: string; market?: 'spread' | 'moneyline' | 'total' }>
  ): Promise<Array<{ game: any; split: BettingSplit; analysis: SplitsAnalysis; fadeConfidence: number }>> {
    const opportunities = [];
    for (const game of games) {
      const split = await this.fetchGameSplits(game.gameId, game.sport, game.homeTeam, game.awayTeam, game.market || 'spread');
      if (!split) continue;
      const analysis = this.analyzeSplits(split);
      if (analysis.fadeRecommendation) {
        opportunities.push({ game, split, analysis, fadeConfidence: analysis.fadeRecommendation.confidence });
      }
    }
    return opportunities.sort((a, b) => b.fadeConfidence - a.fadeConfidence);
  }

  shouldFadePick(
    pick: string,
    opponent: string,
    splits: BettingSplit
  ): { fade: boolean; confidence: number; reasoning: string } {
    const isHomeTeam = pick === splits.homeTeam;
    const publicOnPick = isHomeTeam ? splits.publicPercentage > 50 : splits.publicPercentage < 50;
    const sharpOnPick = isHomeTeam ? splits.moneyPercentage > 50 : splits.moneyPercentage < 50;
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

  getContrarianPick(splits: BettingSplit): { side: string; confidence: number; publicPercentage: number } | null {
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

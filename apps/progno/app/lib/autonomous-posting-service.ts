/**
 * Autonomous Daily Posting Service
 * Automatically generates, processes, and posts picks each day without manual intervention
 */

import { TierAssignmentService, Pick, Tier } from './tier-assignment-service';
import { EarlyBetsDetectionService, EarlyBetOpportunity } from './early-bets-service';
import { ArbitrageDetectionService, ArbitrageOpportunity } from './arbitrage-service';
import { EspnOddsService } from './espn-odds-service';

export interface DailyPost {
  date: string;
  generatedAt: string;
  postedAt?: string;
  picks: Pick[];
  earlyBets: EarlyBetOpportunity[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  tierBreakdown: Record<Tier, number>;
  status: 'generated' | 'posted' | 'failed';
  error?: string;
}

export interface AutonomousConfig {
  enabled: boolean;
  postTime: string; // HH:MM format (e.g., "08:00")
  sports: string[];
  includeArbitrage: boolean;
  includeEarlyBets: boolean;
  maxFreePicks: number;
  maxProPicks: number;
  maxElitePicks: number;
  minConfidence: number;
  autoPost: boolean;
  notificationWebhook?: string;
}

export class AutonomousPostingService {
  private static readonly DEFAULT_CONFIG: AutonomousConfig = {
    enabled: true,
    postTime: '08:00',
    sports: ['nba', 'nfl', 'nhl', 'mlb'],
    includeArbitrage: true,
    includeEarlyBets: true,
    maxFreePicks: 3,
    maxProPicks: 5,
    maxElitePicks: 3,
    minConfidence: 60,
    autoPost: true,
  };

  private config: AutonomousConfig;
  private lastRun: Date | null = null;

  constructor(config: Partial<AutonomousConfig> = {}) {
    this.config = { ...AutonomousPostingService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Run the complete autonomous daily posting workflow
   */
  async runDailyWorkflow(): Promise<DailyPost> {
    const today = new Date().toISOString().split('T')[0];
    const startTime = new Date();

    try {
      console.log(`[Autonomous Posting] Starting daily workflow for ${today}`);

      // Step 1: Generate base picks
      const picks = await this.generatePicks();

      // Step 2: Detect early bet opportunities
      const earlyBets = this.config.includeEarlyBets
        ? await this.detectEarlyBets()
        : [];

      // Step 3: Detect arbitrage opportunities
      const arbitrage = this.config.includeArbitrage
        ? await this.detectArbitrage()
        : [];

      // Step 4: Assign tiers
      const picksWithTiers = TierAssignmentService.assignTiers(picks);

      // Step 5: Apply limits per tier
      const limitedPicks = this.applyTierLimits(picksWithTiers);

      // Step 6: Create daily post
      const dailyPost: DailyPost = {
        date: today,
        generatedAt: startTime.toISOString(),
        picks: limitedPicks,
        earlyBets,
        arbitrageOpportunities: arbitrage,
        tierBreakdown: this.calculateTierBreakdown(limitedPicks),
        status: 'generated',
      };

      // Step 7: Auto-post if enabled
      if (this.config.autoPost) {
        await this.postToPrognostication(dailyPost);
        dailyPost.postedAt = new Date().toISOString();
        dailyPost.status = 'posted';
      }

      // Step 8: Save to file
      await this.saveDailyPost(dailyPost);

      // Step 9: Send notification
      if (this.config.notificationWebhook) {
        await this.sendNotification(dailyPost);
      }

      this.lastRun = new Date();

      console.log(`[Autonomous Posting] Completed daily workflow: ${limitedPicks.length} picks, ${earlyBets.length} early bets, ${arbitrage.length} arbs`);

      return dailyPost;

    } catch (error) {
      console.error('[Autonomous Posting] Workflow failed:', error);

      return {
        date: today,
        generatedAt: startTime.toISOString(),
        picks: [],
        earlyBets: [],
        arbitrageOpportunities: [],
        tierBreakdown: { free: 0, pro: 0, elite: 0, early: 0, arbitrage: 0 },
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate picks using ESPN fallback for odds
   */
  private async generatePicks(): Promise<Pick[]> {
    const picks: Pick[] = [];
    const today = new Date();

    for (const sport of this.config.sports) {
      try {
        // Get odds from ESPN as fallback
        const oddsMap = await EspnOddsService.fetchOdds(sport, today);

        // Convert to pick format
        for (const [gameId, odds] of oddsMap.entries()) {
          if (!odds.moneyline) continue;

          // Simple confidence calculation based on odds differential
          const probHome = this.americanToImpliedProb(odds.moneyline.home);
          const probAway = this.americanToImpliedProb(odds.moneyline.away);
          const confidence = Math.max(probHome, probAway) * 100;

          if (confidence < this.config.minConfidence) continue;

          const pick: Pick = {
            id: `pick-${gameId}`,
            sport: sport.toUpperCase(),
            homeTeam: 'Home',
            awayTeam: 'Away',
            pick: probHome > probAway ? 'Home' : 'Away',
            confidence,
            odds: {
              american: probHome > probAway ? odds.moneyline.home : odds.moneyline.away,
              decimal: this.americanToDecimal(probHome > probAway ? odds.moneyline.home : odds.moneyline.away),
            },
            pickType: 'moneyline',
            gameTime: today.toISOString(),
            createdAt: new Date().toISOString(),
          };

          picks.push(pick);
        }
      } catch (error) {
        console.warn(`[Autonomous Posting] Failed to generate picks for ${sport}:`, error);
      }
    }

    return picks;
  }

  /**
   * Detect early bet opportunities
   */
  private async detectEarlyBets(): Promise<EarlyBetOpportunity[]> {
    // This would integrate with historical odds tracking
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Detect arbitrage opportunities
   */
  private async detectArbitrage(): Promise<ArbitrageOpportunity[]> {
    // This would scan multiple bookmakers
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Apply tier limits to picks
   */
  private applyTierLimits(picks: Pick[]): Pick[] {
    const limited: Pick[] = [];

    // Group by tier
    const byTier = picks.reduce((acc, pick) => {
      const tier = pick.tier || 'free';
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(pick);
      return acc;
    }, {} as Record<Tier, Pick[]>);

    // Apply limits
    const limits: Record<Tier, number> = {
      free: this.config.maxFreePicks,
      pro: this.config.maxProPicks,
      elite: this.config.maxElitePicks,
      early: this.config.maxProPicks,
      arbitrage: 10, // Unlimited arbitrage
    };

    for (const tier of Object.keys(byTier) as Tier[]) {
      const tierPicks = byTier[tier] || [];
      const limit = limits[tier];
      limited.push(...tierPicks.slice(0, limit));
    }

    return limited;
  }

  /**
   * Calculate tier breakdown
   */
  private calculateTierBreakdown(picks: Pick[]): Record<Tier, number> {
    const breakdown: Record<Tier, number> = {
      free: 0,
      pro: 0,
      elite: 0,
      early: 0,
      arbitrage: 0,
    };

    for (const pick of picks) {
      const tier = pick.tier || 'free';
      breakdown[tier]++;
    }

    return breakdown;
  }

  /**
   * Post daily picks to prognostication website
   */
  private async postToPrognostication(dailyPost: DailyPost): Promise<void> {
    // This would make API calls to the prognostication website
    // Implementation depends on the target site's API

    console.log(`[Autonomous Posting] Posting to prognostication: ${dailyPost.picks.length} picks`);

    // Example implementation:
    // const response = await fetch('https://prognostication.com/api/picks', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.PROGNO_API_KEY}` },
    //   body: JSON.stringify(dailyPost),
    // });

    // For now, just log
    console.log('[Autonomous Posting] Would post:', JSON.stringify(dailyPost, null, 2));
  }

  /**
   * Save daily post to file
   */
  private async saveDailyPost(dailyPost: DailyPost): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');

      const prognoDir = path.join(process.cwd(), '.progno');
      if (!fs.existsSync(prognoDir)) {
        fs.mkdirSync(prognoDir, { recursive: true });
      }

      const file = path.join(prognoDir, `daily-post-${dailyPost.date}.json`);
      fs.writeFileSync(file, JSON.stringify(dailyPost, null, 2));

      console.log(`[Autonomous Posting] Saved to ${file}`);
    } catch (error) {
      console.error('[Autonomous Posting] Failed to save:', error);
    }
  }

  /**
   * Send notification webhook
   */
  private async sendNotification(dailyPost: DailyPost): Promise<void> {
    if (!this.config.notificationWebhook) return;

    try {
      await fetch(this.config.notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dailyPost.date,
          picks: dailyPost.picks.length,
          earlyBets: dailyPost.earlyBets.length,
          arbitrage: dailyPost.arbitrageOpportunities.length,
          status: dailyPost.status,
        }),
      });
    } catch (error) {
      console.error('[Autonomous Posting] Failed to send notification:', error);
    }
  }

  /**
   * Check if it's time to run the daily workflow
   */
  shouldRun(): boolean {
    if (!this.config.enabled) return false;

    const now = new Date();
    const [hours, minutes] = this.config.postTime.split(':').map(Number);

    // Check if current time matches post time (within 5 minute window)
    const postTime = new Date(now);
    postTime.setHours(hours, minutes, 0, 0);

    const diffMinutes = Math.abs(now.getTime() - postTime.getTime()) / (1000 * 60);

    // Check if we haven't already run today
    const today = now.toISOString().split('T')[0];
    const lastRunDate = this.lastRun?.toISOString().split('T')[0];

    return diffMinutes < 5 && lastRunDate !== today;
  }

  /**
   * Utility functions
   */
  private americanToImpliedProb(american: number): number {
    if (american > 0) {
      return 100 / (american + 100);
    } else {
      return Math.abs(american) / (Math.abs(american) + 100);
    }
  }

  private americanToDecimal(american: number): number {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger(): Promise<DailyPost> {
    console.log('[Autonomous Posting] Manual trigger activated');
    return this.runDailyWorkflow();
  }

  /**
   * Get last run info
   */
  getStatus(): { lastRun: Date | null; config: AutonomousConfig; nextRun: string } {
    const nextRun = new Date();
    const [hours, minutes] = this.config.postTime.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun < new Date()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return {
      lastRun: this.lastRun,
      config: this.config,
      nextRun: nextRun.toISOString(),
    };
  }
}

export default AutonomousPostingService;

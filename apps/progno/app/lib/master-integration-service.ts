/**
 * Master Integration Service
 * Orchestrates all services into a unified workflow
 */

import { EnhancedOddsAggregator } from './enhanced-odds-aggregator';
import { LineMovementTracker } from './line-movement-tracker';
import { EVCalculator } from './ev-calculator';
import { SmartPublishingScheduler } from './smart-publishing-scheduler';
import { AutoGradingService } from './auto-grading-service';
import { AlertSystem } from './alert-system';
import { ParlayBuilder } from './parlay-builder';
import { LiveBettingMonitor } from './live-betting-monitor';
import { BankrollManagementService } from './bankroll-management-service';
import { TierAssignmentService } from './tier-assignment-service';
import { ElitePicksEnhancer } from './elite-picks-enhancer';
import { ArbitrageDetectionService } from './arbitrage-service';
import { EarlyBetsDetectionService } from './early-bets-service';
import { EnvironmentalFactorsService } from './environmental-factors-service';

export interface MasterWorkflowResult {
  date: string;
  picks: any[];
  parlays: any[];
  arbitrageOpportunities: any[];
  earlyBetOpportunities: any[];
  tierBreakdown: Record<string, number>;
  publishingSchedule: any;
  bankrollState: any;
  alerts: any[];
  analytics: any;
}

export class MasterIntegrationService {
  private oddsAggregator: EnhancedOddsAggregator;
  private lineTracker: LineMovementTracker;
  private evCalculator: EVCalculator;
  private publisher: SmartPublishingScheduler;
  private grader: AutoGradingService;
  private alerts: AlertSystem;
  private parlayBuilder: ParlayBuilder;
  private liveMonitor: LiveBettingMonitor;
  private bankroll: BankrollManagementService;
  private tierService: typeof TierAssignmentService;
  private eliteEnhancer: ElitePicksEnhancer;
  private arbDetector: typeof ArbitrageDetectionService;
  private earlyDetector: typeof EarlyBetsDetectionService;
  private environmentalFactors: EnvironmentalFactorsService;

  constructor(initialBankroll: number = 10000) {
    this.oddsAggregator = new EnhancedOddsAggregator();
    this.lineTracker = new LineMovementTracker();
    this.evCalculator = new EVCalculator();
    this.publisher = new SmartPublishingScheduler();
    this.grader = new AutoGradingService();
    this.alerts = new AlertSystem();
    this.parlayBuilder = new ParlayBuilder();
    this.liveMonitor = new LiveBettingMonitor();
    this.bankroll = new BankrollManagementService(initialBankroll);
    this.tierService = TierAssignmentService;
    this.eliteEnhancer = new ElitePicksEnhancer();
    this.arbDetector = ArbitrageDetectionService;
    this.earlyDetector = EarlyBetsDetectionService;
    this.environmentalFactors = new EnvironmentalFactorsService(process.env.SCRAPINGBEE_API_KEY);
  }

  /**
   * Execute complete daily workflow
   */
  async executeDailyWorkflow(date: string, sports: string[] = ['nba', 'nfl', 'nhl']): Promise<MasterWorkflowResult> {
    console.log(`[Master] Starting daily workflow for ${date}`);

    // 1. Fetch and aggregate odds
    const aggregatedOdds = await this.fetchOdds(sports, date);

    // 2. Generate base picks
    const basePicks = await this.generatePicks(aggregatedOdds);

    // 3. Calculate EV and filter
    const evPicks = this.filterByEV(basePicks);

    // 4. Detect arbitrage
    const arbitrageOps = this.detectArbitrage(aggregatedOdds);

    // 5. Detect early bets
    const earlyBets = await this.detectEarlyBets(aggregatedOdds);

    // 6. Assign tiers (reverse order: Elite → Pro → Free)
    const tieredPicks = this.tierService.assignTiers(evPicks);

    // 7. Enhance Elite picks
    const enhancedPicks = await this.eliteEnhancer.enhance(tieredPicks);

    // 8. Build parlays
    const parlays = this.buildParlays(enhancedPicks);

    // 9. Calculate stakes
    const picksWithStakes = this.calculateStakes(enhancedPicks);

    // 10. Create publishing schedule
    const schedule = this.createSchedule(date, picksWithStakes);

    // 11. Check for alerts
    const alerts = this.checkAlerts(aggregatedOdds, tieredPicks);

    // 12. Calculate analytics
    const analytics = this.grader.calculateAnalytics();

    return {
      date,
      picks: picksWithStakes,
      parlays,
      arbitrageOpportunities: arbitrageOps,
      earlyBetOpportunities: earlyBets,
      tierBreakdown: this.tierService.getTierStats(tieredPicks),
      publishingSchedule: schedule,
      bankrollState: this.bankroll.getState(),
      alerts,
      analytics,
    };
  }

  /**
   * Fetch odds from multiple sources
   */
  private async fetchOdds(sports: string[], date: string): Promise<any[]> {
    const allOdds: any[] = [];

    for (const sport of sports) {
      try {
        // This would call the actual aggregator
        console.log(`[Master] Fetching odds for ${sport}`);
      } catch (e) {
        console.warn(`[Master] Failed to fetch ${sport} odds:`, e);
      }
    }

    return allOdds;
  }

  /**
   * Generate base picks from odds
   */
  private async generatePicks(odds: any[]): Promise<any[]> {
    // This would integrate with existing pick generation
    return [];
  }

  /**
   * Filter picks by minimum EV
   */
  private filterByEV(picks: any[]): any[] {
    const evResults = this.evCalculator.calculateBatch(
      picks.map(p => ({
        id: p.id,
        probability: p.confidence / 100,
        odds: p.odds?.american || -110,
      }))
    );

    const passingIds = new Set(
      evResults.filter(r => r.passFilter).map(r => r.pickId)
    );

    return picks.filter(p => passingIds.has(p.id));
  }

  /**
   * Detect arbitrage opportunities
   */
  private detectArbitrage(odds: any[]): any[] {
    const opportunities: any[] = [];

    for (const game of odds) {
      const arb = this.oddsAggregator.detectArbitrage(game);
      if (arb.exists) {
        opportunities.push({
          gameId: game.gameId,
          profitPercent: arb.profitPercent,
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect early bet opportunities
   */
  private async detectEarlyBets(odds: any[]): Promise<any[]> {
    // This would compare early lines to current lines
    return [];
  }

  /**
   * Build parlays from picks
   */
  private buildParlays(picks: any[]): any[] {
    const legs = picks.map(p => ({
      pickId: p.id,
      sport: p.sport,
      team: p.pick,
      market: p.pickType,
      odds: p.odds?.american || -110,
      probability: p.confidence / 100,
      ev: p.edge || 3,
    }));

    return this.parlayBuilder.buildParlays(legs, 3);
  }

  /**
   * Calculate stakes for all picks
   */
  private calculateStakes(picks: any[]): any[] {
    return picks.map(pick => {
      const stake = this.bankroll.calculateStake(
        pick.id,
        pick.confidence / 100,
        pick.odds?.decimal || 1.91,
        pick.confidence
      );

      return {
        ...pick,
        stake: stake.stake,
        bankrollPercent: stake.bankrollPercent,
        kellyPercent: stake.kellyPercent,
      };
    });
  }

  /**
   * Create publishing schedule
   */
  private createSchedule(date: string, picks: any[]): any {
    const byTier: Record<string, string[]> = {
      elite: [],
      pro: [],
      free: [],
    };

    for (const pick of picks) {
      if (pick.tier && byTier[pick.tier]) {
        byTier[pick.tier].push(pick.id);
      }
    }

    return this.publisher.createSchedule(date, byTier);
  }

  /**
   * Check for various alerts
   */
  private checkAlerts(odds: any[], picks: any[]): any[] {
    const activeAlerts: any[] = [];

    // Check for line movements
    for (const pick of picks) {
      if (pick.lineMovement && Math.abs(pick.lineMovement) > 2) {
        const alert = this.alerts.lineMovement(
          pick.id,
          pick.sport,
          pick.pick,
          pick.pickType,
          pick.earlyLine || 0,
          pick.currentLine || 0,
          pick.lineMovement
        );
        if (alert) activeAlerts.push(alert);
      }
    }

    // Check for arbitrage
    for (const odd of odds) {
      const arb = this.oddsAggregator.detectArbitrage(odd);
      if (arb.exists) {
        const alert = this.alerts.arbitrage(
          odd.gameId,
          odd.sport,
          arb.profitPercent,
          odd.sources
        );
        if (alert) activeAlerts.push(alert);
      }
    }

    return activeAlerts;
  }

  /**
   * Grade completed games
   */
  gradeCompletedGames(results: any[]): void {
    for (const result of results) {
      this.grader.gradePick(
        result.pickId,
        result.gameId,
        result.sport,
        result.pick,
        result.odds,
        result.confidence,
        result.tier,
        result.gameScore,
        result.homeTeam,
        result.awayTeam,
        result.pickType
      );

      // Update bankroll
      const profit = result.result === 'win'
        ? this.calculateProfit(result.odds, 100)
        : result.result === 'loss' ? -100 : 0;

      this.bankroll.gradeBet(result.pickId, result.result, profit);
    }
  }

  private calculateProfit(americanOdds: number, stake: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) * stake;
    } else {
      return (100 / Math.abs(americanOdds)) * stake;
    }
  }

  /**
   * Get current state of all services
   */
  getSystemStatus(): {
    bankroll: any;
    activeAlerts: any[];
    liveGames: any[];
    analytics: any;
  } {
    return {
      bankroll: this.bankroll.getState(),
      activeAlerts: this.alerts.getActiveAlerts(),
      liveGames: this.liveMonitor.getActiveGames(),
      analytics: this.grader.calculateAnalytics(),
    };
  }
}

export default MasterIntegrationService;

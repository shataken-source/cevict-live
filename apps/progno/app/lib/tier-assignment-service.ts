/**
 * Tier Assignment Service
 * Assigns picks to tiers based on backtest-validated confidence bands.
 *
 * V3 backtest results (2024 season, best+all enhancements):
 *   Elite (85-95%): 108.1% ROI, 64.7% accuracy — best-in-class
 *   High  (80-84%): 51.5% ROI, 49.5% accuracy — solid edge
 *   All V3 picks:   82.0% ROI overall (min confidence floor = 80%)
 *
 * Home picks: +112.4% ROI vs Away: -18.2% ROI
 * → Home picks are prioritised for Elite tier.
 *
 * Distribution (~6 picks/day from V3 filters):
 *   Free:    3 picks — lowest-ranked picks that still pass V3 filters (80%+)
 *   Premium: 5 picks — mid-range quality (80-87% confidence band)
 *   Elite:   All remaining — top picks, home-biased, 85%+ preferred
 */

export type Tier = 'free' | 'premium' | 'elite' | 'early' | 'arbitrage';

export interface Pick {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  confidence: number;
  edge?: number;
  odds?: {
    american: number;
    decimal: number;
  };
  spread?: {
    line: number;
    odds: number;
  };
  total?: {
    line: number;
    overOdds?: number;
    underOdds?: number;
  };
  pickType: 'moneyline' | 'spread' | 'total';
  gameTime: string;
  analysis?: string;
  keyFactors?: string[];
  isArbitrage?: boolean;
  arbitrageProfit?: number;
  isEarlyBet?: boolean;
  earlyLine?: number;
  currentLine?: number;
  lineMovement?: number;
  isHomePick?: boolean;
  createdAt: string;
  tier?: Tier;
}

export interface TierConfig {
  name: Tier;
  minConfidence: number;
  maxConfidence: number;
  maxPicks?: number;
  requiresArbitrage?: boolean;
  requiresEarlyLine?: boolean;
  description: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  elite: {
    name: 'elite',
    minConfidence: 85,
    maxConfidence: 100,
    maxPicks: 10,
    description: 'Elite tier — top picks, home-biased, 85%+ confidence (108% ROI in backtest)',
  },
  premium: {
    name: 'premium',
    minConfidence: 80,
    maxConfidence: 85,
    maxPicks: 5,
    description: 'Premium tier — solid picks, 80-84% confidence (51% ROI in backtest)',
  },
  free: {
    name: 'free',
    minConfidence: 0,
    maxConfidence: 100,
    maxPicks: 3,
    description: 'Free tier — 3 quality picks per day (all still 80%+ from V3 filters)',
  },
  early: {
    name: 'early',
    minConfidence: 80,
    maxConfidence: 100,
    requiresEarlyLine: true,
    description: 'Early line picks with value (80%+ confidence after decay)',
  },
  arbitrage: {
    name: 'arbitrage',
    minConfidence: 50,
    maxConfidence: 100,
    requiresArbitrage: true,
    description: 'Guaranteed profit arbitrage opportunities',
  },
};

export class TierAssignmentService {
  static assignTier(pick: Pick): Tier {
    if (pick.isArbitrage && (pick.arbitrageProfit ?? 0) > 0) {
      return 'arbitrage';
    }

    if (pick.isEarlyBet && (pick.lineMovement ?? 0) > 2) {
      return 'early';
    }

    if (pick.confidence >= 85) {
      return 'elite';
    } else if (pick.confidence >= 80) {
      return 'premium';
    } else {
      return 'free';
    }
  }

  /**
   * Assign tiers to all picks: Elite → Premium → Free
   * Home picks are prioritised for Elite (backtest: +112% ROI home vs -18% away)
   */
  static assignTiers(picks: Pick[]): Pick[] {
    const sortedPicks = [...picks].sort((a, b) => {
      return this.calculateQualityScore(b) - this.calculateQualityScore(a);
    });

    const assigned: Pick[] = [];
    const assignedIds = new Set<string>();

    // Phase 1: Elite — confidence 85+ OR arbitrage, home picks first
    const eliteCandidates = sortedPicks.filter(p =>
      !assignedIds.has(p.id) &&
      ((p.confidence >= 85) || p.isArbitrage)
    );
    const eliteHome = eliteCandidates.filter(p => p.isHomePick || p.pick === p.homeTeam);
    const eliteAway = eliteCandidates.filter(p => !p.isHomePick && p.pick !== p.homeTeam);
    const eliteSorted = [...eliteHome, ...eliteAway];
    const eliteMax = TIER_CONFIGS.elite.maxPicks || 10;

    let eliteCount = 0;
    for (const pick of eliteSorted) {
      if (eliteCount >= eliteMax) break;
      assigned.push({ ...pick, tier: 'elite' });
      assignedIds.add(pick.id);
      eliteCount++;
    }

    // Phase 2: Premium — confidence 80-84, max 5
    const premiumCandidates = sortedPicks.filter(p =>
      !assignedIds.has(p.id) &&
      p.confidence >= 80 &&
      p.confidence < 85
    );

    let premiumCount = 0;
    const premMax = TIER_CONFIGS.premium.maxPicks || 5;
    for (const pick of premiumCandidates) {
      if (premiumCount >= premMax) break;
      assigned.push({ ...pick, tier: 'premium' });
      assignedIds.add(pick.id);
      premiumCount++;
    }

    // Phase 3: Free — lowest-ranked remaining picks, max 3
    // These still passed V3 filters (80%+ confidence), so they're quality picks
    const freeCandidates = sortedPicks
      .filter(p => !assignedIds.has(p.id))
      .reverse();

    let freeCount = 0;
    const freeMax = TIER_CONFIGS.free.maxPicks || 3;
    for (const pick of freeCandidates) {
      if (freeCount >= freeMax) break;
      assigned.push({ ...pick, tier: 'free' });
      assignedIds.add(pick.id);
      freeCount++;
    }

    // Phase 4: Overflow elite/premium picks that didn't fit caps
    const overflow = sortedPicks.filter(p => !assignedIds.has(p.id));
    for (const pick of overflow) {
      assigned.push({ ...pick, tier: pick.confidence >= 85 ? 'elite' : 'premium' });
      assignedIds.add(pick.id);
    }

    return assigned.sort((a, b) => {
      const priorityA = this.getTierPriority(a.tier || 'free');
      const priorityB = this.getTierPriority(b.tier || 'free');
      if (priorityA !== priorityB) return priorityA - priorityB;
      return this.calculateQualityScore(b) - this.calculateQualityScore(a);
    });
  }

  private static getTierPriority(tier: Tier): number {
    const priorities: Record<Tier, number> = {
      arbitrage: 1,
      early: 2,
      elite: 3,
      premium: 4,
      free: 5,
    };
    return priorities[tier] || 99;
  }

  /**
   * Quality score for sorting — home picks get a significant boost
   * based on backtest: home ROI +112% vs away -18%
   */
  private static calculateQualityScore(pick: Pick): number {
    let score = pick.confidence * 10;

    if (pick.edge) {
      score += pick.edge * 5;
    }

    if (pick.isArbitrage && pick.arbitrageProfit) {
      score += pick.arbitrageProfit * 100;
    }

    if (pick.isEarlyBet && pick.lineMovement) {
      score += pick.lineMovement * 5;
    }

    // Home-pick boost: backtest shows +130% ROI gap (home vs away)
    if (pick.isHomePick || pick.pick === pick.homeTeam) {
      score += 80;
    }

    const hoursUntilGame = (new Date(pick.gameTime).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilGame > 0 && hoursUntilGame < 24) {
      score += (24 - hoursUntilGame) * 0.5;
    }

    return score;
  }

  static filterByTier(picks: Pick[], tier: Tier): Pick[] {
    return picks.filter(pick => pick.tier === tier);
  }

  static getTierStats(picks: Pick[]): Record<Tier, { count: number; avgConfidence: number; avgEdge: number }> {
    const stats = {} as Record<Tier, { count: number; avgConfidence: number; avgEdge: number }>;

    (Object.keys(TIER_CONFIGS) as Tier[]).forEach(tier => {
      const tierPicks = this.filterByTier(picks, tier);
      const count = tierPicks.length;
      const avgConfidence = count > 0
        ? tierPicks.reduce((sum, p) => sum + p.confidence, 0) / count
        : 0;
      const avgEdge = count > 0
        ? tierPicks.reduce((sum, p) => sum + (p.edge || 0), 0) / count
        : 0;

      stats[tier] = { count, avgConfidence, avgEdge };
    });

    return stats;
  }

  static validateTierAssignment(pick: Pick, tier: Tier): boolean {
    const config = TIER_CONFIGS[tier];

    if (tier !== 'free' && (pick.confidence < config.minConfidence || pick.confidence > config.maxConfidence)) {
      return false;
    }

    if (config.requiresArbitrage && !pick.isArbitrage) {
      return false;
    }

    if (config.requiresEarlyLine && !pick.isEarlyBet) {
      return false;
    }

    return true;
  }

  static reassignTier(pick: Pick, newTier: Tier): Pick {
    if (!this.validateTierAssignment(pick, newTier)) {
      console.warn(`[Tier Service] Warning: Reassigning ${pick.id} to ${newTier} does not meet tier requirements`);
    }

    return {
      ...pick,
      tier: newTier,
    };
  }
}

export default TierAssignmentService;

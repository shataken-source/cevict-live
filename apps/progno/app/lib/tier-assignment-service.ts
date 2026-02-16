/**
 * Tier Assignment Service
 * Automatically assigns picks to correct tiers based on confidence and other factors
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
    minConfidence: 80,
    maxConfidence: 100,
    maxPicks: 5,
    description: 'Elite tier picks (80%+ confidence, top 5)',
  },
  premium: {
    name: 'premium',
    minConfidence: 65,
    maxConfidence: 80,
    maxPicks: 3,
    description: 'Premium tier picks (65-80% confidence, top 3)',
  },
  free: {
    name: 'free',
    minConfidence: 0,
    maxConfidence: 65,
    maxPicks: 2,
    description: 'Free tier picks (≤65% confidence, max 2)',
  },
  early: {
    name: 'early',
    minConfidence: 65,
    maxConfidence: 100,
    requiresEarlyLine: true,
    description: 'Early line picks with value',
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
  /**
   * Assign tier to a single pick based on its characteristics
   */
  static assignTier(pick: Pick): Tier {
    // Check for arbitrage first (highest priority)
    if (pick.isArbitrage && (pick.arbitrageProfit ?? 0) > 0) {
      return 'arbitrage';
    }

    // Check for early line value
    if (pick.isEarlyBet && (pick.lineMovement ?? 0) > 2) {
      return 'early';
    }

    // Assign based on confidence (aligned with new system)
    if (pick.confidence >= 80) {
      return 'elite';
    } else if (pick.confidence >= 65) {
      return 'premium';
    } else {
      return 'free';
    }
  }

  /**
   * Assign tiers to all picks in reverse order (Elite → Pro → Free)
   * This ensures highest quality picks get premium tiers first
   */
  static assignTiers(picks: Pick[]): Pick[] {
    // Sort all picks by quality score (highest first)
    const sortedPicks = [...picks].sort((a, b) => {
      const qualityA = this.calculateQualityScore(a);
      const qualityB = this.calculateQualityScore(b);
      return qualityB - qualityA;
    });

    const assigned: Pick[] = [];
    const assignedIds = new Set<string>();

    // Phase 1: Assign Elite picks (85-95% confidence + all arbitrage)
    const elitePicks = sortedPicks.filter(p =>
      !assignedIds.has(p.id) &&
      ((p.confidence >= 85 && p.confidence <= 95) || p.isArbitrage)
    );

    for (const pick of elitePicks) {
      assigned.push({ ...pick, tier: 'elite' });
      assignedIds.add(pick.id);
    }

    // Phase 2: Assign Premium picks (65-85% confidence, max 5)
    const premiumCandidates = sortedPicks.filter(p =>
      !assignedIds.has(p.id) &&
      p.confidence >= 65 &&
      p.confidence < 85
    );

    let premiumCount = 0;
    for (const pick of premiumCandidates) {
      if (premiumCount >= (TIER_CONFIGS.premium.maxPicks || 5)) break;
      assigned.push({ ...pick, tier: 'premium' });
      assignedIds.add(pick.id);
      premiumCount++;
    }

    // Phase 3: Assign Free picks (≤65% confidence, max 2)
    const freeCandidates = sortedPicks.filter(p =>
      !assignedIds.has(p.id) &&
      p.confidence <= 65
    );

    let freeCount = 0;
    for (const pick of freeCandidates) {
      if (freeCount >= (TIER_CONFIGS.free.maxPicks || 2)) break;
      assigned.push({ ...pick, tier: 'free' });
      assignedIds.add(pick.id);
      freeCount++;
    }

    // Phase 4: Mark remaining as unassigned (or overflow)
    const remaining = sortedPicks.filter(p => !assignedIds.has(p.id));
    for (const pick of remaining) {
      assigned.push({ ...pick, tier: undefined }); // Unassigned/overflow
    }

    // Final sort: Elite → Pro → Free → Unassigned
    return assigned.sort((a, b) => {
      const priorityA = this.getTierPriority(a.tier || 'free');
      const priorityB = this.getTierPriority(b.tier || 'free');
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Within same tier, sort by quality
      return this.calculateQualityScore(b) - this.calculateQualityScore(a);
    });
  }

  /**
   * Get tier priority (lower = higher priority)
   */
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
   * Calculate quality score for sorting within tiers
   */
  private static calculateQualityScore(pick: Pick): number {
    let score = pick.confidence * 10;

    // Boost for edge
    if (pick.edge) {
      score += pick.edge * 5;
    }

    // Boost for arbitrage
    if (pick.isArbitrage && pick.arbitrageProfit) {
      score += pick.arbitrageProfit * 100;
    }

    // Boost for early line movement
    if (pick.isEarlyBet && pick.lineMovement) {
      score += pick.lineMovement * 5;
    }

    // Time decay - games happening sooner get slight boost
    const hoursUntilGame = (new Date(pick.gameTime).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilGame > 0 && hoursUntilGame < 24) {
      score += (24 - hoursUntilGame) * 0.5;
    }

    return score;
  }

  /**
   * Filter picks by tier
   */
  static filterByTier(picks: Pick[], tier: Tier): Pick[] {
    return picks.filter(pick => pick.tier === tier);
  }

  /**
   * Get tier statistics
   */
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

  /**
   * Validate that a pick meets tier requirements
   */
  static validateTierAssignment(pick: Pick, tier: Tier): boolean {
    const config = TIER_CONFIGS[tier];

    if (pick.confidence < config.minConfidence || pick.confidence > config.maxConfidence) {
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

  /**
   * Reassign pick to different tier (manual override)
   */
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

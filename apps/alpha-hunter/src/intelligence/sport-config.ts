/**
 * Sport-Specific Configuration
 * Different limits and thresholds per sport based on performance
 */

export interface SportConfig {
  maxStake: number;
  minConfidence: number;
  minEdge: number;
  maxDailyTrades: number;
  volatilityAdjustment: number; // Multiplier for Kelly criterion
  enabled: boolean;
}

const DEFAULT_SPORT_CONFIG: SportConfig = {
  maxStake: 50,
  minConfidence: 65,
  minEdge: 2,
  maxDailyTrades: 10,
  volatilityAdjustment: 1.0,
  enabled: true
};

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  NBA: {
    maxStake: 50,
    minConfidence: 65,
    minEdge: 2,
    maxDailyTrades: 12,
    volatilityAdjustment: 1.0,
    enabled: true
  },
  NFL: {
    maxStake: 60,
    minConfidence: 68, // Higher bar - fewer games, more variance
    minEdge: 3,
    maxDailyTrades: 8,
    volatilityAdjustment: 0.85, // More conservative Kelly
    enabled: true
  },
  NHL: {
    maxStake: 35,
    minConfidence: 70, // Hockey is more random
    minEdge: 3,
    maxDailyTrades: 6,
    volatilityAdjustment: 0.75,
    enabled: true
  },
  MLB: {
    maxStake: 40,
    minConfidence: 66,
    minEdge: 2.5,
    maxDailyTrades: 15, // Lots of games
    volatilityAdjustment: 0.9,
    enabled: true
  },
  NCAA: {
    maxStake: 30,
    minConfidence: 70, // College sports more volatile
    minEdge: 3,
    maxDailyTrades: 8,
    volatilityAdjustment: 0.7,
    enabled: true
  },
  SOCCER: {
    maxStake: 45,
    minConfidence: 64,
    minEdge: 2,
    maxDailyTrades: 10,
    volatilityAdjustment: 1.0,
    enabled: true
  },
  NASCAR: {
    maxStake: 35,
    minConfidence: 68, // Racing has high variance
    minEdge: 3,
    maxDailyTrades: 5,
    volatilityAdjustment: 0.65, // More conservative
    enabled: true
  },
  CBB: { // College Baseball
    maxStake: 25,
    minConfidence: 72, // College baseball very volatile
    minEdge: 3.5,
    maxDailyTrades: 8,
    volatilityAdjustment: 0.6,
    enabled: false // Disabled by default - enable once data quality verified
  },
  OTHER: {
    maxStake: 25,
    minConfidence: 72, // Unknown sports - higher bar
    minEdge: 4,
    maxDailyTrades: 5,
    volatilityAdjustment: 0.6,
    enabled: false // Disabled by default
  }
};

export class SportConfigManager {
  /**
   * Get config for a sport
   */
  getConfig(sport: string): SportConfig {
    return SPORT_CONFIGS[sport.toUpperCase()] || DEFAULT_SPORT_CONFIG;
  }

  private extractSport(symbol: string): string {
    const s = symbol?.toLowerCase() || '';
    if (s.includes('nba') || s.includes('basketball')) return 'NBA';
    if (s.includes('nfl') || s.includes('football')) return 'NFL';
    if (s.includes('nhl') || s.includes('hockey')) return 'NHL';
    if (s.includes('mlb') || s.includes('baseball')) return 'MLB';
    if (s.includes('ncaa') || s.includes('college')) return 'NCAA';
    if (s.includes('soccer') || s.includes('premier')) return 'SOCCER';
    if (s.includes('nascar') || s.includes('racing')) return 'NASCAR';
    if (s.includes('cbb') || s.includes('college baseball')) return 'CBB';
    return 'OTHER';
  }

  /**
   * Check if a pick meets sport-specific thresholds
   */
  validatePick(sport: string, confidence: number, edge: number): { valid: boolean; reason?: string } {
    const config = this.getConfig(sport);

    if (!config.enabled) {
      return { valid: false, reason: `${sport} betting is disabled` };
    }

    if (confidence < config.minConfidence) {
      return { valid: false, reason: `Confidence ${confidence}% below ${sport} threshold (${config.minConfidence}%)` };
    }

    if (edge < config.minEdge) {
      return { valid: false, reason: `Edge ${edge}% below ${sport} threshold (${config.minEdge}%)` };
    }

    return { valid: true };
  }

  /**
   * Calculate sport-specific stake using adjusted Kelly
   */
  calculateStake(sport: string, baseKellyStake: number): number {
    const config = this.getConfig(sport);
    const adjusted = baseKellyStake * config.volatilityAdjustment;
    return Math.min(adjusted, config.maxStake);
  }

  /**
   * Get all enabled sports
   */
  getEnabledSports(): string[] {
    return Object.entries(SPORT_CONFIGS)
      .filter(([_, config]) => config.enabled)
      .map(([sport, _]) => sport);
  }

  /**
   * Update config for a sport (runtime override)
   */
  updateConfig(sport: string, updates: Partial<SportConfig>): void {
    if (SPORT_CONFIGS[sport.toUpperCase()]) {
      SPORT_CONFIGS[sport.toUpperCase()] = {
        ...SPORT_CONFIGS[sport.toUpperCase()],
        ...updates
      };
    }
  }

  /**
   * Generate config report
   */
  generateReport(): string {
    const lines = [
      '🏆 SPORT-SPECIFIC CONFIGURATION',
      '═'.repeat(60),
      ''
    ];

    for (const [sport, config] of Object.entries(SPORT_CONFIGS)) {
      const status = config.enabled ? '✅' : '❌';
      lines.push(`${status} ${sport}`);
      lines.push(`   Max Stake: $${config.maxStake} | Min Confidence: ${config.minConfidence}%`);
      lines.push(`   Min Edge: ${config.minEdge}% | Max Daily Trades: ${config.maxDailyTrades}`);
      lines.push(`   Kelly Adj: ${config.volatilityAdjustment}x`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const sportConfig = new SportConfigManager();

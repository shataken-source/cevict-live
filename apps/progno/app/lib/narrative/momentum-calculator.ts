/**
 * Narrative Momentum Calculator
 * Combines detected narratives into a final momentum score
 */

import { DetectedNarrative } from './detector';

export interface NarrativeMomentumResult {
  teamId: string;
  gameId: string;

  // Final score
  momentumScore: number;    // -0.30 to +0.30
  confidence: number;       // 0 to 1

  // Breakdown
  positiveNarratives: DetectedNarrative[];
  negativeNarratives: DetectedNarrative[];

  // Key stories
  dominantNarrative: DetectedNarrative | null;
  narrativeConflicts: NarrativeConflict[];

  // Summary
  summary: string;
  keyInsights: string[];
}

export interface NarrativeConflict {
  narrative1: string;
  narrative2: string;
  resolution: 'cancel' | 'dominant_wins' | 'average';
  impact: number;
}

/**
 * Known conflict pairs and their resolution strategies
 */
const CONFLICT_PAIRS = [
  {
    pair: ['revenge_blowout', 'complacency_trap'],
    resolution: 'dominant_wins' as const,
  },
  {
    pair: ['pressure_must_win', 'complacency_championship_hangover'],
    resolution: 'average' as const,
  },
  {
    pair: ['validation_doubters', 'external_legal'],
    resolution: 'cancel' as const,
  },
  {
    pair: ['redemption_contract_year', 'external_personal'],
    resolution: 'average' as const,
  },
  {
    pair: ['revenge_traded', 'complacency_big_favorite'],
    resolution: 'dominant_wins' as const,
  },
];

/**
 * Narrative Momentum Calculator
 */
export class NarrativeMomentumCalculator {

  /**
   * Calculate narrative momentum from detected narratives
   */
  async calculate(
    teamId: string,
    opponentId: string,
    gameId: string,
    narratives: DetectedNarrative[]
  ): Promise<NarrativeMomentumResult> {

    // 1. Separate positive and negative
    const positive = narratives.filter(n => n.adjustedImpact > 0);
    const negative = narratives.filter(n => n.adjustedImpact < 0);

    // 2. Check for conflicts
    const conflicts = this.detectConflicts(narratives);

    // 3. Calculate raw momentum with conflict resolution
    let rawMomentum = 0;
    let totalWeight = 0;

    for (const narrative of narratives) {
      // Check if this narrative is in conflict
      const conflict = conflicts.find(c =>
        c.narrative1 === narrative.narrativeId ||
        c.narrative2 === narrative.narrativeId
      );

      let effectiveImpact = narrative.adjustedImpact;

      if (conflict) {
        if (conflict.resolution === 'cancel') {
          effectiveImpact *= 0.2;  // Mostly cancel out
        } else if (conflict.resolution === 'average') {
          effectiveImpact *= 0.6;  // Partially reduced
        }
        // 'dominant_wins' keeps full impact
      }

      rawMomentum += effectiveImpact * narrative.confidence;
      totalWeight += narrative.confidence;
    }

    // 4. Normalize (use sqrt to not over-punish few narratives)
    const normalizedMomentum = totalWeight > 0
      ? rawMomentum / Math.sqrt(totalWeight)
      : 0;

    // 5. Cap at bounds
    const finalMomentum = Math.max(-0.30, Math.min(0.30, normalizedMomentum));

    // 6. Calculate overall confidence
    const avgConfidence = narratives.length > 0
      ? narratives.reduce((sum, n) => sum + n.confidence, 0) / narratives.length
      : 0;

    // Boost confidence if multiple sources agree
    const sourceBonus = this.calculateSourceDiversity(narratives);
    const finalConfidence = Math.min(avgConfidence + sourceBonus, 0.95);

    // 7. Find dominant narrative
    const dominantNarrative = narratives.length > 0
      ? narratives.reduce((max, n) =>
          Math.abs(n.adjustedImpact) > Math.abs(max.adjustedImpact) ? n : max
        )
      : null;

    // 8. Generate summary
    const summary = this.generateSummary(narratives, finalMomentum);
    const keyInsights = this.generateInsights(narratives, conflicts);

    return {
      teamId,
      gameId,
      momentumScore: finalMomentum,
      confidence: finalConfidence,
      positiveNarratives: positive,
      negativeNarratives: negative,
      dominantNarrative,
      narrativeConflicts: conflicts,
      summary,
      keyInsights,
    };
  }

  /**
   * Detect conflicts between narratives
   */
  private detectConflicts(narratives: DetectedNarrative[]): NarrativeConflict[] {
    const conflicts: NarrativeConflict[] = [];

    for (const { pair, resolution } of CONFLICT_PAIRS) {
      const has1 = narratives.find(n => n.narrativeId === pair[0]);
      const has2 = narratives.find(n => n.narrativeId === pair[1]);

      if (has1 && has2) {
        let impact = 0;

        if (resolution === 'dominant_wins') {
          const dominant = Math.abs(has1.adjustedImpact) > Math.abs(has2.adjustedImpact)
            ? has1 : has2;
          impact = dominant.adjustedImpact;
        } else if (resolution === 'average') {
          impact = (has1.adjustedImpact + has2.adjustedImpact) / 2;
        } else {
          impact = 0;  // Cancel
        }

        conflicts.push({
          narrative1: pair[0],
          narrative2: pair[1],
          resolution,
          impact,
        });
      }
    }

    return conflicts;
  }

  /**
   * Calculate source diversity bonus
   */
  private calculateSourceDiversity(narratives: DetectedNarrative[]): number {
    const allSources = new Set<string>();

    for (const narrative of narratives) {
      for (const source of narrative.detectedFrom) {
        allSources.add(source);
      }
    }

    // 5 possible sources: news, social, press, schedule, stats
    // Bonus for each additional source
    return Math.min((allSources.size - 1) * 0.03, 0.12);
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    narratives: DetectedNarrative[],
    momentum: number
  ): string {

    if (narratives.length === 0) {
      return 'No significant narratives detected for this matchup.';
    }

    let summary = '';

    if (momentum > 0.15) {
      summary = 'STRONG POSITIVE momentum: ';
    } else if (momentum > 0.05) {
      summary = 'Moderate positive momentum: ';
    } else if (momentum > -0.05) {
      summary = 'Neutral narrative environment: ';
    } else if (momentum > -0.15) {
      summary = 'Moderate negative momentum: ';
    } else {
      summary = 'STRONG NEGATIVE momentum: ';
    }

    // Add top narratives
    const top3 = narratives
      .sort((a, b) => Math.abs(b.adjustedImpact) - Math.abs(a.adjustedImpact))
      .slice(0, 3);

    summary += top3.map(n => n.narrative.name).join(', ');

    return summary;
  }

  /**
   * Generate key insights
   */
  private generateInsights(
    narratives: DetectedNarrative[],
    conflicts: NarrativeConflict[]
  ): string[] {

    const insights: string[] = [];

    // Top positive
    const topPositive = narratives
      .filter(n => n.adjustedImpact > 0.05)
      .sort((a, b) => b.adjustedImpact - a.adjustedImpact)[0];

    if (topPositive) {
      insights.push(
        `📈 ${topPositive.narrative.name} (+${(topPositive.adjustedImpact * 100).toFixed(1)}%): ` +
        topPositive.evidence[0].text
      );
    }

    // Top negative
    const topNegative = narratives
      .filter(n => n.adjustedImpact < -0.05)
      .sort((a, b) => a.adjustedImpact - b.adjustedImpact)[0];

    if (topNegative) {
      insights.push(
        `📉 ${topNegative.narrative.name} (${(topNegative.adjustedImpact * 100).toFixed(1)}%): ` +
        topNegative.evidence[0].text
      );
    }

    // Conflicts
    for (const conflict of conflicts) {
      insights.push(
        `⚠️ Narrative conflict: ${conflict.narrative1} vs ${conflict.narrative2} ` +
        `(${conflict.resolution})`
      );
    }

    // Multiple sources
    const multiSource = narratives.filter(n => n.detectedFrom.length >= 3);
    for (const narrative of multiSource.slice(0, 2)) {
      insights.push(
        `🎯 High confidence: ${narrative.narrative.name} confirmed by ` +
        `${narrative.detectedFrom.length} sources`
      );
    }

    return insights;
  }
}


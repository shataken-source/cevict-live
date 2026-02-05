/**
 * Emergent Pattern Detection (EPD)
 * ML-discovered patterns that humans miss
 */

export interface EmergentPattern {
  id: string;
  description: string;
  pattern: string[];        // Conditions that trigger pattern
  score: number;            // -0.1 to +0.1 (impact on probability)
  confidence: number;       // 0 to 1
  sampleSize: number;       // Number of historical matches
  accuracy: number;         // Historical accuracy (0 to 1)
  discoveredAt: Date;
}

export interface PatternMatch {
  pattern: EmergentPattern;
  matched: boolean;
  matchedConditions: string[];
  score: number;
  confidence: number;
}

export interface EPDResult {
  patterns: PatternMatch[];
  combinedScore: number;    // -0.1 to +0.1
  confidence: number;       // 0 to 1
  insights: string[];
}

/**
 * Emergent Pattern Detector
 * Detects ML-discovered patterns in game data
 */
export class EmergentPatternDetector {
  private patterns: EmergentPattern[] = [];

  /**
   * Load patterns (would come from ML model in production)
   */
  loadPatterns(patterns: EmergentPattern[]): void {
    this.patterns = patterns;
  }

  /**
   * Detect patterns in game context
   */
  detect(context: {
    teamId: string;
    opponentId: string;
    gameData: {
      homeTeam: string;
      awayTeam: string;
      league: string;
      sport: string;
      date?: string;
      venue?: string;
      weather?: any;
      odds?: any;
      teamStats?: any;
    };
  }): EPDResult {

    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      // Check if pattern conditions match
      const match = this.checkPatternMatch(pattern, context);

      if (match.matched) {
        matches.push(match);
      }
    }

    // Calculate combined score (weighted by confidence and accuracy)
    let weightedSum = 0;
    let totalWeight = 0;

    for (const match of matches) {
      const weight = match.pattern.confidence * match.pattern.accuracy;
      weightedSum += match.score * weight;
      totalWeight += weight;
    }

    const combinedScore = totalWeight > 0
      ? weightedSum / totalWeight
      : 0;

    // Clamp to bounds
    const finalScore = Math.max(-0.1, Math.min(0.1, combinedScore));

    // Calculate overall confidence
    const avgConfidence = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      : 0;

    // Generate insights
    const insights = this.generateInsights(matches);

    return {
      patterns: matches,
      combinedScore: finalScore,
      confidence: avgConfidence,
      insights,
    };
  }

  /**
   * Check if pattern matches context
   */
  private checkPatternMatch(
    pattern: EmergentPattern,
    context: any
  ): PatternMatch {

    // Simplified pattern matching
    // In production, would use ML model to check complex conditions
    const matchedConditions: string[] = [];
    let matchCount = 0;

    // Check each condition in pattern
    for (const condition of pattern.pattern) {
      // Simple keyword matching (would be more sophisticated in production)
      const contextStr = JSON.stringify(context).toLowerCase();
      if (contextStr.includes(condition.toLowerCase())) {
        matchedConditions.push(condition);
        matchCount++;
      }
    }

    // Pattern matches if all conditions are met
    const matched = matchCount === pattern.pattern.length;

    return {
      pattern,
      matched,
      matchedConditions,
      score: matched ? pattern.score : 0,
      confidence: matched ? pattern.confidence : 0,
    };
  }

  /**
   * Generate insights from matched patterns
   */
  private generateInsights(matches: PatternMatch[]): string[] {
    const insights: string[] = [];

    // Top patterns
    const topPatterns = matches
      .filter(m => m.matched)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 3);

    for (const match of topPatterns) {
      insights.push(
        `🔍 Pattern: ${match.pattern.description} ` +
        `(${(match.score * 100).toFixed(1)}% impact, ` +
        `${(match.pattern.accuracy * 100).toFixed(0)}% historical accuracy)`
      );
    }

    return insights;
  }

  /**
   * Get default patterns (placeholder - would come from ML model)
   */
  getDefaultPatterns(): EmergentPattern[] {
    // Example patterns (would be discovered by ML in production)
    return [
      {
        id: 'pattern_1',
        description: 'Tuesday press conference cancellation',
        pattern: ['press_conference', 'cancelled', 'tuesday'],
        score: -0.05,
        confidence: 0.65,
        sampleSize: 142,
        accuracy: 0.62,
        discoveredAt: new Date(),
      },
      {
        id: 'pattern_2',
        description: 'Road favorite after bye week with revenge narrative',
        pattern: ['road', 'favorite', 'bye_week', 'revenge'],
        score: +0.07,
        confidence: 0.71,
        sampleSize: 89,
        accuracy: 0.71,
        discoveredAt: new Date(),
      },
    ];
  }
}


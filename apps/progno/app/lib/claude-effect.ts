/**
 * THE CLAUDE EFFECT
 * A Revolutionary Probability Framework
 *
 * Quantifies the "intangibles" - human psychology, narratives, information asymmetry,
 * chaos, team chemistry, temporal decay, and emergent patterns that traditional
 * algorithms miss.
 *
 * Formula: FINAL_PROBABILITY = BASE_PROBABILITY × (1 + CLAUDE_EFFECT)
 * CONFIDENCE = BASE_CONFIDENCE × (1 - |CSI|) × (1 + |IAI|)
 */

import { getWeightsForLeague } from './claude-effect-weights';

export interface ClaudeEffectScores {
  sentimentField: number;        // SF: -0.2 to +0.2
  narrativeMomentum: number;     // NM: -0.15 to +0.15
  informationAsymmetry: number;  // IAI: -0.1 to +0.1
  chaosSensitivity: number;       // CSI: 0 to 1 (higher = more chaotic)
  networkInfluence: number;       // NIG: -0.1 to +0.1
  temporalDecay: number;          // TRD: Applied as multiplier (0.5 to 1.0)
  emergentPattern: number;        // EPD: -0.1 to +0.1
}

export interface ClaudeEffectResult {
  scores: ClaudeEffectScores;
  claudeEffect: number;           // Combined weighted effect (-0.3 to +0.3)
  adjustedProbability: number;   // Base probability × (1 + claudeEffect)
  adjustedConfidence: number;     // Base confidence × (1 - |CSI|) × (1 + |IAI|)
  reasoning: string[];
  warnings: string[];
  recommendations: {
    betSize: 'small' | 'medium' | 'large' | 'avoid';
    reason: string;
  };
}

export interface NarrativeContext {
  type: 'revenge' | 'proving_doubters' | 'contract_year' | 'return_to_team' |
        'injured_teammate' | 'losing_streak' | 'underdog' | 'complacency' |
        'looking_ahead' | 'post_championship' | 'none';
  strength: number;  // 0 to 1
  team: 'home' | 'away' | 'both';
  description: string;
}

export interface SentimentData {
  playerInterviews: number;      // -1 to 1
  socialMedia: number;           // -1 to 1
  pressConferences: number;       // -1 to 1
  fanSentiment: number;          // -1 to 1
  beatReporterTone: number;      // -1 to 1
  timestamp: string;
}

export interface InformationAsymmetryData {
  publicBetPercentage: number;   // 0 to 1
  lineMovement: number;          // Movement in points
  lineMovementDirection: 'with_public' | 'against_public' | 'neutral';
  sharpMoneyDirection: 'home' | 'away' | 'neutral';
  reverseLineMovement: boolean;
  volume: number;                // Betting volume
}

export interface ChaosFactors {
  divisionRivalry: boolean;
  weatherImpact: number;         // 0 to 1
  shortWeek: boolean;
  newStarter: boolean;
  playoffImplications: boolean;
  trapGame: boolean;
  domeTeamOutdoors: boolean;
}

/**
 * Claude Effect Engine
 * Implements the 7-dimensional probability modifier
 */
export class ClaudeEffectEngine {
  // Base weights (fallback when getWeightsForLeague returns default)
  // NOTE: CSI and TRD are NOT in the main formula - they're applied separately
  private weights = {
    sentiment: 0.15,        // w₁ - SF
    narrative: 0.12,        // w₂ - NM
    information: 0.20,      // w₃ - IAI
    network: 0.13,          // w₅ - NIG
    emergent: 0.20,         // w₇ - EPD
  };

  // Sport-specific decay constants for temporal relevance
  private decayConstants = {
    nfl: 0.15,    // Weekly games, slower decay
    nba: 0.25,    // Daily games, faster decay
    mlb: 0.30,    // Daily games, very fast decay
    nhl: 0.25,
    ncaa: 0.20,
    default: 0.20,
  };

  /** League-specific weights from simulation (NHL Momentum, NFL Efficiency). Maps 7D to engine 5D; applies optional overrides. */
  private getEffectiveWeights(league?: string): { sentiment: number; narrative: number; information: number; network: number; emergent: number } {
    const W = getWeightsForLeague(league || '');
    const base = {
      sentiment: W.SF,
      narrative: W.NM,
      information: W.IAI,
      network: W.NIG,
      emergent: W.EPD,
    };
    return { ...base, ...this.weightOverrides };
  }

  /**
   * Calculate the complete Claude Effect for a game
   */
  async calculateClaudeEffect(
    baseProbability: number,
    baseConfidence: number,
    gameData: {
      homeTeam: string;
      awayTeam: string;
      league: string;
      sport: string;
      date?: string;
      venue?: string;
      weather?: { conditions?: string; windSpeed?: number };
      odds?: { home: number; away: number; spread?: number };
    },
    context?: {
      sentiment?: SentimentData;
      narratives?: NarrativeContext[];
      informationAsymmetry?: InformationAsymmetryData;
      chaosFactors?: ChaosFactors;
      chaosData?: { csiScore: number; confidencePenalty: number }; // Phase 4: CSI API result
      networkData?: { cohesion: number; leadership: number; integration: number };
      recentEvents?: Array<{ daysAgo: number; impact: number; type: string }>;
      emergentPatterns?: Array<{ score: number; description: string }>;
    }
  ): Promise<ClaudeEffectResult> {
    const scores: ClaudeEffectScores = {
      sentimentField: 0,
      narrativeMomentum: 0,
      informationAsymmetry: 0,
      chaosSensitivity: 0,
      networkInfluence: 0,
      temporalDecay: 1.0,
      emergentPattern: 0,
    };

    const reasoning: string[] = [];
    const warnings: string[] = [];

    // DIMENSION 1: Sentiment Field (SF)
    if (context?.sentiment) {
      scores.sentimentField = this.calculateSentimentField(context.sentiment);
      if (Math.abs(scores.sentimentField) > 0.05) {
        reasoning.push(
          `Sentiment: ${scores.sentimentField > 0 ? 'Positive' : 'Negative'} emotional state detected (${(scores.sentimentField * 100).toFixed(1)}%)`
        );
      }
    }

    // DIMENSION 2: Narrative Momentum (NM)
    if (context?.narratives && context.narratives.length > 0) {
      scores.narrativeMomentum = this.calculateNarrativeMomentum(context.narratives);
      if (Math.abs(scores.narrativeMomentum) > 0.03) {
        const topNarrative = context.narratives.reduce((a, b) =>
          Math.abs(a.strength) > Math.abs(b.strength) ? a : b
        );
        reasoning.push(
          `Narrative: ${this.formatNarrativeType(topNarrative.type)} affecting ${topNarrative.team} (${(scores.narrativeMomentum * 100).toFixed(1)}% impact)`
        );
      }
    }

    // DIMENSION 3: Information Asymmetry Index (IAI)
    if (context?.informationAsymmetry) {
      scores.informationAsymmetry = this.calculateInformationAsymmetry(
        context.informationAsymmetry
      );
      if (Math.abs(scores.informationAsymmetry) > 0.02) {
        reasoning.push(
          `Smart Money: ${scores.informationAsymmetry > 0 ? 'Favoring' : 'Fading'} this side (${(scores.informationAsymmetry * 100).toFixed(1)}% edge)`
        );
        if (context.informationAsymmetry.reverseLineMovement) {
          warnings.push('⚠️ Reverse line movement detected - sharp money disagrees with public');
        }
      }
    }

    // DIMENSION 4: Chaos Sensitivity Index (CSI)
    scores.chaosSensitivity = this.calculateChaosSensitivity(
      gameData,
      context?.chaosFactors
    );
    if (scores.chaosSensitivity > 0.35) {
      warnings.push(`🚨 HIGH CHAOS (${(scores.chaosSensitivity * 100).toFixed(0)}%) - Reduce bet size or avoid`);
      reasoning.push(`Chaos Index: ${(scores.chaosSensitivity * 100).toFixed(0)}% - High volatility expected`);
    } else if (scores.chaosSensitivity > 0.25) {
      reasoning.push(`Chaos Index: ${(scores.chaosSensitivity * 100).toFixed(0)}% - Moderate volatility`);
    }

    // DIMENSION 5: Network Influence Graph (NIG)
    if (context?.networkData) {
      scores.networkInfluence = this.calculateNetworkInfluence(context.networkData);
      if (Math.abs(scores.networkInfluence) > 0.03) {
        reasoning.push(
          `Team Chemistry: ${scores.networkInfluence > 0 ? 'Strong' : 'Concerning'} cohesion (${(scores.networkInfluence * 100).toFixed(1)}%)`
        );
      }
    }

    // DIMENSION 6: Temporal Relevance Decay (TRD)
    if (context?.recentEvents && context.recentEvents.length > 0) {
      scores.temporalDecay = this.calculateTemporalDecay(
        context.recentEvents,
        gameData.sport || 'default'
      );
      if (scores.temporalDecay < 0.8) {
        reasoning.push(
          `Temporal Decay: Recent events weighted at ${(scores.temporalDecay * 100).toFixed(0)}% of original impact`
        );
      }
    }

    // DIMENSION 7: Emergent Pattern Detection (EPD)
    if (context?.emergentPatterns && context.emergentPatterns.length > 0) {
      scores.emergentPattern = this.calculateEmergentPattern(context.emergentPatterns);
      if (Math.abs(scores.emergentPattern) > 0.02) {
        reasoning.push(
          `Emergent Pattern: ${scores.emergentPattern > 0 ? 'Positive' : 'Negative'} ML-detected signal (${(scores.emergentPattern * 100).toFixed(1)}%)`
        );
      }
    }

    // Calculate combined Claude Effect (per complete guide spec)
    // Formula: CLAUDE_EFFECT = (w₁ × SF) + (w₂ × NM) + (w₃ × IAI) + (w₅ × NIG) + (w₇ × EPD)
    // NOTE: CSI and TRD are NOT in this formula - they're applied separately
    // Use league-specific weights when available (NHL: NM; NFL: IAI from simulation)
    const w = this.getEffectiveWeights(gameData.league);
    const claudeEffect =
      (w.sentiment * scores.sentimentField) +
      (w.narrative * scores.narrativeMomentum) +
      (w.information * scores.informationAsymmetry) +
      (w.network * scores.networkInfluence) +
      (w.emergent * scores.emergentPattern);

    // Clamp Claude Effect to reasonable bounds (±15% max impact per guide)
    const clampedEffect = Math.max(-0.15, Math.min(0.15, claudeEffect));

    // Calculate adjusted probability (per complete guide spec)
    // Formula: FINAL_PROBABILITY = BASE_PROBABILITY × (1 + CLAUDE_EFFECT) × TRD_MULTIPLIER
    const adjustedProbability = Math.max(0.01, Math.min(0.99,
      baseProbability * (1 + clampedEffect) * scores.temporalDecay
    ));

    // Calculate adjusted confidence (per complete guide spec)
    // Formula: FINAL_CONFIDENCE = BASE_CONFIDENCE × (1 - CSI_PENALTY) × (1 + |IAI|)
    // Phase 4: Use confidencePenalty from CSI API if available
    const csiPenalty = context?.chaosData?.confidencePenalty !== undefined
      ? context.chaosData.confidencePenalty
      : scores.chaosSensitivity; // CSI is 0-1, use directly as penalty

    const infoBoost = Math.abs(scores.informationAsymmetry);
    const adjustedConfidence = Math.max(0.1, Math.min(1.0,
      baseConfidence * (1 - csiPenalty) * (1 + infoBoost)
    ));

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      adjustedProbability,
      adjustedConfidence,
      scores.chaosSensitivity,
      scores.informationAsymmetry,
      warnings
    );

    return {
      scores,
      claudeEffect: clampedEffect,
      adjustedProbability,
      adjustedConfidence,
      reasoning,
      warnings,
      recommendations,
    };
  }

  /**
   * DIMENSION 1: Sentiment Field (SF)
   * Analyzes emotional state from multiple sources
   *
   * Phase 1: Uses provided sentiment data
   * Phase 2: Will call Sentiment Field API for real-time analysis
   */
  private calculateSentimentField(sentiment: SentimentData): number {
    const weights = {
      playerInterviews: 0.30,
      socialMedia: 0.20,
      pressConferences: 0.25,
      fanSentiment: 0.15,
      beatReporterTone: 0.10,
    };

    const weightedSum =
      (sentiment.playerInterviews * weights.playerInterviews) +
      (sentiment.socialMedia * weights.socialMedia) +
      (sentiment.pressConferences * weights.pressConferences) +
      (sentiment.fanSentiment * weights.fanSentiment) +
      (sentiment.beatReporterTone * weights.beatReporterTone);

    // Normalize to -0.2 to +0.2 range
    return Math.max(-0.2, Math.min(0.2, weightedSum * 0.2));
  }

  /**
   * Calculate Sentiment Field from API (Phase 1 integration)
   */
  async calculateSentimentFieldFromAPI(
    teamId: string,
    teamName: string,
    gameId?: string
  ): Promise<number> {
    try {
      // Call sentiment API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/sentiment/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          teamName,
          gameId: gameId || 'current',
          forceRefresh: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.sentimentField || 0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch sentiment from API:', error);
    }

    // Fallback to 0 if API fails
    return 0;
  }

  /**
   * DIMENSION 2: Narrative Momentum (NM)
   * Quantifies the "story power" affecting a game
   *
   * Phase 1: Uses provided narrative context
   * Phase 2: Will call Narrative Momentum API for real-time analysis
   */
  private calculateNarrativeMomentum(narratives: NarrativeContext[]): number {
    const narrativeImpacts: Record<string, number> = {
      revenge: 0.08,
      proving_doubters: 0.05,
      contract_year: 0.04,
      return_to_team: 0.06,
      injured_teammate: 0.07,
      losing_streak: 0.03,
      underdog: 0.05,
      complacency: -0.04,
      looking_ahead: -0.06,
      post_championship: -0.08,
      none: 0.0,
    };

    let totalMomentum = 0;
    for (const narrative of narratives) {
      const baseImpact = narrativeImpacts[narrative.type] || 0;
      const adjustedImpact = baseImpact * narrative.strength;

      // Apply team direction (home = positive, away = negative, both = neutral)
      if (narrative.team === 'away') {
        totalMomentum -= adjustedImpact;
      } else if (narrative.team === 'home') {
        totalMomentum += adjustedImpact;
      }
      // 'both' doesn't change momentum (neutral)
    }

    // Normalize to -0.15 to +0.15 range
    return Math.max(-0.15, Math.min(0.15, totalMomentum));
  }

  /**
   * Calculate Narrative Momentum from API (Phase 2 integration)
   */
  async calculateNarrativeMomentumFromAPI(
    teamId: string,
    opponentId: string,
    gameId: string,
    context?: any
  ): Promise<number> {
    try {
      // Call narrative API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/narrative/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          opponentId,
          gameId,
          context,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.momentumScore || 0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch narrative momentum from API:', error);
    }

    // Fallback to 0 if API fails
    return 0;
  }

  /**
   * DIMENSION 3: Information Asymmetry Index (IAI)
   * Detects what sharp money knows
   *
   * Phase 1: Uses provided information asymmetry data
   * Phase 3: Will call IAI API for real-time analysis
   */
  private calculateInformationAsymmetry(data: InformationAsymmetryData): number {
    // Reverse Line Movement is the strongest signal
    if (data.reverseLineMovement) {
      const rlmScore = Math.abs(data.publicBetPercentage - 0.5) * Math.abs(data.lineMovement);
      const direction = data.lineMovementDirection === 'against_public' ? 1 : -1;
      return Math.max(-0.1, Math.min(0.1, rlmScore * direction * 0.1));
    }

    // Regular line movement with sharp money direction
    if (data.sharpMoneyDirection !== 'neutral' && Math.abs(data.lineMovement) > 0.5) {
      const direction = data.sharpMoneyDirection === 'home' ? 1 : -1;
      return Math.max(-0.1, Math.min(0.1, Math.abs(data.lineMovement) * direction * 0.05));
    }

    return 0;
  }

  /**
   * Calculate Information Asymmetry from API (Phase 3 integration)
   */
  async calculateInformationAsymmetryFromAPI(
    gameId: string,
    context: {
      openingLine: number;
      currentLine: number;
      isHomeFavorite: boolean;
      sport?: string;
      publicTicketPct: number;
      bettingSplits?: any[];
      recentMovements?: any[];
    }
  ): Promise<number> {
    try {
      // Call IAI API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/iai/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          context,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.iaiScore || 0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch IAI from API:', error);
    }

    // Fallback to 0 if API fails
    return 0;
  }

  /**
   * DIMENSION 4: Chaos Sensitivity Index (CSI)
   * Measures game volatility
   *
   * Phase 1: Uses provided chaos factors
   * Phase 4: Will call CSI API for comprehensive analysis
   */
  private calculateChaosSensitivity(
    gameData: any,
    factors?: ChaosFactors
  ): number {
    let baseVolatility = 0.15; // Base chaos for any game

    if (!factors) {
      // Estimate from available data
      if (gameData.weather?.conditions &&
          ['rain', 'snow', 'wind'].some(w => gameData.weather.conditions?.toLowerCase().includes(w))) {
        baseVolatility += 0.20;
      }
      if (gameData.league?.toLowerCase().includes('division')) {
        baseVolatility += 0.15;
      }
      return Math.min(1.0, baseVolatility);
    }

    // Division rivalry
    if (factors.divisionRivalry) baseVolatility += 0.15;

    // Weather impact
    if (factors.weatherImpact > 0) {
      baseVolatility += factors.weatherImpact * 0.20;
    }

    // Short week (Thursday games, etc.)
    if (factors.shortWeek) baseVolatility += 0.10;

    // New starter (backup QB, new coach, etc.)
    if (factors.newStarter) baseVolatility += 0.25;

    // Playoff implications
    if (factors.playoffImplications) baseVolatility += 0.12;

    // Trap game
    if (factors.trapGame) baseVolatility += 0.18;

    // Dome team playing outdoors
    if (factors.domeTeamOutdoors) baseVolatility += 0.15;

    return Math.min(1.0, baseVolatility);
  }

  /**
   * Calculate Chaos Sensitivity from API (Phase 4 integration)
   */
  async calculateChaosSensitivityFromAPI(
    gameId: string,
    context: {
      sport: string;
      weather?: any;
      schedule?: any;
      roster?: any;
      context?: any;
      rivalry?: any;
      external?: any;
    }
  ): Promise<{ csiScore: number; confidencePenalty: number }> {
    try {
      // Call CSI API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/csi/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          context,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return {
            csiScore: result.data.csiScore || 0,
            confidencePenalty: result.data.confidencePenalty || 0,
          };
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch CSI from API:', error);
    }

    // Fallback
    return { csiScore: 0.15, confidencePenalty: 0 };
  }

  /**
   * DIMENSION 5: Network Influence Graph (NIG)
   * Measures team chemistry and relationships
   *
   * Phase 1: Uses provided network data
   * Phase 5: Will call NIG API for comprehensive graph analysis
   */
  private calculateNetworkInfluence(data: {
    cohesion: number;      // 0 to 1
    leadership: number;   // 0 to 1
    integration: number;   // 0 to 1
  }): number {
    const nig = (data.cohesion * 0.4) + (data.leadership * 0.4) + (data.integration * 0.2);

    // Convert from 0-1 scale to -0.1 to +0.1 (centered at 0.5)
    return (nig - 0.5) * 0.2;
  }

  /**
   * Calculate Network Influence from API (Phase 5 integration)
   */
  async calculateNetworkInfluenceFromAPI(
    teamId: string,
    gameId: string,
    players: any[],
    relationships: any[]
  ): Promise<number> {
    try {
      // Call NIG API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/nig/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          gameId,
          players,
          relationships,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.networkInfluence || 0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch NIG from API:', error);
    }

    // Fallback to 0 if API fails
    return 0;
  }

  /**
   * DIMENSION 6: Temporal Relevance Decay (TRD)
   * Applies recency weighting to events
   *
   * Phase 1: Uses provided events
   * Phase 6: Will call Temporal Decay API for comprehensive analysis
   */
  private calculateTemporalDecay(
    events: Array<{ daysAgo: number; impact: number; type: string }>,
    sport: string
  ): number {
    const lambda = this.decayConstants[sport as keyof typeof this.decayConstants] ||
                   this.decayConstants.default;

    let totalDecayedImpact = 0;
    let totalOriginalImpact = 0;

    for (const event of events) {
      const decayFactor = Math.exp(-lambda * event.daysAgo);
      const decayedImpact = event.impact * decayFactor;
      totalDecayedImpact += decayedImpact;
      totalOriginalImpact += event.impact;
    }

    if (totalOriginalImpact === 0) return 1.0;

    // Return the ratio of decayed to original (0.5 to 1.0)
    const ratio = totalDecayedImpact / totalOriginalImpact;
    return Math.max(0.5, Math.min(1.0, ratio));
  }

  /**
   * Calculate Temporal Decay from API (Phase 6 integration)
   */
  async calculateTemporalDecayFromAPI(
    events: Array<{ daysAgo: number; impact: number; type: string; description?: string }>,
    sport: string
  ): Promise<number> {
    try {
      // Call Temporal API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/temporal/decay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events,
          sport,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.decayFactor || 1.0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch temporal decay from API:', error);
    }

    // Fallback
    return 1.0;
  }

  /**
   * DIMENSION 7: Emergent Pattern Detection (EPD)
   * ML-discovered patterns
   *
   * Phase 1: Uses provided patterns
   * Phase 7: Will call Emergent Pattern API for ML-based detection
   */
  private calculateEmergentPattern(
    patterns: Array<{ score: number; description: string }>
  ): number {
    if (patterns.length === 0) return 0;

    // Average the pattern scores
    const avgScore = patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length;

    // Normalize to -0.1 to +0.1
    return Math.max(-0.1, Math.min(0.1, avgScore));
  }

  /**
   * Calculate Emergent Pattern from API (Phase 7 integration)
   */
  async calculateEmergentPatternFromAPI(
    context: {
      teamId: string;
      opponentId: string;
      gameData: any;
    }
  ): Promise<number> {
    try {
      // Call Emergent Pattern API
      const baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/emergent/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.combinedScore || 0;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Failed to fetch emergent patterns from API:', error);
    }

    // Fallback to 0 if API fails
    return 0;
  }

  /**
   * Generate betting recommendations based on Claude Effect
   */
  private generateRecommendations(
    probability: number,
    confidence: number,
    chaos: number,
    infoAsymmetry: number,
    warnings: string[]
  ): { betSize: 'small' | 'medium' | 'large' | 'avoid'; reason: string } {
    // High chaos = avoid or small bet
    if (chaos > 0.5) {
      return {
        betSize: 'avoid',
        reason: `Extremely high chaos (${(chaos * 100).toFixed(0)}%) - too unpredictable`,
      };
    }

    if (chaos > 0.35) {
      return {
        betSize: 'small',
        reason: `High chaos (${(chaos * 100).toFixed(0)}%) - reduce bet size`,
      };
    }

    // Low confidence = small bet
    if (confidence < 0.6) {
      return {
        betSize: 'small',
        reason: `Low confidence (${(confidence * 100).toFixed(0)}%) - small bet only`,
      };
    }

    // Strong sharp money signal = medium to large
    if (Math.abs(infoAsymmetry) > 0.05 && confidence > 0.7) {
      return {
        betSize: 'large',
        reason: `Sharp money signal + high confidence (${(confidence * 100).toFixed(0)}%)`,
      };
    }

    // High confidence, low chaos = medium to large
    if (confidence > 0.75 && chaos < 0.25) {
      return {
        betSize: 'large',
        reason: `High confidence (${(confidence * 100).toFixed(0)}%) with low chaos`,
      };
    }

    // Default medium
    return {
      betSize: 'medium',
      reason: `Standard bet size - confidence: ${(confidence * 100).toFixed(0)}%, chaos: ${(chaos * 100).toFixed(0)}%`,
    };
  }

  /**
   * Format narrative type for display
   */
  private formatNarrativeType(type: string): string {
    const formats: Record<string, string> = {
      revenge: 'Revenge Game',
      proving_doubters: 'Proving Doubters Wrong',
      contract_year: 'Contract Year',
      return_to_team: 'Return to Former Team',
      injured_teammate: 'Playing for Injured Teammate',
      losing_streak: 'Losing Streak Desperation',
      underdog: 'Nobody Believes in Us',
      complacency: 'Complacency (Heavy Favorite)',
      looking_ahead: 'Looking Ahead',
      post_championship: 'Post-Championship Hangover',
      none: 'No Narrative',
    };
    return formats[type] || type;
  }

  /**
   * Update weights based on backtesting results
   */
  updateWeights(newWeights: Partial<{ sentiment: number; narrative: number; information: number; network: number; emergent: number }>): void {
    this.weightOverrides = { ...this.weightOverrides, ...newWeights };
  }

  /**
   * Get current effective weights (default league + overrides; for fine-tuning UI)
   */
  getWeights(): { sentiment: number; narrative: number; information: number; network: number; emergent: number } {
    return this.getEffectiveWeights('');
  }
}


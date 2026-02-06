/**
 * Complete Claude Effect Engine
 * Modular, hardened, with Monte Carlo support
 */

import { calculateNarrativeMomentum } from '../api-sports/services/h2h-sync';
import { getTeamInjuryImpact } from '../api-sports/services/injury-sync';
import { MultiSourceOddsService } from '../api-sports/services/multi-source-odds';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

const DIMENSION_WEIGHTS = {
  SF: 0.15,
  NM: 0.12,
  IAI: 0.20,
  NIG: 0.13,
  EPD: 0.20,
} as const;

const MAX_EFFECT_SWING = 0.25;

const RECOMMENDATION_THRESHOLDS = {
  NFL: {
    strong:    { prob: 0.62, conf: 78, edge: 7 },
    moderate:  { prob: 0.58, conf: 70, edge: 5 },
    lean:      { prob: 0.55, conf: 62, edge: 3 }
  },
  DEFAULT: {
    strong:    { prob: 0.65, conf: 80, edge: 8 },
    moderate:  { prob: 0.60, conf: 72, edge: 6 },
    lean:      { prob: 0.56, conf: 65, edge: 4 }
  }
} as const;

export interface ClaudeEffectInput {
  baseProbability: number;
  baseConfidence: number;
  gameTime: Date;
  sport: string;
  /** Optional: for narrative momentum (H2H) and chaos (injury) */
  homeTeam?: string;
  awayTeam?: string;
  /** Optional: for multi-source odds / information asymmetry */
  gameId?: string;
}

export interface DimensionScores {
  sentimentField: number;
  narrativeMomentum: number;
  informationAsymmetry: number;
  chaosSensitivity: number;
  networkInfluence: number;
  temporalDecay: number;
  emergentPatterns: number;
}

export interface ClaudeEffectResult {
  dimensions: DimensionScores;
  narratives: any;
  claudeEffect: number;
  adjustedProbability: number;
  adjustedConfidence: number;
  recommendation: 'strong_bet' | 'moderate_bet' | 'lean' | 'avoid' | 'no_play';
  edgePercentage: number;
  monteCarlo?: {
    iterations: number;
    probability5th: number;
    probability50th: number;
    probability95th: number;
    probabilityMean: number;
    confidenceIntervalWidth: number;
  };
}

export class CompleteClaudeEffectEngine {
  async calculate(
    input: ClaudeEffectInput,
    options: { useMonteCarlo?: boolean; mcIterations?: number } = {}
  ): Promise<ClaudeEffectResult> {
    const { useMonteCarlo = false, mcIterations = 1000 } = options;

    const dimensions = await this.gatherAllDimensions(input);
    const claudeEffect = this.computeBoundedEffect(dimensions);
    const temporalDecay = dimensions.temporalDecay;

    let adjustedProbability = input.baseProbability * (1 + claudeEffect) * temporalDecay;
    adjustedProbability = Math.max(0.50, Math.min(0.95, adjustedProbability));

    const CSI_PENALTY = Math.min(dimensions.chaosSensitivity * 0.35, 0.35);
    let adjustedConfidence = input.baseConfidence * (1 - CSI_PENALTY) * (1 + Math.abs(dimensions.informationAsymmetry) * 0.5);
    adjustedConfidence = Math.max(55, Math.min(95, adjustedConfidence));

    const edgePercentage = (adjustedProbability - 0.50) * 100;

    const recommendation = this.getLeagueAwareRecommendation(
      adjustedProbability,
      adjustedConfidence,
      dimensions.chaosSensitivity,
      edgePercentage,
      input.sport
    );

    const result: ClaudeEffectResult = {
      dimensions,
      narratives: {
        sentiment: [],
        narrative: [],
        information: [],
        chaos: [],
        network: [],
        temporal: [],
        emergent: []
      },
      claudeEffect,
      adjustedProbability,
      adjustedConfidence,
      recommendation,
      edgePercentage
    };

    if (useMonteCarlo) {
      const probabilities: number[] = [];
      for (let i = 0; i < mcIterations; i++) {
        const noisy = this.addNoiseToDimensions(dimensions);
        const noisyEffect = this.computeBoundedEffect(noisy);
        let p = input.baseProbability * (1 + noisyEffect) * temporalDecay;
        p = Math.max(0.50, Math.min(0.95, p));
        probabilities.push(p);
      }
      probabilities.sort((a, b) => a - b);

      result.monteCarlo = {
        iterations: mcIterations,
        probability5th: probabilities[Math.floor(mcIterations * 0.05)],
        probability50th: probabilities[Math.floor(mcIterations * 0.50)],
        probability95th: probabilities[Math.floor(mcIterations * 0.95)],
        probabilityMean: probabilities.reduce((a, b) => a + b, 0) / mcIterations,
        confidenceIntervalWidth: probabilities[Math.floor(mcIterations * 0.95)] - probabilities[Math.floor(mcIterations * 0.05)]
      };
    }

    return result;
  }

  private async gatherAllDimensions(input: ClaudeEffectInput): Promise<DimensionScores> {
    const sport = input.sport || 'NFL';
    const sportLower = sport.toLowerCase();

    // Defaults (used when services fail or data missing)
    let narrativeMomentum = 0.08;
    let chaosSensitivity = 0.35;
    let informationAsymmetry = 0.12;
    let temporalDecay = 0.92;

    // Phase 2: Narrative Momentum (H2H) – real call when we have team names
    if (input.homeTeam && input.awayTeam) {
      try {
        const nm = await calculateNarrativeMomentum(input.homeTeam, input.awayTeam, sport);
        narrativeMomentum = nm.momentum;
      } catch (_) {
        // keep default
      }
    }

    // Phase 4: Chaos Sensitivity (injury impact) – real call when we have team names
    if (input.homeTeam || input.awayTeam) {
      try {
        const [homeImpact, awayImpact] = await Promise.all([
          input.homeTeam ? getTeamInjuryImpact(sportLower, input.homeTeam) : Promise.resolve(0),
          input.awayTeam ? getTeamInjuryImpact(sportLower, input.awayTeam) : Promise.resolve(0),
        ]);
        chaosSensitivity = Math.min(1, Math.max(homeImpact, awayImpact));
      } catch (_) {
        // keep default
      }
    }

    // Phase 3: Information Asymmetry (multi-source odds) – real call when we have gameId
    if (input.gameId) {
      try {
        const odds = await MultiSourceOddsService.getGameOdds(input.gameId, sport);
        if (odds != null && typeof odds.marketEfficiencyScore === 'number') {
          informationAsymmetry = Math.min(0.25, (1 - odds.marketEfficiencyScore) * 0.5);
        }
      } catch (_) {
        // keep default
      }
    }

    // Phase 6: Temporal decay from game time (older = slightly lower decay)
    if (input.gameTime) {
      const now = Date.now();
      const gameMs = new Date(input.gameTime).getTime();
      const daysDiff = (gameMs - now) / (24 * 60 * 60 * 1000);
      if (daysDiff < 0) temporalDecay = 0.95; // already played
      else if (daysDiff > 7) temporalDecay = 0.88; // far future
      else temporalDecay = 0.92;
    }

    return {
      sentimentField: 0.4,
      narrativeMomentum,
      informationAsymmetry,
      chaosSensitivity,
      networkInfluence: -0.05,
      temporalDecay,
      emergentPatterns: 0.15
    };
  }

  private computeBoundedEffect(scores: DimensionScores): number {
    let effect =
      DIMENSION_WEIGHTS.SF * scores.sentimentField +
      DIMENSION_WEIGHTS.NM * scores.narrativeMomentum +
      DIMENSION_WEIGHTS.IAI * scores.informationAsymmetry +
      DIMENSION_WEIGHTS.NIG * scores.networkInfluence +
      DIMENSION_WEIGHTS.EPD * scores.emergentPatterns;

    return Math.max(-MAX_EFFECT_SWING, Math.min(MAX_EFFECT_SWING, effect));
  }

  private addNoiseToDimensions(scores: DimensionScores): DimensionScores {
    const noise = () => (Math.random() - 0.5) * 0.2;
    return {
      sentimentField: scores.sentimentField * (1 + noise()),
      narrativeMomentum: scores.narrativeMomentum * (1 + noise()),
      informationAsymmetry: scores.informationAsymmetry * (1 + noise()),
      chaosSensitivity: scores.chaosSensitivity * (1 + noise()),
      networkInfluence: scores.networkInfluence * (1 + noise()),
      temporalDecay: scores.temporalDecay,
      emergentPatterns: scores.emergentPatterns * (1 + noise())
    };
  }

  private getLeagueAwareRecommendation(
    prob: number,
    conf: number,
    chaos: number,
    edge: number,
    sport: string
  ): 'strong_bet' | 'moderate_bet' | 'lean' | 'avoid' | 'no_play' {
    if (chaos > 0.5) return 'avoid';

    const thresholds = sport === 'NFL' ? RECOMMENDATION_THRESHOLDS.NFL : RECOMMENDATION_THRESHOLDS.DEFAULT;

    if (prob >= thresholds.strong.prob && conf >= thresholds.strong.conf && edge >= thresholds.strong.edge) return 'strong_bet';
    if (prob >= thresholds.moderate.prob && conf >= thresholds.moderate.conf && edge >= thresholds.moderate.edge) return 'moderate_bet';
    if (prob >= thresholds.lean.prob && conf >= thresholds.lean.conf && edge >= thresholds.lean.edge) return 'lean';
    if (prob < 0.53 || conf < 58) return 'no_play';

    return 'lean';
  }
}

let engineInstance: CompleteClaudeEffectEngine | null = null;
export function getClaudeEffectEngine(): CompleteClaudeEffectEngine {
  if (!engineInstance) engineInstance = new CompleteClaudeEffectEngine();
  return engineInstance;
}
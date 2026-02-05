/**
 * Information Asymmetry Index (IAI) Scoring Engine
 * Combines all signals into final IAI score
 */

import { IAI_WEIGHTS, normalizeIAIScore } from './signals';
import { RLMDetector, SteamDetector, ProEdgeCalculator, LineFreezeDetector } from './detector';
import { LineMovement, BettingSplit } from './signals';

export interface IAIContext {
  // Line data
  openingLine: number;
  currentLine: number;
  isHomeFavorite: boolean;
  sport: string;

  // Betting splits
  publicTicketPct: number;  // % of public on favorite
  bettingSplits?: BettingSplit[];

  // Line movements (for steam detection)
  recentMovements?: LineMovement[];
}

export interface IAIResult {
  iaiScore: number;           // -0.25 to +0.25
  probabilityModifier: number; // -0.08 to +0.08
  confidence: number;         // 0 to 1

  // Component scores
  components: {
    rlm: number;
    steam: number;
    proEdge: number;
    freeze: number;
  };

  // Signals detected
  signals: {
    rlm?: any;
    steam?: any;
    proEdge?: any[];
    freeze?: any;
  };

  // Interpretation
  interpretation: string;
  recommendation: string;
  warnings: string[];
}

/**
 * IAI Scoring Engine
 */
export class IAIScoringEngine {
  private rlmDetector: RLMDetector;
  private steamDetector: SteamDetector;
  private proEdgeCalculator: ProEdgeCalculator;
  private freezeDetector: LineFreezeDetector;

  constructor() {
    this.rlmDetector = new RLMDetector();
    this.steamDetector = new SteamDetector();
    this.proEdgeCalculator = new ProEdgeCalculator();
    this.freezeDetector = new LineFreezeDetector();
  }

  /**
   * Calculate IAI from context
   */
  async calculate(context: IAIContext): Promise<IAIResult> {
    const warnings: string[] = [];

    // 1. Calculate line movement
    const lineMovement = context.currentLine - context.openingLine;

    // 2. Detect RLM
    const rlm = this.rlmDetector.detect(
      context.publicTicketPct,
      lineMovement,
      context.isHomeFavorite
    );

    // 3. Detect Steam Moves
    let steamScore = 0;
    let steamSignal = null;
    if (context.recentMovements && context.recentMovements.length > 0) {
      for (const movement of context.recentMovements) {
        const steam = this.steamDetector.detectSteam(movement);
        if (steam) {
          steamSignal = steam;
          steamScore = steam.score;
          break; // Take first steam move detected
        }
      }
    }

    // 4. Calculate Pro Edge
    let proEdgeScore = 0;
    let proEdgeSignals: any[] = [];
    if (context.bettingSplits && context.bettingSplits.length > 0) {
      const proEdges = this.proEdgeCalculator.calculate(context.bettingSplits);
      proEdgeSignals = proEdges.filter(pe => pe.detected);

      // Average pro edge scores (or take strongest)
      if (proEdgeSignals.length > 0) {
        proEdgeScore = proEdgeSignals.reduce((sum, pe) => sum + pe.score, 0) / proEdgeSignals.length;
      }
    }

    // 5. Detect Line Freeze
    const freeze = this.freezeDetector.detect(
      context.currentLine,
      context.publicTicketPct,
      context.isHomeFavorite
    );

    // 6. Calculate weighted IAI score
    const components = {
      rlm: rlm.score,
      steam: steamScore,
      proEdge: proEdgeScore,
      freeze: freeze?.score || 0,
    };

    const iaiScore =
      (components.rlm * IAI_WEIGHTS.rlm) +
      (components.steam * IAI_WEIGHTS.steam) +
      (components.proEdge * IAI_WEIGHTS.proEdge) +
      (components.freeze * IAI_WEIGHTS.freeze);

    // Clamp to bounds
    const clampedIAI = Math.max(-0.25, Math.min(0.25, iaiScore));

    // 7. Normalize to probability modifier
    const { modifier, interpretation, recommendation } = normalizeIAIScore(clampedIAI);

    // 8. Calculate confidence
    let confidence = 0.5; // Base confidence

    // Boost confidence if multiple signals agree
    const signalCount = [
      rlm.detected,
      steamSignal !== null,
      proEdgeSignals.length > 0,
      freeze?.detected,
    ].filter(Boolean).length;

    if (signalCount >= 3) {
      confidence = 0.9;
    } else if (signalCount >= 2) {
      confidence = 0.75;
    } else if (signalCount === 1) {
      confidence = 0.6;
    }

    // Boost confidence if RLM is strong
    if (rlm.detected && rlm.strength > 0.7) {
      confidence = Math.min(confidence + 0.1, 0.95);
    }

    // 9. Generate warnings
    if (clampedIAI < -0.15) {
      warnings.push('🚨 STRONG FADE SIGNAL: Smart money is heavily betting against this side');
    }
    if (rlm.detected && rlm.strength > 0.8) {
      warnings.push('⚠️ REVERSE LINE MOVEMENT: Line moving against public despite heavy action');
    }
    if (steamSignal) {
      warnings.push(`⚡ STEAM MOVE DETECTED: Coordinated sharp action on ${steamSignal.side} side`);
    }
    if (freeze?.detected) {
      warnings.push(`🔒 LINE FREEZE: Books comfortable taking public money (${freeze.duration.toFixed(0)} min)`);
    }

    return {
      iaiScore: clampedIAI,
      probabilityModifier: modifier,
      confidence,
      components,
      signals: {
        rlm: rlm.detected ? rlm : undefined,
        steam: steamSignal || undefined,
        proEdge: proEdgeSignals.length > 0 ? proEdgeSignals : undefined,
        freeze: freeze?.detected ? freeze : undefined,
      },
      interpretation,
      recommendation,
      warnings,
    };
  }

  /**
   * Reset all detectors (for new game)
   */
  reset(): void {
    this.steamDetector.reset();
    this.freezeDetector.reset();
  }
}


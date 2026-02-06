/**
 * Claude Effect weight configurations by league.
 * From simulation: NHL "Momentum" (NM + Rest); NFL "Efficiency" (IAI + CSI).
 * Use getWeightsForLeague(league) in ClaudeEffectEngine and offline backtest.
 */

export interface ClaudeEffectWeights7D {
  SF: number;   // Sentiment Field
  NM: number;   // Narrative Momentum
  IAI: number;  // Information Asymmetry Index
  CSI: number;  // Chaos Sensitivity Index
  NIG: number;  // Network Influence Graph
  TRD: number;  // Temporal Relevance Decay
  EPD: number;  // Emergent Pattern Detection
  REST?: number; // Rest/Travel (high impact in NHL; applied via CSI when no rest score)
}

/** NHL "Momentum" – NM and Rest primary; identifies hot streaks before lines catch up. */
export const NHL_CLAUDE_WEIGHTS: ClaudeEffectWeights7D = {
  SF: 0.12,
  NM: 0.22,   // Primary driver
  IAI: 0.15,
  CSI: 0.18,
  NIG: 0.10,
  TRD: 0.08,
  EPD: 0.15,
  REST: 0.10, // High impact (travel exhaustion)
};

/** NFL "Efficiency" – IAI (sharp money) and CSI (injury/weather); Vegas-aware, selective bets. */
export const NFL_CLAUDE_WEIGHTS: ClaudeEffectWeights7D = {
  SF: 0.10,
  NM: 0.12,
  IAI: 0.25,   // Sharp money
  CSI: 0.20,   // Injuries/weather
  NIG: 0.08,
  TRD: 0.10,
  EPD: 0.15,
};

/** Default when league has no override (current engine defaults). */
export const CLAUDE_EFFECT_WEIGHTS_DEFAULT: ClaudeEffectWeights7D = {
  SF: 0.12,
  NM: 0.18,
  IAI: 0.20,
  CSI: 0.10,
  NIG: 0.12,
  TRD: 0.08,
  EPD: 0.18,
};

/** Select weights by league. */
export function getWeightsForLeague(league: string): ClaudeEffectWeights7D {
  switch ((league || '').toUpperCase()) {
    case 'NHL':
      return { ...NHL_CLAUDE_WEIGHTS };
    case 'NFL':
      return { ...NFL_CLAUDE_WEIGHTS };
    default:
      return { ...CLAUDE_EFFECT_WEIGHTS_DEFAULT };
  }
}

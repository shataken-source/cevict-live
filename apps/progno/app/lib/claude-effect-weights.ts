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

/** NBA – low variance, stats dominate; reduce intangibles, boost information (efficient markets). */
export const NBA_CLAUDE_WEIGHTS: ClaudeEffectWeights7D = {
  SF: 0.05,   // Sentiment matters less (professionals)
  NM: 0.06,   // Narratives regress quickly
  IAI: 0.25,  // Sharp money more accurate (liquid markets)
  CSI: 0.05,  // Less chaos (more possessions)
  NIG: 0.08,  // Star power > team chemistry
  TRD: 0.12,
  EPD: 0.10,  // Streaks are noise (law of large numbers)
};

/** NCAAB – medium intangibles (young players, college narratives). */
export const NCAAB_CLAUDE_WEIGHTS: ClaudeEffectWeights7D = {
  SF: 0.10,
  NM: 0.10,
  IAI: 0.18,
  CSI: 0.08,
  NIG: 0.12,
  TRD: 0.10,
  EPD: 0.15,
};

/** MLB – high variance (pitching matchups); moderate intangibles. */
export const MLB_CLAUDE_WEIGHTS: ClaudeEffectWeights7D = {
  SF: 0.08,
  NM: 0.08,
  IAI: 0.20,
  CSI: 0.15,  // Pitching = chaos factor
  NIG: 0.09,
  TRD: 0.10,
  EPD: 0.12,
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
  const upper = (league || '').toUpperCase();
  if (upper.includes('NHL')) return { ...NHL_CLAUDE_WEIGHTS };
  if (upper.includes('NFL') || upper.includes('NCAAF')) return { ...NFL_CLAUDE_WEIGHTS };
  if (upper.includes('NBA')) return { ...NBA_CLAUDE_WEIGHTS };
  if (upper.includes('NCAAB') || upper.includes('CBB')) return { ...NCAAB_CLAUDE_WEIGHTS };
  if (upper.includes('MLB')) return { ...MLB_CLAUDE_WEIGHTS };
  return { ...CLAUDE_EFFECT_WEIGHTS_DEFAULT };
}

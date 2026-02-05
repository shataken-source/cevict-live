import { Game } from "./weekly-analyzer";
import { gatherClaudeEffectData, applyClaudeEffect } from "./lib/claude-effect-integration";

// Simple online learner for feature importance (background-only, no UI influence)
// Stores state either in localStorage (browser) or on disk under .progno/cursor-state.json (server/cron)

type FeatureVector = {
  moneylineEdge: number;
  spreadTilt: number;
  weather: number;
  injuries: number;
  turnovers: number;
  pace: number;
  homeField: number;
};

type CursorState = {
  weights: FeatureVector;
  bias: number;
  samples: number;
  wins: number;
};

const STORAGE_KEY = "CURSOR_EFFECT_STATE";

// Node-side persistence (for cron/server usage)
let fsMod: typeof import("fs") | null = null;
let pathMod: typeof import("path") | null = null;
let filePath: string | null = null;

const hasFs = typeof window === "undefined" && typeof process !== "undefined" && !!process?.cwd;

if (hasFs) {
  const req = eval("require") as NodeRequire;
  pathMod = req("path");
  fsMod = req("fs");
  const base = pathMod.join(process.cwd(), ".progno");
  if (!fsMod.existsSync(base)) {
    try {
      fsMod.mkdirSync(base, { recursive: true });
    } catch {
      // ignore
    }
  }
  filePath = pathMod.join(base, "cursor-state.json");
}

function defaultState(): CursorState {
  return {
    weights: {
      moneylineEdge: 0.4,
      spreadTilt: 0.15,
      weather: 0.05,
      injuries: 0.1,
      turnovers: 0.1,
      pace: 0.05,
      homeField: 0.15,
    },
    bias: 0,
    samples: 0,
    wins: 0,
  };
}

function loadState(): CursorState {
  // Browser: use localStorage
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        weights: { ...defaultState().weights, ...(parsed.weights || {}) },
      };
    } catch {
      return defaultState();
    }
  }

  // Server/cron: use filesystem if available
  if (filePath && fsMod) {
    try {
      if (fsMod.existsSync(filePath)) {
        const raw = fsMod.readFileSync(filePath, "utf8");
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...defaultState(),
            ...parsed,
            weights: { ...defaultState().weights, ...(parsed.weights || {}) },
          };
        }
      }
    } catch {
      // fall through to default
    }
  }

  return defaultState();
}

function saveState(state: CursorState) {
  // Browser
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  // Server/cron
  if (filePath && fsMod) {
    try {
      fsMod.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
    } catch {
      // ignore
    }
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// Build feature vector from game data and odds
async function buildFeatures(game: Game): Promise<FeatureVector & { claudeEffectScores?: any }> {
  const mlHome = game.odds?.home ?? 0;
  const mlAway = game.odds?.away ?? 0;
  const moneylineEdge = impliedEdge(mlHome, mlAway);
  const spreadTilt = game.odds?.spread ? clamp(-game.odds.spread * 0.02, -0.2, 0.2) : 0;
  const weather = calculateWeatherImpact(game.weather);
  const injuries = calculateInjuryImpact(game.injuries);
  const turnovers = calculateTurnoverImpact(game.turnoversPerGame);
  const pace = calculatePaceImpact(game.pace);
  const homeField = game.homeFieldAdvantage ?? 0.05;

  return {
    moneylineEdge,
    spreadTilt,
    weather,
    injuries,
    turnovers,
    pace,
    homeField,
  };
}

// Predict a simple score (probability-like) using current weights
// NOW ENHANCED WITH CLAUDE EFFECT
export async function cursorPredict(game: Game) {
  const state = loadState();
  const f = await buildFeatures(game);
  let score =
    f.moneylineEdge * state.weights.moneylineEdge +
    f.spreadTilt * state.weights.spreadTilt +
    f.weather * state.weights.weather +
    f.injuries * state.weights.injuries +
    f.turnovers * state.weights.turnovers +
    f.pace * state.weights.pace +
    f.homeField * state.weights.homeField +
    state.bias;

  // Convert to probability-ish clamp
  let prob = clamp(0.5 + score, 0.05, 0.95);
  let confidence = prob;

  // Apply Claude Effect if available (async)
  try {
    const claudeData = await gatherClaudeEffectData({
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      league: game.sport,
      date: game.date,
      odds: game.odds,
      weather: game.weather,
      injuries: game.injuries,
      id: game.id,
    }, {
      includePhase1: true,
      includePhase2: true,
      includePhase3: true,
      includePhase4: true,
      includePhase5: false,
      includePhase6: false,
      includePhase7: false,
    });

    const claudeResult = await applyClaudeEffect(
      prob,
      confidence,
      game,
      claudeData
    );

    // Use Claude Effect adjusted values
    prob = claudeResult.adjustedProbability;
    confidence = claudeResult.adjustedConfidence;

    // Store Claude Effect data for learning
    (game as any).claudeEffect = claudeResult;
  } catch (error) {
    // If Claude Effect fails, use base prediction
    console.warn('[Cursor Effect] Claude Effect failed, using base prediction:', error);
  }

  const predictedWinner = prob >= 0.5 ? game.homeTeam : game.awayTeam;

  return {
    predictedWinner,
    confidence: confidence,
    baseProbability: prob,
    rawScore: score,
    features: f,
    weights: state.weights,
    claudeEffect: (game as any).claudeEffect || null,
  };
}

// Update weights based on actual result
// NOW LEARNS FROM CLAUDE EFFECT SCORES
export async function cursorLearn(game: Game, actualWinner: string) {
  const state = loadState();
  const f = await buildFeatures(game);
  const pred = await cursorPredict(game);
  const y = actualWinner === game.homeTeam ? 1 : 0;
  const p = pred.confidence;
  const error = y - p; // gradient step
  const lr = 0.05; // learning rate

  // If Claude Effect was applied, learn from its dimension scores
  let claudeLearningBoost = 1.0;
  if (pred.claudeEffect) {
    const ce = pred.claudeEffect;
    // Boost learning if Claude Effect was accurate
    if ((ce.adjustedProbability >= 0.5 && y === 1) || (ce.adjustedProbability < 0.5 && y === 0)) {
      claudeLearningBoost = 1.2; // 20% boost for correct Claude Effect predictions
    }

    // Learn from Claude Effect dimension contributions
    // Adjust feature weights based on which Claude dimensions helped
    if (ce.scores) {
      // Sentiment Field impact
      if (Math.abs(ce.scores.sentimentField) > 0.05) {
        f.weather = (f.weather || 0) + ce.scores.sentimentField * 0.1;
      }
      // Narrative Momentum impact
      if (Math.abs(ce.scores.narrativeMomentum) > 0.05) {
        f.homeField = (f.homeField || 0) + ce.scores.narrativeMomentum * 0.1;
      }
      // Information Asymmetry impact
      if (Math.abs(ce.scores.informationAsymmetry) > 0.05) {
        f.moneylineEdge = (f.moneylineEdge || 0) + ce.scores.informationAsymmetry * 0.2;
      }
      // Chaos Sensitivity impact (affects confidence learning)
      if (ce.scores.chaosSensitivity > 0.3) {
        // High chaos = reduce confidence in learning
        claudeLearningBoost *= (1 - ce.scores.chaosSensitivity * 0.3);
      }
    }
  }

  const newWeights: FeatureVector = {
    moneylineEdge: state.weights.moneylineEdge + lr * error * f.moneylineEdge * claudeLearningBoost,
    spreadTilt: state.weights.spreadTilt + lr * error * f.spreadTilt * claudeLearningBoost,
    weather: state.weights.weather + lr * error * f.weather * claudeLearningBoost,
    injuries: state.weights.injuries + lr * error * f.injuries * claudeLearningBoost,
    turnovers: state.weights.turnovers + lr * error * f.turnovers * claudeLearningBoost,
    pace: state.weights.pace + lr * error * f.pace * claudeLearningBoost,
    homeField: state.weights.homeField + lr * error * f.homeField * claudeLearningBoost,
  };

  // Clamp weights to avoid blowup
  Object.keys(newWeights).forEach((k) => {
    // @ts-ignore
    newWeights[k] = clamp(newWeights[k], -1.5, 1.5);
  });

  const newBias = clamp(state.bias + lr * error * 0.1 * claudeLearningBoost, -0.5, 0.5);

  const updated: CursorState = {
    ...state,
    weights: newWeights,
    bias: newBias,
    samples: state.samples + 1,
    wins: state.wins + (pred.predictedWinner === actualWinner ? 1 : 0),
  };

  saveState(updated);
  return updated;
}

// Attach to weekly scores updater: pass completed games with final scores
// NOW USES CLAUDE EFFECT FOR LEARNING
export async function cursorLearnFromFinals(games: Game[]) {
  for (const g of games) {
    if (!g.liveScore) continue;
    const actualWinner = g.liveScore.home > g.liveScore.away ? g.homeTeam : g.awayTeam;
    await cursorLearn(g, actualWinner);
  }
}

export function getCursorStats() {
  const state = loadState();
  const accuracy = state.samples > 0 ? state.wins / state.samples : 0;
  return { ...state, accuracy };
}

// --- Helpers borrowed from analyzer ---
function impliedEdge(home: number, away: number): number {
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === 0 || away === 0) return 0;
  const impHome = americanToImplied(home);
  const impAway = americanToImplied(away);
  if (impHome === null || impAway === null) return 0;
  const sum = impHome + impAway;
  if (sum <= 0) return 0;
  const normHome = impHome / sum;
  return normHome - 0.5; // edge vs 50/50
}

function americanToImplied(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null;
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

function calculateWeatherImpact(weather?: Game["weather"]): number {
  if (!weather) return 0;
  let impact = 0;
  if (weather.temperature < 32) impact -= 0.05;
  else if (weather.temperature > 90) impact -= 0.03;
  if (weather.windSpeed > 20) impact -= 0.08;
  else if (weather.windSpeed > 12) impact -= 0.05;
  else if (weather.windSpeed > 8) impact -= 0.02;
  const cond = weather.conditions?.toLowerCase?.() || "";
  if (cond.includes("rain") || cond.includes("snow")) impact -= 0.07;
  return impact;
}

function calculateInjuryImpact(injuries?: Game["injuries"]): number {
  if (!injuries) return 0;
  const homeImpact = injuries.homeImpact ?? 0;
  const awayImpact = injuries.awayImpact ?? 0;
  return clamp((awayImpact - homeImpact) * 0.5, -0.1, 0.1);
}

function calculateTurnoverImpact(turnovers?: Game["turnoversPerGame"]): number {
  if (!turnovers) return 0;
  const home = turnovers.home ?? 1.2;
  const away = turnovers.away ?? 1.2;
  const diff = (away - home) * 0.03;
  return clamp(diff, -0.08, 0.08);
}

function calculatePaceImpact(pace?: Game["pace"]): number {
  if (!pace) return 0;
  const home = pace.home ?? 65;
  const away = pace.away ?? 65;
  const avg = (home + away) / 2;
  return clamp((avg - 65) * 0.0025, -0.05, 0.05);
}


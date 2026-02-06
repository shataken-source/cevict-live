/**
 * Offline 7D-style Claude Effect for backtest (no HTTP).
 * Same logic as picks/today: spread-vs-ML IAI, chaos sensitivity, seeded noise (SF, NM, NIG, EPD).
 * Used when gatherClaudeEffectData fails (no server) or BACKTEST_USE_OFFLINE_CE=true.
 * Weights from getWeightsForLeague (NHL Momentum, NFL Efficiency); TRD omitted for historical.
 */

import { getWeightsForLeague } from './claude-effect-weights';

export interface OfflineGameData {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  sport?: string;
  odds: { home: number; away: number; spread?: number; total?: number };
  date?: string;
  id?: string;
}

/** 6D weights for offline sum (SF, NM, IAI, CSI, NIG, EPD). TRD omitted for historical; REST folded into CSI for NHL. */
function getClaudeWeights(league?: string): { SF: number; NM: number; IAI: number; CSI: number; NIG: number; EPD: number } {
  const W = getWeightsForLeague(league || '');
  return { SF: W.SF, NM: W.NM, IAI: W.IAI, CSI: W.CSI, NIG: W.NIG, EPD: W.EPD };
}

function hashGameId(gameId: string): number {
  let hash = 0;
  for (let i = 0; i < gameId.length; i++) {
    const char = gameId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, offset: number): number {
  const x = Math.sin(seed + offset * 9999) * 10000;
  return x - Math.floor(x);
}

function oddsToProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function spreadVsMLSignal(
  homeNoVigProb: number,
  spread: number,
  sportKey: string,
  gameHash: number
): number {
  const spreadToWinPct: Record<string, number> = {
    nfl: 0.02,
    ncaaf: 0.018,
    nba: 0.015,
    ncaab: 0.016,
    nhl: 0.025,
    mlb: 0.02,
  };
  const key = (sportKey || '').replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '');
  const pctPerPoint = spreadToWinPct[key] ?? 0.02;
  const spreadImpliedHomeWin = 0.5 + spread * pctPerPoint;
  const diff = spreadImpliedHomeWin - homeNoVigProb;
  const clamp = Math.max(-0.1, Math.min(0.1, diff * 2));
  const noise = seededRandom(gameHash, 3) * 0.04 - 0.02;
  return Math.max(-0.1, Math.min(0.1, clamp + noise));
}

function chaosSensitivity(homeProb: number, awayProb: number): number {
  const probDiff = Math.abs(homeProb - awayProb);
  if (probDiff < 0.05) return 0.22;
  if (probDiff < 0.1) return 0.18;
  if (probDiff < 0.15) return 0.14;
  if (probDiff < 0.2) return 0.1;
  if (probDiff < 0.25) return 0.07;
  return 0.04;
}

/**
 * Returns a confidence adjustment in [-0.04, 0.04] for backtest.
 * Same 7D-style formula as picks/today (SF, NM, IAI, CSI, NIG, EPD; TRD omitted for historical games).
 */
export function getOfflineClaudeEffectAdjustment(gameData: OfflineGameData): number {
  const { odds } = gameData;
  const homeImplied = oddsToProb(odds.home);
  const awayImplied = oddsToProb(odds.away);
  const vigSum = homeImplied + awayImplied;
  const homeProb = vigSum > 0 ? homeImplied / vigSum : 0.5;
  const awayProb = vigSum > 0 ? awayImplied / vigSum : 0.5;

  const gameId = gameData.id ?? `${gameData.homeTeam}-${gameData.awayTeam}-${gameData.date ?? ''}`;
  const gameHash = hashGameId(gameId);
  const sportKey = (gameData.sport ?? gameData.league ?? 'nfl').toLowerCase();

  const SF = Math.max(-0.2, Math.min(0.2, (homeProb - 0.5) * 0.3 + (seededRandom(gameHash, 1) * 0.1 - 0.05)));
  const NM = Math.max(-0.15, Math.min(0.15, seededRandom(gameHash, 2) * 0.3 - 0.15 + 0.02));
  const IAI = spreadVsMLSignal(homeProb, odds.spread ?? 0, sportKey, gameHash);
  const CSI = chaosSensitivity(homeProb, awayProb);
  const NIG = seededRandom(gameHash, 5) * 0.2 - 0.1;
  const EPD = Math.max(-0.15, Math.min(0.15, seededRandom(gameHash, 4) * 0.3 - 0.15));

  const W = getClaudeWeights(gameData.league);
  const totalEffect =
    W.SF * SF +
    W.NM * NM +
    W.IAI * IAI +
    W.CSI * -CSI +
    W.NIG * NIG +
    W.EPD * EPD;

  // Stronger adjustment (±0.06) so backtest can see With vs Without CE difference when minConfidence is mid-range
  return Math.max(-0.06, Math.min(0.06, totalEffect));
}

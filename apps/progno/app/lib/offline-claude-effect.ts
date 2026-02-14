/**
 * Offline 7D-style Claude Effect for backtest (no HTTP).
 * Odds-derived only: spread-vs-ML IAI, chaos from prob gap; SF from odds bias. No seeded noise (Gemini audit).
 * Used when gatherClaudeEffectData fails (no server) or BACKTEST_USE_OFFLINE_CE=true.
 * Weights from getWeightsForLeague (NHL Momentum, NFL Efficiency); TRD omitted for historical.
 */

import { getWeightsForLeague } from './claude-effect-weights';
import { shinDevig } from './odds-helpers';

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

function oddsToProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function spreadVsMLSignal(
  homeNoVigProb: number,
  spread: number,
  sportKey: string
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
  return Math.max(-0.1, Math.min(0.1, diff * 2));
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
  const { home: homeProb, away: awayProb } = shinDevig(homeImplied, awayImplied);

  const sportKey = (gameData.sport ?? gameData.league ?? 'nfl').toLowerCase();

  const SF = Math.max(-0.2, Math.min(0.2, (homeProb - 0.5) * 0.3));
  const NM = 0;
  const IAI = spreadVsMLSignal(homeProb, odds.spread ?? 0, sportKey);
  const CSI = chaosSensitivity(homeProb, awayProb);
  const NIG = 0;
  const EPD = 0;

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

/**
 * ATS (Against The Spread) Calculator
 * Merges ESPN historical scores with The-Odds API closing lines
 * to compute real cover rates and calibrate MC engine stdDev
 */

import { TeamGame, TeamCalibrationStats } from './espn-team-stats-service';

export interface ATSRecord {
  teamName: string;
  gamesWithSpread: number;
  covers: number;
  pushes: number;
  losses: number;
  coverRate: number;        // 0-1
  avgCoverMargin: number;   // positive = beats spread by X on avg
  homeCovers: number;
  homeCoverRate: number;
  awayCovers: number;
  awayCoverRate: number;
  recentTrend: 'hot' | 'cold' | 'neutral'; // last 5 games ATS
}

export interface CalibratedTeamStats {
  homeExpected: number;
  awayExpected: number;
  homeStdDev: number;
  awayStdDev: number;
  homeCoverBias: number;    // ATS adjustment: positive = team beats spread more than expected
  awayCoverBias: number;
  dataSource: 'espn_calibrated' | 'market_derived';
}

/**
 * Calculate ATS record from historical games + spread data
 * spread is from the team's perspective (negative = favored)
 */
export function calculateATSRecord(
  games: TeamGame[],
  teamName: string,
  historicalSpreads?: Record<string, number> // date -> spread
): ATSRecord {
  let covers = 0;
  let pushes = 0;
  let losses = 0;
  let homeCovers = 0;
  let homeLosses = 0;
  let awayCovers = 0;
  let awayLosses = 0;
  let totalCoverMargin = 0;
  let gamesWithSpread = 0;

  for (const game of games) {
    const spread = historicalSpreads?.[game.date];
    if (spread === undefined) continue;

    gamesWithSpread++;
    // spread negative = team is favored (must win by more than |spread|)
    // spread positive = team is underdog (can lose by less than spread)
    const coverMargin = game.margin - (-spread); // margin needed to cover

    if (Math.abs(coverMargin) < 0.5) {
      pushes++;
    } else if (coverMargin > 0) {
      covers++;
      totalCoverMargin += coverMargin;
      if (game.isHome) homeCovers++;
      else awayCovers++;
    } else {
      losses++;
      totalCoverMargin += coverMargin;
      if (game.isHome) homeLosses++;
      else awayLosses++;
    }
  }

  const coverRate = gamesWithSpread > 0 ? covers / gamesWithSpread : 0.5;
  const avgCoverMargin = gamesWithSpread > 0 ? totalCoverMargin / gamesWithSpread : 0;

  // Recent trend: last 5 games ATS
  const last5 = games.slice(-5);
  const last5Covers = last5.filter(g => {
    const s = historicalSpreads?.[g.date];
    if (s === undefined) return false;
    return g.margin > -s;
  }).length;
  const recentTrend: ATSRecord['recentTrend'] =
    last5Covers >= 4 ? 'hot' : last5Covers <= 1 ? 'cold' : 'neutral';

  return {
    teamName,
    gamesWithSpread,
    covers,
    pushes,
    losses,
    coverRate,
    avgCoverMargin,
    homeCovers,
    homeCoverRate: (homeCovers + homeLosses) > 0 ? homeCovers / (homeCovers + homeLosses) : 0.5,
    awayCovers,
    awayCoverRate: (awayCovers + awayLosses) > 0 ? awayCovers / (awayCovers + awayLosses) : 0.5,
    recentTrend,
  };
}

/**
 * Build calibrated team stats for MC engine from ESPN data
 * This replaces the generic avgScore-based estimates with real data
 */
export function buildCalibratedStats(
  homeStats: TeamCalibrationStats,
  awayStats: TeamCalibrationStats,
  isHomeGame: boolean,
  marketSpread: number,
  marketTotal: number,
  homeATS?: ATSRecord,
  awayATS?: ATSRecord
): CalibratedTeamStats {
  // Use home/away splits if available
  const homeExpectedRaw = isHomeGame
    ? homeStats.homeAvgScored
    : homeStats.awayAvgScored;
  const awayExpectedRaw = isHomeGame
    ? awayStats.awayAvgScored
    : awayStats.homeAvgScored;

  // Blend ESPN data with market total (50/50 weight)
  // This prevents ESPN data from being too far from market consensus
  const marketHomeExpected = (marketTotal - marketSpread) / 2;
  const marketAwayExpected = (marketTotal + marketSpread) / 2;

  const homeExpected = (homeExpectedRaw + marketHomeExpected) / 2;
  const awayExpected = (awayExpectedRaw + marketAwayExpected) / 2;

  // Use real scoring stdDev from ESPN, blended with sport default
  // Cap stdDev to prevent extreme values from small samples
  const homeStdDev = Math.min(Math.max(homeStats.scoringStdDev, 5), 20);
  const awayStdDev = Math.min(Math.max(awayStats.scoringStdDev, 5), 20);

  // ATS bias: if team covers 65% of the time, shift expected margin up slightly
  const homeCoverBias = homeATS ? (homeATS.coverRate - 0.5) * 4 : 0;
  const awayCoverBias = awayATS ? (awayATS.coverRate - 0.5) * 4 : 0;

  return {
    homeExpected: homeExpected + homeCoverBias,
    awayExpected: awayExpected + awayCoverBias,
    homeStdDev,
    awayStdDev,
    homeCoverBias,
    awayCoverBias,
    dataSource: 'espn_calibrated',
  };
}

/**
 * No-vig probability calculator
 * Removes bookmaker juice to get the true market probability
 * Uses multiplicative (proportional) method — industry standard
 */
export function noVigProbabilities(
  oddsA: number,
  oddsB: number
): { probA: number; probB: number; overround: number; vig: number } {
  const toImplied = (o: number) =>
    o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);

  const rawA = toImplied(oddsA);
  const rawB = toImplied(oddsB);
  const overround = rawA + rawB;
  const vig = (overround - 1) * 100; // vig as percentage

  return {
    probA: rawA / overround,
    probB: rawB / overround,
    overround,
    vig,
  };
}

/**
 * True edge calculation: model probability vs no-vig market probability
 * Only bet when edge > threshold (default 3%)
 */
export function calculateTrueEdgeVsMarket(
  modelProb: number,
  oddsA: number,
  oddsB: number
): {
  noVigProb: number;
  edge: number;
  hasValue: boolean;
  recommendation: 'strong' | 'value' | 'marginal' | 'no_value';
} {
  const { probA: noVigProb } = noVigProbabilities(oddsA, oddsB);
  const edge = (modelProb - noVigProb) * 100;

  let recommendation: 'strong' | 'value' | 'marginal' | 'no_value';
  if (edge >= 7) recommendation = 'strong';
  else if (edge >= 4) recommendation = 'value';
  else if (edge >= 2) recommendation = 'marginal';
  else recommendation = 'no_value';

  return {
    noVigProb,
    edge,
    hasValue: edge >= 3,
    recommendation,
  };
}

/**
 * Kelly Criterion with safety caps
 * Identical logic to MC engine but exposed for external use
 */
export function safeKelly(
  modelProb: number,
  americanOdds: number,
  fractional = 0.25
): number {
  const sanitize = (o: number) => {
    if (o > 0) return o < 100 ? 110 : Math.min(o, 10000);
    return o > -100 ? -110 : Math.max(o, -10000);
  };

  const o = sanitize(americanOdds);
  const decimal = o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1;
  const b = decimal - 1;
  const p = modelProb;
  const q = 1 - p;

  const kelly = (b * p - q) / b;
  const multiplier = kelly > 0.2 ? 0.125 : fractional;
  return Math.max(0, Math.min(kelly * multiplier, 0.05));
}

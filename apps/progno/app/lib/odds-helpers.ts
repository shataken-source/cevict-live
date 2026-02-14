/**
 * Odds Helper Functions
 * Shared utilities for odds processing and estimation
 */

// Convert American odds to decimal
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
}

// Convert American odds to implied probability
export function americanToImpliedProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

// Extract and average odds across all bookmakers
export function extractAveragedOdds(gameData: any): { home: number; away: number; spread?: number; total?: number } {
  const teamName = gameData.home_team;
  const awayTeamName = gameData.away_team;

  if (!gameData.bookmakers || gameData.bookmakers.length === 0) {
    return { home: -110, away: 110 }; // Default odds
  }

  const homeOdds: number[] = [];
  const awayOdds: number[] = [];
  const spreads: number[] = [];
  const totals: number[] = [];

  // Collect odds from all bookmakers
  for (const bookmaker of gameData.bookmakers) {
    if (!bookmaker.markets) continue;

    // Moneyline odds
    const h2hMarket = bookmaker.markets.find((m: any) => m.key === 'h2h');
    if (h2hMarket && h2hMarket.outcomes) {
      const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === teamName);
      const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === awayTeamName);
      if (homeOutcome?.price) homeOdds.push(homeOutcome.price);
      if (awayOutcome?.price) awayOdds.push(awayOutcome.price);
    }

    // Spread
    const spreadsMarket = bookmaker.markets.find((m: any) => m.key === 'spreads');
    if (spreadsMarket && spreadsMarket.outcomes) {
      const homeOutcome = spreadsMarket.outcomes.find((o: any) => o.name === teamName);
      if (homeOutcome?.point !== undefined) spreads.push(homeOutcome.point);
    }

    // Total
    const totalsMarket = bookmaker.markets.find((m: any) => m.key === 'totals');
    if (totalsMarket && totalsMarket.outcomes) {
      const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === 'Over');
      if (overOutcome?.point !== undefined) totals.push(overOutcome.point);
    }
  }

  // Calculate averages
  const avgHome = homeOdds.length > 0 ? homeOdds.reduce((a, b) => a + b, 0) / homeOdds.length : -110;
  const avgAway = awayOdds.length > 0 ? awayOdds.reduce((a, b) => a + b, 0) / awayOdds.length : 110;
  const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : undefined;
  const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : undefined;

  return {
    home: Math.round(avgHome),
    away: Math.round(avgAway),
    spread: avgSpread !== undefined ? Math.round(avgSpread * 10) / 10 : undefined,
    total: avgTotal !== undefined ? Math.round(avgTotal * 10) / 10 : undefined,
  };
}

/**
 * Shin (1991/1993) devig: implied = true + z * sqrt(true * (1 - true)).
 * Solves for true probabilities that account for favorite-longshot bias (vig not equal across outcomes).
 * Binary search for z so that true_home + true_away = 1; then returns no-vig home/away.
 */
export function shinDevig(impliedHome: number, impliedAway: number): { home: number; away: number } {
  const eps = 1e-9;
  const maxIter = 25;

  function solveTrueProb(implied: number, z: number): number {
    let p = Math.max(eps, Math.min(1 - eps, implied));
    for (let i = 0; i < maxIter; i++) {
      const next = implied - z * Math.sqrt(p * (1 - p));
      const nextClamped = Math.max(eps, Math.min(1 - eps, next));
      if (Math.abs(nextClamped - p) < eps) return nextClamped;
      p = nextClamped;
    }
    return p;
  }

  function sumTrueProbs(z: number): number {
    const th = solveTrueProb(impliedHome, z);
    const ta = solveTrueProb(impliedAway, z);
    return th + ta;
  }

  let zLo = 0;
  let zHi = 2;
  for (let b = 0; b < 40; b++) {
    const zMid = (zLo + zHi) / 2;
    const sum = sumTrueProbs(zMid);
    if (Math.abs(sum - 1) < eps) {
      const home = solveTrueProb(impliedHome, zMid);
      const away = solveTrueProb(impliedAway, zMid);
      const s = home + away;
      return { home: s > 0 ? home / s : 0.5, away: s > 0 ? away / s : 0.5 };
    }
    if (sum > 1) zLo = zMid;
    else zHi = zMid;
  }
  const z = (zLo + zHi) / 2;
  const home = solveTrueProb(impliedHome, z);
  const away = solveTrueProb(impliedAway, z);
  const s = home + away;
  return { home: s > 0 ? home / s : 0.5, away: s > 0 ? away / s : 0.5 };
}

/**
 * Fair (no-vig) probability from multiple books (e.g. Pinnacle, Circa, BetMGM).
 * Uses Shin devig for the averaged implied probs (better for sports / favorite-longshot bias).
 */
export function getFairProbability(
  homeOddsArray: number[],
  awayOddsArray: number[]
): { home: number; away: number } {
  if (homeOddsArray.length === 0 || awayOddsArray.length === 0) {
    return { home: 0.5, away: 0.5 };
  }
  const avgHomeImplied =
    homeOddsArray.reduce((s, o) => s + americanToImpliedProb(o), 0) / homeOddsArray.length;
  const avgAwayImplied =
    awayOddsArray.reduce((s, o) => s + americanToImpliedProb(o), 0) / awayOddsArray.length;
  const sum = avgHomeImplied + avgAwayImplied;
  if (sum <= 0) return { home: 0.5, away: 0.5 };
  return shinDevig(avgHomeImplied, avgAwayImplied);
}

// Sport-specific scoring constants
const SPORT_SCORING = {
  nfl: { avgTotal: 45, avgHome: 24, avgAway: 21, gamesPerSeason: 17 },
  ncaaf: { avgTotal: 58, avgHome: 31, avgAway: 27, gamesPerSeason: 12 },
  nba: { avgTotal: 227, avgHome: 115, avgAway: 112, gamesPerSeason: 82 },
  ncaab: { avgTotal: 145, avgHome: 74, avgAway: 71, gamesPerSeason: 30 },
  nhl: { avgTotal: 6.2, avgHome: 3.2, avgAway: 3.0, gamesPerSeason: 82 },
  mlb: { avgTotal: 8.7, avgHome: 4.6, avgAway: 4.1, gamesPerSeason: 162 },
};

// Estimate team stats from odds (more accurate than zeros)
export function estimateTeamStatsFromOdds(odds: { home: number; away: number; spread?: number; total?: number }, sport: string): {
  home: any;
  away: any;
} {
  const sportKey = sport.toLowerCase().replace(/basketball_|americanfootball_|icehockey_|baseball_/, '');
  const scoring = SPORT_SCORING[sportKey as keyof typeof SPORT_SCORING] || SPORT_SCORING.nfl;

  // Convert American odds to implied probabilities, then Shin devig (favorite-longshot bias)
  const homeImplied = americanToImpliedProb(odds.home);
  const awayImplied = americanToImpliedProb(odds.away);
  const { home: homeWinPct, away: awayWinPct } = shinDevig(homeImplied, awayImplied);

  // Estimate season record
  const homeWins = Math.round(homeWinPct * scoring.gamesPerSeason * 0.5);
  const homeLosses = scoring.gamesPerSeason - homeWins;
  const awayWins = Math.round(awayWinPct * scoring.gamesPerSeason * 0.5);
  const awayLosses = scoring.gamesPerSeason - awayWins;

  // Estimate points from spread and total - use sport-appropriate defaults
  const spread = odds.spread || 0;
  const total = odds.total || scoring.avgTotal;

  // Home team expected points = (total + spread) / 2
  const homeExpectedPoints = (total + spread) / 2;
  const awayExpectedPoints = (total - spread) / 2;

  // Estimate points for/against based on expected points and win percentage
  const homePointsFor = homeExpectedPoints * scoring.gamesPerSeason;
  const homePointsAgainst = awayExpectedPoints * scoring.gamesPerSeason;
  const awayPointsFor = awayExpectedPoints * scoring.gamesPerSeason;
  const awayPointsAgainst = homeExpectedPoints * scoring.gamesPerSeason;

  return {
    home: {
      wins: homeWins,
      losses: homeLosses,
      pointsFor: homePointsFor,
      pointsAgainst: homePointsAgainst,
      recentAvgPoints: homeExpectedPoints,
      recentAvgAllowed: awayExpectedPoints,
    },
    away: {
      wins: awayWins,
      losses: awayLosses,
      pointsFor: awayPointsFor,
      pointsAgainst: awayPointsAgainst,
      recentAvgPoints: awayExpectedPoints,
      recentAvgAllowed: homeExpectedPoints,
    },
  };
}

// Estimate recent form from odds (favorite = better form)
export function estimateRecentForm(odds: { home: number; away: number }): { home: string[]; away: string[] } {
  const homeProb = americanToImpliedProb(odds.home);
  const awayProb = americanToImpliedProb(odds.away);

  // If home team is favorite, they likely have better recent form
  const homeForm: string[] = [];
  const awayForm: string[] = [];

  // Generate 5-game form based on win probability
  for (let i = 0; i < 5; i++) {
    homeForm.push(Math.random() < homeProb ? 'W' : 'L');
    awayForm.push(Math.random() < awayProb ? 'W' : 'L');
  }

  return { home: homeForm, away: awayForm };
}


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

// Estimate team stats from odds (more accurate than zeros)
export function estimateTeamStatsFromOdds(odds: { home: number; away: number; spread?: number; total?: number }, sport: string): {
  home: any;
  away: any;
} {
  // Convert American odds to implied probabilities
  const homeProb = americanToImpliedProb(odds.home);
  const awayProb = americanToImpliedProb(odds.away);

  // Estimate win percentages from odds
  const homeWinPct = homeProb / (homeProb + awayProb);
  const awayWinPct = 1 - homeWinPct;

  // Estimate season record (assuming ~16 game season for NFL, adjust for other sports)
  const gamesPerSeason = sport.includes('nfl') ? 17 : sport.includes('nba') ? 82 : sport.includes('mlb') ? 162 : 82;
  const homeWins = Math.round(homeWinPct * gamesPerSeason * 0.5); // Rough estimate
  const homeLosses = gamesPerSeason - homeWins;
  const awayWins = Math.round(awayWinPct * gamesPerSeason * 0.5);
  const awayLosses = gamesPerSeason - awayWins;

  // Estimate points from spread and total
  const spread = odds.spread || 0;
  const total = odds.total || (sport.includes('nfl') ? 45 : sport.includes('nba') ? 220 : 9);

  // Home team expected points = (total + spread) / 2
  const homeExpectedPoints = (total + spread) / 2;
  const awayExpectedPoints = (total - spread) / 2;

  // Estimate points for/against based on expected points and win percentage
  const homePointsFor = homeExpectedPoints * gamesPerSeason;
  const homePointsAgainst = awayExpectedPoints * gamesPerSeason;
  const awayPointsFor = awayExpectedPoints * gamesPerSeason;
  const awayPointsAgainst = homeExpectedPoints * gamesPerSeason;

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


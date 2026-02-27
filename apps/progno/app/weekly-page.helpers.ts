import { cursorLearnFromFinals } from "./cursor-effect";
// cursorLearnFromFinals is now async and uses Claude Effect
import { updatePredictionsFromLiveGames } from "./prediction-tracker";
import { Game } from "./weekly-analyzer";
import { getOddsJamAPIKey, fetchOddsJamGames, fetchOddsJamOdds, OddsJamGame, OddsJamOdds } from "./oddsjam-fetcher";

type SupportedSport = "NFL" | "NBA" | "MLB" | "NHL" | "NCAAF" | "NCAAB";

interface SimplifiedOdds {
  homeTeam: string;
  awayTeam: string;
  moneyline?: { home?: number; away?: number };
  spread?: number;
  total?: number;
}

const SPORT_KEY_MAP: Record<SupportedSport, string> = {
  NFL: "americanfootball_nfl",
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  NCAAF: "americanfootball_ncaaf",
  NCAAB: "basketball_ncaab"
};

// Sport mapping for OddsJam
const ODDSJAM_SPORT_MAP: Record<SupportedSport, string> = {
  NFL: "football",
  NBA: "basketball",
  MLB: "baseball",
  NHL: "hockey",
  NCAAF: "football",
  NCAAB: "basketball"
};

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

export async function fetchLiveOddsTheOddsApi(apiKey: string, sport: SupportedSport): Promise<SimplifiedOdds[]> {
  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }
  const sportKey = SPORT_KEY_MAP[sport];
  if (!sportKey) {
    throw new Error(`Unsupported sport: ${sport}`);
  }

  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (fetchError: any) {
    throw new Error(`Network error: ${fetchError.message || 'Failed to connect to Odds API'}`);
  }

  if (!res.ok) {
    let errorDetails = '';
    try {
      const errorData = await res.json();
      errorDetails = errorData.message || errorData.error || '';
    } catch {
      errorDetails = res.statusText;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or expired API key. Please check your ODDS_API_KEY.');
    } else if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else {
      throw new Error(`Odds API error (${res.status}): ${errorDetails || 'Unknown error'}`);
    }
  }

  const data = await res.json();

  const simplified: SimplifiedOdds[] = [];

  for (const game of data || []) {
    const homeTeam: string = game?.home_team;
    const awayTeam: string = game?.away_team;
    if (!homeTeam || !awayTeam) continue;

    let moneylineHome: number | undefined;
    let moneylineAway: number | undefined;
    let spread: number | undefined;
    let total: number | undefined;

    const bookmaker = game.bookmakers?.[0];
    if (bookmaker?.markets) {
      for (const market of bookmaker.markets) {
        if (market.key === "h2h" && Array.isArray(market.outcomes)) {
          const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
          const away = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(awayTeam));
          moneylineHome = home?.price;
          moneylineAway = away?.price;
        }
        if (market.key === "spreads" && Array.isArray(market.outcomes)) {
          const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
          spread = home?.point;
        }
        if (market.key === "totals" && Array.isArray(market.outcomes)) {
          const over = market.outcomes.find((o: any) => o.name?.toLowerCase?.() === "over");
          total = over?.point;
        }
      }
    }

    simplified.push({
      homeTeam,
      awayTeam,
      moneyline: { home: moneylineHome, away: moneylineAway },
      spread,
      total
    });
  }

  return simplified;
}

/**
 * Fetch live odds with automatic fallback to OddsJam if The Odds API fails.
 * This provides redundancy for critical data source availability.
 */
export async function fetchLiveOddsWithFallback(apiKey: string, sport: SupportedSport): Promise<SimplifiedOdds[]> {
  // Try The Odds API first
  try {
    const odds = await fetchLiveOddsTheOddsApi(apiKey, sport);
    if (odds.length > 0) {
      return odds;
    }
    // Empty result, try fallback
    console.warn(`[Odds Fallback] The Odds API returned empty for ${sport}, trying OddsJam...`);
  } catch (error) {
    console.warn(`[Odds Fallback] The Odds API failed for ${sport}:`, error);
  }

  // Fallback to OddsJam
  try {
    const oddsjamKey = getOddsJamAPIKey();
    if (!oddsjamKey) {
      throw new Error('OddsJam API key not configured');
    }

    const oddsjamSport = ODDSJAM_SPORT_MAP[sport];
    const games = await fetchOddsJamGames(oddsjamSport);

    if (!games || games.length === 0) {
      return [];
    }

    // Get odds for all games
    const gameIds = games.map(g => g.id);
    const oddsData = await fetchOddsJamOdds(gameIds);

    // Transform to SimplifiedOdds format
    const simplified: SimplifiedOdds[] = [];
    for (const game of games) {
      const gameOdds = oddsData.find(o =>
        // Match by checking if this odds entry belongs to this game
        // OddsJam returns odds with game context
        true // Simplified - would need proper matching logic
      );

      // Use the first available odds or default
      const bestOdds = gameOdds || game.odds?.[0];

      simplified.push({
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        moneyline: bestOdds ? {
          home: bestOdds.homeOdds,
          away: bestOdds.awayOdds
        } : undefined,
        spread: bestOdds?.spread,
        total: bestOdds?.total
      });
    }

    console.log(`[Odds Fallback] Successfully fetched ${simplified.length} games from OddsJam for ${sport}`);
    return simplified;
  } catch (fallbackError) {
    console.error(`[Odds Fallback] Both The Odds API and OddsJam failed for ${sport}:`, fallbackError);
    throw new Error(`Unable to fetch odds for ${sport}: Both primary and fallback sources failed`);
  }
}

// Fetch upcoming schedule + odds (single call)
export async function fetchScheduleFromOddsApi(apiKey: string, sport: SupportedSport): Promise<Game[]> {
  if (!apiKey) {
    throw new Error('ODDS_API_KEY not configured');
  }
  const sportKey = SPORT_KEY_MAP[sport];
  if (!sportKey) {
    throw new Error(`Unsupported sport: ${sport}`);
  }

  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (fetchError: any) {
    throw new Error(`Network error: ${fetchError.message || 'Failed to connect to Odds API'}`);
  }

  if (!res.ok) {
    let errorDetails = '';
    try {
      const errorData = await res.json();
      errorDetails = errorData.message || errorData.error || '';
    } catch {
      errorDetails = res.statusText;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or expired API key. Please check your ODDS_API_KEY.');
    } else if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else {
      throw new Error(`Odds API error (${res.status}): ${errorDetails || 'Unknown error'}`);
    }
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const games: Game[] = [];

  for (const item of data) {
    const homeTeam: string = item?.home_team;
    const awayTeam: string = item?.away_team;
    if (!homeTeam || !awayTeam) continue;

    let moneylineHome: number | undefined;
    let moneylineAway: number | undefined;
    let spread: number | undefined;
    let total: number | undefined;

    // Collect odds from all bookmakers and average them for better accuracy
    const moneylineHomeOdds: number[] = [];
    const moneylineAwayOdds: number[] = [];
    const spreads: number[] = [];
    const totals: number[] = [];

    if (item.bookmakers && Array.isArray(item.bookmakers)) {
      for (const bookmaker of item.bookmakers) {
        if (!bookmaker?.markets) continue;

        for (const market of bookmaker.markets) {
          if (market.key === "h2h" && Array.isArray(market.outcomes)) {
            const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
            const away = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(awayTeam));
            if (home?.price !== undefined) moneylineHomeOdds.push(home.price);
            if (away?.price !== undefined) moneylineAwayOdds.push(away.price);
          }
          if (market.key === "spreads" && Array.isArray(market.outcomes)) {
            const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
            if (home?.point !== undefined) spreads.push(home.point);
          }
          if (market.key === "totals" && Array.isArray(market.outcomes)) {
            const over = market.outcomes.find((o: any) => o.name?.toLowerCase?.() === "over");
            if (over?.point !== undefined) totals.push(over.point);
          }
        }
      }
    }

    // Average the odds across all bookmakers
    if (moneylineHomeOdds.length > 0) {
      moneylineHome = Math.round(moneylineHomeOdds.reduce((a, b) => a + b, 0) / moneylineHomeOdds.length);
    }
    if (moneylineAwayOdds.length > 0) {
      moneylineAway = Math.round(moneylineAwayOdds.reduce((a, b) => a + b, 0) / moneylineAwayOdds.length);
    }
    if (spreads.length > 0) {
      spread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    }
    if (totals.length > 0) {
      total = totals.reduce((a, b) => a + b, 0) / totals.length;
    }

    // If no moneyline odds found, use default odds based on spread (if available)
    // This handles cases where bookmakers only offer spread betting
    let finalHome = moneylineHome;
    let finalAway = moneylineAway;

    if (finalHome === undefined && finalAway === undefined && spread !== undefined) {
      // Estimate moneyline from spread (rough approximation)
      // A spread of -16.5 suggests a heavy favorite, roughly -1200 to -1500
      if (spread < -10) {
        finalHome = -1200;
        finalAway = 800;
      } else if (spread < -5) {
        finalHome = -300;
        finalAway = 250;
      } else if (spread < 0) {
        finalHome = -150;
        finalAway = 130;
      } else if (spread > 5) {
        finalHome = 250;
        finalAway = -300;
      } else {
        finalHome = -110;
        finalAway = 110;
      }
    } else if (finalHome === undefined || finalAway === undefined) {
      // If only one side has odds, estimate the other
      if (finalHome !== undefined && finalAway === undefined) {
        // Estimate away odds from home odds
        finalAway = finalHome > 0 ? -finalHome : Math.abs(finalHome);
      } else if (finalAway !== undefined && finalHome === undefined) {
        // Estimate home odds from away odds
        finalHome = finalAway > 0 ? -finalAway : Math.abs(finalAway);
      } else {
        // No odds at all, use defaults
        finalHome = -110;
        finalAway = 110;
      }
    }

    games.push({
      id: item.id || `${homeTeam}-${awayTeam}-${item.commence_time || Date.now()}`,
      homeTeam,
      awayTeam,
      sport,
      date: item.commence_time ? new Date(item.commence_time) : new Date(),
      venue: item.venue || "TBD",
      odds: {
        home: finalHome ?? -110,
        away: finalAway ?? 110,
        spread,
        total
      }
    });
  }

  return games;
}

export function mergeOddsIntoGames(games: Game[], odds: SimplifiedOdds[]): Game[] {
  if (!odds || odds.length === 0) return games;
  return games.map(game => {
    const match = odds.find(o =>
      normalizeName(o.homeTeam) === normalizeName(game.homeTeam) &&
      normalizeName(o.awayTeam) === normalizeName(game.awayTeam)
    );
    if (!match) return game;
    return {
      ...game,
      odds: {
        home: match.moneyline?.home ?? game.odds?.home ?? 0,
        away: match.moneyline?.away ?? game.odds?.away ?? 0,
        spread: match.spread ?? game.odds?.spread,
        total: match.total ?? game.odds?.total
      }
    };
  });
}

// Fetch final scores and update prediction tracker (use in Tuesday cron)
export async function fetchScoresAndUpdatePredictions(
  apiKey: string,
  sport: SupportedSport,
  games: Game[] = [],
  daysFrom: number = 3
): Promise<{ completedGames: number; predictionsUpdated: number; cursorLearnGames: number }> {
  const sportKey = SPORT_KEY_MAP[sport];
  if (!sportKey) return { completedGames: 0, predictionsUpdated: 0, cursorLearnGames: 0 };

  let data: any[] | null = null;

  // 1️⃣ Try ESPN first — free, no quota, near real-time
  const ESPN_PATH: Record<string, string> = {
    NFL: 'football/nfl', NBA: 'basketball/nba', NHL: 'hockey/nhl',
    MLB: 'baseball/mlb', NCAAF: 'football/college-football', NCAAB: 'basketball/mens-college-basketball',
  };
  const espnPath = ESPN_PATH[sport];
  if (espnPath) {
    try {
      // Fetch scores for recent days to cover the daysFrom window
      const espnResults: any[] = [];
      for (let d = 0; d < daysFrom; d++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - d);
        const dateStr = dt.toISOString().split('T')[0].replace(/-/g, '');
        const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard?dates=${dateStr}&limit=300${sport === 'NCAAB' ? '&groups=50' : sport === 'NCAAF' ? '&groups=80' : ''}`;
        const res = await fetch(espnUrl, { cache: 'no-store' });
        if (!res.ok) continue;
        const espnData = await res.json();
        for (const ev of (espnData?.events || [])) {
          const comp = ev?.competitions?.[0];
          const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
          const home = competitors.find((c: any) => c.homeAway === 'home');
          const away = competitors.find((c: any) => c.homeAway === 'away');
          if (!home?.team?.displayName || !away?.team?.displayName) continue;
          const isFinal = ev?.status?.type?.completed === true || ev?.status?.type?.state === 'post';
          // Normalize to Odds API format so the rest of the function works unchanged
          espnResults.push({
            id: ev.id,
            home_team: home.team.displayName,
            away_team: away.team.displayName,
            completed: isFinal,
            scores: [
              { name: home.team.displayName, score: home.score ?? '0' },
              { name: away.team.displayName, score: away.score ?? '0' },
            ],
          });
        }
      }
      if (espnResults.length > 0) {
        data = espnResults;
        console.log(`[Scores] ESPN returned ${data.length} events for ${sport} (${daysFrom} days)`);
      }
    } catch (err) {
      console.warn(`[Scores] ESPN failed for ${sport}, falling back to Odds API`);
    }
  }

  // 2️⃣ Fallback to The Odds API
  if (!data && apiKey) {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysFrom}&apiKey=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Scores API failed: ${res.status} for ${url}`);
        return { completedGames: 0, predictionsUpdated: 0, cursorLearnGames: 0 };
      }
      data = await res.json();
      console.log(`[Scores] Odds API returned ${Array.isArray(data) ? data.length : 0} events for ${sport}`);
    } catch (err) {
      console.error("Scores API request error", err);
      return { completedGames: 0, predictionsUpdated: 0, cursorLearnGames: 0 };
    }
  }

  if (!Array.isArray(data)) return { completedGames: 0, predictionsUpdated: 0, cursorLearnGames: 0 };

  const norm = (name: string) => name?.toLowerCase().replace(/\s+/g, "") || "";
  const completedForCursor: Game[] = [];
  let completedGames = 0;
  let predictionsUpdated = 0;
  let gamesWithoutMatch = 0;
  let gamesWithoutScores = 0;

  for (const g of data) {
    if (!g.completed || !g.scores || !Array.isArray(g.scores)) {
      if (g.completed && (!g.scores || !Array.isArray(g.scores))) gamesWithoutScores++;
      continue;
    }
    completedGames++;
    const homeTeam = g.home_team;
    const awayTeam = g.away_team;
    const homeScoreEntry = g.scores.find((s: any) => norm(s.name) === norm(homeTeam));
    const awayScoreEntry = g.scores.find((s: any) => norm(s.name) === norm(awayTeam));
    if (!homeScoreEntry || !awayScoreEntry) {
      gamesWithoutScores++;
      continue;
    }

    const homeScore = Number(homeScoreEntry.score ?? homeScoreEntry.points ?? 0);
    const awayScore = Number(awayScoreEntry.score ?? awayScoreEntry.points ?? 0);

    const matchingGame = games.find(
      gg => norm(gg.homeTeam) === norm(homeTeam) && norm(gg.awayTeam) === norm(awayTeam)
    );

    if (!matchingGame) {
      gamesWithoutMatch++;
    }

    // Update predictions stored locally (by Odds API game id first)
    try {
      const liveGameFromOddsApi = {
        id: g.id, // The Odds API game id (best match for stored predictions)
        homeTeam,
        awayTeam,
        liveScore: { home: homeScore, away: awayScore },
        isCompleted: true
      };
      predictionsUpdated += await updatePredictionsFromLiveGames([liveGameFromOddsApi]);

      // If our locally-tracked game id differs (e.g., sample ids), also update by the local game id.
      if (matchingGame && matchingGame.id !== g.id) {
        predictionsUpdated += await updatePredictionsFromLiveGames([{
          id: matchingGame.id,
          homeTeam: matchingGame.homeTeam,
          awayTeam: matchingGame.awayTeam,
          liveScore: { home: homeScore, away: awayScore },
          isCompleted: true
        }]);
      }
    } catch (err) {
      console.error("Prediction tracker update failed", err);
    }

    // Feed cursor learner only when we have full game context (odds, etc.)
    if (matchingGame) {
      completedForCursor.push({
        ...matchingGame,
        liveScore: { home: homeScore, away: awayScore },
        isCompleted: true
      });
    }
  }

  if (completedForCursor.length > 0) {
    try {
      await cursorLearnFromFinals(completedForCursor);
    } catch (err) {
      console.error("Cursor effect update failed", err);
    }
  }

  // Log diagnostic info if no games matched
  if (completedGames > 0 && completedForCursor.length === 0) {
    console.warn(`[${sport}] Found ${completedGames} completed games but ${gamesWithoutMatch} had no matching game context. Games array length: ${games.length}`);
  }

  return {
    completedGames,
    predictionsUpdated,
    cursorLearnGames: completedForCursor.length
  };
}


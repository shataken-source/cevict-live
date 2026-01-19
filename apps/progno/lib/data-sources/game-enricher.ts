/**
 * Game Enricher
 * Enriches game objects with fetched data from all purchased data sources:
 * - SportsDataIO (team stats)
 * - Rotowire API (injuries)
 * - API-Football (soccer/basketball data)
 * - The Odds API (odds, line movement)
 * - Historical results (H2H, recent form)
 */

import { Game, InjuryReport } from '../../app/weekly-analyzer';
import {
  getH2HResults,
  getRecentTeamPerformance
} from './historical-results';
import {
  calculateInjuryImpact,
  getTeamInjuries
} from './injury-fetcher';
import { lineMovementTracker } from './line-movement-tracker';
import { teamStatsFetcher } from './team-stats-fetcher';

// API-Football integration (for soccer/basketball)
let apiFootballModule: any = null;
try {
  apiFootballModule = require('../../enhancements/api-football');
} catch (e) {
  // API-Football not available
}

/**
 * Enrich a game with injury data (from Rotowire API or file)
 */
export async function enrichWithInjuries(game: Game): Promise<Game> {
  if (!game.sport || !game.homeTeam || !game.awayTeam) {
    return game;
  }

  const homeInjuries = await getTeamInjuries(game.sport, game.homeTeam);
  const awayInjuries = await getTeamInjuries(game.sport, game.awayTeam);
  const homeImpact = await calculateInjuryImpact(game.sport, game.homeTeam);
  const awayImpact = await calculateInjuryImpact(game.sport, game.awayTeam);

  // Convert to InjuryReport format expected by Game interface
  const convertInjuries = (injuries: typeof homeInjuries): InjuryReport[] => {
    return injuries.map(inj => ({
      playerName: inj.player,
      position: '', // Not available from Rotowire
      status: mapStatusToEnum(inj.status),
      injury: inj.injury,
      impact: inj.status.toLowerCase().includes('out') ? 'high' :
              inj.status.toLowerCase().includes('doubtful') ? 'high' :
              inj.status.toLowerCase().includes('questionable') ? 'medium' : 'low'
    }));
  };

  return {
    ...game,
    injuries: {
      homeImpact: -homeImpact, // Negative because injuries reduce strength
      awayImpact: -awayImpact,
      homeInjuries: convertInjuries(homeInjuries),
      awayInjuries: convertInjuries(awayInjuries)
    }
  };
}

/**
 * Enrich a game with head-to-head history
 */
export function enrichWithH2H(game: Game): Game {
  if (!game.sport || !game.homeTeam || !game.awayTeam) {
    return game;
  }

  const h2hResults = getH2HResults(game.sport, game.homeTeam, game.awayTeam);

  if (h2hResults.length === 0) {
    return game;
  }

  const recentMeetings = h2hResults
    .slice(0, 5) // Last 5 meetings
    .map(result => ({
      date: new Date(result.date),
      homeTeam: result.homeTeam,
      awayTeam: result.awayTeam,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winner: result.winner,
      spread: result.spread,
      total: result.total,
      homeCovered: result.homeCovered ?? false,
      overHit: result.overHit ?? false
    }));

  let homeWins = 0;
  let awayWins = 0;
  let homeATS = 0;
  let awayATS = 0;
  let totalPoints = 0;

  for (const meeting of recentMeetings) {
    if (meeting.winner === game.homeTeam) homeWins++;
    else if (meeting.winner === game.awayTeam) awayWins++;

    if (meeting.homeCovered && meeting.homeTeam === game.homeTeam) homeATS++;
    if (meeting.homeCovered && meeting.awayTeam === game.homeTeam) awayATS++;

    totalPoints += meeting.homeScore + meeting.awayScore;
  }

  return {
    ...game,
    h2hHistory: {
      recentMeetings,
      homeTeamWins: homeWins,
      awayTeamWins: awayWins,
      homeTeamATS: homeATS,
      awayTeamATS: awayATS,
      averageTotal: totalPoints / recentMeetings.length
    }
  };
}

/**
 * Enrich a game with team stats from SportsDataIO API or historical data
 */
export async function enrichWithTeamStats(game: Game): Promise<Game> {
  if (!game.sport || !game.homeTeam || !game.awayTeam) {
    return game;
  }

  // Try SportsDataIO API first (if available)
  const homeStats = await teamStatsFetcher.getTeamStats(game.homeTeam, game.sport);
  const awayStats = await teamStatsFetcher.getTeamStats(game.awayTeam, game.sport);

  // Fallback to historical performance if SportsDataIO not available
  const homePerf = getRecentTeamPerformance(game.sport, game.homeTeam, 5);
  const awayPerf = getRecentTeamPerformance(game.sport, game.awayTeam, 5);

  // Use SportsDataIO stats if available, otherwise use historical performance
  if (homeStats && awayStats) {
    return {
      ...game,
      teamStats: {
        home: homeStats,
        away: awayStats
      }
    };
  }

  return {
    ...game,
    teamStats: {
      home: {
        recentForm: {
          last5Wins: homePerf.wins,
          last5Losses: homePerf.losses,
          last10Wins: 0, // Would need more data
          last10Losses: 0,
          currentStreak: homePerf.wins > homePerf.losses ? 'win' : 'loss',
          streakLength: Math.abs(homePerf.wins - homePerf.losses)
        },
        season: {
          wins: 0, // Would need full season data
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointsForPerGame: homePerf.avgPointsFor,
          pointsAgainstPerGame: homePerf.avgPointsAgainst
        },
        homeAway: {
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          homePointsFor: 0,
          homePointsAgainst: 0,
          awayPointsFor: 0,
          awayPointsAgainst: 0
        },
        ats: {
          wins: 0,
          losses: 0,
          pushes: 0,
          winPercentage: 0
        },
        totals: {
          overs: 0,
          unders: 0,
          pushes: 0,
          overPercentage: 0
        }
      },
      away: {
        recentForm: {
          last5Wins: awayPerf.wins,
          last5Losses: awayPerf.losses,
          last10Wins: 0,
          last10Losses: 0,
          currentStreak: awayPerf.wins > awayPerf.losses ? 'win' : 'loss',
          streakLength: Math.abs(awayPerf.wins - awayPerf.losses)
        },
        season: {
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointsForPerGame: awayPerf.avgPointsFor,
          pointsAgainstPerGame: awayPerf.avgPointsAgainst
        },
        homeAway: {
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          homePointsFor: 0,
          homePointsAgainst: 0,
          awayPointsFor: 0,
          awayPointsAgainst: 0
        },
        ats: {
          wins: 0,
          losses: 0,
          pushes: 0,
          winPercentage: 0
        },
        totals: {
          overs: 0,
          unders: 0,
          pushes: 0,
          overPercentage: 0
        }
      }
    }
  };
}

/**
 * Enrich a game with line movement data
 */
export function enrichWithLineMovement(game: Game): Game {
  if (!game.id || !game.sport) {
    return game;
  }

  // Record current odds snapshot
  lineMovementTracker.recordSnapshot(
    game.id,
    game.sport,
    game.odds?.spread,
    game.odds?.total,
    game.odds?.home,
    game.odds?.away
  );

  // Get line movement if available
  const movement = lineMovementTracker.getMovement(game.id);

  if (movement) {
    return {
      ...game,
      lineMovement: {
        openingSpread: movement.openingSpread,
        currentSpread: movement.currentSpread,
        openingTotal: movement.openingTotal,
        currentTotal: movement.currentTotal,
        movementDirection: movement.movementDirection,
        sharpMoneyIndicator: movement.sharpMoneyIndicator
      }
    };
  }

  return game;
}

/**
 * Enrich a game with API-Football data (for soccer/basketball)
 */
export async function enrichWithApiFootball(game: Game): Promise<Game> {
  if (!apiFootballModule || !game.sport) {
    return game;
  }

  // API-Football supports soccer and some basketball leagues
  const supportedSports = ['soccer', 'basketball'];
  const sportLower = game.sport.toLowerCase();

  if (!supportedSports.some(s => sportLower.includes(s))) {
    return game;
  }

  try {
    const { getHeadToHead, calculateTeamStrength, getInjuries } = apiFootballModule;

    // Try to get team IDs from team names (would need a mapping)
    // For now, skip if we can't map teams
    // This would require a team name to API-Football ID mapping

    // If we have team IDs, we could do:
    // const h2h = await getHeadToHead({ team1: homeTeamId, team2: awayTeamId });
    // const homeStrength = await calculateTeamStrength({ team: homeTeamId, ... });
    // const awayStrength = await calculateTeamStrength({ team: awayTeamId, ... });

    return game;
  } catch (error) {
    console.warn(`[GameEnricher] API-Football enrichment failed:`, error);
    return game;
  }
}

/**
 * Fully enrich a game with all available data sources
 * Uses: SportsDataIO, Rotowire API, API-Football, The Odds API, Historical data
 */
export async function enrichGame(game: Game): Promise<Game> {
  let enriched = { ...game };

  // Apply enrichments in order (all async now)
  enriched = await enrichWithInjuries(enriched);
  enriched = enrichWithH2H(enriched);
  enriched = await enrichWithTeamStats(enriched);
  enriched = enrichWithLineMovement(enriched);
  enriched = await enrichWithApiFootball(enriched);

  return enriched;
}

/**
 * Map Rotowire status to enum
 */
function mapStatusToEnum(status: string): 'out' | 'questionable' | 'probable' | 'doubtful' {
  const lower = status.toLowerCase();
  if (lower.includes('out') || lower.includes('ir') || lower.includes('pup')) {
    return 'out';
  }
  if (lower.includes('doubtful')) {
    return 'doubtful';
  }
  if (lower.includes('questionable')) {
    return 'questionable';
  }
  return 'probable';
}


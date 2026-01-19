/**
 * Train Bot on 2024 Season
 * POST /api/train/2024 - Train cursor effect bot on entire 2024 season
 */

import { NextRequest, NextResponse } from 'next/server';
import { cursorLearnFromFinals, getCursorStats } from '../../../cursor-effect';
import { loadHistoricalResults } from '../../../../lib/data-sources/historical-results';
import { Game } from '../../../weekly-analyzer';

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'] as const;

// Map sport names to league codes
const SPORT_MAP: Record<string, typeof ALL_LEAGUES[number]> = {
  'NFL': 'NFL',
  'nfl': 'NFL',
  'americanfootball_nfl': 'NFL',
  'NBA': 'NBA',
  'nba': 'NBA',
  'basketball_nba': 'NBA',
  'MLB': 'MLB',
  'mlb': 'MLB',
  'baseball_mlb': 'MLB',
  'NHL': 'NHL',
  'nhl': 'NHL',
  'icehockey_nhl': 'NHL',
  'NCAAF': 'NCAAF',
  'ncaaf': 'NCAAF',
  'americanfootball_ncaaf': 'NCAAF',
  'collegefootball': 'NCAAF',
  'NCAAB': 'NCAAB',
  'ncaab': 'NCAAB',
  'basketball_ncaab': 'NCAAB',
  'collegebasketball': 'NCAAB',
};

export async function POST(request: NextRequest) {
  try {
    console.log('[Train 2024] Starting training on 2024 season...');

    // Get initial stats
    const initialStats = getCursorStats();

    // Try multiple data sources
    const fs = require('fs');
    const path = require('path');
    const prognoDir = path.join(process.cwd(), '.progno');
    const dataDir = path.join(process.cwd(), 'data');
    let allGames: any[] = [];

    // Try data/2024-games.json first (has actual data)
    const dataFile = path.join(dataDir, '2024-games.json');
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (Array.isArray(data)) {
        allGames = data;
      }
    }

    // Fallback to historical results loader
    if (allGames.length === 0) {
      const allResults = loadHistoricalResults();
      if (allResults && Object.keys(allResults).length > 0) {
        // Flatten all results into single array
        for (const [sport, games] of Object.entries(allResults)) {
          if (Array.isArray(games)) {
            allGames.push(...games.map((g: any) => ({ ...g, league: sport })));
          }
        }
      }
    }

    if (allGames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No 2024 game data found',
          message: 'Expected files: data/2024-games.json or .progno/2024-results-all-sports.json'
        },
        { status: 404 }
      );
    }

    // Process each league
    let totalGames = 0;
    let totalLearned = 0;
    const leagueStats: Record<string, { games: number; learned: number }> = {};

    // Group games by league
    const gamesByLeague: Record<string, any[]> = {};
    for (const game of allGames) {
      const league = SPORT_MAP[game.league?.toLowerCase()] || game.league || 'NFL';
      if (!gamesByLeague[league]) {
        gamesByLeague[league] = [];
      }
      gamesByLeague[league].push(game);
    }

    for (const league of ALL_LEAGUES) {
      try {
        const leagueGames = gamesByLeague[league] || [];

        if (leagueGames.length === 0) {
          console.log(`[Train 2024] ${league}: No results found`);
          continue;
        }

        console.log(`[Train 2024] Processing ${league}: ${leagueGames.length} games`);

        // Convert historical games to Game format
        const games: Game[] = [];
        let learned = 0;

        for (const result of leagueGames) {
          // Skip if no scores
          if (!result.actualScore || result.actualScore.home === undefined || result.actualScore.away === undefined) {
            continue;
          }

          // Create Game object
          const game: Game = {
            id: result.id || `${result.homeTeam}-${result.awayTeam}-${result.date}`,
            homeTeam: result.homeTeam,
            awayTeam: result.awayTeam,
            sport: league,
            date: new Date(result.date),
            venue: 'TBD',
            odds: result.odds || {
              home: -110, // Default if not available
              away: 110,
            },
            liveScore: {
              home: result.actualScore.home,
              away: result.actualScore.away,
            },
            teamStats: result.teamStats,
          };

          games.push(game);
        }

        console.log(`[Train 2024] ${league}: Converted ${games.length} games with scores`);

        // Train the bot on these games
        if (games.length > 0) {
          console.log(`[Train 2024] ${league}: Training bot on ${games.length} games...`);
          await cursorLearnFromFinals(games);
          learned = games.length;
          totalLearned += learned;
          console.log(`[Train 2024] ${league}: Learned from ${learned} games`);
        }

        totalGames += games.length;
        leagueStats[league] = { games: games.length, learned };

      } catch (error: any) {
        console.error(`[Train 2024] Error processing ${league}:`, error);
      }
    }

    // Get final stats
    const finalStats = getCursorStats();
    const newSamples = finalStats.samples - initialStats.samples;
    const newWins = finalStats.wins - initialStats.wins;

    return NextResponse.json({
      success: true,
      message: 'Training complete',
      summary: {
        totalGames,
        totalLearned,
        leaguesProcessed: Object.keys(leagueStats).length,
      },
      leagueStats,
      initialStats: {
        samples: initialStats.samples,
        wins: initialStats.wins,
        accuracy: initialStats.accuracy,
      },
      finalStats: {
        samples: finalStats.samples,
        wins: finalStats.wins,
        accuracy: finalStats.accuracy,
        newSamples,
        newWins,
      },
      weights: finalStats.weights,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Train 2024] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Training failed'
      },
      { status: 500 }
    );
  }
}


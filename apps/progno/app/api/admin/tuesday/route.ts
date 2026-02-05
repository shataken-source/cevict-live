/**
 * API endpoint for Tuesday: Update scores for all leagues
 * Fetches final scores and updates predictions for NFL, NBA, MLB, NHL, NCAAF, NCAAB
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from '../../../weekly-page.helpers';
import { getAccuracyMetrics } from '../../../prediction-tracker';
import { getPrimaryKey } from '../../../keys-store';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'] as const;

function saveJson(filename: string, data: any) {
  const prognoDir = path.join(process.cwd(), '.progno');
  if (!fs.existsSync(prognoDir)) fs.mkdirSync(prognoDir, { recursive: true });
  const file = path.join(prognoDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(request: NextRequest) {
  try {
    const key = getPrimaryKey();
    if (!key) {
      return NextResponse.json(
        { error: 'ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY not set' },
        { status: 400 }
      );
    }

    const stamp = new Date().toISOString().split('T')[0];
    const results: Record<string, any> = {};
    let totalCompleted = 0;
    let totalUpdated = 0;

    // Load all games from Friday picks (all leagues combined)
    const prognoDir = path.join(process.cwd(), '.progno');
    let allGamesBySport: Record<string, any[]> = {};
    try {
      // First try the combined all-leagues picks file
      const allPicksFile = path.join(prognoDir, 'picks-all-leagues-latest.json');
      if (fs.existsSync(allPicksFile)) {
        const allPicksData = JSON.parse(fs.readFileSync(allPicksFile, 'utf8'));
        if (Array.isArray(allPicksData)) {
          // Extract games from picks - each pick has a "game" property
          allPicksData.forEach((pick: any) => {
            // Get sport from pick.sport or pick.game.sport
            const sport = pick.sport || pick.game?.sport || 'NFL';
            if (!allGamesBySport[sport]) allGamesBySport[sport] = [];
            // Extract the game object from the pick
            if (pick.game && typeof pick.game === 'object') {
              allGamesBySport[sport].push(pick.game);
            }
          });
        }
      }
    } catch (err) {
      // If all-leagues file fails, will try individual files
      console.warn('Could not load all-leagues picks file', err);
    }

    // Process all leagues in parallel
    const leaguePromises = ALL_LEAGUES.map(async (sport) => {
      try {
        // Load games for this league
        // Priority: 1) All-leagues picks, 2) Individual league picks, 3) Current schedule API
        let games: any[] = [];

        // Try from all-leagues picks first
        if (allGamesBySport[sport] && allGamesBySport[sport].length > 0) {
          games = allGamesBySport[sport];
        } else {
          // Fallback to individual league picks file
          try {
            const picksFile = path.join(prognoDir, `picks-${sport}-latest.json`);
            if (fs.existsSync(picksFile)) {
              const picksData = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
              if (Array.isArray(picksData) && picksData.length > 0) {
                games = picksData.map((p: any) => p.game).filter((g: any) => g);
              }
            }
          } catch {
            // Continue to schedule API fallback
          }

          // Final fallback to current schedule API
          if (games.length === 0) {
            try {
              games = await fetchScheduleFromOddsApi(key, sport);
            } catch {
              // If schedule fetch fails, continue with empty games array
            }
          }
        }

        // Fetch scores and update predictions (look back 7 days to catch weekend games)
        const scoreResult = await fetchScoresAndUpdatePredictions(key, sport, games, 7);

        totalCompleted += scoreResult.completedGames;
        totalUpdated += scoreResult?.predictionsUpdated;

        return {
          sport,
          success: true,
          ...scoreResult
        };
      } catch (error: any) {
        console.error(`Error processing ${sport}:`, error);
        return {
          sport,
          success: false,
          error: error.message || 'Unknown error',
          completedGames: 0,
          predictionsUpdated: 0,
          cursorLearnGames: 0
        };
      }
    });

    const leagueResults = await Promise.all(leaguePromises);

    // Get overall metrics
    const metrics = getAccuracyMetrics();

    // Save results
    const payload = {
      leagueResults,
      metrics,
      summary: {
        totalCompleted,
        totalUpdated,
        timestamp: new Date().toISOString()
      }
    };

    saveJson(`results-all-leagues-${stamp}.json`, payload);
    saveJson(`results-all-leagues-latest.json`, payload);

    const successCount = leagueResults.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Updated scores for ${successCount}/${ALL_LEAGUES.length} leagues`,
      timestamp: new Date().toISOString(),
      results: leagueResults,
      summary: {
        totalCompleted,
        totalUpdated,
        successCount,
        failedCount: ALL_LEAGUES.length - successCount,
        metrics
      }
    });
  } catch (error: any) {
    console.error('Tuesday update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update all leagues' },
      { status: 500 }
    );
  }
}





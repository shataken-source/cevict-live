/**
 * API endpoint to run analysis for all leagues at once
 * Fetches odds, analyzes, and saves picks for NFL, NBA, MLB, NHL, NCAAF, NCAAB
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchScheduleFromOddsApi } from '../../../weekly-page.helpers';
import { analyzeWeeklyGames, ModelCalibration } from '../../../weekly-analyzer';
import { addPrediction } from '../../../prediction-tracker';
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

function loadCalibration(): ModelCalibration | undefined {
  const prognoDir = path.join(process.cwd(), '.progno');
  const file = path.join(prognoDir, 'calibration.json');
  if (!fs.existsSync(file)) return undefined;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as ModelCalibration;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const key = getPrimaryKey();
    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: 'ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY not set. Please configure your API key in environment variables or use the admin panel to add it.',
          details: 'The Odds API key is required to fetch live sports betting odds. Get a free key at https://the-odds-api.com/'
        },
        { status: 400 }
      );
    }

    const stamp = new Date().toISOString().split('T')[0];
    const results: Record<string, any> = {};
    const allPicks: any[] = [];
    const allOdds: Record<string, any[]> = {};

    const calibration = loadCalibration();

    // Process all leagues in parallel
    const leaguePromises = ALL_LEAGUES.map(async (sport) => {
      try {
        // Fetch schedule and odds
        const games = await fetchScheduleFromOddsApi(key, sport);
        if (!games.length) {
          return { sport, success: false, error: 'No games returned' };
        }

        // Save odds
        allOdds[sport] = games;
        saveJson(`odds-${sport}-${stamp}.json`, games);
        saveJson(`odds-${sport}-latest.json`, games);

        // Analyze games
        const result = await analyzeWeeklyGames(games, calibration);

        // Persist predictions
        for (const pred of (await result).predictions ?? []) {
          addPrediction(pred.game.id, pred, sport);
          allPicks.push({ ...pred, sport });
        }

        // Save picks
        saveJson(`picks-${sport}-${stamp}.json`, result?.predictions);
        saveJson(`picks-${sport}-latest.json`, result?.predictions);

        return {
          sport,
          success: true,
          gamesCount: games.length,
          picksCount: result?.predictions.length,
          bestBets: result.summary.bestBets.length
        };
      } catch (error: any) {
        console.error(`Error processing ${sport}:`, error);
        return {
          sport,
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    });

    const leagueResults = await Promise.all(leaguePromises);

    // Save combined results
    saveJson(`odds-all-leagues-${stamp}.json`, allOdds);
    saveJson(`odds-all-leagues-latest.json`, allOdds);
    saveJson(`picks-all-leagues-${stamp}.json`, allPicks);
    saveJson(`picks-all-leagues-latest.json`, allPicks);

    const successCount = leagueResults.filter(r => r.success).length;
    const totalGames = leagueResults.reduce((sum, r) => sum + (r.gamesCount || 0), 0);
    const totalPicks = allPicks.length;

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount}/${ALL_LEAGUES.length} leagues`,
      timestamp: new Date().toISOString(),
      results: leagueResults,
      summary: {
        totalGames,
        totalPicks,
        successCount,
        failedCount: ALL_LEAGUES.length - successCount
      }
    });
  } catch (error: any) {
    console.error('All leagues analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process all leagues' },
      { status: 500 }
    );
  }
}






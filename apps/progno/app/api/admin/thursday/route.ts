/**
 * API endpoint for Thursday: Complete weekly cycle
 * 1. Update final scores from previous week (learn from results)
 * 2. Load odds and make picks for the week ahead
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions } from '../../../weekly-page.helpers';
import { analyzeWeeklyGames, ModelCalibration } from '../../../weekly-analyzer';
import { addPrediction } from '../../../prediction-tracker';
import { getAccuracyMetrics } from '../../../prediction-tracker';
import { getPrimaryKey } from '../../../keys-store';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'] as const;

// Vercel Cron calls endpoints with GET and `x-vercel-cron: 1`.
export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron) {
    return NextResponse.json(
      { error: 'Method Not Allowed. Use POST, or Vercel Cron GET with x-vercel-cron: 1.' },
      { status: 405 }
    );
  }

  return POST(request);
}

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
        { error: 'ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY not set' },
        { status: 400 }
      );
    }

    const stamp = new Date().toISOString().split('T')[0];
    const results: any = {
      phase1: { updateResults: [], metrics: null, summary: {} },
      phase2: { picksResults: [], summary: {} }
    };

    // ============================================================
    // PHASE 1: UPDATE FINALS & LEARN
    // ============================================================
    const prognoDir = path.join(process.cwd(), '.progno');
    let allGamesBySport: Record<string, any[]> = {};

    try {
      const allPicksFile = path.join(prognoDir, 'picks-all-leagues-latest.json');
      if (fs.existsSync(allPicksFile)) {
        const allPicksData = JSON.parse(fs.readFileSync(allPicksFile, 'utf8'));
        if (Array.isArray(allPicksData)) {
          allPicksData.forEach((pick: any) => {
            const sport = pick.sport || pick.game?.sport || 'NFL';
            if (!allGamesBySport[sport]) allGamesBySport[sport] = [];
            if (pick.game && typeof pick.game === 'object') {
              allGamesBySport[sport].push(pick.game);
            }
          });
        }
      }
    } catch (err) {
      // Continue
    }

    let totalCompleted = 0;
    let totalUpdated = 0;
    let totalLearned = 0;

    const updatePromises = ALL_LEAGUES.map(async (sport) => {
      try {
        let games: any[] = [];

        if (allGamesBySport[sport] && allGamesBySport[sport].length > 0) {
          games = allGamesBySport[sport];
        } else {
          try {
            const picksFile = path.join(prognoDir, `picks-${sport}-latest.json`);
            if (fs.existsSync(picksFile)) {
              const picksData = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
              if (Array.isArray(picksData) && picksData.length > 0) {
                games = picksData.map((p: any) => p.game).filter((g: any) => g);
              }
            }
          } catch {
            // Continue
          }

          if (games.length === 0) {
            try {
              games = await fetchScheduleFromOddsApi(key, sport);
            } catch {
              // Continue
            }
          }
        }

        const scoreResult = await fetchScoresAndUpdatePredictions(key, sport, games, 7);

        totalCompleted += scoreResult.completedGames;
        totalUpdated += scoreResult?.predictionsUpdated;
        totalLearned += scoreResult.cursorLearnGames;

        return {
          sport,
          success: true,
          ...scoreResult
        };
      } catch (error: any) {
        console.error(`Error updating ${sport}:`, error);
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

    const updateResults = await Promise.all(updatePromises);
    const metrics = getAccuracyMetrics();

    results.phase1 = {
      updateResults,
      metrics,
      summary: {
        totalCompleted,
        totalUpdated,
        totalLearned,
        timestamp: new Date().toISOString()
      }
    };

    saveJson(`results-all-leagues-${stamp}.json`, results.phase1);
    saveJson(`results-all-leagues-latest.json`, results.phase1);

    // ============================================================
    // PHASE 2: LOAD ODDS & MAKE PICKS
    // ============================================================
    const allPicks: any[] = [];
    const allOdds: Record<string, any[]> = {};
    const calibration = loadCalibration();

    const picksPromises = ALL_LEAGUES.map(async (sport) => {
      try {
        const games = await fetchScheduleFromOddsApi(key, sport);
        if (!games.length) {
          return { sport, success: false, error: 'No games returned' };
        }

        allOdds[sport] = games;
        saveJson(`odds-${sport}-${stamp}.json`, games);
        saveJson(`odds-${sport}-latest.json`, games);

        const result = await analyzeWeeklyGames(games, calibration);

        for (const pred of result?.predictions ?? []) {
          addPrediction(pred.game.id, pred, sport);
          allPicks.push({ ...pred, sport });
        }

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

    const picksResults = await Promise.all(picksPromises);

    saveJson(`odds-all-leagues-${stamp}.json`, allOdds);
    saveJson(`odds-all-leagues-latest.json`, allOdds);
    saveJson(`picks-all-leagues-${stamp}.json`, allPicks);
    saveJson(`picks-all-leagues-latest.json`, allPicks);

    const successCount = picksResults.filter(r => r.success).length;
    const totalGames = picksResults.reduce((sum, r) => sum + (r.gamesCount || 0), 0);
    const totalPicks = allPicks.length;
    const totalBestBets = picksResults.reduce((sum, r) => sum + (r.bestBets || 0), 0);

    results.phase2 = {
      picksResults,
      summary: {
        totalGames,
        totalPicks,
        totalBestBets,
        successCount,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      message: `Thursday cycle complete: Learned from ${totalLearned} games, made ${totalPicks} picks`,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        phase1: {
          learnedFrom: totalLearned,
          completedGames: totalCompleted,
          updatedPredictions: totalUpdated,
          winRate: metrics.winRate,
          roi: metrics.roi
        },
        phase2: {
          totalGames,
          totalPicks,
          totalBestBets,
          leaguesProcessed: successCount
        }
      }
    });
  } catch (error: any) {
    console.error('Thursday cycle error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete Thursday cycle' },
      { status: 500 }
    );
  }
}


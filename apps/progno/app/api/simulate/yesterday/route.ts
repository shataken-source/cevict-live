/**
 * Simulate Yesterday's Games with Claude Effect
 * GET /api/simulate/yesterday - Run simulation on yesterday's games
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchScoresAndUpdatePredictions } from '../../../weekly-page.helpers';
import { analyzeWeeklyGames } from '../../../weekly-analyzer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get API key
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ODDS_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Supported sports
    const SPORTS: Array<'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB'> = [
      'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'
    ];

    const allResults: any[] = [];

    for (const sport of SPORTS) {
      try {
        const sportKey = sport === 'NFL' ? 'americanfootball_nfl' :
                        sport === 'NBA' ? 'basketball_nba' :
                        sport === 'MLB' ? 'baseball_mlb' :
                        sport === 'NHL' ? 'icehockey_nhl' :
                        sport === 'NCAAF' ? 'americanfootball_ncaaf' :
                        'basketball_ncaab';

        // Fetch completed games from yesterday
        const scoresUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=1&apiKey=${apiKey}`;
        const scoresRes = await fetch(scoresUrl);

        if (!scoresRes.ok) {
          continue;
        }

        const scoresData = await scoresRes.json();
        if (!Array.isArray(scoresData) || scoresData.length === 0) {
          continue;
        }

        // Filter to yesterday's games only
        const yesterdayGames = scoresData.filter((game: any) => {
          if (!game.commence_time) return false;
          const gameDate = new Date(game.commence_time);
          return gameDate.toISOString().split('T')[0] === yesterdayStr;
        });

        if (yesterdayGames.length === 0) {
          continue;
        }

        // Convert to Game format
        const games = yesterdayGames.map((item: any) => ({
          id: item.id || `${item.home_team}-${item.away_team}-${item.commence_time}`,
          homeTeam: item.home_team,
          awayTeam: item.away_team,
          sport: sport,
          date: new Date(item.commence_time),
          venue: item.venue || 'TBD',
          odds: {
            home: -110,
            away: 110,
            spread: item.scores?.[0]?.spread || undefined,
            total: item.scores?.[0]?.total || undefined,
          },
          liveScore: item.scores?.[0] ? {
            home: item.scores[0].scores?.find((s: any) => s.name === item.home_team)?.score || 0,
            away: item.scores[0].scores?.find((s: any) => s.name === item.away_team)?.score || 0,
          } : undefined,
        }));

        // Run predictions with Claude Effect
        const analysis = await analyzeWeeklyGames(games);

        const predictions = analysis.predictions.map(pred => {
          const claudeEffect = (pred as any).claudeEffect || null;
          const actualWinner = pred.game.liveScore
            ? (pred.game.liveScore.home > pred.game.liveScore.away
                ? pred.game.homeTeam
                : pred.game.awayTeam)
            : null;
          const correct = pred.game.liveScore
            ? pred.predictedWinner === actualWinner
            : null;

          return {
            game: `${pred.game.homeTeam} vs ${pred.game.awayTeam}`,
            predictedWinner: pred.predictedWinner,
            confidence: pred.confidence,
            actualWinner,
            correct,
            claudeEffect: claudeEffect ? {
              adjustedProbability: claudeEffect.adjustedProbability,
              scores: claudeEffect.scores,
              warnings: claudeEffect.warnings || [],
              reasoning: claudeEffect.reasoning || [],
            } : null,
          };
        });

        const claudeEffectCount = predictions.filter(p => p.claudeEffect !== null).length;
        const withResults = predictions.filter(p => p.actualWinner !== null);
        const correct = withResults.filter(p => p.correct === true).length;
        const accuracy = withResults.length > 0 ? (correct / withResults.length) * 100 : null;

        allResults.push({
          sport,
          gamesFound: yesterdayGames.length,
          predictions: predictions.length,
          claudeEffectApplied: claudeEffectCount,
          accuracy,
          correct,
          total: withResults.length,
          results: predictions,
        });

      } catch (error: any) {
        console.error(`Error processing ${sport}:`, error);
      }
    }

    // Calculate totals
    const totalGames = allResults.reduce((sum, r) => sum + r.gamesFound, 0);
    const totalPredictions = allResults.reduce((sum, r) => sum + r.predictions, 0);
    const totalClaudeEffect = allResults.reduce((sum, r) => sum + r.claudeEffectApplied, 0);
    const totalCorrect = allResults.reduce((sum, r) => sum + (r.correct || 0), 0);
    const totalWithResults = allResults.reduce((sum, r) => sum + (r.total || 0), 0);
    const overallAccuracy = totalWithResults > 0 ? (totalCorrect / totalWithResults) * 100 : null;

    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      summary: {
        totalGames,
        totalPredictions,
        totalClaudeEffect,
        claudeEffectPercentage: totalPredictions > 0 ? (totalClaudeEffect / totalPredictions) * 100 : 0,
        overallAccuracy,
        totalCorrect,
        totalWithResults,
      },
      results: allResults,
    });
  } catch (error: any) {
    console.error('[Simulate Yesterday] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}


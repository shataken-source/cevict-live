import { NextResponse } from 'next/server';
import { fetchLiveOdds, fetchPublicBetting, detectSharpMoney, fetchExpertConsensus } from '@/lib/live-data-service';

/**
 * Live Odds API
 * Returns real-time odds with public betting %, sharp money, and expert consensus
 * Competitor parity: Action Network, Covers.com, OddsTrader
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'NFL';
  const includeAnalysis = searchParams.get('analysis') === 'true';

  try {
    // Fetch live odds
    const games = await fetchLiveOdds(league);

    // If analysis requested, add public betting and sharp money data
    if (includeAnalysis) {
      const enrichedGames = await Promise.all(
        games.map(async (game) => {
          const [publicBetting, expertConsensus] = await Promise.all([
            fetchPublicBetting(game.gameId),
            fetchExpertConsensus(game.gameId, game.homeTeam, game.awayTeam),
          ]);

          const sharpMoney = await detectSharpMoney(game.gameId, publicBetting);

          return {
            ...game,
            analysis: {
              publicBetting,
              sharpMoney,
              expertConsensus,
            },
          };
        })
      );

      return NextResponse.json({
        success: true,
        league,
        games: enrichedGames,
        lastUpdate: new Date().toISOString(),
        source: 'live',
      });
    }

    return NextResponse.json({
      success: true,
      league,
      games,
      lastUpdate: new Date().toISOString(),
      source: 'live',
    });
  } catch (error) {
    console.error('Live odds error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live odds' },
      { status: 500 }
    );
  }
}


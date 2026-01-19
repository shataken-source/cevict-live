/**
 * Sentiment Field API Endpoints
 * GET /api/sentiment/team/:teamId - Get sentiment for a team
 * POST /api/sentiment/calculate - Calculate sentiment for a team
 * GET /api/sentiment/compare - Compare two teams' sentiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateSentimentField, TeamBaseline } from '../../lib/sentiment/scoring-engine';
import { SentimentDataCollector } from '../../lib/sentiment/collectors';
import { aggregateSentiment } from '../../lib/sentiment/analyzer';

// Placeholder for database functions (would use Supabase in production)
async function getTeamBaseline(teamId: string): Promise<TeamBaseline> {
  // Phase 1: Return default baseline
  // Phase 2: Fetch from database
  return {
    teamId,
    teamName: teamId, // Would fetch actual name
    avgSentiment: 0,
    avgSocialSentiment: 0,
    avgPressSentiment: 0,
    stdSentiment: 0.15,
  };
}

async function getCachedSentiment(teamId: string, gameId: string): Promise<{ data: any; age: number } | null> {
  // Phase 1: No caching
  // Phase 2: Implement Redis or database cache
  return null;
}

async function storeSentimentReading(sentiment: any): Promise<void> {
  // Phase 1: No storage
  // Phase 2: Store in database
  console.log('[Sentiment API] Would store:', sentiment);
}

/**
 * GET /api/sentiment/team/:teamId
 * Get sentiment for a team
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const teamId = pathParts[pathParts.length - 1];
    const gameId = url.searchParams.get('gameId') || 'current';

    if (!teamId || teamId === 'sentiment') {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      );
    }

    // For now, return a placeholder response
    // Phase 2: Fetch from database
    return NextResponse.json({
      success: true,
      data: {
        teamId,
        gameId,
        sentimentField: 0,
        confidence: 0,
        message: 'Sentiment calculation not yet implemented. Use POST /api/sentiment/calculate to calculate.',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get sentiment' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sentiment/calculate
 * Calculate sentiment for a team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, teamName, gameId, forceRefresh = false } = body;

    if (!teamId || !teamName) {
      return NextResponse.json(
        { success: false, error: 'teamId and teamName required' },
        { status: 400 }
      );
    }

    // 1. Check cache (don't recalculate within 15 min unless forced)
    if (!forceRefresh) {
      const cached = await getCachedSentiment(teamId, gameId || 'current');
      if (cached && cached.age < 15 * 60 * 1000) {
        return NextResponse.json({ success: true, data: cached.data, cached: true });
      }
    }

    // 2. Get baseline
    const baseline = await getTeamBaseline(teamId);

    // 3. Collect data (Phase 1: Placeholder data)
    const collector = new SentimentDataCollector();
    const collectedData = await collector.collectAllData(teamName, 168);

    // 4. Process social media data
    const socialData = {
      playerPosts: collectedData.socialPosts
        .filter(p => p.authorType === 'player')
        .map(p => p.content),
      coachPosts: collectedData.socialPosts
        .filter(p => p.authorType === 'coach')
        .map(p => p.content),
      teamPosts: collectedData.socialPosts
        .filter(p => p.authorType === 'team_official')
        .map(p => p.content),
      beatReporterPosts: collectedData.socialPosts
        .filter(p => p.authorType === 'beat_reporter')
        .map(p => p.content),
      fanPosts: collectedData.socialPosts
        .filter(p => p.authorType === 'fan')
        .map(p => p.content),
    };

    // 5. Process press conferences
    const pressData = {
      headCoach: collectedData.pressConferences.find(pc =>
        pc.speaker.role === 'head_coach'
      ) ? {
        transcript: collectedData.pressConferences.find(pc =>
          pc.speaker.role === 'head_coach'
        )!.transcript,
      } : undefined,
      coordinators: collectedData.pressConferences
        .filter(pc => pc.speaker.role === 'coordinator')
        .map(pc => ({ transcript: pc.transcript })),
      keyPlayers: collectedData.pressConferences
        .filter(pc => pc.speaker.role === 'player')
        .map(pc => ({ transcript: pc.transcript })),
    };

    // 6. Process news articles
    const newsHeadlines = collectedData.newsArticles.map(a => a.title);
    const newsArticles = collectedData.newsArticles.map(a => `${a.title} ${a.content}`);

    const headlineSentiment = newsHeadlines.length > 0
      ? (await aggregateSentiment(newsHeadlines)).score
      : 0;
    const articleSentiment = newsArticles.length > 0
      ? (await aggregateSentiment(newsArticles)).score
      : 0;

    const newsData = {
      headlineSentiment,
      articleSentiment,
      injuryReports: 0, // Handled separately
    };

    // 7. Calculate SF
    const sentiment = await calculateSentimentField(
      teamId,
      teamName,
      gameId || 'current',
      socialData,
      pressData,
      newsData,
      baseline
    );

    // 8. Store result
    await storeSentimentReading(sentiment);

    return NextResponse.json({ success: true, data: sentiment, cached: false });
  } catch (error: any) {
    console.error('[Sentiment API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}


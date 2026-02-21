/**
 * Sentiment Calculate API - Route handler for /api/sentiment/calculate
 * This forwards POST requests to the parent sentiment handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateSentimentField, TeamBaseline } from '@/lib/sentiment/scoring-engine';
import { SentimentDataCollector } from '@/lib/sentiment/collectors';
import { aggregateSentiment } from '@/lib/sentiment/analyzer';

// Placeholder for database functions (would use Supabase in production)
async function getTeamBaseline(teamId: string): Promise<TeamBaseline> {
  return {
    teamId,
    teamName: teamId,
    avgSentiment: 0,
    avgSocialSentiment: 0,
    avgPressSentiment: 0,
    stdSentiment: 0.15,
  };
}

async function getCachedSentiment(teamId: string, gameId: string): Promise<{ data: any; age: number } | null> {
  return null;
}

async function storeSentimentReading(sentiment: any): Promise<void> {
  console.log('[Sentiment API] Would store:', sentiment);
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
      injuryReports: 0,
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


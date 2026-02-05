/**
 * Claude Effect Helpers - Phase 1 Implementation
 *
 * Provides data collection and analysis for:
 * - Narrative Momentum (Dimension 2)
 * - Sentiment Field (Dimension 1) - Text-based only
 */

import { NarrativeContext, SentimentData } from './claude-effect';

/**
 * Analyze headlines and news for narrative detection
 * Phase 1: Simple keyword-based detection
 * Phase 2: LLM-based analysis
 */
export async function detectNarratives(
  homeTeam: string,
  awayTeam: string,
  league: string,
  headlines?: string[],
  recentNews?: Array<{ title: string; content: string; date: string }>
): Promise<NarrativeContext[]> {
  const narratives: NarrativeContext[] = [];

  // If no data provided, return empty (will be enhanced with API calls later)
  if (!headlines && !recentNews) {
    return narratives;
  }

  const allText = [
    ...(headlines || []),
    ...(recentNews?.map(n => `${n.title} ${n.content}`) || []),
  ].join(' ').toLowerCase();

  // Narrative detection patterns
  const narrativePatterns = [
    {
      type: 'revenge' as const,
      keywords: ['revenge', 'payback', 'rematch', 'avenge', 'get back', 'settle the score'],
      impact: 0.08,
    },
    {
      type: 'proving_doubters' as const,
      keywords: ['doubt', 'underdog', 'nobody believes', 'disrespect', 'overlooked', 'sleeper'],
      impact: 0.05,
    },
    {
      type: 'contract_year' as const,
      keywords: ['contract year', 'free agency', 'playing for contract', 'contract season'],
      impact: 0.04,
    },
    {
      type: 'return_to_team' as const,
      keywords: ['return', 'former team', 'old team', 'back to', 'reunion'],
      impact: 0.06,
    },
    {
      type: 'injured_teammate' as const,
      keywords: ['playing for', 'honor', 'dedicate', 'injured teammate', 'fallen teammate'],
      impact: 0.07,
    },
    {
      type: 'losing_streak' as const,
      keywords: ['losing streak', 'desperate', 'must win', 'back against wall', 'do or die'],
      impact: 0.03,
    },
    {
      type: 'underdog' as const,
      keywords: ['underdog', 'nobody believes', 'chip on shoulder', 'disrespected'],
      impact: 0.05,
    },
    {
      type: 'complacency' as const,
      keywords: ['heavy favorite', 'overconfident', 'looking past', 'trap game', 'letdown'],
      impact: -0.04,
    },
    {
      type: 'looking_ahead' as const,
      keywords: ['looking ahead', 'next week', 'bigger game', 'distraction'],
      impact: -0.06,
    },
    {
      type: 'post_championship' as const,
      keywords: ['championship hangover', 'defending champ', 'letdown', 'complacent'],
      impact: -0.08,
    },
  ];

  for (const pattern of narrativePatterns) {
    const matches = pattern.keywords.filter(kw => allText.includes(kw));
    if (matches.length > 0) {
      // Determine which team the narrative affects
      let team: 'home' | 'away' | 'both' = 'both';

      // Simple heuristic: check if team names appear near narrative keywords
      const homeTeamLower = homeTeam.toLowerCase();
      const awayTeamLower = awayTeam.toLowerCase();

      // Check if narrative mentions specific team
      const homeMentions = allText.split(/[.!?]/).filter(s =>
        s.includes(homeTeamLower) && pattern.keywords.some(kw => s.includes(kw))
      ).length;

      const awayMentions = allText.split(/[.!?]/).filter(s =>
        s.includes(awayTeamLower) && pattern.keywords.some(kw => s.includes(kw))
      ).length;

      if (homeMentions > awayMentions && homeMentions > 0) {
        team = 'home';
      } else if (awayMentions > homeMentions && awayMentions > 0) {
        team = 'away';
      }

      // Strength based on number of keyword matches and context
      const strength = Math.min(1.0, matches.length * 0.3 + (homeMentions + awayMentions) * 0.1);

      narratives.push({
        type: pattern.type,
        strength,
        team,
        description: `Detected ${pattern.type.replace(/_/g, ' ')} narrative (${matches.length} indicators)`,
      });
    }
  }

  return narratives;
}

/**
 * Analyze text-based sentiment from news and social media
 * Phase 1: Simple sentiment analysis using keyword patterns
 * Phase 2: LLM-based sentiment analysis
 */
export async function analyzeSentiment(
  homeTeam: string,
  awayTeam: string,
  newsArticles?: Array<{ title: string; content: string; source: string }>,
  socialMediaPosts?: Array<{ text: string; source: 'twitter' | 'instagram' | 'other' }>
): Promise<SentimentData> {
  // Default neutral sentiment
  const sentiment: SentimentData = {
    playerInterviews: 0,
    socialMedia: 0,
    pressConferences: 0,
    fanSentiment: 0,
    beatReporterTone: 0,
    timestamp: new Date().toISOString(),
  };

  if (!newsArticles && !socialMediaPosts) {
    return sentiment;
  }

  // Simple keyword-based sentiment analysis
  const positiveKeywords = [
    'confident', 'excited', 'ready', 'focused', 'prepared', 'optimistic',
    'strong', 'great', 'excellent', 'amazing', 'fantastic', 'win', 'victory',
    'dominate', 'crush', 'destroy', 'unstoppable', 'elite', 'championship',
  ];

  const negativeKeywords = [
    'concerned', 'worried', 'struggling', 'disappointed', 'frustrated',
    'injury', 'doubt', 'question', 'problem', 'issue', 'weak', 'poor',
    'lose', 'defeat', 'struggle', 'collapse', 'disaster', 'crisis',
  ];

  // Analyze news articles (press conferences, beat reporters)
  if (newsArticles) {
    let pressConferenceScore = 0;
    let beatReporterScore = 0;

    for (const article of newsArticles) {
      const text = `${article.title} ${article.content}`.toLowerCase();
      const source = article.source.toLowerCase();

      const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length;
      const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length;

      const articleSentiment = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);

      if (source.includes('press') || source.includes('conference') || source.includes('interview')) {
        pressConferenceScore += articleSentiment;
      } else {
        beatReporterScore += articleSentiment;
      }
    }

    sentiment.pressConferences = Math.max(-1, Math.min(1, pressConferenceScore / Math.max(1, newsArticles.length)));
    sentiment.beatReporterTone = Math.max(-1, Math.min(1, beatReporterScore / Math.max(1, newsArticles.length)));
  }

  // Analyze social media (Twitter, Instagram)
  if (socialMediaPosts) {
    let socialScore = 0;
    let interviewScore = 0;

    for (const post of socialMediaPosts) {
      const text = post.text.toLowerCase();
      const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length;
      const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length;
      const postSentiment = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);

      if (post.source === 'twitter' || post.source === 'instagram') {
        socialScore += postSentiment;
      }

      // Check if it's a player interview/statement
      if (text.includes('i ') || text.includes('we ') || text.includes('our ')) {
        interviewScore += postSentiment;
      }
    }

    sentiment.socialMedia = Math.max(-1, Math.min(1, socialScore / Math.max(1, socialMediaPosts.length)));
    sentiment.playerInterviews = Math.max(-1, Math.min(1, interviewScore / Math.max(1, socialMediaPosts.length)));
  }

  // Fan sentiment (simplified - would use social media API in Phase 2)
  // For now, use a weighted average of social media
  sentiment.fanSentiment = sentiment.socialMedia * 0.8;

  return sentiment;
}

/**
 * Fetch news articles for a game (placeholder for API integration)
 */
export async function fetchGameNews(
  homeTeam: string,
  awayTeam: string,
  league: string,
  date?: string
): Promise<Array<{ title: string; content: string; source: string; date: string }>> {
  // Phase 1: Return empty array (will be enhanced with news API)
  // Phase 2: Integrate with news API (ESPN, The Athletic, etc.)
  return [];
}

/**
 * Fetch social media posts for teams (placeholder for API integration)
 */
export async function fetchSocialMediaPosts(
  homeTeam: string,
  awayTeam: string,
  league: string
): Promise<Array<{ text: string; source: 'twitter' | 'instagram' | 'other'; date: string }>> {
  // Phase 1: Return empty array (will be enhanced with Twitter/X API)
  // Phase 2: Integrate with Twitter/X API, Instagram API
  return [];
}

/**
 * Estimate information asymmetry from betting line movement
 * Phase 1: Requires integration with betting data API
 */
export async function estimateInformationAsymmetry(
  homeTeam: string,
  awayTeam: string,
  currentLine: number,
  openingLine?: number
): Promise<{
  publicBetPercentage: number;
  lineMovement: number;
  lineMovementDirection: 'with_public' | 'against_public' | 'neutral';
  sharpMoneyDirection: 'home' | 'away' | 'neutral';
  reverseLineMovement: boolean;
  volume: number;
}> {
  // Phase 1: Estimate from line movement only
  const lineMovement = openingLine !== undefined ? currentLine - openingLine : 0;

  // Simple heuristic: if line moves significantly, assume sharp money
  const significantMovement = Math.abs(lineMovement) > 1.0;
  const reverseLineMovement = significantMovement; // Simplified

  return {
    publicBetPercentage: 0.5, // Unknown without betting data API
    lineMovement,
    lineMovementDirection: lineMovement > 0 ? 'with_public' : lineMovement < 0 ? 'against_public' : 'neutral',
    sharpMoneyDirection: lineMovement > 0 ? 'away' : lineMovement < 0 ? 'home' : 'neutral',
    reverseLineMovement,
    volume: 0, // Unknown without betting data API
  };
}


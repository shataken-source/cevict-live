/**
 * Sentiment Field Scoring Engine
 * Combines all sentiment signals into a final SF score
 */

import { analyzeSentiment, aggregateSentiment, SentimentResult } from './analyzer';

export interface TeamSentimentProfile {
  teamId: string;
  teamName: string;
  gameId: string;
  calculatedAt: Date;

  // Component scores
  components: {
    socialMedia: {
      players: number;
      coaches: number;
      team: number;
      beatReporters: number;
      fans: number;
    };
    pressConferences: {
      headCoach: number;
      coordinators: number;
      keyPlayers: number;
    };
    news: {
      headlines: number;
      articles: number;
      injuryReports: number;
    };
  };

  // Weighted final score
  sentimentField: number;  // -1 to +1
  confidence: number;      // 0 to 1

  // Trend
  trend: 'improving' | 'stable' | 'declining';
  trendMagnitude: number;

  // Key factors
  keyFactors: SentimentFactor[];

  // Red/green flags
  flags: SentimentFlag[];
}

export interface SentimentFactor {
  description: string;
  impact: number;
  source: string;
  timestamp: Date;
}

export interface SentimentFlag {
  type: 'red' | 'yellow' | 'green';
  description: string;
  impact: number;
}

export interface TeamBaseline {
  teamId: string;
  teamName: string;
  avgSentiment: number;
  avgSocialSentiment: number;
  avgPressSentiment: number;
  stdSentiment: number;
}

export interface SocialSentimentData {
  playerPosts: string[];
  coachPosts: string[];
  teamPosts: string[];
  beatReporterPosts: string[];
  fanPosts: string[];
}

export interface PressConferenceSentimentData {
  headCoach?: { transcript: string; analysis?: any };
  coordinators: Array<{ transcript: string; analysis?: any }>;
  keyPlayers: Array<{ transcript: string; analysis?: any }>;
}

export interface NewsSentimentData {
  headlineSentiment: number;
  articleSentiment: number;
  injuryReports: number;
}

// WEIGHTS for combining signals (per Claude Effect Complete Guide)
// Total: 1.0 across all categories
const SENTIMENT_WEIGHTS = {
  socialMedia: {
    // Twitter/X: 25% weight (split among sources)
    // Instagram: 20% weight (split among sources)
    players: 0.25,      // Player posts are CRITICAL (Twitter + Instagram)
    coaches: 0.10,      // Coaches rarely post sentiment
    team: 0.05,         // Official accounts are sanitized
    beatReporters: 0.20, // Beat reporters have inside info! (20% per guide)
    fans: 0.05,         // Fans are noise, but wisdom of crowds
  },
  pressConferences: {
    // Press Conferences: 25% weight per guide (split)
    headCoach: 0.15,
    coordinators: 0.05,
    keyPlayers: 0.05,
  },
  news: {
    // News Articles: 10% weight per guide
    headlines: 0.05,
    articles: 0.05,
    injuryReports: 0.00, // Handled separately in injury module
  },
};

/**
 * Calculate Sentiment Field for a team
 */
export async function calculateSentimentField(
  teamId: string,
  teamName: string,
  gameId: string,
  socialData: SocialSentimentData,
  pressData: PressConferenceSentimentData,
  newsData: NewsSentimentData,
  baseline: TeamBaseline
): Promise<TeamSentimentProfile> {

  // 1. Calculate component scores
  const components = {
    socialMedia: {
      players: await aggregateComponentSentiment(socialData.playerPosts),
      coaches: await aggregateComponentSentiment(socialData.coachPosts),
      team: await aggregateComponentSentiment(socialData.teamPosts),
      beatReporters: await aggregateComponentSentiment(socialData.beatReporterPosts),
      fans: await aggregateComponentSentiment(socialData.fanPosts),
    },
    pressConferences: {
      headCoach: pressData.headCoach
        ? (await analyzeSentiment(pressData.headCoach.transcript)).score
        : 0,
      coordinators: await aggregateComponentSentiment(
        pressData.coordinators.map(c => c.transcript)
      ),
      keyPlayers: await aggregateComponentSentiment(
        pressData.keyPlayers.map(p => p.transcript)
      ),
    },
    news: {
      headlines: newsData.headlineSentiment,
      articles: newsData.articleSentiment,
      injuryReports: newsData.injuryReports,
    },
  };

  // 2. Apply weights
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, categoryWeights] of Object.entries(SENTIMENT_WEIGHTS)) {
    for (const [subCategory, weight] of Object.entries(categoryWeights)) {
      const categoryData = (components as any)[category];
      const score = categoryData?.[subCategory];
      if (score !== null && score !== undefined && !isNaN(score)) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }
  }

  const rawSF = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 3. Compare to baseline (deviation from team's norm)
  const deviationFromBaseline = rawSF - baseline.avgSentiment;

  // 4. Final SF = deviation from baseline (we care about CHANGE, not absolute)
  const sentimentField = deviationFromBaseline;

  // 5. Calculate confidence
  const dataPoints = countDataPoints(socialData, pressData, newsData);
  const recency = calculateRecencyScore(socialData, pressData, newsData);
  const confidence = Math.min((dataPoints / 50) * recency, 1);

  // 6. Identify key factors
  const keyFactors = identifyKeyFactors(components, socialData, pressData, newsData);

  // 7. Generate flags
  const flags = generateFlags(components, keyFactors);

  // 8. Calculate trend (simplified - would use historical data)
  const trend = calculateTrend(components);

  return {
    teamId,
    teamName,
    gameId,
    calculatedAt: new Date(),
    components,
    sentimentField: Math.max(-1, Math.min(1, sentimentField)),
    confidence: Math.max(0, Math.min(1, confidence)),
    trend: trend.direction,
    trendMagnitude: trend.magnitude,
    keyFactors,
    flags,
  };
}

/**
 * Aggregate sentiment for a component
 */
async function aggregateComponentSentiment(texts: string[]): Promise<number> {
  if (texts.length === 0) return 0;

  const result = await aggregateSentiment(texts, {
    checkClichés: true,
    extractAspects: false, // Don't need aspects for component aggregation
  });

  return result.score;
}

/**
 * Count total data points
 */
function countDataPoints(
  socialData: SocialSentimentData,
  pressData: PressConferenceSentimentData,
  newsData: NewsSentimentData
): number {
  return (
    socialData.playerPosts.length +
    socialData.coachPosts.length +
    socialData.teamPosts.length +
    socialData.beatReporterPosts.length +
    socialData.fanPosts.length +
    (pressData.headCoach ? 1 : 0) +
    pressData.coordinators.length +
    pressData.keyPlayers.length +
    (newsData.headlineSentiment !== 0 ? 1 : 0) +
    (newsData.articleSentiment !== 0 ? 1 : 0)
  );
}

/**
 * Calculate recency score (more recent data = higher score)
 */
function calculateRecencyScore(
  socialData: SocialSentimentData,
  pressData: PressConferenceSentimentData,
  newsData: NewsSentimentData
): number {
  // Simplified: assume all data is recent if provided
  // In production, would check timestamps
  const hasRecentData =
    socialData.playerPosts.length > 0 ||
    socialData.beatReporterPosts.length > 0 ||
    pressData.headCoach !== undefined;

  return hasRecentData ? 1.0 : 0.5;
}

/**
 * Identify key factors affecting sentiment
 */
function identifyKeyFactors(
  components: any,
  socialData: SocialSentimentData,
  pressData: PressConferenceSentimentData,
  newsData: NewsSentimentData
): SentimentFactor[] {
  const factors: SentimentFactor[] = [];

  // Player sentiment
  if (Math.abs(components.socialMedia.players) > 0.3) {
    factors.push({
      description: `Player social media shows ${components.socialMedia.players > 0 ? 'strong positive' : 'strong negative'} sentiment`,
      impact: components.socialMedia.players,
      source: 'social_media',
      timestamp: new Date(),
    });
  }

  // Beat reporter sentiment
  if (Math.abs(components.socialMedia.beatReporters) > 0.25) {
    factors.push({
      description: `Beat reporters signaling ${components.socialMedia.beatReporters > 0 ? 'positive' : 'negative'} team dynamics`,
      impact: components.socialMedia.beatReporters,
      source: 'beat_reporters',
      timestamp: new Date(),
    });
  }

  // Head coach press conference
  if (Math.abs(components.pressConferences.headCoach) > 0.3) {
    factors.push({
      description: `Head coach press conference ${components.pressConferences.headCoach > 0 ? 'unusually confident' : 'unusually negative'}`,
      impact: components.pressConferences.headCoach,
      source: 'press_conference',
      timestamp: new Date(),
    });
  }

  return factors;
}

/**
 * Generate red/yellow/green flags
 */
function generateFlags(
  components: any,
  keyFactors: SentimentFactor[]
): SentimentFlag[] {
  const flags: SentimentFlag[] = [];

  // RED FLAGS
  if (components.socialMedia.players < -0.3) {
    flags.push({
      type: 'red',
      description: 'Player social media shows significant negative sentiment',
      impact: -0.15,
    });
  }

  if (components.pressConferences.headCoach < -0.4) {
    flags.push({
      type: 'red',
      description: 'Head coach press conference unusually negative',
      impact: -0.12,
    });
  }

  if (components.socialMedia.beatReporters < -0.35) {
    flags.push({
      type: 'red',
      description: 'Beat reporters signaling internal issues',
      impact: -0.10,
    });
  }

  // YELLOW FLAGS
  if (components.socialMedia.players < -0.15 && components.socialMedia.players >= -0.3) {
    flags.push({
      type: 'yellow',
      description: 'Mild negative sentiment from players',
      impact: -0.05,
    });
  }

  // GREEN FLAGS
  if (components.socialMedia.players > 0.3) {
    flags.push({
      type: 'green',
      description: 'Players showing high positive energy',
      impact: +0.10,
    });
  }

  if (components.pressConferences.headCoach > 0.35) {
    flags.push({
      type: 'green',
      description: 'Head coach unusually confident',
      impact: +0.08,
    });
  }

  return flags;
}

/**
 * Calculate trend (simplified - would use historical data in production)
 */
function calculateTrend(components: any): { direction: 'improving' | 'stable' | 'declining'; magnitude: number } {
  // Simplified: would compare to historical components
  // For now, return stable
  return {
    direction: 'stable',
    magnitude: 0,
  };
}


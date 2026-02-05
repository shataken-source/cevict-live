/**
 * Aspect-Based Sentiment Analysis
 * Analyzes sentiment for specific aspects (injuries, chemistry, confidence, etc.)
 */

import { PreprocessedText } from './preprocessor';

export interface AspectSentiment {
  aspect: string;
  sentiment: number;
  mentions: string[];
  confidence: number;
}

export const ASPECT_KEYWORDS = {
  injury: {
    keywords: ['injury', 'injured', 'hurt', 'pain', 'health', 'questionable', 'doubtful', 'limited', 'full', 'cleared', 'surgery', 'rehab', 'recovery'],
    weight: 1.5,  // Injuries are CRITICAL
  },
  team_chemistry: {
    keywords: ['chemistry', 'locker room', 'together', 'united', 'tension', 'conflict', 'drama', 'rift', 'disagreement', 'feud', 'bond', 'brotherhood'],
    weight: 1.2,
  },
  confidence: {
    keywords: ['confident', 'believe', 'ready', 'prepared', 'worried', 'concerned', 'doubt', 'uncertain', 'sure', 'certain'],
    weight: 1.0,
  },
  motivation: {
    keywords: ['motivated', 'hungry', 'focused', 'revenge', 'prove', 'chip', 'fire', 'flat', 'desperate', 'determined', 'driven'],
    weight: 1.1,
  },
  coaching: {
    keywords: ['scheme', 'gameplan', 'adjustments', 'prepared', 'outcoached', 'execution', 'strategy', 'playcalling', 'coaching'],
    weight: 0.9,
  },
  external: {
    keywords: ['distraction', 'media', 'contract', 'trade', 'rumor', 'personal', 'family', 'off-field', 'legal'],
    weight: 0.8,
  },
  performance: {
    keywords: ['struggling', 'dominating', 'improving', 'declining', 'hot', 'cold', 'streak', 'slump', 'breakout'],
    weight: 1.0,
  },
};

/**
 * Extract aspect-based sentiment from preprocessed text
 */
export function extractAspects(preprocessed: PreprocessedText): AspectSentiment[] {
  const aspects: AspectSentiment[] = [];
  const lowerText = preprocessed.cleaned.toLowerCase();

  for (const [aspectName, config] of Object.entries(ASPECT_KEYWORDS)) {
    const mentions: string[] = [];
    let sentimentSum = 0;
    let count = 0;

    // Find sentences containing aspect keywords
    for (const sentence of preprocessed.sentences) {
      const lowerSentence = sentence.toLowerCase();

      for (const keyword of config.keywords) {
        if (lowerSentence.includes(keyword)) {
          mentions.push(sentence.trim());

          // Analyze sentiment of this specific sentence
          // Simple approach: count positive/negative words in sentence
          const sentenceTokens = lowerSentence.split(/\s+/);
          const positiveWords = sentenceTokens.filter(t =>
            ['confident', 'ready', 'healthy', 'great', 'excited', 'prepared'].some(p => t.includes(p))
          ).length;
          const negativeWords = sentenceTokens.filter(t =>
            ['worried', 'concerned', 'struggling', 'hurt', 'doubt'].some(n => t.includes(n))
          ).length;

          let sentenceSentiment = 0;
          if (positiveWords > negativeWords) {
            sentenceSentiment = 0.3;
          } else if (negativeWords > positiveWords) {
            sentenceSentiment = -0.3;
          }

          sentimentSum += sentenceSentiment;
          count++;
          break; // Only count sentence once per aspect
        }
      }
    }

    if (count > 0) {
      const avgSentiment = sentimentSum / count;
      const weightedSentiment = avgSentiment * config.weight;

      aspects.push({
        aspect: aspectName,
        sentiment: Math.max(-1, Math.min(1, weightedSentiment)),
        mentions: mentions.slice(0, 5), // Limit to top 5 mentions
        confidence: Math.min(1.0, count / 3), // More mentions = higher confidence
      });
    }
  }

  return aspects;
}

/**
 * Get the most impactful aspect (highest absolute sentiment * weight)
 */
export function getMostImpactfulAspect(aspects: AspectSentiment[]): AspectSentiment | null {
  if (aspects.length === 0) return null;

  return aspects.reduce((max, aspect) => {
    const impact = Math.abs(aspect.sentiment) * aspect.confidence;
    const maxImpact = Math.abs(max.sentiment) * max.confidence;
    return impact > maxImpact ? aspect : max;
  });
}


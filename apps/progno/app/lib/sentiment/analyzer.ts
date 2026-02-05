/**
 * Main Sentiment Analyzer
 * Combines lexicon-based and ML-based sentiment analysis
 */

import { preprocessText, processEmojis, PreprocessedText } from './preprocessor';
import { lexiconSentiment, isMostlyClichés } from './lexicon';
import { extractAspects, getMostImpactfulAspect, AspectSentiment } from './aspects';

export interface SentimentResult {
  score: number;           // -1 to +1
  confidence: number;      // 0 to 1
  magnitude: number;       // Strength of emotion (0 to 1)
  aspects: AspectSentiment[];
  emojiSentiment: number;
  isCliché: boolean;
  reasoning: string[];
}

/**
 * Analyze sentiment of text
 */
export async function analyzeSentiment(
  text: string,
  options: {
    useML?: boolean;
    checkClichés?: boolean;
    extractAspects?: boolean;
  } = {}
): Promise<SentimentResult> {
  const {
    useML = false,
    checkClichés = true,
    extractAspects: extractAspectsFlag = true,
  } = options;

  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      confidence: 0,
      magnitude: 0,
      aspects: [],
      emojiSentiment: 0,
      isCliché: false,
      reasoning: ['Empty text provided'],
    };
  }

  // Check for clichés first (filter out PR speak)
  const isCliché = checkClichés && isMostlyClichés(text);
  if (isCliché) {
    return {
      score: 0,
      confidence: 0,
      magnitude: 0,
      aspects: [],
      emojiSentiment: 0,
      isCliché: true,
      reasoning: ['Text is mostly sports clichés - no sentiment value'],
    };
  }

  // Process emojis
  const { cleaned: textWithoutEmojis, emojiSentiment } = processEmojis(text);

  // Preprocess text
  const preprocessed = preprocessText(textWithoutEmojis);

  // Lexicon-based sentiment (always calculate - it's fast)
  const lexiconScore = lexiconSentiment(preprocessed.tokens);

  // ML-based sentiment (if enabled)
  // In production, would call ML model API or local model
  let mlScore = 0;
  if (useML) {
    // Placeholder for ML sentiment
    // mlScore = await mlSentiment(text, mlConfig);
    mlScore = lexiconScore; // For now, use lexicon as fallback
  }

  // Combine scores (weighted average)
  const combinedScore = useML
    ? (lexiconScore * 0.3) + (mlScore * 0.7)  // Trust ML more
    : lexiconScore;

  // Incorporate emoji sentiment
  const finalScore = emojiSentiment !== 0
    ? (combinedScore * 0.8) + (emojiSentiment * 0.2)
    : combinedScore;

  // Calculate confidence
  const textLength = preprocessed.tokens.length;
  const textConfidence = Math.min(textLength / 50, 1); // More text = more confident

  // Agreement between lexicon and ML (if both used)
  const agreement = useML
    ? 1 - Math.abs(lexiconScore - mlScore)
    : 1;

  const confidence = (agreement + textConfidence) / 2;

  // Extract aspects
  const aspects = extractAspectsFlag ? extractAspects(preprocessed) : [];

  // Generate reasoning
  const reasoning: string[] = [];
  if (Math.abs(finalScore) > 0.3) {
    reasoning.push(
      `${finalScore > 0 ? 'Positive' : 'Negative'} sentiment detected (${(finalScore * 100).toFixed(1)}%)`
    );
  }
  if (emojiSentiment !== 0) {
    reasoning.push(
      `Emoji sentiment: ${emojiSentiment > 0 ? 'positive' : 'negative'} (${(emojiSentiment * 100).toFixed(1)}%)`
    );
  }
  const topAspect = getMostImpactfulAspect(aspects);
  if (topAspect && Math.abs(topAspect.sentiment) > 0.2) {
    reasoning.push(
      `Key aspect: ${topAspect.aspect.replace(/_/g, ' ')} (${(topAspect.sentiment * 100).toFixed(1)}%)`
    );
  }

  return {
    score: Math.max(-1, Math.min(1, finalScore)),
    confidence: Math.max(0, Math.min(1, confidence)),
    magnitude: Math.abs(finalScore),
    aspects,
    emojiSentiment,
    isCliché,
    reasoning,
  };
}

/**
 * Analyze multiple texts and aggregate
 */
export async function aggregateSentiment(
  texts: string[],
  options?: {
    useML?: boolean;
    checkClichés?: boolean;
    extractAspects?: boolean;
  }
): Promise<SentimentResult> {
  if (texts.length === 0) {
    return {
      score: 0,
      confidence: 0,
      magnitude: 0,
      aspects: [],
      emojiSentiment: 0,
      isCliché: false,
      reasoning: ['No texts provided'],
    };
  }

  // Analyze each text
  const results = await Promise.all(
    texts.map(text => analyzeSentiment(text, options))
  );

  // Filter out clichés
  const validResults = results.filter(r => !r.isCliché);

  if (validResults.length === 0) {
    return {
      score: 0,
      confidence: 0,
      magnitude: 0,
      aspects: [],
      emojiSentiment: 0,
      isCliché: true,
      reasoning: ['All texts were clichés'],
    };
  }

  // Weighted average by confidence
  let weightedSum = 0;
  let totalWeight = 0;
  let totalEmojiSentiment = 0;
  const allAspects: AspectSentiment[] = [];

  for (const result of validResults) {
    const weight = result.confidence;
    weightedSum += result.score * weight;
    totalWeight += weight;
    totalEmojiSentiment += result.emojiSentiment;
    allAspects.push(...result.aspects);
  }

  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const avgEmojiSentiment = validResults.length > 0 ? totalEmojiSentiment / validResults.length : 0;
  const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;

  // Aggregate aspects (average by aspect type)
  const aspectMap = new Map<string, AspectSentiment[]>();
  for (const aspect of allAspects) {
    if (!aspectMap.has(aspect.aspect)) {
      aspectMap.set(aspect.aspect, []);
    }
    aspectMap.get(aspect.aspect)!.push(aspect);
  }

  const aggregatedAspects: AspectSentiment[] = [];
  for (const [aspectName, aspectList] of aspectMap.entries()) {
    const avgSentiment = aspectList.reduce((sum, a) => sum + a.sentiment, 0) / aspectList.length;
    const avgConfidence = aspectList.reduce((sum, a) => sum + a.confidence, 0) / aspectList.length;
    aggregatedAspects.push({
      aspect: aspectName,
      sentiment: avgSentiment,
      mentions: aspectList.flatMap(a => a.mentions).slice(0, 5),
      confidence: avgConfidence,
    });
  }

  return {
    score: Math.max(-1, Math.min(1, avgScore)),
    confidence: avgConfidence,
    magnitude: Math.abs(avgScore),
    aspects: aggregatedAspects,
    emojiSentiment: avgEmojiSentiment,
    isCliché: false,
    reasoning: [`Aggregated from ${validResults.length} texts`],
  };
}


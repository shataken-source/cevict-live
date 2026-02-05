/**
 * Text Preprocessing for Sentiment Analysis
 * Cleans and normalizes text before sentiment analysis
 */

export interface PreprocessedText {
  original: string;
  cleaned: string;
  tokens: string[];
  entities: NamedEntity[];
  sentences: string[];
}

export interface NamedEntity {
  text: string;
  type: 'PERSON' | 'TEAM' | 'LOCATION' | 'DATE' | 'INJURY';
  confidence: number;
}

/**
 * Preprocess text for sentiment analysis
 */
export function preprocessText(text: string): PreprocessedText {
  if (!text || text.trim().length === 0) {
    return {
      original: text,
      cleaned: '',
      tokens: [],
      entities: [],
      sentences: [],
    };
  }

  // 1. Lowercase
  let cleaned = text.toLowerCase();

  // 2. Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

  // 3. Handle contractions
  const contractions: Record<string, string> = {
    "won't": "will not",
    "can't": "cannot",
    "n't": " not",
    "'re": " are",
    "'s": " is",
    "'ll": " will",
    "'ve": " have",
    "'d": " would",
    "'m": " am",
  };

  for (const [contraction, expansion] of Object.entries(contractions)) {
    cleaned = cleaned.replace(new RegExp(contraction, 'g'), expansion);
  }

  // 4. Remove special characters (keep apostrophes for names)
  cleaned = cleaned.replace(/[^\w\s'-]/g, ' ');

  // 5. Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 6. Tokenize
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);

  // 7. Named Entity Recognition (simplified - would use NLP library in production)
  const entities = extractEntities(cleaned);

  // 8. Sentence splitting
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    original: text,
    cleaned,
    tokens,
    entities,
    sentences,
  };
}

/**
 * Extract named entities from text (simplified version)
 * In production, would use spaCy, NLTK, or similar
 */
function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];

  // Simple pattern matching for common sports entities
  // In production, use proper NER model

  // Team names (would come from team database)
  const teamPattern = /\b(alabama|auburn|chiefs|bills|patriots|dolphins)\b/gi;
  const teamMatches = text.match(teamPattern);
  if (teamMatches) {
    for (const match of teamMatches) {
      entities.push({
        text: match,
        type: 'TEAM',
        confidence: 0.7,
      });
    }
  }

  // Injury keywords
  const injuryPattern = /\b(injury|injured|hurt|pain|questionable|doubtful|limited|out|surgery)\b/gi;
  const injuryMatches = text.match(injuryPattern);
  if (injuryMatches) {
    for (const match of injuryMatches) {
      entities.push({
        text: match,
        type: 'INJURY',
        confidence: 0.8,
      });
    }
  }

  return entities;
}

/**
 * Remove emojis and convert to text sentiment
 */
export function processEmojis(text: string): { cleaned: string; emojiSentiment: number } {
  const emojiSentimentMap: Record<string, number> = {
    '😀': 0.8, '😃': 0.8, '😄': 0.8, '😁': 0.7, '😊': 0.7,
    '🙂': 0.5, '😉': 0.6, '😍': 0.9, '🥰': 0.9, '😘': 0.7,
    '😎': 0.6, '🤗': 0.7, '🤔': 0.0, '😐': 0.0, '😑': -0.2,
    '😒': -0.4, '🙁': -0.5, '😞': -0.6, '😔': -0.5, '😟': -0.4,
    '😕': -0.3, '😣': -0.5, '😖': -0.6, '😫': -0.6, '😩': -0.5,
    '😤': -0.3, '😠': -0.6, '😡': -0.8, '🤬': -0.9,
    '💪': 0.6, '🔥': 0.7, '⚡': 0.5, '💯': 0.8, '✅': 0.5,
    '❌': -0.5, '⚠️': -0.3, '🚨': -0.4,
  };

  let emojiSentiment = 0;
  let emojiCount = 0;
  let cleaned = text;

  // Extract emojis (simplified - would use proper emoji regex)
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = text.match(emojiRegex);

  if (emojis) {
    for (const emoji of emojis) {
      if (emojiSentimentMap[emoji] !== undefined) {
        emojiSentiment += emojiSentimentMap[emoji];
        emojiCount++;
      }
      // Remove emoji from text
      cleaned = cleaned.replace(emoji, '');
    }
  }

  const avgEmojiSentiment = emojiCount > 0 ? emojiSentiment / emojiCount : 0;

  return {
    cleaned: cleaned.trim(),
    emojiSentiment: avgEmojiSentiment,
  };
}


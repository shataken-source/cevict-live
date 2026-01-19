/**
 * Sentiment Lexicon for Sports Analysis
 * Hybrid approach: Lexicon-based (fast, explainable) + ML (accurate, contextual)
 */

export const SENTIMENT_LEXICON = {
  // POSITIVE WORDS
  positive: {
    'confident': 0.7,
    'excited': 0.8,
    'healthy': 0.6,
    'ready': 0.5,
    'great': 0.6,
    'excellent': 0.8,
    'dominate': 0.7,
    'focused': 0.5,
    'motivated': 0.6,
    'hungry': 0.5,
    'united': 0.6,
    'chemistry': 0.4,
    'special': 0.5,
    'elite': 0.7,
    'championship': 0.6,
    'best': 0.6,
    'strong': 0.5,
    'prepared': 0.5,
    'optimistic': 0.6,
    'impressed': 0.5,
    'breakout': 0.6,
    'surge': 0.5,
    'dominant': 0.7,
    'praised': 0.5,
  },

  // NEGATIVE WORDS
  negative: {
    'concerned': -0.5,
    'worried': -0.6,
    'disappointed': -0.7,
    'frustrated': -0.6,
    'struggling': -0.5,
    'questionable': -0.4,
    'doubtful': -0.5,
    'limited': -0.3,
    'painful': -0.4,
    'tension': -0.6,
    'conflict': -0.7,
    'distraction': -0.5,
    'issue': -0.4,
    'problem': -0.5,
    'uncertain': -0.4,
    'rift': -0.6,
    'drama': -0.5,
    'trouble': -0.5,
    'hurt': -0.4,
    'injured': -0.5,
    'out': -0.4,
    'surgery': -0.6,
    'doubt': -0.4,
  },

  // INTENSIFIERS (modify sentiment strength)
  intensifiers: {
    'very': 1.5,
    'really': 1.4,
    'extremely': 1.8,
    'incredibly': 1.7,
    'absolutely': 1.6,
    'completely': 1.5,
    'totally': 1.4,
    'slightly': 0.5,
    'somewhat': 0.6,
    'quite': 1.2,
    'pretty': 1.1,
  },

  // NEGATORS (flip sentiment)
  negators: ['not', 'no', 'never', 'none', 'nothing', "n't", 'without', 'nobody', 'nowhere'],
};

/**
 * Sports Cliché Filter
 * Filters out generic PR speak that has no real sentiment value
 */
export const SPORTS_CLICHES = [
  // Generic phrases
  'we just gotta execute',
  'they\'re a good team',
  'we need to play our game',
  'one game at a time',
  'we\'ll see what happens',
  'take it day by day',
  'focus on ourselves',
  'control what we can control',
  'give 110 percent',
  'leave it all on the field',
  'play hard',
  'do our job',
  'trust the process',
  'next man up',
  'it is what it is',
  'we\'ll be ready',
  'we\'ll see',
  'day to day',
  'no comment',
  'not going to get into that',
  'next question',
  'we\'ll see how it goes',
  'we\'ll see what happens',
  'we\'ll see how it plays out',
  'we\'ll see how it shakes out',
  'we\'ll see how it goes',
  'we\'ll see what happens',
  'we\'ll see how it plays out',
  'we\'ll see how it shakes out',
];

/**
 * Check if text is mostly clichés (should be filtered out)
 */
export function isMostlyClichés(text: string): boolean {
  const lowerText = text.toLowerCase();
  const clichéMatches = SPORTS_CLICHES.filter(cliché => lowerText.includes(cliché)).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // If 80% of sentences contain clichés, filter it out
  if (sentences.length === 0) return true;
  const clichéRatio = clichéMatches / sentences.length;
  return clichéRatio >= 0.8;
}

/**
 * Calculate sentiment using lexicon-based approach
 */
export function lexiconSentiment(tokens: string[]): number {
  let score = 0;
  let wordCount = 0;
  let intensifier = 1;
  let negation = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    // Check for negation
    if (SENTIMENT_LEXICON.negators.includes(token)) {
      negation = true;
      continue;
    }

    // Check for intensifier
    if (SENTIMENT_LEXICON.intensifiers[token]) {
      intensifier = SENTIMENT_LEXICON.intensifiers[token];
      continue;
    }

    // Check positive words
    if (SENTIMENT_LEXICON.positive[token]) {
      let wordScore = SENTIMENT_LEXICON.positive[token] * intensifier;
      if (negation) wordScore *= -1;
      score += wordScore;
      wordCount++;
    }

    // Check negative words
    if (SENTIMENT_LEXICON.negative[token]) {
      let wordScore = SENTIMENT_LEXICON.negative[token] * intensifier;
      if (negation) wordScore *= -1;
      score += wordScore;
      wordCount++;
    }

    // Reset modifiers after use (or after a few words)
    if (i > 0 && tokens[i - 1] !== token) {
      intensifier = 1;
      negation = false;
    }
  }

  return wordCount > 0 ? score / wordCount : 0;
}


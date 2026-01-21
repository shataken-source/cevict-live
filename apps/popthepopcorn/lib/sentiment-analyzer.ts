/**
 * Sentiment Analyzer (Vibe-O-Meter)
 * Analyzes headlines for Gen Z sentiment: Hype, Panic, Satire, etc.
 */

export type Sentiment = 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'

interface SentimentResult {
  sentiment: Sentiment
  score: number // -100 (panic) to +100 (hype)
  confidence: number // 0-100%
}

/**
 * Analyze sentiment of a headline
 * Returns vibe score and sentiment type
 */
export function analyzeSentiment(headline: {
  title: string
  description?: string
  category: string
}): SentimentResult {
  const text = `${headline.title} ${headline.description || ''}`.toLowerCase()

  // Hype indicators (positive excitement)
  const hypeKeywords = [
    'breaking', 'viral', 'explosive', 'massive', 'huge', 'incredible',
    'amazing', 'unbelievable', 'insane', 'wild', 'crazy', 'epic',
    'game-changing', 'revolutionary', 'historic', 'record-breaking'
  ]

  // Panic indicators (negative urgency)
  const panicKeywords = [
    'crisis', 'emergency', 'alert', 'warning', 'danger', 'threat',
    'attack', 'disaster', 'catastrophe', 'collapse', 'chaos', 'turmoil',
    'fear', 'panic', 'alarming', 'devastating', 'terrifying'
  ]

  // Satire indicators
  const satireKeywords = [
    'satire', 'parody', 'joke', 'meme', 'fake', 'not real',
    'onion', 'babylon bee', 'clickhole'
  ]

  // Concern indicators (moderate worry)
  const concernKeywords = [
    'concern', 'worried', 'troubling', 'disturbing', 'problematic',
    'issue', 'problem', 'controversy', 'scandal', 'outrage'
  ]

  // Count matches
  const hypeCount = hypeKeywords.filter(kw => text.includes(kw)).length
  const panicCount = panicKeywords.filter(kw => text.includes(kw)).length
  const satireCount = satireKeywords.filter(kw => text.includes(kw)).length
  const concernCount = concernKeywords.filter(kw => text.includes(kw)).length

  // Calculate score (-100 to +100)
  let score = 0
  score += hypeCount * 15 // Hype increases score
  score -= panicCount * 20 // Panic decreases score
  score -= concernCount * 10 // Concern slightly decreases
  score += satireCount * 5 // Satire is slightly positive (entertaining)

  // Clamp score
  score = Math.max(-100, Math.min(100, score))

  // Determine sentiment
  let sentiment: Sentiment = 'neutral'
  let confidence = 50

  if (satireCount > 0) {
    sentiment = 'satire'
    confidence = 80
  } else if (hypeCount > panicCount && hypeCount > concernCount) {
    sentiment = 'hype'
    confidence = Math.min(90, 50 + (hypeCount * 10))
  } else if (panicCount > hypeCount && panicCount > concernCount) {
    sentiment = 'panic'
    confidence = Math.min(90, 50 + (panicCount * 10))
  } else if (concernCount > 0) {
    sentiment = 'concern'
    confidence = Math.min(80, 50 + (concernCount * 8))
  } else {
    sentiment = 'neutral'
    confidence = 60
  }

  // Category adjustments
  if (headline.category === 'entertainment' || headline.category === 'viral') {
    score += 10 // Entertainment is generally more positive
  } else if (headline.category === 'politics') {
    score -= 5 // Politics tends to be more negative
  }

  return {
    sentiment,
    score: Math.round(score),
    confidence,
  }
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(sentiment: Sentiment): string {
  const emojis: Record<Sentiment, string> = {
    'hype': '📈',
    'panic': '📉',
    'satire': '🎭',
    'neutral': '➡️',
    'concern': '⚠️',
  }
  return emojis[sentiment] || '➡️'
}

/**
 * Get vibe meter visual (for UI)
 */
export function getVibeMeterVisual(score: number): {
  barWidth: number // 0-100%
  color: string
  label: string
} {
  // Convert -100 to +100 score to 0-100% bar width
  const barWidth = ((score + 100) / 2) // -100 becomes 0%, 0 becomes 50%, 100 becomes 100%

  let color = '#6b7280' // gray (neutral)
  let label = 'Neutral'

  if (score >= 60) {
    color = '#10b981' // green (hype)
    label = 'Hype'
  } else if (score >= 20) {
    color = '#3b82f6' // blue (positive)
    label = 'Positive'
  } else if (score >= -20) {
    color = '#6b7280' // gray (neutral)
    label = 'Neutral'
  } else if (score >= -60) {
    color = '#f59e0b' // orange (concern)
    label = 'Concern'
  } else {
    color = '#ef4444' // red (panic)
    label = 'Panic'
  }

  return {
    barWidth: Math.max(0, Math.min(100, barWidth)),
    color,
    label,
  }
}

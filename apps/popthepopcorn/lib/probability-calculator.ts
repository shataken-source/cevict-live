/**
 * Probability & Volatility Calculator
 * Converts drama meter (1-10) to probability percentages
 * Gen Z loves data visualization and "what are the odds?"
 */

interface ProbabilityResult {
  probability: number // 0-100%
  volatility: number // 0-100% (how likely to change)
  confidence: number // 0-100% (how certain we are)
  interpretation: string // Gen Z-friendly explanation
}

/**
 * Calculate probability based on drama score and crowd votes
 */
export function calculateProbability(
  dramaScore: number, // 1-10
  crowdVotes?: Array<{ drama_score: number }>, // User-submitted drama scores
  verificationConfidence?: number, // 0-100%
  sentiment?: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'
): ProbabilityResult {
  // Base probability from drama score (higher drama = higher probability of being significant)
  let baseProbability = (dramaScore / 10) * 100

  // Adjust based on crowd votes (if available)
  if (crowdVotes && crowdVotes.length > 0) {
    const avgCrowdScore = crowdVotes.reduce((sum, v) => sum + v.drama_score, 0) / crowdVotes.length
    const crowdProbability = (avgCrowdScore / 10) * 100
    // Weighted average: 60% base, 40% crowd
    baseProbability = (baseProbability * 0.6) + (crowdProbability * 0.4)
  }

  // Adjust based on verification confidence
  if (verificationConfidence !== undefined) {
    // Higher verification = more reliable probability
    baseProbability = baseProbability * (verificationConfidence / 100)
  }

  // Adjust based on sentiment
  let sentimentMultiplier = 1.0
  if (sentiment === 'panic' || sentiment === 'hype') {
    sentimentMultiplier = 1.1 // Panic/hype increases probability
  } else if (sentiment === 'satire') {
    sentimentMultiplier = 0.7 // Satire decreases probability
  }

  const probability = Math.min(100, Math.max(0, baseProbability * sentimentMultiplier))

  // Calculate volatility (how likely the story is to change/develop)
  // High drama = high volatility (story is developing)
  const volatility = (dramaScore / 10) * 100

  // Confidence based on verification and crowd size
  let confidence = 50 // Base confidence
  if (verificationConfidence !== undefined) {
    confidence = verificationConfidence
  }
  if (crowdVotes && crowdVotes.length > 5) {
    confidence = Math.min(100, confidence + (crowdVotes.length * 5)) // More votes = more confidence
  }

  // Generate Gen Z-friendly interpretation
  const interpretation = generateInterpretation(probability, volatility, dramaScore)

  return {
    probability: Math.round(probability),
    volatility: Math.round(volatility),
    confidence: Math.round(confidence),
    interpretation,
  }
}

/**
 * Generate Gen Z-friendly probability interpretation
 */
function generateInterpretation(probability: number, volatility: number, dramaScore: number): string {
  if (probability >= 90) {
    return `Almost definitely happening (${Math.round(probability)}% chance) 🔥`
  } else if (probability >= 70) {
    return `Very likely (${Math.round(probability)}% chance) 📈`
  } else if (probability >= 50) {
    return `50/50 shot (${Math.round(probability)}% chance) 🎲`
  } else if (probability >= 30) {
    return `Unlikely but possible (${Math.round(probability)}% chance) 🤔`
  } else {
    return `Probably not happening (${Math.round(probability)}% chance) 🧢`
  }
}

/**
 * Format probability for SMS/alert
 */
export function formatProbabilityAlert(
  headline: { title: string; drama_score: number },
  probability: ProbabilityResult
): string {
  const shortTitle = headline.title.substring(0, 50) + (headline.title.length > 50 ? '...' : '')
  return `🍿 Pop alert from The Kernel:\n\n"${shortTitle}"\n\nProbability: ${probability.probability}%\nDrama: ${headline.drama_score}/10\n\n${probability.interpretation}`
}

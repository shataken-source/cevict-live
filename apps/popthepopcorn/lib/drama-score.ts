/**
 * Calculate drama score (1-10) for a headline
 * Enhanced algorithm with better keyword detection and source weighting
 * @param trendingTopics - Optional array of trending topic names (from Twitter) to boost matching headlines
 */
export function calculateDramaScore(headline: {
  title: string
  description?: string
  source: string
  upvotes?: number
  downvotes?: number
  posted_at: string
  trendingTopics?: string[]
}): number {
  let score = 4 // Base score (slightly lower to allow more range)

  const title = headline.title.toLowerCase()
  const description = (headline.description || '').toLowerCase()
  const text = `${title} ${description}`

  // High-impact drama keywords (worth more points)
  const highDramaKeywords = [
    'breaking', 'bombshell', 'explosive', 'devastating', 'shocking',
    'scandal', 'crisis', 'chaos', 'turmoil', 'firestorm', 'uproar',
    'outrage', 'backlash', 'fury', 'fiasco', 'debacle', 'catastrophic',
    'emergency', 'alert', 'warning', 'danger', 'threat', 'attack',
    'arrest', 'charged', 'indicted', 'convicted', 'sentenced', 'resigns',
    'fired', 'terminated', 'lawsuit', 'sued', 'bankruptcy', 'collapse'
  ]

  // Medium-impact drama keywords
  const mediumDramaKeywords = [
    'urgent', 'exclusive', 'leaked', 'exposed', 'revealed', 'uncovered',
    'controversial', 'outrageous', 'unprecedented', 'historic', 'record',
    'surge', 'spike', 'plunge', 'crash', 'soar', 'rocket', 'tumble',
    'conflict', 'dispute', 'feud', 'war', 'battle', 'fight', 'clash',
    'split', 'divorce', 'breakup', 'cheating', 'affair', 'betrayal'
  ]

  // Low-impact drama keywords (subtle indicators)
  const lowDramaKeywords = [
    'drama', 'tension', 'strain', 'pressure', 'stress', 'anxiety',
    'concern', 'worried', 'fear', 'panic', 'alarm', 'shock',
    'surprise', 'unexpected', 'sudden', 'abrupt', 'dramatic'
  ]

  // Count keyword matches with weighted scoring
  const highMatches = highDramaKeywords.filter(keyword => text.includes(keyword)).length
  const mediumMatches = mediumDramaKeywords.filter(keyword => text.includes(keyword)).length
  const lowMatches = lowDramaKeywords.filter(keyword => text.includes(keyword)).length

  score += Math.min(highMatches * 1.2, 4) // High-impact: up to +4 points
  score += Math.min(mediumMatches * 0.6, 2) // Medium-impact: up to +2 points
  score += Math.min(lowMatches * 0.2, 1) // Low-impact: up to +1 point

  // Source credibility and drama potential adjustment
  const majorOutlets = ['cnn', 'fox', 'bbc', 'reuters', 'ap', 'bloomberg', 'wsj', 'nyt', 'npr', 'politico']
  const tabloids = ['tmz', 'people', 'variety', 'entertainment weekly', 'deadline', 'hollywood reporter']
  const techOutlets = ['techcrunch', 'the verge', 'ars technica', 'wired', 'engadget']
  const businessOutlets = ['bloomberg', 'cnbc', 'marketwatch', 'forbes', 'wsj']
  const sportsOutlets = ['espn', 'bbc sport']
  
  const sourceLower = headline.source.toLowerCase()
  
  if (tabloids.some(tabloid => sourceLower.includes(tabloid))) {
    score += 1.8 // Tabloids are inherently more dramatic
  } else if (majorOutlets.some(outlet => sourceLower.includes(outlet))) {
    score += 0.6 // Major outlets get credibility boost
  } else if (techOutlets.some(outlet => sourceLower.includes(outlet))) {
    score += 0.3 // Tech outlets slightly less dramatic by default
  } else if (businessOutlets.some(outlet => sourceLower.includes(outlet))) {
    score += 0.4 // Business news can be dramatic
  } else if (sportsOutlets.some(outlet => sourceLower.includes(outlet))) {
    score += 0.5 // Sports can be very dramatic
  }

  // Title characteristics
  const titleLength = headline.title.length
  if (titleLength > 80) score += 0.3 // Long titles often indicate complex/dramatic stories
  if (titleLength < 30) score += 0.2 // Short punchy titles can be dramatic
  
  // Check for ALL CAPS words (drama indicator)
  const allCapsWords = headline.title.match(/\b[A-Z]{3,}\b/g)
  if (allCapsWords && allCapsWords.length > 0) {
    score += Math.min(allCapsWords.length * 0.3, 1) // Up to +1 for ALL CAPS
  }

  // Check for exclamation marks
  const exclamationCount = (headline.title.match(/!/g) || []).length
  score += Math.min(exclamationCount * 0.4, 1.2) // Up to +1.2 for exclamations

  // Check for question marks (controversy indicator)
  const questionCount = (headline.title.match(/\?/g) || []).length
  score += Math.min(questionCount * 0.3, 0.9) // Up to +0.9 for questions

  // Engagement boost (based on votes)
  const totalVotes = (headline.upvotes || 0) + (headline.downvotes || 0)
  if (totalVotes > 500) score += 1.5
  else if (totalVotes > 200) score += 1.0
  else if (totalVotes > 100) score += 0.7
  else if (totalVotes > 50) score += 0.4
  else if (totalVotes > 20) score += 0.2

  // Vote ratio boost (controversial stories get more drama)
  if (headline.upvotes && headline.downvotes && totalVotes > 10) {
    const ratio = headline.upvotes / totalVotes
    // Highly controversial (close to 50/50) gets boost
    if (ratio > 0.4 && ratio < 0.6) {
      score += 0.8 // Controversial stories
    } else if (ratio > 0.8) {
      score += 0.5 // Highly upvoted (popular drama)
    } else if (ratio < 0.2) {
      score += 0.6 // Highly downvoted (controversial drama)
    }
  }

  // Recency boost (fresher = more dramatic)
  const postedAt = new Date(headline.posted_at)
  const hoursAgo = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 0.5) score += 1.5 // Less than 30 minutes = very fresh
  else if (hoursAgo < 1) score += 1.2 // Less than 1 hour
  else if (hoursAgo < 3) score += 0.8 // Less than 3 hours
  else if (hoursAgo < 6) score += 0.5 // Less than 6 hours
  else if (hoursAgo < 12) score += 0.2 // Less than 12 hours
  // Older than 12 hours gets no recency boost

  // Category-specific adjustments
  // Politics and entertainment tend to be more dramatic
  // (This would need category passed in, but we can infer from source)
  if (sourceLower.includes('politics') || sourceLower.includes('politico') || sourceLower.includes('the hill')) {
    score += 0.4
  }
  if (sourceLower.includes('entertainment') || tabloids.some(t => sourceLower.includes(t))) {
    score += 0.3
  }

  // Trending topics boost (if headline matches Twitter/X trending topics)
  if (headline.trendingTopics && headline.trendingTopics.length > 0) {
    const text = `${title} ${description}`
    const matchingTrends = headline.trendingTopics.filter(trend => {
      const normalizedTrend = trend.toLowerCase().replace(/[#@]/g, '').trim()
      return text.includes(normalizedTrend)
    })
    
    if (matchingTrends.length > 0) {
      // Boost based on number of matching trends (up to +2.5 points)
      score += Math.min(matchingTrends.length * 0.8, 2.5)
      // Multiple trend matches = very hot topic
      if (matchingTrends.length >= 2) {
        score += 0.5 // Extra boost for multiple trend matches
      }
    }
  }

  // Clamp between 1 and 10 and round to integer
  return Math.max(1, Math.min(10, Math.round(score)))
}

/**
 * Get drama emoji indicator
 */
export function getDramaEmoji(score: number): string {
  if (score >= 9) return '🔴'
  if (score >= 7) return '🟠'
  if (score >= 4) return '🟡'
  return '🟢'
}

/**
 * Get drama fire emojis
 */
export function getDramaFires(score: number): string {
  if (score >= 9) return '🔥🔥🔥'
  if (score >= 7) return '🔥🔥'
  if (score >= 4) return '🔥'
  return ''
}

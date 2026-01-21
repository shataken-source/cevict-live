/**
 * Twitter/X Trends Fetcher
 * Fetches trending topics from Twitter API v2
 */

interface TwitterTrend {
  name: string
  tweet_count?: number
  url?: string
}

interface TwitterTrendsResponse {
  data: Array<{
    trend_name: string
    tweet_count?: number
  }>
}

/**
 * Fetch trending topics from Twitter/X API v2
 * @param woeid - Where-On-Earth ID (1 = Worldwide, 23424977 = USA, etc.)
 * @returns Array of trending topic names
 */
export async function fetchTwitterTrends(woeid: number = 1): Promise<string[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN

  if (!bearerToken) {
    console.warn('[Twitter Trends] TWITTER_BEARER_TOKEN not set, skipping Twitter trends')
    return []
  }

  try {
    const url = `https://api.x.com/2/trends/by/woeid/${woeid}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Twitter Trends] API error (${response.status}):`, errorText)
      
      // Handle rate limiting
      if (response.status === 429) {
        console.warn('[Twitter Trends] Rate limited, will retry later')
      }
      
      return []
    }

    const data = await response.json() as TwitterTrendsResponse
    
    if (!data.data || !Array.isArray(data.data)) {
      console.warn('[Twitter Trends] Unexpected response format:', data)
      return []
    }

    // Extract trend names and filter out hashtags (we want clean keywords)
    const trends = data.data
      .map(trend => trend.trend_name)
      .filter(name => name && name.length > 0)
      // Remove # from hashtags for better matching
      .map(name => name.startsWith('#') ? name.slice(1) : name)
      // Filter out very short or generic terms
      .filter(name => name.length > 2 && !['trending', 'news', 'breaking'].includes(name.toLowerCase()))

    console.log(`[Twitter Trends] Fetched ${trends.length} trending topics`)
    return trends.slice(0, 20) // Limit to top 20

  } catch (error) {
    console.error('[Twitter Trends] Error fetching trends:', error)
    return []
  }
}

/**
 * Get WOEID for a location
 * Common WOEIDs:
 * - 1: Worldwide
 * - 23424977: United States
 * - 23424975: United Kingdom
 * - 23424748: Canada
 * - 23424775: Australia
 */
export function getWOEID(location: string = 'worldwide'): number {
  const woeids: Record<string, number> = {
    'worldwide': 1,
    'usa': 23424977,
    'us': 23424977,
    'united states': 23424977,
    'uk': 23424975,
    'united kingdom': 23424975,
    'canada': 23424748,
    'australia': 23424775,
  }

  return woeids[location.toLowerCase()] || 1
}

/**
 * Normalize trend name for matching (remove special chars, lowercase)
 */
export function normalizeTrendName(trend: string): string {
  return trend
    .toLowerCase()
    .replace(/[#@]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
}

/**
 * Check if a headline title/description matches any trending topics
 * @param text - Headline title or description
 * @param trends - Array of trending topic names
 * @returns Array of matching trend names
 */
export function findMatchingTrends(text: string, trends: string[]): string[] {
  const normalizedText = text.toLowerCase()
  const matches: string[] = []

  for (const trend of trends) {
    const normalizedTrend = normalizeTrendName(trend)
    
    // Check for exact word match or phrase match
    if (normalizedText.includes(normalizedTrend)) {
      matches.push(trend)
    } else {
      // Check for individual words in multi-word trends
      const trendWords = normalizedTrend.split(/\s+/).filter(w => w.length > 3)
      const matchingWords = trendWords.filter(word => normalizedText.includes(word))
      
      // If most words match, consider it a match
      if (trendWords.length > 0 && matchingWords.length >= Math.ceil(trendWords.length * 0.6)) {
        matches.push(trend)
      }
    }
  }

  return matches
}

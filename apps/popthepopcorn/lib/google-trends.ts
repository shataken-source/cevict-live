/**
 * Google Trends Fetcher
 * Fetches trending topics from Google Trends RSS feeds
 * 
 * Note: Google Trends RSS feeds are available via the Export feature on trends.google.com
 * The feed URLs may vary by location and are not officially documented as an API.
 */

import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [
      ['description', 'description'],
    ],
  },
})

interface GoogleTrend {
  name: string
  searchVolume?: number
  url?: string
}

/**
 * Get Google Trends RSS feed URL for a location
 * These URLs are based on common patterns but may need adjustment
 */
function getGoogleTrendsRSSUrl(location: string = 'US'): string {
  // Common country codes for Google Trends
  const countryCodes: Record<string, string> = {
    'worldwide': '',
    'usa': 'US',
    'us': 'US',
    'united states': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'canada': 'CA',
    'australia': 'AU',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'japan': 'JP',
    'india': 'IN',
    'brazil': 'BR',
  }

  const countryCode = countryCodes[location.toLowerCase()] || location.toUpperCase()
  
  // Try the new RSS feed pattern (may need adjustment based on actual URLs)
  // The actual URL can be obtained from Google Trends → Trending → Export → RSS Feed
  if (countryCode === '') {
    // Worldwide - try common pattern
    return 'https://trends.google.com/trends/trendingsearches/daily/rss?geo='
  }
  
  return `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${countryCode}`
}

/**
 * Fetch trending topics from Google Trends RSS feed
 * @param location - Location code (US, GB, CA, etc.) or 'worldwide'
 * @returns Array of trending topic names
 */
export async function fetchGoogleTrends(location: string = 'US'): Promise<string[]> {
  try {
    const rssUrl = getGoogleTrendsRSSUrl(location)
    
    console.log(`[Google Trends] Fetching trends for ${location} from: ${rssUrl}`)
    
    const feed = await parser.parseURL(rssUrl)

    if (!feed.items || feed.items.length === 0) {
      console.warn('[Google Trends] No items found in RSS feed')
      return []
    }

    // Extract trend names from RSS items
    const trends = feed.items
      .map(item => {
        // Google Trends RSS typically has the search query in the title
        let trendName = item.title || ''
        
        // Clean up the trend name
        // Sometimes titles include extra info like "Search term - Google Trends"
        trendName = trendName
          .replace(/\s*-\s*Google Trends.*$/i, '')
          .replace(/\s*-\s*Trending.*$/i, '')
          .trim()
        
        return trendName
      })
      .filter(name => name && name.length > 0)
      // Filter out very short or generic terms
      .filter(name => name.length > 2 && !['trending', 'news', 'breaking', 'google'].includes(name.toLowerCase()))

    console.log(`[Google Trends] Fetched ${trends.length} trending topics`)
    return trends.slice(0, 25) // Limit to top 25

  } catch (error: any) {
    // Handle different error types gracefully
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.warn(`[Google Trends] Network error (${error.code}). RSS feed may be unavailable or URL pattern incorrect.`)
    } else if (error.message && (error.message.includes('404') || error.message.includes('Not Found'))) {
      console.warn('[Google Trends] RSS feed URL not found. The URL pattern may have changed or location may not be supported.')
    } else if (error.message && error.message.includes('XML') || error.message.includes('parse')) {
      console.warn('[Google Trends] Failed to parse RSS feed. The feed format may have changed.')
    } else {
      console.warn('[Google Trends] Error fetching trends:', error.message || error)
    }
    
    return []
  }
}

/**
 * Alternative method: Try multiple common RSS feed URL patterns
 * This is a fallback if the primary method fails
 */
export async function fetchGoogleTrendsWithFallback(location: string = 'US'): Promise<string[]> {
  // Try primary method first
  let trends = await fetchGoogleTrends(location)
  
  if (trends.length > 0) {
    return trends
  }

  // If primary fails, try alternative URL patterns
  const alternativePatterns = [
    `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${location}`,
    `https://trends.google.com/trends/hottrends/atom/feed?geo=${location}`,
  ]

  for (const url of alternativePatterns) {
    try {
      console.log(`[Google Trends] Trying alternative URL: ${url}`)
      const feed = await parser.parseURL(url)
      
      if (feed.items && feed.items.length > 0) {
        trends = feed.items
          .map(item => item.title || '')
          .filter(name => name && name.length > 2)
          .slice(0, 25)
        
        if (trends.length > 0) {
          console.log(`[Google Trends] Successfully fetched ${trends.length} trends from alternative URL`)
          return trends
        }
      }
    } catch (error) {
      // Continue to next pattern
      continue
    }
  }

  return []
}

/**
 * Get location code for Google Trends
 */
export function getGoogleTrendsLocation(location: string = 'US'): string {
  const locationMap: Record<string, string> = {
    'worldwide': '',
    'usa': 'US',
    'us': 'US',
    'united states': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'canada': 'CA',
    'australia': 'AU',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'japan': 'JP',
    'india': 'IN',
    'brazil': 'BR',
  }

  return locationMap[location.toLowerCase()] || location.toUpperCase()
}

/**
 * Combine Google Trends with existing trend matching utilities
 * Re-export the matching functions from twitter-trends for consistency
 */
export { normalizeTrendName, findMatchingTrends } from './twitter-trends'

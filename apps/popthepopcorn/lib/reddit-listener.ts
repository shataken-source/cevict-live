/**
 * Reddit API Integration for Social Listening
 * Monitors Reddit for breaking news and viral content (Gen Z's preferred source)
 */

interface RedditPost {
  title: string
  url: string
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
  selftext?: string
  permalink: string
  author: string
  is_self: boolean
}

interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost
    }>
  }
}

/**
 * Fetch hot posts from a subreddit
 */
export async function fetchRedditHot(subreddit: string, limit: number = 25): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PopThePopcorn/1.0 (Breaking News Aggregator)',
      },
    })

    if (!response.ok) {
      console.error(`[Reddit] Error fetching r/${subreddit}: ${response.status}`)
      return []
    }

    const data = await response.json() as RedditResponse
    
    return data.data.children.map(child => child.data)
  } catch (error) {
    console.error(`[Reddit] Error fetching r/${subreddit}:`, error)
    return []
  }
}

/**
 * Monitor multiple subreddits for breaking news
 * Gen Z-focused subreddits: r/news, r/worldnews, r/entertainment, r/technology, r/videos, r/PublicFreakout
 */
export async function monitorRedditForBreakingNews(
  subreddits: string[] = ['news', 'worldnews', 'entertainment', 'technology', 'videos', 'PublicFreakout', 'UpliftingNews', 'nottheonion']
): Promise<Array<RedditPost & { source_type: 'reddit' | 'reddit_viral' }>> {
  const allPosts: Array<RedditPost & { source_type: 'reddit' | 'reddit_viral' }> = []

  for (const subreddit of subreddits) {
    try {
      const posts = await fetchRedditHot(subreddit, 10)
      
      // Filter for high-engagement posts (viral indicators)
      const viralPosts = posts
        .filter(post => {
          // High score (upvotes) or high comment count indicates engagement
          const engagement = post.score + (post.num_comments * 2)
          return engagement > 100 // Threshold for "viral"
        })
        .map(post => ({
          ...post,
          source_type: (post.score > 1000 || post.num_comments > 100) ? 'reddit_viral' as const : 'reddit' as const,
        }))

      allPosts.push(...viralPosts)
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.warn(`[Reddit] Error monitoring r/${subreddit}:`, error)
    }
  }

  return allPosts
}

/**
 * Convert Reddit post to headline format
 */
export function redditPostToHeadline(post: RedditPost & { source_type: 'reddit' | 'reddit_viral' }): {
  title: string
  url: string
  source: string
  category: string
  description?: string
  source_verification: 'unverified' | 'user_report' | 'viral'
} {
  // Determine category from subreddit
  const categoryMap: Record<string, string> = {
    'news': 'politics',
    'worldnews': 'politics',
    'entertainment': 'entertainment',
    'technology': 'tech',
    'videos': 'viral',
    'PublicFreakout': 'viral',
    'UpliftingNews': 'social',
    'nottheonion': 'viral',
  }

  const category = categoryMap[post.subreddit.toLowerCase()] || 'other'
  
  // Build URL (Reddit permalink or external link)
  const url = post.is_self 
    ? `https://www.reddit.com${post.permalink}`
    : post.url

  return {
    title: post.title,
    url,
    source: `r/${post.subreddit}`,
    category,
    description: post.selftext?.substring(0, 500) || undefined,
    source_verification: post.source_type === 'reddit_viral' ? 'viral' : 'user_report',
  }
}

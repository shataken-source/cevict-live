/**
 * Receipts Engine
 * Tracks source trace timeline: Where did this story start and how did it spread?
 */

interface SourceTrace {
  platform: string
  timestamp: string
  engagement: number
  url?: string
  verified: boolean
}

interface ReceiptsData {
  timeline: SourceTrace[]
  original_source?: string
  first_seen: string
  spread_velocity: number // Stories per hour
  verification_path: Array<{
    step: string
    timestamp: string
    status: 'unverified' | 'trending' | 'verified' | 'debunked'
  }>
}

/**
 * Build source trace timeline for a headline
 * Shows: Reddit -> X -> TikTok -> Mainstream
 */
export async function buildSourceTrace(headline: {
  title: string
  source: string
  posted_at: string
  url: string
}): Promise<ReceiptsData> {
  const timeline: SourceTrace[] = []

  // Determine platform from source
  const sourceLower = headline.source.toLowerCase()
  let platform = 'unknown'
  let verified = false

  if (sourceLower.includes('reddit') || sourceLower.startsWith('r/')) {
    platform = 'Reddit'
  } else if (sourceLower.includes('twitter') || sourceLower.includes('x.com') || sourceLower.includes('x/')) {
    platform = 'X (Twitter)'
  } else if (sourceLower.includes('tiktok')) {
    platform = 'TikTok'
  } else if (sourceLower.includes('discord')) {
    platform = 'Discord'
  } else if (sourceLower.includes('telegram')) {
    platform = 'Telegram'
  } else {
    platform = 'Mainstream Media'
    verified = true
  }

  // Add initial source
  timeline.push({
    platform,
    timestamp: headline.posted_at,
    engagement: 0,
    url: headline.url,
    verified,
  })

  // Calculate spread velocity (simplified - would need historical data for real calculation)
  const spread_velocity = timeline.length // Would be calculated from actual spread data

  return {
    timeline,
    original_source: headline.source,
    first_seen: headline.posted_at,
    spread_velocity,
    verification_path: [
      {
        step: `Posted on ${platform}`,
        timestamp: headline.posted_at,
        status: verified ? 'verified' : 'unverified',
      },
    ],
  }
}

/**
 * Enhance source trace with cross-platform data
 * (Would integrate with APIs to find when story appeared on other platforms)
 */
export async function enhanceSourceTrace(
  headline: { title: string; url: string },
  existingTrace: ReceiptsData
): Promise<ReceiptsData> {
  // This would ideally:
  // 1. Search Reddit for similar titles
  // 2. Search X/Twitter for trending topics matching the headline
  // 3. Check TikTok for viral videos
  // 4. Check when mainstream media picked it up

  // For now, return enhanced trace with placeholder data
  const enhancedTimeline = [...existingTrace.timeline]

  // Simulate finding it on other platforms (in real implementation, this would use APIs)
  // This is a placeholder - real implementation would use Reddit API, Twitter API, etc.

  return {
    ...existingTrace,
    timeline: enhancedTimeline,
  }
}

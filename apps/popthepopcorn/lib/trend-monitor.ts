import { supabase } from './supabase'
import { calculateDramaScore } from './drama-score'
import { fetchTwitterTrends, getWOEID, findMatchingTrends } from './twitter-trends'
import { fetchGoogleTrends, getGoogleTrendsLocation } from './google-trends'

/**
 * Fetch and store trending topics from both Twitter and Google Trends
 */
async function fetchAndStoreTrends() {
  const allTrends: string[] = []
  
  // Fetch Twitter trends
  try {
    const woeid = getWOEID(process.env.TWITTER_TRENDS_LOCATION || 'worldwide')
    const twitterTrends = await fetchTwitterTrends(woeid)
    
    if (twitterTrends.length > 0) {
      console.log(`✓ Fetched ${twitterTrends.length} Twitter trends`)
      allTrends.push(...twitterTrends.map(t => `twitter:${t}`))
    } else {
      console.log('No Twitter trends fetched (API may not be configured)')
    }
  } catch (error) {
    console.warn('Error fetching Twitter trends:', error)
  }

  // Fetch Google Trends
  try {
    const location = process.env.GOOGLE_TRENDS_LOCATION || process.env.TWITTER_TRENDS_LOCATION || 'US'
    const googleTrends = await fetchGoogleTrends(location)
    
    if (googleTrends.length > 0) {
      console.log(`✓ Fetched ${googleTrends.length} Google Trends`)
      allTrends.push(...googleTrends.map(t => `google:${t}`))
    } else {
      console.log('No Google Trends fetched (RSS feed may be unavailable)')
    }
  } catch (error) {
    console.warn('Error fetching Google Trends:', error)
  }

  if (allTrends.length === 0) {
    console.log('No trends fetched from any source')
    return []
  }

  // Track which trends come from which source
  const twitterTrendNames = allTrends
    .filter(t => t.startsWith('twitter:'))
    .map(t => t.replace('twitter:', ''))
  const googleTrendNames = allTrends
    .filter(t => t.startsWith('google:'))
    .map(t => t.replace('google:', ''))
  
  // Find trends that appear in both sources
  const bothTrends = twitterTrendNames.filter(t => googleTrendNames.includes(t))
  const twitterOnly = twitterTrendNames.filter(t => !googleTrendNames.includes(t))
  const googleOnly = googleTrendNames.filter(t => !twitterTrendNames.includes(t))

  // Delete expired trends
  await supabase
    .from('trending_topics')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Insert new trends with source tracking
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1) // Trends expire after 1 hour

  const trendsToInsert = [
    ...bothTrends.map(topic => ({
      topic_name: topic,
      source: 'both' as const,
      expires_at: expiresAt.toISOString(),
    })),
    ...twitterOnly.map(topic => ({
      topic_name: topic,
      source: 'twitter' as const,
      expires_at: expiresAt.toISOString(),
    })),
    ...googleOnly.map(topic => ({
      topic_name: topic,
      source: 'google' as const,
      expires_at: expiresAt.toISOString(),
    })),
  ]

  const { error: insertError } = await supabase
    .from('trending_topics')
    .upsert(trendsToInsert, { onConflict: 'topic_name' })

  if (insertError) {
    console.error('Error storing trends:', insertError)
    return uniqueTrends
  }

  console.log(`✓ Stored ${uniqueTrends.length} unique trending topics (from ${allTrends.length} total)`)
  return uniqueTrends
}

/**
 * Get current trending topics from database
 */
async function getCurrentTrends(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('trending_topics')
      .select('topic_name')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching trends from DB:', error)
      return []
    }

    return (data || []).map(t => t.topic_name)
  } catch (error) {
    console.error('Error getting current trends:', error)
    return []
  }
}

/**
 * Monitor trends and update drama scores based on engagement and Twitter trends
 */
async function monitorTrends() {
  console.log('Monitoring trends...')

  try {
    // Fetch and store latest Twitter trends
    const twitterTrends = await fetchAndStoreTrends()
    
    // Get current trends from database (fallback if Twitter API fails)
    const currentTrends = twitterTrends.length > 0 ? twitterTrends : await getCurrentTrends()

    // Get recent headlines (last 24 hours)
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: headlines, error } = await supabase
      .from('headlines')
      .select('*')
      .gte('posted_at', yesterday.toISOString())
      .order('upvotes', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching headlines:', error)
      return
    }

    if (!headlines || headlines.length === 0) {
      console.log('No recent headlines to monitor')
      return
    }

    // Recalculate drama scores based on current engagement and trending topics
    for (const headline of headlines) {
      // Find matching trends for this headline
      const matchingTrends = currentTrends.length > 0
        ? findMatchingTrends(`${headline.title} ${headline.description || ''}`, currentTrends)
        : []

      const newDramaScore = calculateDramaScore({
        title: headline.title,
        description: headline.description || '',
        source: headline.source,
        upvotes: headline.upvotes,
        downvotes: headline.downvotes,
        posted_at: headline.posted_at,
        trendingTopics: matchingTrends,
      })

      // Only update if score changed significantly
      if (Math.abs(newDramaScore - headline.drama_score) >= 1) {
        await supabase
          .from('headlines')
          .update({ drama_score: newDramaScore })
          .eq('id', headline.id)

        const trendInfo = matchingTrends.length > 0 ? ` (matches ${matchingTrends.length} trend${matchingTrends.length > 1 ? 's' : ''})` : ''
        console.log(`Updated drama score for "${headline.title.substring(0, 50)}..." from ${headline.drama_score} to ${newDramaScore}${trendInfo}`)
      }
    }

    // Record overall drama score
    const topHeadlines = headlines.slice(0, 10)
    const overallDrama = Math.round(
      topHeadlines.reduce((sum, h) => sum + h.drama_score, 0) / topHeadlines.length
    )

    await supabase
      .from('drama_history')
      .insert({
        overall_drama_score: overallDrama,
        top_headline_id: topHeadlines[0]?.id || null,
      })

    console.log(`Overall drama score: ${overallDrama}/10`)
    console.log('✓ Trend monitoring complete')
  } catch (error) {
    console.error('Error in trend monitoring:', error)
  }
}

// Run if called directly
if (require.main === module) {
  monitorTrends()
    .then(() => {
      console.log('Trend monitor finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Trend monitor failed:', error)
      process.exit(1)
    })
}

export { monitorTrends }

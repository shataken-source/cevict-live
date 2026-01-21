import { supabase } from './supabase'
import { calculateDramaScore } from './drama-score'
import { fetchTwitterTrends, getWOEID, findMatchingTrends } from './twitter-trends'

/**
 * Fetch and store Twitter trending topics
 */
async function fetchAndStoreTrends() {
  try {
    const woeid = getWOEID(process.env.TWITTER_TRENDS_LOCATION || 'worldwide')
    const trends = await fetchTwitterTrends(woeid)

    if (trends.length === 0) {
      console.log('No Twitter trends fetched (API may not be configured)')
      return []
    }

    // Delete expired trends
    await supabase
      .from('trending_topics')
      .delete()
      .lt('expires_at', new Date().toISOString())

    // Insert new trends
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Trends expire after 1 hour

    const trendsToInsert = trends.map(topic => ({
      topic_name: topic,
      woeid,
      expires_at: expiresAt.toISOString(),
    }))

    const { error: insertError } = await supabase
      .from('trending_topics')
      .upsert(trendsToInsert, { onConflict: 'topic_name,woeid' })

    if (insertError) {
      console.error('Error storing trends:', insertError)
      return trends
    }

    console.log(`✓ Stored ${trends.length} trending topics`)
    return trends
  } catch (error) {
    console.error('Error fetching/storing trends:', error)
    return []
  }
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

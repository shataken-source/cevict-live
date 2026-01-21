import { supabase } from './supabase'
import { calculateDramaScore } from './drama-score'

/**
 * Monitor trends and update drama scores based on engagement
 */
async function monitorTrends() {
  console.log('Monitoring trends...')

  try {
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

    // Recalculate drama scores based on current engagement
    for (const headline of headlines) {
      const newDramaScore = calculateDramaScore({
        title: headline.title,
        description: headline.description || '',
        source: headline.source,
        upvotes: headline.upvotes,
        downvotes: headline.downvotes,
        posted_at: headline.posted_at,
      })

      // Only update if score changed significantly
      if (Math.abs(newDramaScore - headline.drama_score) >= 1) {
        await supabase
          .from('headlines')
          .update({ drama_score: newDramaScore })
          .eq('id', headline.id)

        console.log(`Updated drama score for "${headline.title.substring(0, 50)}..." from ${headline.drama_score} to ${newDramaScore}`)
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

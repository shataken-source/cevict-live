import Parser from 'rss-parser'
import { supabase } from './supabase'
import { calculateDramaScore } from './drama-score'
import { getCurrentTrends, findMatchingTrends } from './twitter-trends'
import { getSetting } from './settings'
import { generateVideoScript, formatScriptForPlatform } from './video-script-generator'
import { sendDiscordNotification } from './discord-webhook'
import { monitorRedditForBreakingNews, redditPostToHeadline } from './reddit-listener'

// Create parser instance
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
    ],
  },
})

interface NewsSource {
  name: string
  url: string
  category: 'politics' | 'tech' | 'entertainment' | 'business' | 'sports' | 'other'
}

const newsSources: NewsSource[] = [
  // Gen Z Focus: Entertainment & Lifestyle (Top Priority)
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml', category: 'entertainment' },
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'Deadline', url: 'https://deadline.com/feed/', category: 'entertainment' },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', category: 'entertainment' },
  { name: 'People', url: 'https://people.com/feed/', category: 'entertainment' },
  
  // Social Issues (Gen Z cares deeply about)
  { name: 'Vox', url: 'https://www.vox.com/rss/index.xml', category: 'social' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'social' },
  
  // Tech (Gen Z is tech-native)
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  
  // Viral/Entertainment
  { name: 'BuzzFeed News', url: 'https://www.buzzfeed.com/news.xml', category: 'viral' },
  
  // Politics (Secondary for Gen Z, but still important)
  { name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss', category: 'politics' },
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml', category: 'politics' },
  { name: 'Axios', url: 'https://api.axios.com/feed/', category: 'politics' },
  
  // Sports
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
]

async function scrapeSource(source: NewsSource, trendingTopics: string[] = [], retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying ${source.name} (attempt ${attempt + 1}/${retries + 1})...`)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)) // Exponential backoff
      } else {
        console.log(`Scraping ${source.name}...`)
      }

      const feed = await parser.parseURL(source.url)

      if (!feed.items || feed.items.length === 0) {
        console.log(`No items found for ${source.name}`)
        return
      }

      let addedCount = 0
      const itemsPerSource = parseInt(await getSetting('SCRAPER_ITEMS_PER_SOURCE', '20') || '20', 10)
      for (const item of feed.items.slice(0, itemsPerSource)) {
        if (!item.title || !item.link) continue

        // Check if headline already exists
        const { data: existing } = await supabase
          .from('headlines')
          .select('id')
          .eq('url', item.link)
          .single()

        if (existing) {
          continue // Skip duplicates
        }

        // Find matching trends for this headline
        const matchingTrends = trendingTopics.length > 0
          ? findMatchingTrends(`${item.title} ${item.contentSnippet || item.content || ''}`, trendingTopics)
          : []

        // Calculate drama score (with trending topics boost)
        const dramaScore = calculateDramaScore({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          source: source.name,
          upvotes: 0,
          downvotes: 0,
          posted_at: item.pubDate || new Date().toISOString(),
          trendingTopics: matchingTrends,
        })

        // Determine if breaking (drama score >= 8 or title contains "breaking")
        const isBreaking = dramaScore >= 8 || 
                          item.title.toLowerCase().includes('breaking') ||
                          item.title.toLowerCase().includes('urgent')

        // Generate video script for Gen Z platforms
        const videoScript = generateVideoScript({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          source: source.name,
          drama_score: dramaScore,
          category: source.category,
          url: item.link,
        })
        const tiktokScript = formatScriptForPlatform(videoScript, 'tiktok')

        // Run Verification Agent
        const verification = await verifyHeadline({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          source: source.name,
          url: item.link,
          category: source.category,
        })

        // Analyze sentiment (Vibe-O-Meter)
        const sentiment = analyzeSentiment({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          category: source.category,
        })

        // Build source trace (Receipts)
        const sourceTrace = await buildSourceTrace({
          title: item.title,
          source: source.name,
          posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          url: item.link,
        })

        // Insert into database with verification and sentiment data
        const { error, data: insertedHeadline } = await supabase
          .from('headlines')
          .insert({
            title: item.title,
            url: item.link,
            source: source.name,
            category: source.category,
            drama_score: dramaScore,
            upvotes: 0,
            downvotes: 0,
            posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            is_breaking: isBreaking,
            description: item.contentSnippet || item.content?.substring(0, 500) || null,
            source_verification: verification.verification_status,
            video_script: tiktokScript,
            verification_status: verification.verification_status,
            verification_confidence: verification.confidence,
            verification_risk: verification.risk,
            verification_summary: verification.summary,
            evidence_links: verification.evidence_links,
            red_flags: verification.red_flags,
            bias_label: verification.bias_label,
            sentiment: sentiment.sentiment,
            vibe_score: sentiment.score,
            provenance: verification.provenance,
            source_trace: sourceTrace,
          })
          .select()
          .single()

        // Add to Story Arc (The "Lore" System) if high drama
        if (insertedHeadline && dramaScore >= 7) {
          try {
            await findOrCreateStoryArc({
              id: insertedHeadline.id,
              title: item.title,
              description: item.contentSnippet || item.content?.substring(0, 500) || '',
              category: source.category,
              drama_score: dramaScore,
            })
          } catch (arcError) {
            console.warn('[Scraper] Error adding to story arc:', arcError)
            // Don't fail the scrape if arc tracking fails
          }
        }

        if (error) {
          console.error(`Error inserting headline from ${source.name}:`, error)
        } else {
          addedCount++
          
          // Add to Story Arc (The "Lore" System) if high drama
          if (insertedHeadline && dramaScore >= 7) {
            try {
              await findOrCreateStoryArc({
                id: insertedHeadline.id,
                title: item.title,
                description: item.contentSnippet || item.content?.substring(0, 500) || '',
                category: source.category,
                drama_score: dramaScore,
              })
            } catch (arcError) {
              console.warn('[Scraper] Error adding to story arc:', arcError)
              // Don't fail the scrape if arc tracking fails
            }
          }
          console.log(`✓ Added: ${item.title.substring(0, 60)}... (Drama: ${dramaScore}/10)`)
          
          // Send to Discord if high drama (Gen Z distribution)
          if (dramaScore >= 7 && insertedHeadline) {
            await sendDiscordNotification({
              title: insertedHeadline.title,
              url: insertedHeadline.url,
              source: insertedHeadline.source,
              drama_score: insertedHeadline.drama_score,
              category: insertedHeadline.category,
              description: insertedHeadline.description,
              is_breaking: insertedHeadline.is_breaking,
            })
          }
        }
      }
      
      console.log(`✓ Successfully scraped ${source.name}: ${addedCount} new items added (${feed.items.length} total found)`)
      return // Success, exit retry loop
    } catch (error: any) {
      if (attempt === retries) {
        // Last attempt failed
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          console.error(`✗ Failed to scrape ${source.name}: Network/DNS error (${error.code}). Check your internet connection or the feed URL.`)
        } else if (error.message && error.message.includes('Unexpected close tag') || error.message && error.message.includes('XML')) {
          console.error(`✗ Failed to scrape ${source.name}: XML parsing error. The RSS feed may be malformed or incompatible.`)
        } else if (error.statusCode) {
          console.error(`✗ Error scraping ${source.name}: Status code ${error.statusCode}`)
        } else {
          console.error(`✗ Error scraping ${source.name}:`, error.message || error)
        }
      }
      // Continue to retry if not last attempt
    }
  }
}

/**
 * Get current trending topics (cached from database)
 */
async function getTrendingTopics(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('trending_topics')
      .select('topic_name')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(20)

    if (error || !data) {
      return []
    }

    return data.map(t => t.topic_name)
  } catch (error) {
    return []
  }
}

async function scrapeAll() {
  console.log('Starting news scrape...')
  console.log(`Scraping ${newsSources.length} sources...\n`)

  // Get current trending topics to boost matching headlines
  const trendingTopics = await getTrendingTopics()
  if (trendingTopics.length > 0) {
    console.log(`Using ${trendingTopics.length} trending topics for drama score boost\n`)
  }

  // Also scrape Reddit for Gen Z-preferred social listening
  console.log('Monitoring Reddit for breaking news...\n')
  try {
    const redditPosts = await monitorRedditForBreakingNews()
    console.log(`Found ${redditPosts.length} high-engagement Reddit posts\n`)
    
    // Process Reddit posts as headlines
    for (const post of redditPosts.slice(0, 20)) { // Limit to top 20
      const headlineData = redditPostToHeadline(post)
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('headlines')
        .select('id')
        .eq('url', headlineData.url)
        .single()

      if (existing) continue

      // Calculate drama score
      const matchingTrends = trendingTopics.length > 0
        ? findMatchingTrends(`${headlineData.title} ${headlineData.description || ''}`, trendingTopics)
        : []

      const dramaScore = calculateDramaScore({
        title: headlineData.title,
        description: headlineData.description || '',
        source: headlineData.source,
        upvotes: 0,
        downvotes: 0,
        posted_at: new Date(post.created_utc * 1000).toISOString(),
        trendingTopics: matchingTrends,
      })

      // Run Verification Agent
      const verification = await verifyHeadline({
        title: headlineData.title,
        description: headlineData.description || '',
        source: headlineData.source,
        url: headlineData.url,
        category: headlineData.category,
      })

      // Analyze sentiment
      const sentiment = analyzeSentiment({
        title: headlineData.title,
        description: headlineData.description || '',
        category: headlineData.category,
      })

      // Build source trace
      const sourceTrace = await buildSourceTrace({
        title: headlineData.title,
        source: headlineData.source,
        posted_at: new Date(post.created_utc * 1000).toISOString(),
        url: headlineData.url,
      })

      // Generate video script
      const videoScript = generateVideoScript({
        ...headlineData,
        drama_score: dramaScore,
        url: headlineData.url,
      })
      const tiktokScript = formatScriptForPlatform(videoScript, 'tiktok')

      // Insert Reddit post as headline with full verification data
      const { data: insertedHeadline } = await supabase
        .from('headlines')
        .insert({
          title: headlineData.title,
          url: headlineData.url,
          source: headlineData.source,
          category: headlineData.category,
          drama_score: dramaScore,
          upvotes: post.score,
          downvotes: 0,
          posted_at: new Date(post.created_utc * 1000).toISOString(),
          is_breaking: dramaScore >= 8,
          description: headlineData.description,
          source_verification: headlineData.source_verification,
          video_script: tiktokScript,
          verification_status: verification.verification_status,
          verification_confidence: verification.confidence,
          verification_risk: verification.risk,
          verification_summary: verification.summary,
          evidence_links: verification.evidence_links,
          red_flags: verification.red_flags,
          bias_label: verification.bias_label,
          sentiment: sentiment.sentiment,
          vibe_score: sentiment.score,
          provenance: verification.provenance,
          source_trace: sourceTrace,
        })
        .select()
        .single()

      if (insertedHeadline && dramaScore >= 7) {
        await sendDiscordNotification({
          title: insertedHeadline.title,
          url: insertedHeadline.url,
          source: insertedHeadline.source,
          drama_score: insertedHeadline.drama_score,
          category: insertedHeadline.category,
          description: insertedHeadline.description,
          is_breaking: insertedHeadline.is_breaking,
        })
      }
    }
  } catch (error) {
    console.warn('Error scraping Reddit:', error)
  }

  let successCount = 0
  let failCount = 0

  for (const source of newsSources) {
    try {
      await scrapeSource(source, trendingTopics)
      successCount++
    } catch (error) {
      failCount++
    }
    // Small delay between sources to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\n✓ Scraping complete!`)
  console.log(`  Successful: ${successCount}/${newsSources.length}`)
  if (failCount > 0) {
    console.log(`  Failed: ${failCount}/${newsSources.length}`)
    console.log(`  Note: Some feeds may be temporarily unavailable or require network access.`)
  }
}

// Run if called directly
if (require.main === module) {
  scrapeAll()
    .then(() => {
      console.log('Scraper finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Scraper failed:', error)
      process.exit(1)
    })
}

export { scrapeAll, scrapeSource }

import Parser from 'rss-parser'
import { supabase } from './supabase'
import { calculateDramaScore } from './drama-score'
import { getCurrentTrends, findMatchingTrends } from './twitter-trends'
import { getSetting } from './settings'

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
  // Politics - Mainstream
  { name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss', category: 'politics' },
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml', category: 'politics' },
  { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', category: 'politics' },
  { name: 'The Hill', url: 'https://thehill.com/rss/syndicator/19110', category: 'politics' },
  { name: 'Axios', url: 'https://api.axios.com/feed/', category: 'politics' },
  
  // Politics - Alternative/Independent (Left-leaning)
  { name: 'Truthout', url: 'https://truthout.org/feed/?withoutcomments=1', category: 'politics' },
  { name: 'Raw Story', url: 'https://www.rawstory.com/feeds/feed.rss', category: 'politics' },
  { name: 'Common Dreams', url: 'https://www.commondreams.org/rss.xml', category: 'politics' },
  { name: 'The Intercept', url: 'https://theintercept.com/feed', category: 'politics' },
  { name: 'Democracy Now', url: 'http://www.democracynow.org/democracynow.rss', category: 'politics' },
  
  // Politics - Alternative/Independent (Right-leaning)
  { name: 'Breitbart', url: 'http://feeds.feedburner.com/Breitbart', category: 'politics' },
  { name: 'The Daily Wire', url: 'https://www.dailywire.com/feeds/rss.xml', category: 'politics' },
  { name: 'The Federalist', url: 'https://thefederalist.com/feed/', category: 'politics' },
  
  // Tech & Business
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'tech' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'business' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'business' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', category: 'business' },
  // Note: Forbes, Politico, Reuters RSSHub, People, Entertainment Weekly may have access restrictions
  
  // Entertainment
  { name: 'TMZ', url: 'https://www.tmz.com/rss.xml', category: 'entertainment' },
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'Deadline', url: 'https://deadline.com/feed/', category: 'entertainment' },
  { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', category: 'entertainment' },
  { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', category: 'entertainment' },
  
  // Sports
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
  { name: 'BBC Sport', url: 'http://feeds.bbci.co.uk/sport/rss.xml', category: 'sports' },
]

async function scrapeSource(source: NewsSource, retries = 2) {
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

        // Insert into database
        const { error } = await supabase
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
          })

        if (error) {
          console.error(`Error inserting headline from ${source.name}:`, error)
        } else {
          addedCount++
          console.log(`✓ Added: ${item.title.substring(0, 60)}... (Drama: ${dramaScore}/10)`)
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

  let successCount = 0
  let failCount = 0

  for (const source of newsSources) {
    try {
      await scrapeSource(source)
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

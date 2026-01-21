/**
 * Story Arc Tracker (The "Lore" System)
 * Groups related headlines into ongoing "seasons" with "episodes"
 * Gen Z loves lore - this turns news into Netflix-like experiences
 */

import { supabase } from './supabase'

interface StoryArc {
  id: string
  title: string
  description?: string
  category: string
  season_number: number
  status: 'ongoing' | 'concluded' | 'archived'
  total_episodes: number
  total_drama_score: number
  cover_image_url?: string
  created_at: string
  updated_at: string
  last_episode_at?: string
}

interface Episode {
  id: string
  arc_id: string
  headline_id: string
  episode_number: number
  title?: string
  summary?: string
  drama_score: number
  posted_at: string
}

/**
 * Find or create a story arc for a headline
 * Uses AI to detect if headline is part of an ongoing story
 */
export async function findOrCreateStoryArc(headline: {
  title: string
  description?: string
  category: string
  drama_score: number
  id: string
}): Promise<StoryArc | null> {
  // Check if headline matches existing arc
  const existingArc = await findMatchingArc(headline)
  
  if (existingArc) {
    // Add headline as new episode
    await addEpisodeToArc(existingArc.id, headline)
    return existingArc
  }

  // Check if this headline is significant enough to start a new arc
  // Only create arcs for high-drama stories (7+)
  if (headline.drama_score < 7) {
    return null
  }

  // Create new arc
  const newArc = await createStoryArc(headline)
  
  // Add first episode
  if (newArc) {
    await addEpisodeToArc(newArc.id, headline, 1)
  }

  return newArc
}

/**
 * Find matching story arc for a headline
 * Uses keyword matching and category to find related arcs
 */
async function findMatchingArc(headline: {
  title: string
  description?: string
  category: string
}): Promise<StoryArc | null> {
  // Extract key terms from headline
  const keyTerms = extractKeyTerms(headline.title, headline.description || '')
  
  // Search for arcs in same category with similar keywords
  const { data: arcs, error } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('category', headline.category)
    .eq('status', 'ongoing')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error || !arcs) {
    return null
  }

  // Find arc with highest keyword match
  let bestMatch: StoryArc | null = null
  let bestScore = 0

  for (const arc of arcs) {
    const arcTerms = extractKeyTerms(arc.title, arc.description || '')
    const score = calculateMatchScore(keyTerms, arcTerms)
    
    if (score > bestScore && score > 0.3) { // 30% threshold
      bestScore = score
      bestMatch = arc as StoryArc
    }
  }

  return bestMatch
}

/**
 * Extract key terms from text (simple keyword extraction)
 */
function extractKeyTerms(title: string, description: string): Set<string> {
  const text = `${title} ${description}`.toLowerCase()
  
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ])

  // Extract words (3+ characters)
  const words = text.match(/\b[a-z]{3,}\b/g) || []
  const terms = new Set(words.filter(word => !stopWords.has(word)))

  return terms
}

/**
 * Calculate match score between two sets of terms
 */
function calculateMatchScore(terms1: Set<string>, terms2: Set<string>): number {
  if (terms1.size === 0 || terms2.size === 0) return 0

  const intersection = new Set([...terms1].filter(x => terms2.has(x)))
  const union = new Set([...terms1, ...terms2])

  // Jaccard similarity
  return intersection.size / union.size
}

/**
 * Create a new story arc
 */
async function createStoryArc(headline: {
  title: string
  description?: string
  category: string
}): Promise<StoryArc | null> {
  // Generate arc title (extract main subject from headline)
  const arcTitle = generateArcTitle(headline.title)
  const arcDescription = headline.description?.substring(0, 300) || headline.title

  const { data: arc, error } = await supabase
    .from('story_arcs')
    .insert({
      title: arcTitle,
      description: arcDescription,
      category: headline.category,
      season_number: 1,
      status: 'ongoing',
      total_episodes: 0,
      total_drama_score: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[Story Arc] Error creating arc:', error)
    return null
  }

  return arc as StoryArc
}

/**
 * Generate arc title from headline
 * Extracts the main subject/topic
 */
function generateArcTitle(headline: string): string {
  // Simple extraction: take first 50 chars and clean up
  let title = headline.substring(0, 50)
  
  // Remove common prefixes
  title = title.replace(/^(breaking|exclusive|update|new|latest):\s*/i, '')
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)
  
  // Remove trailing punctuation
  title = title.replace(/[.,;:!?]+$/, '')
  
  return title
}

/**
 * Add headline as episode to an arc
 */
async function addEpisodeToArc(
  arcId: string,
  headline: {
    id: string
    title: string
    description?: string
    drama_score: number
    posted_at?: string
  },
  episodeNumber?: number
): Promise<Episode | null> {
  // Get next episode number if not provided
  let epNumber = episodeNumber
  if (!epNumber) {
    const { data: episodes } = await supabase
      .from('story_arc_episodes')
      .select('episode_number')
      .eq('arc_id', arcId)
      .order('episode_number', { ascending: false })
      .limit(1)
      .single()

    epNumber = episodes ? (episodes.episode_number + 1) : 1
  }

  const { data: episode, error } = await supabase
    .from('story_arc_episodes')
    .insert({
      arc_id: arcId,
      headline_id: headline.id,
      episode_number: epNumber,
      title: headline.title,
      summary: headline.description?.substring(0, 200),
      drama_score: headline.drama_score,
      posted_at: headline.posted_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    // If duplicate, that's okay (headline already in arc)
    if (error.code !== '23505') {
      console.error('[Story Arc] Error adding episode:', error)
    }
    return null
  }

  return episode as Episode
}

/**
 * Get all episodes for a story arc
 */
export async function getArcEpisodes(arcId: string): Promise<Episode[]> {
  const { data: episodes, error } = await supabase
    .from('story_arc_episodes')
    .select(`
      *,
      headline:headlines(*)
    `)
    .eq('arc_id', arcId)
    .order('episode_number', { ascending: true })

  if (error) {
    console.error('[Story Arc] Error fetching episodes:', error)
    return []
  }

  return (episodes || []) as Episode[]
}

/**
 * Get active story arcs (ongoing)
 */
export async function getActiveStoryArcs(limit: number = 10): Promise<StoryArc[]> {
  const { data: arcs, error } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('status', 'ongoing')
    .order('last_episode_at', { ascending: false })
    .order('total_drama_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Story Arc] Error fetching active arcs:', error)
    return []
  }

  return (arcs || []) as StoryArc[]
}

/**
 * Subscribe user to a story arc
 */
export async function subscribeToArc(arcId: string, userIdentifier: string): Promise<boolean> {
  const { error } = await supabase
    .from('story_arc_subscriptions')
    .insert({
      arc_id: arcId,
      user_identifier: userIdentifier,
      notification_preference: 'all',
    })

  return !error
}

/**
 * Unsubscribe user from a story arc
 */
export async function unsubscribeFromArc(arcId: string, userIdentifier: string): Promise<boolean> {
  const { error } = await supabase
    .from('story_arc_subscriptions')
    .delete()
    .eq('arc_id', arcId)
    .eq('user_identifier', userIdentifier)

  return !error
}

/**
 * Video Script Generator for TikTok/YouTube Shorts/Reels
 * Gen Z prefers video content - this generates scripts for vertical video
 */

interface VideoScript {
  hook: string // First 3 seconds (critical for retention)
  body: string // Main content (20-30 seconds)
  cta: string // Call to action
  hashtags: string[]
  tone: 'casual' | 'urgent' | 'informative' | 'dramatic'
}

/**
 * Generate a vertical video script from a headline
 * Format optimized for TikTok/YouTube Shorts/Instagram Reels
 */
export function generateVideoScript(headline: {
  title: string
  description?: string
  source: string
  drama_score: number
  category: string
  url: string
}): VideoScript {
  const { title, description, source, drama_score, category, url } = headline

  // Gen Z tone: Casual, direct, emoji-friendly
  const isBreaking = drama_score >= 8
  const isHighDrama = drama_score >= 7

  // Hook (first 3 seconds - most important)
  const hooks = [
    isBreaking ? `🚨 BREAKING: ${title}` : `Y'all need to see this 👀`,
    isHighDrama ? `This is WILD 😱` : `Okay so this just happened...`,
    `POV: You're about to find out ${title.substring(0, 30)}...`,
    `Wait, WHAT? ${title.substring(0, 40)}`,
  ]
  const hook = hooks[Math.floor(Math.random() * hooks.length)]

  // Body (20-30 seconds of content)
  const bodyParts: string[] = []
  
  // Main story
  if (description) {
    bodyParts.push(description.substring(0, 150))
  } else {
    bodyParts.push(title)
  }

  // Add context
  bodyParts.push(`Source: ${source}`)
  
  if (drama_score >= 9) {
    bodyParts.push(`This is a 10/10 on the drama scale 🔥`)
  } else if (drama_score >= 7) {
    bodyParts.push(`Drama level: ${drama_score}/10 💀`)
  }

  const body = bodyParts.join('. ')

  // Call to action
  const ctas = [
    `Full story in my bio 👆`,
    `Link in comments for the tea ☕`,
    `Check the link for receipts 📎`,
    `Read more: [shortened URL]`,
  ]
  const cta = ctas[Math.floor(Math.random() * ctas.length)]

  // Hashtags (Gen Z uses fewer, more targeted hashtags)
  const categoryHashtags: Record<string, string[]> = {
    'politics': ['#politics', '#news', '#breaking'],
    'tech': ['#tech', '#technology', '#technews'],
    'entertainment': ['#entertainment', '#celebrity', '#popculture'],
    'viral': ['#viral', '#fyp', '#foryou'],
    'social': ['#socialjustice', '#activism', '#news'],
  }

  const baseHashtags = categoryHashtags[category] || ['#news', '#breaking']
  const hashtags = [
    ...baseHashtags,
    '#popthepopcorn',
    drama_score >= 8 ? '#breakingnews' : '#news',
    '#genz',
  ]

  // Determine tone
  let tone: VideoScript['tone'] = 'casual'
  if (isBreaking) tone = 'urgent'
  else if (drama_score >= 7) tone = 'dramatic'
  else if (category === 'tech' || category === 'business') tone = 'informative'

  return {
    hook,
    body,
    cta,
    hashtags,
    tone,
  }
}

/**
 * Format script for TikTok/YouTube Shorts
 */
export function formatScriptForPlatform(script: VideoScript, platform: 'tiktok' | 'youtube' | 'instagram'): string {
  const { hook, body, cta, hashtags } = script

  let formatted = ''

  switch (platform) {
    case 'tiktok':
      // TikTok: Hook first, then body, then CTA, hashtags at end
      formatted = `${hook}\n\n${body}\n\n${cta}\n\n${hashtags.join(' ')}`
      break
    case 'youtube':
      // YouTube Shorts: Similar but can be longer
      formatted = `${hook}\n\n${body}\n\n${cta}\n\n${hashtags.slice(0, 5).join(' ')}`
      break
    case 'instagram':
      // Instagram: Can include line breaks and emojis
      formatted = `${hook}\n\n${body}\n\n${cta}\n\n${hashtags.join(' ')}`
      break
  }

  return formatted
}

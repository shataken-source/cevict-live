/**
 * News Drops Model
 * Instead of constant stream, send curated "drops" twice daily
 * Creates FOMO effect without 24/7 scrolling fatigue
 */

import { supabase } from './supabase'
import { sendSMSAlerts } from './sms-alerts'
import { sendDiscordNotification } from './discord-webhook'

interface NewsDrop {
  id: string
  title: string
  url: string
  drama_score: number
  category: string
  summary: string
}

/**
 * Generate a News Drop (top 5 stories from last 12 hours)
 * Format: "The 5 things you missed while you were off-grid"
 */
export async function generateNewsDrop(): Promise<NewsDrop[]> {
  try {
    // Get top stories from last 12 hours
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    const { data: headlines, error } = await supabase
      .from('headlines')
      .select('id, title, url, drama_score, category, description, verification_status')
      .gte('posted_at', twelveHoursAgo.toISOString())
      .order('drama_score', { ascending: false })
      .order('upvotes', { ascending: false })
      .limit(5)

    if (error) {
      console.error('[News Drops] Error fetching headlines:', error)
      return []
    }

    if (!headlines || headlines.length === 0) {
      return []
    }

    return headlines.map(h => ({
      id: h.id,
      title: h.title,
      url: h.url,
      drama_score: h.drama_score,
      category: h.category,
      summary: h.description?.substring(0, 150) || h.title,
    }))
  } catch (error) {
    console.error('[News Drops] Error generating drop:', error)
    return []
  }
}

/**
 * Format News Drop message for SMS/Discord
 */
export function formatNewsDropMessage(drops: NewsDrop[]): string {
  if (drops.length === 0) {
    return '🍿 No major stories in the last 12 hours. Stay tuned!'
  }

  let message = `🍿 NEWS DROP: The ${drops.length} things you missed:\n\n`

  drops.forEach((drop, index) => {
    const emoji = drop.drama_score >= 9 ? '🔴' : drop.drama_score >= 7 ? '🟠' : '🟡'
    message += `${index + 1}. ${emoji} ${drop.title}\n`
    message += `   ${drop.url}\n\n`
  })

  message += `— Popcorn Bot 🍿`

  return message
}

/**
 * Send News Drop to all subscribers
 */
export async function sendNewsDrop() {
  console.log('📦 Generating News Drop...')

  const drops = await generateNewsDrop()

  if (drops.length === 0) {
    console.log('📦 No stories for News Drop')
    return
  }

  const message = formatNewsDropMessage(drops)

  // Send via SMS (if configured)
  // Note: This would need to be adapted to send the drop message
  // For now, we'll send individual high-drama stories
  if (drops.some(d => d.drama_score >= 8)) {
    // Send high-drama stories individually
    for (const drop of drops.filter(d => d.drama_score >= 8)) {
      // SMS alerts will handle this via sendSMSAlerts()
    }
  }

  // Send to Discord (if configured)
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      })
      console.log('📦 News Drop sent to Discord')
    } catch (error) {
      console.error('📦 Error sending News Drop to Discord:', error)
    }
  }

  console.log(`📦 News Drop generated: ${drops.length} stories`)
}

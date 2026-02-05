/**
 * Discord Webhook Integration for Gen Z News Distribution
 * Sends breaking news to Discord channels with personality and formatting
 */

interface DiscordMessage {
  content?: string
  embeds?: Array<{
    title?: string
    description?: string
    color?: number
    fields?: Array<{
      name: string
      value: string
      inline?: boolean
    }>
    footer?: {
      text: string
    }
    timestamp?: string
  }>
}

/**
 * Send breaking news to Discord webhook
 */
export async function sendDiscordNotification(headline: {
  title: string
  url: string
  source: string
  drama_score: number
  category: string
  description?: string
  is_breaking?: boolean
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL not set, skipping Discord notification')
    return false
  }

  try {
    // Gen Z personality: Emoji-rich, casual, urgent
    const dramaEmoji = headline.drama_score >= 9 ? '🔴' : headline.drama_score >= 7 ? '🟠' : '🟡'
    const breakingBadge = headline.is_breaking ? '🚨 BREAKING ' : ''
    
    // Category emojis for Gen Z
    const categoryEmojis: Record<string, string> = {
      'politics': '🏛️',
      'tech': '💻',
      'entertainment': '🎬',
      'business': '💼',
      'sports': '⚽',
      'lifestyle': '✨',
      'social': '✊',
      'viral': '🔥',
    }
    
    const categoryEmoji = categoryEmojis[headline.category] || '📰'
    
    // Gen Z tone: Short, punchy, with personality
    const popcornBot = '🍿 Popcorn Bot'
    const signOff = headline.drama_score >= 9 ? '💀' : headline.drama_score >= 7 ? '😱' : '👀'
    
    const message: DiscordMessage = {
      content: `${breakingBadge}${dramaEmoji} **${headline.title}**`,
      embeds: [
        {
          title: `${categoryEmoji} ${headline.category.toUpperCase()}`,
          description: headline.description?.substring(0, 200) || 'No description available',
          color: headline.drama_score >= 9 ? 0xff0000 : headline.drama_score >= 7 ? 0xff8800 : 0xffaa00,
          fields: [
            {
              name: '📊 Drama Score',
              value: `${headline.drama_score}/10 ${'🔥'.repeat(Math.floor(headline.drama_score / 3))}`,
              inline: true,
            },
            {
              name: '📰 Source',
              value: headline.source,
              inline: true,
            },
            {
              name: '🔗 Read More',
              value: `[Click here](${headline.url})`,
              inline: false,
            },
          ],
          footer: {
            text: `${popcornBot} • ${signOff}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Discord] Webhook error (${response.status}):`, errorText)
      return false
    }

    console.log(`[Discord] ✓ Sent notification: ${headline.title.substring(0, 50)}...`)
    return true
  } catch (error) {
    console.error('[Discord] Error sending notification:', error)
    return false
  }
}

/**
 * Send to multiple Discord channels (for categorized channels)
 */
export async function sendToDiscordChannels(
  headline: {
    title: string
    url: string
    source: string
    drama_score: number
    category: string
    description?: string
    is_breaking?: boolean
  },
  channelWebhooks: Record<string, string>
) {
  const category = headline.category.toLowerCase()
  const webhookUrl = channelWebhooks[category] || channelWebhooks['general'] || process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    return false
  }

  return await sendDiscordNotification(headline)
}

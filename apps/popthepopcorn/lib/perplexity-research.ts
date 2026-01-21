/**
 * Perplexity API Integration
 * Fast, comprehensive research for breaking news verification
 */

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * Research a topic using Perplexity API
 * Faster and more summarized than traditional search
 */
export async function researchWithPerplexity(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    console.warn('[Perplexity] API key not set')
    return ''
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online', // Online model for real-time data
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide concise, factual summaries with source citations. Focus on what, why, and primary sources.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Perplexity] API error: ${errorText}`)
      return ''
    }

    const data = await response.json() as PerplexityResponse
    return data.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('[Perplexity] Error:', error)
    return ''
  }
}

/**
 * Get context for a breaking news story
 * Returns: What happened, why it matters, and primary sources
 */
export async function getStoryContext(headline: {
  title: string
  description?: string
  source: string
}): Promise<{
  what: string
  why: string
  sources: string[]
}> {
  const query = `Explain this news story in Gen Z terms: "${headline.title}". ${headline.description || ''} What happened? Why does it matter? List primary sources.`
  
  const research = await researchWithPerplexity(query)
  
  // Extract sources (URLs) from research
  const urlRegex = /https?:\/\/[^\s]+/g
  const sources = research.match(urlRegex) || []

  // Simple extraction of "what" and "why"
  const whatMatch = research.match(/What[^?]*\?[^]*?Why/m)
  const what = whatMatch ? research.substring(0, research.indexOf('Why')).trim() : research.substring(0, 200)
  const why = research.includes('Why') ? research.substring(research.indexOf('Why')).trim() : 'Context not available'

  return {
    what: what.substring(0, 300),
    why: why.substring(0, 300),
    sources: sources.slice(0, 5), // Top 5 sources
  }
}

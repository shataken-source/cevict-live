/**
 * Verification Agent (V-Agent)
 * Multi-layered verification system for Gen Z news consumption
 * Uses Perplexity API and cross-referencing for fact-checking
 */

interface VerificationResult {
  summary: string
  verification_status: 'verified' | 'unverified' | 'ai_generated' | 'satire' | 'misleading'
  confidence: number // 0-100%
  risk: 'high' | 'medium' | 'low'
  evidence_links: string[]
  red_flags: string[]
  bias_label?: 'mainstream' | 'alternative' | 'neutral'
  sentiment: 'hype' | 'panic' | 'satire' | 'neutral' | 'concern'
  provenance: {
    original_source?: string
    first_seen?: string
    spread_path?: Array<{ platform: string; timestamp: string; engagement: number }>
  }
}

/**
 * Verify a headline using multi-source cross-referencing
 */
export async function verifyHeadline(headline: {
  title: string
  description?: string
  source: string
  url: string
  category: string
}): Promise<VerificationResult> {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY

  if (!perplexityApiKey) {
    console.warn('[V-Agent] PERPLEXITY_API_KEY not set, using basic verification')
    return basicVerification(headline)
  }

  try {
    // Use Perplexity API for fast, comprehensive research
    const query = `Verify this news story: "${headline.title}". ${headline.description || ''} Source: ${headline.source}. Find primary sources, check if verified by mainstream media, identify any red flags or inconsistencies.`
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a digital forensics journalist and fact-checker. Analyze news stories for verification status. Return JSON with: summary (1 sentence Gen Z-friendly), verification_status (verified/unverified/ai_generated/satire/misleading), confidence (0-100), risk (high/medium/low), evidence_links (array of URLs), red_flags (array of issues), bias_label (mainstream/alternative/neutral), sentiment (hype/panic/satire/neutral/concern).`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      console.error(`[V-Agent] Perplexity API error: ${response.status}`)
      return basicVerification(headline)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return basicVerification(headline)
    }

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          ...parsed,
          evidence_links: parsed.evidence_links || [],
          red_flags: parsed.red_flags || [],
          provenance: parsed.provenance || {},
        } as VerificationResult
      }
    } catch (parseError) {
      console.warn('[V-Agent] Failed to parse JSON from Perplexity response')
    }

    // Fallback: extract info from text response
    return extractVerificationFromText(content, headline)
  } catch (error) {
    console.error('[V-Agent] Error in verification:', error)
    return basicVerification(headline)
  }
}

/**
 * Basic verification when Perplexity API is not available
 */
function basicVerification(headline: {
  title: string
  source: string
  category: string
}): VerificationResult {
  // Heuristic-based verification
  const mainstreamSources = ['cnn', 'bbc', 'reuters', 'ap', 'npr', 'the guardian']
  const alternativeSources = ['reddit', 'twitter', 'x.com', 'tiktok', 'discord']
  const isMainstream = mainstreamSources.some(s => headline.source.toLowerCase().includes(s))
  const isAlternative = alternativeSources.some(s => headline.source.toLowerCase().includes(s))

  let verification_status: VerificationResult['verification_status'] = 'unverified'
  let confidence = 50
  let risk: 'high' | 'medium' | 'low' = 'medium'

  if (isMainstream) {
    verification_status = 'verified'
    confidence = 80
    risk = 'low'
  } else if (isAlternative) {
    verification_status = 'unverified'
    confidence = 40
    risk = 'medium'
  }

  // Check for common red flags
  const redFlags: string[] = []
  const titleLower = headline.title.toLowerCase()
  
  if (titleLower.includes('breaking') && !isMainstream) {
    redFlags.push('Breaking news from non-mainstream source')
  }
  if (titleLower.includes('exclusive') && isAlternative) {
    redFlags.push('Exclusive claim from alternative source')
  }

  return {
    summary: `Source: ${headline.source}. ${isMainstream ? 'Mainstream media outlet' : 'Alternative source'}.`,
    verification_status,
    confidence,
    risk,
    evidence_links: [headline.source],
    red_flags: redFlags,
    bias_label: isMainstream ? 'mainstream' : isAlternative ? 'alternative' : 'neutral',
    sentiment: 'neutral',
    provenance: {
      original_source: headline.source,
    },
  }
}

/**
 * Extract verification info from text response
 */
function extractVerificationFromText(text: string, headline: any): VerificationResult {
  const lowerText = text.toLowerCase()
  
  let verification_status: VerificationResult['verification_status'] = 'unverified'
  if (lowerText.includes('verified') || lowerText.includes('confirmed')) {
    verification_status = 'verified'
  } else if (lowerText.includes('fake') || lowerText.includes('hoax') || lowerText.includes('deepfake')) {
    verification_status = 'ai_generated'
  } else if (lowerText.includes('satire') || lowerText.includes('parody')) {
    verification_status = 'satire'
  } else if (lowerText.includes('misleading') || lowerText.includes('false')) {
    verification_status = 'misleading'
  }

  let sentiment: VerificationResult['sentiment'] = 'neutral'
  if (lowerText.includes('hype') || lowerText.includes('viral')) sentiment = 'hype'
  else if (lowerText.includes('panic') || lowerText.includes('alarming')) sentiment = 'panic'
  else if (lowerText.includes('satire') || lowerText.includes('joke')) sentiment = 'satire'
  else if (lowerText.includes('concern') || lowerText.includes('worried')) sentiment = 'concern'

  const confidence = lowerText.includes('high confidence') ? 80 : 
                    lowerText.includes('low confidence') ? 30 : 50

  const risk = lowerText.includes('high risk') ? 'high' :
               lowerText.includes('low risk') ? 'low' : 'medium'

  // Extract URLs from text
  const urlRegex = /https?:\/\/[^\s]+/g
  const evidence_links = text.match(urlRegex) || []

  return {
    summary: text.substring(0, 200),
    verification_status,
    confidence,
    risk,
    evidence_links,
    red_flags: [],
    sentiment,
    provenance: {
      original_source: headline.source,
    },
  }
}

/**
 * Trace source provenance (where did this story start?)
 */
export async function traceProvenance(headline: {
  title: string
  url: string
  source: string
  posted_at: string
}): Promise<VerificationResult['provenance']> {
  // This would ideally use APIs to check:
  // - When was this first posted on Reddit?
  // - When did it trend on X/Twitter?
  // - When did mainstream media pick it up?
  
  // For now, return basic provenance
  return {
    original_source: headline.source,
    first_seen: headline.posted_at,
    spread_path: [
      {
        platform: headline.source,
        timestamp: headline.posted_at,
        engagement: 0,
      },
    ],
  }
}

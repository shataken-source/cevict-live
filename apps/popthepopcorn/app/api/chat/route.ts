import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { researchWithPerplexity } from '@/lib/perplexity-research'
import { verifyHeadline } from '@/lib/verification-agent'

/**
 * POST /api/chat
 * AI Chatbot "The Kernel" - Gen Z's resident expert
 * Users can ask: "Is this real?", "Why should I care?", etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, headlineId, context } = body

    if (!message) {
      return NextResponse.json({
        error: 'Missing message',
      }, { status: 400 })
    }

    // Get context from headline if provided
    let headlineContext = ''
    if (headlineId) {
      const { data: headline } = await supabase
        .from('headlines')
        .select('*')
        .eq('id', headlineId)
        .single()

      if (headline) {
        headlineContext = `Headline: "${headline.title}". Source: ${headline.source}. Verification: ${headline.verification_status || 'unverified'}. Drama Score: ${headline.drama_score}/10.`
      }
    }

    // Use Perplexity for research-backed answers
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY
    let response = ''

    if (perplexityApiKey) {
      const query = `${message}. ${headlineContext} ${context || ''} Provide a Gen Z-friendly answer (casual, direct, emoji-friendly).`
      response = await researchWithPerplexity(query)
    }

    // If Perplexity fails or isn't configured, provide basic response
    if (!response) {
      response = generateBasicResponse(message, headlineContext)
    }

    // Add "The Kernel" personality
    const kernelResponse = formatKernelResponse(response)

    return NextResponse.json({
      response: kernelResponse,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API] Error in chat route:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * Generate basic response when Perplexity isn't available
 */
function generateBasicResponse(message: string, context: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('real') || lowerMessage.includes('fake') || lowerMessage.includes('true')) {
    return `I'd need to cross-reference multiple sources to verify this. ${context ? 'Based on the source, ' : ''}I'd recommend checking the "Receipts" tab to see the source trace. Always verify breaking news from multiple independent sources! 🧐`
  }

  if (lowerMessage.includes('why') || lowerMessage.includes('care') || lowerMessage.includes('matter')) {
    return `This story matters because it's ${context ? 'trending and ' : ''}getting significant engagement. The drama score and sentiment analysis can help you gauge how the community is reacting. Check the Vibe-O-Meter! 📊`
  }

  if (lowerMessage.includes('trending') || lowerMessage.includes('viral')) {
    return `This is trending because it's hitting multiple platforms (Reddit, X, TikTok). The source trace shows how it spread. High engagement = high drama score! 🔥`
  }

  return `I'm The Kernel, your AI news expert! I can help you verify stories, understand why they matter, and trace their origins. Ask me anything about the headlines! 🍿`
}

/**
 * Format response with "The Kernel" personality
 */
function formatKernelResponse(response: string): string {
  // Add signature if not already present
  if (!response.includes('🍿') && !response.includes('Kernel')) {
    return `${response}\n\n— The Kernel 🍿`
  }
  return response
}

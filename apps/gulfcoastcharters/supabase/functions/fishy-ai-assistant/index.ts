/**
 * Fishy AI Assistant Edge Function
 * 
 * AI chatbot assistant for Gulf Coast Charters
 * - Context-aware responses (captain/customer)
 * - Conversation history support
 * - Web search capability (optional)
 * - FAQ knowledge base integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract intent from user message for learning
 */
function extractIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) return 'booking';
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) return 'pricing';
  if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) return 'cancellation';
  if (lowerMessage.includes('weather') || lowerMessage.includes('forecast')) return 'weather';
  if (lowerMessage.includes('availability') || lowerMessage.includes('available')) return 'availability';
  if (lowerMessage.includes('help') || lowerMessage.includes('how')) return 'help';
  if (lowerMessage.includes('contact') || lowerMessage.includes('support')) return 'support';
  
  return 'general';
}

/**
 * Analyze sentiment from message
 */
function analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
  const lowerMessage = message.toLowerCase();
  
  const positiveWords = ['great', 'good', 'excellent', 'amazing', 'love', 'thanks', 'thank you', 'perfect', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'worst', 'horrible'];
  
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Update learning patterns based on conversation
 */
async function updateLearningPatterns(
  supabase: any,
  userMessage: string,
  assistantResponse: string,
  intent: string,
  userType: string
): Promise<void> {
  // Check if pattern exists
  const { data: existing } = await supabase
    .from('fishy_learning_patterns')
    .select('*')
    .eq('intent', intent)
    .eq('user_type', userType)
    .eq('pattern_text', userMessage.toLowerCase().substring(0, 100))
    .single();
  
  if (existing) {
    // Update existing pattern
    await supabase
      .from('fishy_learning_patterns')
      .update({
        times_seen: existing.times_seen + 1,
        last_seen: new Date().toISOString(),
        response_quality: calculateResponseQuality(assistantResponse),
      })
      .eq('id', existing.id);
  } else {
    // Create new pattern
    await supabase
      .from('fishy_learning_patterns')
      .insert({
        intent: intent,
        user_type: userType,
        pattern_text: userMessage.toLowerCase().substring(0, 100),
        response_template: assistantResponse.substring(0, 200),
        times_seen: 1,
        response_quality: calculateResponseQuality(assistantResponse),
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
  }
}

/**
 * Calculate response quality score (simple heuristic)
 */
function calculateResponseQuality(response: string): number {
  let score = 50; // Base score
  
  // Longer responses are generally better (up to a point)
  if (response.length > 50) score += 10;
  if (response.length > 100) score += 10;
  if (response.length > 200) score += 5;
  
  // Check for helpful indicators
  if (response.includes('?')) score += 5; // Asking clarifying questions
  if (response.includes('can') || response.includes('will')) score += 5; // Action-oriented
  if (response.length < 20) score -= 20; // Too short
  
  return Math.min(100, Math.max(0, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userType = 'customer', context = {}, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI Gateway API key
    const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY');
    if (!gatewayApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt based on user type
    const systemPrompt = `You are Fishy, a helpful AI assistant for Gulf Coast Charters, a fishing charter booking platform.

User Type: ${userType === 'captain' ? 'Captain' : 'Customer'}
Current Page: ${context.page || 'Unknown'}

Your role:
${userType === 'captain' 
  ? '- Help captains manage bookings, earnings, and operations\n- Answer questions about captain dashboard features\n- Provide guidance on fleet management, availability, and pricing'
  : '- Help customers find and book fishing charters\n- Answer questions about bookings, pricing, and features\n- Provide information about vessels, captains, and locations'
}

Guidelines:
- Be friendly, helpful, and professional
- Use fishing/charter terminology naturally
- If you don't know something, say so honestly
- For complex issues, suggest contacting support
- Keep responses concise but informative
- Use emojis sparingly (🐟 🎣 ⚓)`;

    // Build messages array for API
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call AI Gateway (Claude/GPT)
    try {
      const gatewayResponse = await fetch('https://api.gateway.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!gatewayResponse.ok) {
        const errorData = await gatewayResponse.text();
        console.error('Gateway API error:', errorData);
        throw new Error('Failed to get AI response');
      }

      const gatewayData = await gatewayResponse.json();
      const aiMessage = gatewayData.choices?.[0]?.message?.content || 
                        gatewayData.content?.[0]?.text ||
                        'I apologize, but I encountered an error processing your request. Please try again.';

      // Log conversation for learning (async, don't block response)
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Extract intent and sentiment for learning
          const intent = extractIntent(message);
          const sentiment = analyzeSentiment(message);
          
          // Store conversation in learning table
          await supabase.from('fishy_conversations').insert({
            user_type: userType,
            user_message: message,
            assistant_response: aiMessage,
            intent: intent,
            sentiment: sentiment,
            context: context,
            conversation_length: conversationHistory.length + 1,
            created_at: new Date().toISOString(),
          }).catch(err => console.error('Failed to log conversation:', err));
          
          // Update learning patterns
          await updateLearningPatterns(supabase, message, aiMessage, intent, userType).catch(err => 
            console.error('Failed to update learning patterns:', err)
          );
        } catch (logError) {
          console.error('Error logging conversation:', logError);
          // Don't fail the request if logging fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: aiMessage,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (gatewayError) {
      console.error('Gateway error:', gatewayError);
      
      // Fallback response
      return new Response(
        JSON.stringify({
          success: true,
          message: `Hi! I'm Fishy, your AI assistant. I'm currently experiencing some technical difficulties, but I'm here to help with questions about Gulf Coast Charters. Please try again in a moment, or contact our support team for immediate assistance.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

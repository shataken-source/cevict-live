/**
 * AI Support Bot Edge Function
 *
 * Used by SmartChatbot.tsx. Contract:
 * - In: { question, sessionId, userId?, checkKnowledgeBase }
 * - Out: { answer, sentiment?, needsEscalation?, conversationId? }
 *
 * Flow: KB lookup (optional) → else Gateway AI → escalation check → log to chatbot_conversations.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ESCALATION_KEYWORDS = [
  'urgent', 'emergency', 'complaint', 'refund', 'cancel booking',
  'speak to manager', 'human', 'real person', 'agent', 'support ticket',
];

function needsEscalation(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
}

function simpleSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const lower = message.toLowerCase();
  const positive = ['thanks', 'thank you', 'great', 'good', 'helpful', 'perfect', 'awesome'];
  const negative = ['bad', 'terrible', 'wrong', 'frustrated', 'angry', 'disappointed', 'worst'];
  if (positive.some((w) => lower.includes(w))) return 'positive';
  if (negative.some((w) => lower.includes(w))) return 'negative';
  return 'neutral';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY');

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const { question, sessionId, userId, checkKnowledgeBase = true } = body;

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuestion = question.trim();
    const escalated = needsEscalation(trimmedQuestion);
    const sentiment = simpleSentiment(trimmedQuestion);

    let answer: string;
    let fromKb = false;

    if (checkKnowledgeBase) {
      const { data: kbRows } = await supabase
        .from('chatbot_knowledge_base')
        .select('id, question, answer, keywords, usage_count');

      const words = trimmedQuestion.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      let best = null as { answer: string; id: string; usage_count: number } | null;

      for (const row of kbRows ?? []) {
        const keywords = (row.keywords ?? []) as string[];
        const matchCount = keywords.filter((k) =>
          words.some((w) => k.toLowerCase().includes(w) || w.includes(k.toLowerCase()))
        ).length;
        if (matchCount > 0 && (!best || matchCount > 0)) {
          best = { answer: row.answer, id: row.id, usage_count: row.usage_count ?? 0 };
          break;
        }
        if (trimmedQuestion.toLowerCase().includes((row.question || '').toLowerCase().slice(0, 30))) {
          best = { answer: row.answer, id: row.id, usage_count: row.usage_count ?? 0 };
          break;
        }
      }

      if (best) {
        answer = best.answer;
        fromKb = true;
        await supabase
          .from('chatbot_knowledge_base')
          .update({ usage_count: best.usage_count + 1 })
          .eq('id', best.id)
          .then(() => {});
      }
    }

    if (!fromKb) {
      if (!gatewayApiKey) {
        answer =
          'Support bot is not fully configured. Please email support@gulfcoastcharters.com for help.';
      } else {
        const systemPrompt = `You are the Gulf Coast Charters support bot. Answer briefly and helpfully about bookings, certifications, referrals, and platform features. If the user seems upset or asks for a human, suggest they contact support@gulfcoastcharters.com.`;
        const res = await fetch('https://api.gateway.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${gatewayApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: trimmedQuestion },
            ],
            max_tokens: 512,
            temperature: 0.5,
          }),
        });
        if (!res.ok) {
          answer = 'Sorry, I had trouble answering. Please try again or contact support@gulfcoastcharters.com.';
        } else {
          const data = await res.json();
          answer =
            data.choices?.[0]?.message?.content?.trim() ||
            'I\'m not sure how to answer that. Please contact support@gulfcoastcharters.com for help.';
        }
      }
    }

    const { data: insertRow, error: insertErr } = await supabase
      .from('chatbot_conversations')
      .insert({
        user_id: userId || null,
        session_id: sessionId || `session_${Date.now()}`,
        message: trimmedQuestion,
        response: answer,
        sentiment,
        confidence_score: fromKb ? 0.95 : 0.7,
        was_helpful: null,
        escalated,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const conversationId = insertErr ? null : insertRow?.id;

    return new Response(
      JSON.stringify({
        answer,
        sentiment,
        needsEscalation: escalated,
        conversationId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, state } = body as { messages: ChatMessage[]; state?: string };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Get state laws for context if state provided
    let stateContext = '';
    if (state && SUPABASE_URL && SUPABASE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: laws } = await supabase
        .from('sr_law_cards')
        .select('title, summary, category')
        .eq('state', state.toUpperCase())
        .limit(5);

      if (laws && laws.length > 0) {
        stateContext = `\n\nRelevant laws for ${state.toUpperCase()}:\n` +
          laws.map(l => `- ${l.title}: ${l.summary}`).join('\n');
      }
    }

    const systemPrompt = `You are a helpful AI assistant for SmokersRights.com. You provide accurate information about tobacco, hemp, marijuana, vaping, and alternative product laws, but always remind users to verify with official sources.

Your knowledge areas:
- State and local smoking/vaping laws
- Tobacco, hemp, and marijuana regulations
- CBD, delta-8, delta-9, and THC product laws
- Edibles, gummies, and infused product regulations
- Age restrictions and compliance for all products
- Designated smoking/vaping areas
- Recent legislative changes affecting adult recreational products

Guidelines:
- Be factual and cite sources when possible
- Do not provide medical advice
- Always mention that laws change frequently
- For legal disputes, recommend consulting a lawyer
- Be neutral and objective${stateContext}`;

    let response: string;

    // Try OpenAI first
    if (OPENAI_API_KEY) {
      response = await callOpenAI(messages, systemPrompt);
    } else if (ANTHROPIC_API_KEY) {
      response = await callAnthropic(messages, systemPrompt);
    } else {
      // Fallback to demo response
      response = generateDemoResponse(messages[messages.length - 1].content, state);
    }

    // Log conversation to database (optional)
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        await supabase.from('sr_analytics').insert({
          event_type: 'ai_chat',
          event_data: { state, question: messages[messages.length - 1].content }
        });
      } catch {
        // Silent fail - don't break chat if logging fails
      }
    }

    return NextResponse.json({ message: response });

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({
      error: 'Failed to generate response',
      message: 'I apologize, but I cannot provide a response at this time. Please try again later or browse our state law guides.'
    }, { status: 500 });
  }
}

async function callOpenAI(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY} `,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${error} `);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic API error: ${error} `);
  }

  const data = await res.json();
  return data.content[0].text;
}

function generateDemoResponse(question: string, state?: string): string {
  const stateRef = state ? ` in ${state.toUpperCase()} ` : '';

  if (question.toLowerCase().includes('law') || question.toLowerCase().includes('legal')) {
    return `I can help you understand smoking and vaping laws${stateRef}.However, I'm currently running in demo mode without a connected AI service.\n\nFor accurate legal information, please:\n1. Browse our state law guides at /search\n2. Check the legislation tracker for recent changes\n3. Consult a local attorney for specific legal advice\n\nTo enable full AI responses, add OPENAI_API_KEY or ANTHROPIC_API_KEY to your environment variables.`;
  }

  if (question.toLowerCase().includes('product') || question.toLowerCase().includes('vape') || question.toLowerCase().includes('tobacco')) {
    return `I can provide general information about tobacco and vaping products${stateRef}. However, I'm currently in demo mode.\n\nFor product recommendations and reviews, please visit our affiliate marketplace or check user reviews on trusted sites.\n\nNote: Always verify age requirements (21+) and local regulations before purchasing.`;
  }

  return `I'm here to help with smoking rights information${stateRef}! I'm currently operating in demo mode.\n\nTo get full AI-powered responses, please configure an AI service:\n- Set OPENAI_API_KEY for GPT-4\n- Set ANTHROPIC_API_KEY for Claude\n\nIn the meantime, you can:\n• Browse our comprehensive state law guides\n• Track active legislation\n• Find smoking-friendly locations near you`;
}

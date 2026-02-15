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

    if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'AI service not configured',
        message: 'AI assistant is not available. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY.'
      }, { status: 503 });
    }

    // Try OpenAI first
    if (OPENAI_API_KEY) {
      response = await callOpenAI(messages, systemPrompt);
    } else {
      response = await callAnthropic(messages, systemPrompt);
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
  if (!ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');

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

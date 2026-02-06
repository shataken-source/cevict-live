import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build context about the monitoring system
    const systemContext = `You are an AI assistant helping to diagnose and fix issues with website monitoring systems.
You have access to monitoring data including:
- Website uptime status
- Bot status (running/waiting/broken)
- Visitor statistics
- Error messages and logs

Help the user diagnose problems and suggest fixes. Be concise and actionable.`;

    const fullMessage = context
      ? `${systemContext}\n\nContext: ${JSON.stringify(context, null, 2)}\n\nUser Question: ${message}`
      : `${systemContext}\n\nUser Question: ${message}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: fullMessage,
        },
      ],
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      response: aiResponse,
      model: 'claude-3-5-sonnet',
    });
  } catch (error: any) {
    console.error('Error with AI chat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI response' },
      { status: 500 }
    );
  }
}


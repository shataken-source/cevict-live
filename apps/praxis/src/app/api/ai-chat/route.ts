import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt, apiKey } = body;
    
    // User-provided key from Settings: OK without auth (user owns it)
    // Server env key: require auth to avoid abuse
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const anthropicKey = apiKey || serverKey;

    if (!anthropicKey) {
      return NextResponse.json({
        content: "AI analysis requires an Anthropic API key. Add your key in Settings to enable Claude-powered insights.",
      });
    }

    if (!apiKey && serverKey) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Sign in required to use AI insights' }, { status: 401 });
      }
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || 'No response generated';
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

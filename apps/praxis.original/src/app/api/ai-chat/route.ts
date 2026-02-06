import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt, apiKey } = body;
    
    // Use provided API key or fall back to env
    const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicKey) {
      // Return a fallback response without API
      return NextResponse.json({
        content: "AI analysis requires an Anthropic API key. Add your key in Settings to enable Claude-powered insights.",
      });
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

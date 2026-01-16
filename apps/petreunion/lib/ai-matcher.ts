const DEFAULT_MODEL = 'gpt-4o-mini';

export type MatchResult = {
  confidence: number;
  reasoning?: string;
};

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  return { apiKey, baseUrl, model };
}

/**
 * Compare two images (lost vs shelter) using GPT-4o-mini vision.
 * If OpenAI is not configured, returns a default low-confidence result.
 */
export async function comparePetImages(lostImageUrl: string, shelterImageUrl: string): Promise<MatchResult> {
  if (!lostImageUrl || !shelterImageUrl) {
    return { confidence: 0, reasoning: 'Missing images' };
  }

  try {
    const { apiKey, baseUrl, model } = getOpenAIConfig();
    if (!apiKey) return { confidence: 0, reasoning: 'Missing OPENAI_API_KEY' };

    const prompt = `Compare these two pet photos and estimate match probability (0-100). Return just a number and one-sentence reasoning.`;
    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: lostImageUrl } },
              { type: 'image_url', image_url: { url: shelterImageUrl } },
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${resp.status}${errText ? `: ${errText.slice(0, 300)}` : ''}`);
    }

    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content || '';
    const match = text.match(/(\d{1,3})/);
    const confidence = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 0;
    return { confidence, reasoning: text.trim() };
  } catch (err: any) {
    console.error('[AI-MATCHER] Vision compare failed:', err?.message || err);
    return { confidence: 0, reasoning: 'Vision compare unavailable' };
  }
}

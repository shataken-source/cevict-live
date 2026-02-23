/**
 * Local AI Integration
 * Uses Ollama for free local LLM inference
 * Install: https://ollama.ai
 * Run: ollama run llama3.2:3b
 */

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export class LocalAI {
  private baseUrl: string;
  private model: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    this.enabled = process.env.USE_LOCAL_AI === 'true';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async analyze(prompt: string): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500
          }
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) return null;

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.warn('[LOCAL AI] Request failed:', error);
      return null;
    }
  }

  /**
   * Analyze crypto market data and return trading signal
   */
  async analyzeCrypto(data: {
    symbol: string;
    price: number;
    momentum: { trend: string; strength: number };
    fearGreed: number;
    btcDominance: number;
    volume24h: number;
  }): Promise<{
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
  }> {
    const prompt = `You are a crypto trading analyst. Analyze this data and provide a trading signal.

Symbol: ${data.symbol}
Current Price: $${data.price}
Momentum: ${data.momentum.trend} (${data.momentum.strength.toFixed(1)}% strength)
Fear & Greed Index: ${data.fearGreed} (0=Extreme Fear, 100=Extreme Greed)
BTC Dominance: ${data.btcDominance}%
24h Volume: $${(data.volume24h / 1e9).toFixed(2)}B

Respond ONLY in this exact format:
SIGNAL: [BUY/SELL/HOLD]
CONFIDENCE: [0-100]
REASON: [brief explanation in 10 words or less]

Example:
SIGNAL: BUY
CONFIDENCE: 75
REASON: Strong upward momentum with extreme fear buying opportunity`;

    const response = await this.analyze(prompt);

    if (!response) {
      return { signal: 'HOLD', confidence: 50, reason: 'AI unavailable' };
    }

    // Parse response
    const signalMatch = response.match(/SIGNAL:\s*(BUY|SELL|HOLD)/i);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
    const reasonMatch = response.match(/REASON:\s*(.+)/i);

    const signal = (signalMatch?.[1]?.toUpperCase() as 'BUY' | 'SELL' | 'HOLD') || 'HOLD';
    const confidence = parseInt(confidenceMatch?.[1] || '50');
    const reason = reasonMatch?.[1]?.trim() || 'No clear signal';

    return { signal, confidence, reason };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getModel(): string {
    return this.model;
  }
}

export const localAI = new LocalAI();

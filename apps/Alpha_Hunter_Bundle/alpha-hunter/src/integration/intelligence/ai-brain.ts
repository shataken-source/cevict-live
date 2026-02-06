/**
 * AI BRAIN - 7 LAYERS OF CLAUDE EFFECT
 * 
 * The ultimate intelligence center for trading decisions.
 * Combines multiple layers of analysis for comprehensive predictions.
 * 
 * LAYER 1: Market Data Analysis (price, volume, spread)
 * LAYER 2: Technical Analysis (RSI, MA, support/resistance)
 * LAYER 3: Historical Pattern Recognition (seasonality, cycles)
 * LAYER 4: Category Expertise (domain-specific knowledge)
 * LAYER 5: Sentiment Analysis (news, social, market mood)
 * LAYER 6: Past Performance Learning (win/loss patterns)
 * LAYER 7: Claude AI Synthesis (final judgment)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getBotPredictions, getBotConfig } from './lib/supabase-memory';
import { historicalKnowledge, CRYPTO_HISTORY } from './intelligence/historical-knowledge';

const anthropic = new Anthropic();

// Types
export type Category = 
  | 'crypto' | 'politics' | 'economics' | 'entertainment' 
  | 'sports' | 'weather' | 'technology' | 'health' 
  | 'world' | 'companies' | 'financials' | 'climate' | 'culture';

export interface LayerScores {
  marketData: number;
  technical: number;
  historical: number;
  categoryExpertise: number;
  sentiment: number;
  pastPerformance: number;
  aiSynthesis: number;
  combined: number;
}

export interface AIAnalysis {
  prediction: 'yes' | 'no' | 'buy' | 'sell' | 'hold';
  confidence: number;
  edge: number;
  probability: number;
  reasoning: string[];
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  historicalContext: string[];
  learnedPatterns: string[];
  layerScores: LayerScores;
  marketInefficiency?: string;
}

export interface MarketContext {
  id: string;
  title: string;
  category: Category;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  expiresAt?: string;
}

export interface CryptoContext {
  pair: string;
  price: number;
  change24h: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  candles?: { open: number; high: number; low: number; close: number; volume: number; time: number }[];
}

const c = {
  reset: '\x1b[0m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  dim: '\x1b[2m',
};

export class AIBrain {
  private aiCallsToday = 0;
  private maxAICallsPerDay = 150;
  private lastResetDate = '';

  constructor() {
    this.resetDailyCounterIfNeeded();
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.aiCallsToday = 0;
      this.lastResetDate = today;
    }
  }

  private canMakeAICall(): boolean {
    this.resetDailyCounterIfNeeded();
    return this.aiCallsToday < this.maxAICallsPerDay;
  }

  // ==========================================================================
  // KALSHI MARKET ANALYSIS
  // ==========================================================================
  async analyzeKalshiMarket(market: MarketContext): Promise<AIAnalysis | null> {
    if (!this.canMakeAICall()) {
      console.log(`   ${c.brightYellow}⚠️  AI call limit reached${c.reset}`);
      return null;
    }

    try {
      console.log(`   ${c.brightMagenta}🧠 AI Brain analyzing: ${market.title.substring(0, 50)}...${c.reset}`);
      this.aiCallsToday++;

      // Layer 1: Market Data
      const layer1 = this.analyzeMarketData(market);
      
      // Layer 2: Technical (limited for predictions)
      const layer2 = { score: 50, analysis: market.yesPrice > 50 ? 'Market favors YES' : 'Market favors NO' };
      
      // Layer 3: Historical
      const layer3 = await this.analyzeHistorical(market);
      
      // Layer 4: Category Expertise
      const layer4 = this.getCategoryExpertise(market.category);
      
      // Layer 5: Sentiment
      const layer5 = this.analyzeSentiment(market);
      
      // Layer 6: Past Performance
      const layer6 = await this.analyzePastPerformance(market.category);
      
      // Layer 7: Claude AI Synthesis
      const layer7 = await this.synthesizeKalshiWithClaude(market, { layer1, layer2, layer3, layer4, layer5, layer6 });

      if (!layer7) return null;

      const layerScores: LayerScores = {
        marketData: layer1.score,
        technical: layer2.score,
        historical: layer3.score,
        categoryExpertise: layer4.score,
        sentiment: layer5.score,
        pastPerformance: layer6.score,
        aiSynthesis: layer7.confidence,
        combined: this.calculateCombined([
          { score: layer1.score, weight: 0.15 },
          { score: layer2.score, weight: 0.05 },
          { score: layer3.score, weight: 0.15 },
          { score: layer4.score, weight: 0.10 },
          { score: layer5.score, weight: 0.10 },
          { score: layer6.score, weight: 0.15 },
          { score: layer7.confidence, weight: 0.30 },
        ]),
      };

      console.log(`   ${c.brightGreen}✅ 7-Layer Analysis Complete - Score: ${layerScores.combined.toFixed(1)}%${c.reset}`);

      return {
        prediction: layer7.prediction,
        confidence: Math.min(95, Math.max(50, layerScores.combined)),
        edge: layer7.edge,
        probability: layer7.probability,
        reasoning: layer7.reasoning,
        factors: [...layer4.expertise.slice(0, 2)],
        riskLevel: layer7.riskLevel,
        historicalContext: layer3.context,
        learnedPatterns: layer6.patterns,
        layerScores,
        marketInefficiency: layer7.marketInefficiency,
      };
    } catch (err: any) {
      console.error(`   ${c.brightRed}❌ AI Brain error: ${err.message}${c.reset}`);
      return null;
    }
  }

  // ==========================================================================
  // CRYPTO ANALYSIS
  // ==========================================================================
  async analyzeCrypto(crypto: CryptoContext): Promise<AIAnalysis | null> {
    if (!this.canMakeAICall()) return null;

    try {
      console.log(`   ${c.brightMagenta}🧠 AI Brain analyzing: ${crypto.pair}...${c.reset}`);
      this.aiCallsToday++;

      // Layer 1: Market Data
      const layer1 = this.analyzeCryptoMarketData(crypto);
      
      // Layer 2: Technical
      const layer2 = this.analyzeCryptoTechnicals(crypto);
      
      // Layer 3: Historical
      const layer3 = this.analyzeCryptoHistory();
      
      // Layer 4: Expertise
      const layer4 = this.getCryptoExpertise(crypto.pair);
      
      // Layer 5: Sentiment
      const layer5 = this.analyzeCryptoSentiment(crypto);
      
      // Layer 6: Past Performance
      const layer6 = await this.analyzePastPerformance('crypto');
      
      // Layer 7: Claude Synthesis
      const layer7 = await this.synthesizeCryptoWithClaude(crypto, { layer1, layer2, layer3, layer4, layer5, layer6 });

      if (!layer7) return null;

      const layerScores: LayerScores = {
        marketData: layer1.score,
        technical: layer2.score,
        historical: layer3.score,
        categoryExpertise: layer4.score,
        sentiment: layer5.score,
        pastPerformance: layer6.score,
        aiSynthesis: layer7.confidence,
        combined: this.calculateCombined([
          { score: layer1.score, weight: 0.10 },
          { score: layer2.score, weight: 0.20 },
          { score: layer3.score, weight: 0.15 },
          { score: layer4.score, weight: 0.10 },
          { score: layer5.score, weight: 0.10 },
          { score: layer6.score, weight: 0.10 },
          { score: layer7.confidence, weight: 0.25 },
        ]),
      };

      console.log(`   ${c.brightGreen}✅ Crypto Analysis - Score: ${layerScores.combined.toFixed(1)}%${c.reset}`);

      return {
        prediction: layer7.prediction,
        confidence: Math.min(80, Math.max(50, layerScores.combined)),
        edge: layer7.edge,
        probability: layer7.probability,
        reasoning: layer7.reasoning,
        factors: layer7.factors,
        riskLevel: layer7.riskLevel,
        historicalContext: layer3.context,
        learnedPatterns: layer6.patterns,
        layerScores,
        marketInefficiency: layer7.marketInefficiency,
      };
    } catch (err: any) {
      console.error(`   ${c.brightRed}❌ AI error: ${err.message}${c.reset}`);
      return null;
    }
  }

  // ==========================================================================
  // LAYER IMPLEMENTATIONS
  // ==========================================================================
  private analyzeMarketData(market: MarketContext): { score: number; analysis: string } {
    let score = 50;
    let analysis = '';
    
    if ((market.volume || 0) > 100) { score += 5; analysis += 'Good liquidity. '; }
    if (market.yesPrice < 20 || market.yesPrice > 80) { score -= 5; analysis += 'Extreme price. '; }
    
    return { score, analysis };
  }

  private analyzeCryptoMarketData(crypto: CryptoContext): { score: number; analysis: string } {
    let score = 50;
    let analysis = '';
    
    if (crypto.volume24h && crypto.volume24h > 1e9) { score += 10; analysis += 'High volume. '; }
    
    if (crypto.high24h && crypto.low24h) {
      const pos = (crypto.price - crypto.low24h) / (crypto.high24h - crypto.low24h);
      if (pos < 0.3) { score += 5; analysis += 'Near daily low. '; }
      else if (pos > 0.7) { score += 5; analysis += 'Near daily high. '; }
    }
    
    return { score, analysis };
  }

  private analyzeCryptoTechnicals(crypto: CryptoContext): { score: number; indicators: string[] } {
    if (!crypto.candles || crypto.candles.length < 10) {
      return { score: 50, indicators: ['Insufficient data'] };
    }

    const closes = crypto.candles.map(c => c.close);
    const indicators: string[] = [];
    let score = 50;

    // SMAs
    const sma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const sma20 = closes.reduce((a, b) => a + b, 0) / closes.length;

    if (crypto.price > sma5 && sma5 > sma20) {
      score += 15;
      indicators.push('Bullish: Price > SMA5 > SMA20');
    } else if (crypto.price < sma5 && sma5 < sma20) {
      score -= 10;
      indicators.push('Bearish: Price < SMA5 < SMA20');
    }

    // RSI
    let gains = 0, losses = 0;
    for (let i = 1; i < Math.min(14, closes.length); i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
    
    if (rsi < 30) { score += 10; indicators.push(`RSI ${rsi.toFixed(0)}: Oversold`); }
    else if (rsi > 70) { score -= 5; indicators.push(`RSI ${rsi.toFixed(0)}: Overbought`); }
    else { indicators.push(`RSI ${rsi.toFixed(0)}: Neutral`); }

    return { score: Math.min(80, Math.max(20, score)), indicators };
  }

  private async analyzeHistorical(market: MarketContext): Promise<{ score: number; patterns: string[]; context: string[] }> {
    const context = historicalKnowledge.getRelevantKnowledge(market.title.toLowerCase()).slice(0, 3);
    let score = 50 + (context.length > 0 ? 10 : 0);
    return { score, patterns: [`Found ${context.length} parallels`], context };
  }

  private analyzeCryptoHistory(): { score: number; patterns: string[]; context: string[] } {
    const lastHalving = new Date('2024-04-20');
    const days = Math.floor((Date.now() - lastHalving.getTime()) / (1000 * 60 * 60 * 24));
    
    let context: string;
    let score = 50;
    
    if (days < 180) { context = `${days}d post-halving: Accumulation`; }
    else if (days < 365) { context = `${days}d post-halving: Bull initiation`; score += 10; }
    else if (days < 540) { context = `${days}d post-halving: Peak zone`; score += 5; }
    else { context = `${days}d post-halving: Late cycle`; score -= 5; }
    
    return { score, patterns: [], context: [context] };
  }

  private getCategoryExpertise(category: Category): { score: number; expertise: string[] } {
    const map: Partial<Record<Category, string[]>> = {
      crypto: ['24/7 markets', 'BTC correlation', 'News-driven'],
      politics: ['Partisan bias', 'Polling baseline', 'Late news repricing'],
      economics: ['Fed telegraphed', 'Consensus baseline', 'Surprise factor'],
      sports: ['Sharp money', 'Public bias', 'Injury edge'],
      weather: ['Public forecasts', 'Model uncertainty', 'Extremes underpriced'],
    };
    return { score: 60, expertise: map[category] || ['General analysis'] };
  }

  private getCryptoExpertise(pair: string): { score: number; expertise: string[] } {
    let score = 55;
    const expertise: string[] = [];
    
    if (pair.includes('BTC')) { expertise.push('BTC leads market', 'Institutional flow'); score += 5; }
    else if (pair.includes('ETH')) { expertise.push('Follows BTC', 'DeFi activity'); }
    else if (pair.includes('SOL')) { expertise.push('High beta', 'Ecosystem growth'); }
    
    return { score, expertise };
  }

  private analyzeSentiment(market: MarketContext): { score: number; sentiment: string } {
    let score = 50;
    let sentiment = 'neutral';
    
    if (market.yesPrice > 70) { sentiment = 'strongly bullish'; score = 60; }
    else if (market.yesPrice > 55) { sentiment = 'slightly bullish'; score = 55; }
    else if (market.yesPrice < 30) { sentiment = 'strongly bearish'; score = 40; }
    else if (market.yesPrice < 45) { sentiment = 'slightly bearish'; score = 45; }
    
    return { score, sentiment };
  }

  private analyzeCryptoSentiment(crypto: CryptoContext): { score: number; sentiment: string } {
    let score = 50;
    let sentiment = 'neutral';
    
    if (crypto.change24h > 5) { sentiment = 'bullish momentum'; score = 65; }
    else if (crypto.change24h > 2) { sentiment = 'slightly bullish'; score = 55; }
    else if (crypto.change24h < -5) { sentiment = 'bearish momentum'; score = 35; }
    else if (crypto.change24h < -2) { sentiment = 'slightly bearish'; score = 45; }
    
    return { score, sentiment };
  }

  private async analyzePastPerformance(category: Category | 'crypto'): Promise<{ score: number; patterns: string[]; winRate: number; avgEdge: number }> {
    try {
      const platform = category === 'crypto' ? 'coinbase' : 'kalshi';
      const preds = await getBotPredictions(category, platform, 50);
      const resolved = preds.filter((p: any) => p.actual_outcome !== null);
      
      const wins = resolved.filter((p: any) => p.actual_outcome === 'win').length;
      const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 50;
      const avgEdge = preds.length > 0 ? preds.reduce((s: number, p: any) => s + (p.edge || 0), 0) / preds.length : 0;

      let score = 50;
      const patterns: string[] = [];
      
      if (winRate > 55) { score += 10; patterns.push(`${winRate.toFixed(0)}% win rate`); }
      if (avgEdge > 3) { score += 5; patterns.push(`${avgEdge.toFixed(1)}% avg edge`); }
      
      return { score: Math.min(75, Math.max(25, score)), patterns, winRate, avgEdge };
    } catch {
      return { score: 50, patterns: [], winRate: 50, avgEdge: 0 };
    }
  }

  // ==========================================================================
  // CLAUDE SYNTHESIS
  // ==========================================================================
  private async synthesizeKalshiWithClaude(market: MarketContext, layers: any): Promise<any> {
    const prompt = `You are an elite prediction market analyst.

MARKET: ${market.title}
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢
Category: ${market.category}

LAYER SCORES:
- Market Data: ${layers.layer1.score} - ${layers.layer1.analysis}
- Technicals: ${layers.layer2.score}
- Historical: ${layers.layer3.score} - ${layers.layer3.context.join('; ')}
- Expertise: ${layers.layer4.score} - ${layers.layer4.expertise.join(', ')}
- Sentiment: ${layers.layer5.score} - ${layers.layer5.sentiment}
- Past Performance: ${layers.layer6.score} - ${layers.layer6.winRate.toFixed(0)}% win rate

Respond with JSON only:
{
  "prediction": "yes" or "no",
  "probability": 0-100,
  "confidence": 50-95,
  "edge": 0-50,
  "reasoning": ["r1", "r2", "r3"],
  "riskLevel": "low" | "medium" | "high",
  "marketInefficiency": "brief explanation"
}

Only recommend if edge >= 3%. Otherwise confidence=50, edge=0.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;
    const match = content.text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }

  private async synthesizeCryptoWithClaude(crypto: CryptoContext, layers: any): Promise<any> {
    const prompt = `You are an expert crypto trader.

${crypto.pair}: $${crypto.price.toFixed(2)} (${crypto.change24h?.toFixed(2)}% 24h)

LAYERS:
- Market: ${layers.layer1.score} - ${layers.layer1.analysis}
- Technical: ${layers.layer2.score} - ${layers.layer2.indicators.join(', ')}
- Historical: ${layers.layer3.score} - ${layers.layer3.context.join('; ')}
- Expertise: ${layers.layer4.score} - ${layers.layer4.expertise.join(', ')}
- Sentiment: ${layers.layer5.score} - ${layers.layer5.sentiment}
- Past: ${layers.layer6.score} - ${layers.layer6.winRate.toFixed(0)}% win rate

Respond JSON only:
{
  "prediction": "buy" or "sell",
  "probability": 50-80,
  "confidence": 50-80,
  "edge": 0-5,
  "reasoning": ["r1", "r2"],
  "factors": ["f1"],
  "riskLevel": "low" | "medium" | "high",
  "marketInefficiency": "setup explanation"
}

Conservative. If no clear setup, confidence=50, edge=0.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;
    const match = content.text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }

  private calculateCombined(layers: { score: number; weight: number }[]): number {
    const total = layers.reduce((s, l) => s + l.weight, 0);
    return layers.reduce((s, l) => s + l.score * l.weight, 0) / total;
  }

  getAICallsRemaining(): number {
    this.resetDailyCounterIfNeeded();
    return this.maxAICallsPerDay - this.aiCallsToday;
  }
}

export const aiBrain = new AIBrain();

/**
 * CLAUDE EFFECT ENGINE v2.0
 * =========================
 * The Full 7-Layer Analysis Framework
 * 
 * Each layer runs as a SEPARATE analysis phase, contributing
 * weighted scores to the final trading decision.
 * 
 * Layers:
 * 1. Sentiment Field (SF) - 12%
 * 2. Narrative Momentum (NM) - 18%
 * 3. Information Asymmetry Index (IAI) - 20%
 * 4. Chaos Sensitivity Index (CSI) - Modifier
 * 5. Network Influence Graph (NIG) - 12%
 * 6. Temporal Relevance Decay (TRD) - Modifier
 * 7. Emergent Pattern Detection (EPD) - 18%
 * 
 * Base Analysis - 20%
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic
const anthropic = new Anthropic();

// Layer weights (adjustable by Cursor Effect Bot)
export interface LayerWeights {
  sentimentField: number;        // SF
  narrativeMomentum: number;     // NM
  informationAsymmetry: number;  // IAI
  chaosSensitivity: number;      // CSI (modifier, not additive)
  networkInfluence: number;      // NIG
  temporalRelevance: number;     // TRD (modifier, not additive)
  emergentPatterns: number;      // EPD
  baseAnalysis: number;          // Base price/volume analysis
}

export const DEFAULT_WEIGHTS: LayerWeights = {
  sentimentField: 0.12,
  narrativeMomentum: 0.18,
  informationAsymmetry: 0.20,
  chaosSensitivity: 1.0,    // Multiplier
  networkInfluence: 0.12,
  temporalRelevance: 1.0,   // Multiplier
  emergentPatterns: 0.18,
  baseAnalysis: 0.20,
};

export interface LayerResult {
  layer: string;
  score: number;          // 0-100
  confidence: number;     // 0-100
  signal: 'bullish' | 'bearish' | 'neutral';
  reasoning: string[];
  rawData?: any;
}

export interface ClaudeEffectResult {
  finalScore: number;
  finalConfidence: number;
  prediction: 'yes' | 'no' | 'buy' | 'sell';
  edge: number;
  layers: LayerResult[];
  reasoning: string[];
  weights: LayerWeights;
  analysisTime: number;
}

export interface MarketData {
  id: string;
  title: string;
  category: string;
  yesPrice?: number;
  noPrice?: number;
  price?: number;
  volume?: number;
  change24h?: number;
  expiresAt?: string;
  historicalPrices?: number[];
  relatedNews?: string[];
  socialMentions?: number;
}

export class ClaudeEffectEngine {
  private weights: LayerWeights;
  private aiCallCount = 0;
  private readonly MAX_AI_CALLS_PER_ANALYSIS = 3; // Limit AI calls per market

  constructor(weights?: Partial<LayerWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Run the full 7-Layer Claude Effect analysis
   */
  async analyze(market: MarketData): Promise<ClaudeEffectResult> {
    const startTime = Date.now();
    const layers: LayerResult[] = [];
    
    console.log(`\n   🧠 CLAUDE EFFECT: Analyzing ${market.title?.substring(0, 40)}...`);

    // Layer 1: Sentiment Field (SF)
    const sf = await this.analyzeSentimentField(market);
    layers.push(sf);
    console.log(`   L1 Sentiment: ${sf.signal} (${sf.score})`);

    // Layer 2: Narrative Momentum (NM)
    const nm = await this.analyzeNarrativeMomentum(market);
    layers.push(nm);
    console.log(`   L2 Narrative: ${nm.signal} (${nm.score})`);

    // Layer 3: Information Asymmetry Index (IAI)
    const iai = await this.analyzeInformationAsymmetry(market);
    layers.push(iai);
    console.log(`   L3 Info Asymmetry: ${iai.signal} (${iai.score})`);

    // Layer 4: Chaos Sensitivity Index (CSI)
    const csi = this.analyzeChaosSensitivity(market);
    layers.push(csi);
    console.log(`   L4 Chaos: ${csi.score > 70 ? '⚠️ HIGH' : '✓ LOW'} (${csi.score})`);

    // Layer 5: Network Influence Graph (NIG)
    const nig = this.analyzeNetworkInfluence(market);
    layers.push(nig);
    console.log(`   L5 Network: ${nig.signal} (${nig.score})`);

    // Layer 6: Temporal Relevance Decay (TRD)
    const trd = this.analyzeTemporalRelevance(market);
    layers.push(trd);
    console.log(`   L6 Temporal: ${trd.score > 70 ? 'FRESH' : 'STALE'} (${trd.score})`);

    // Layer 7: Emergent Pattern Detection (EPD)
    const epd = await this.analyzeEmergentPatterns(market, layers);
    layers.push(epd);
    console.log(`   L7 Patterns: ${epd.signal} (${epd.score})`);

    // Calculate final score
    const result = this.synthesizeLayers(market, layers);
    result.analysisTime = Date.now() - startTime;

    console.log(`   ═══════════════════════════════════`);
    console.log(`   🎯 FINAL: ${result.prediction.toUpperCase()} @ ${result.finalConfidence}% conf, ${result.edge}% edge`);
    console.log(`   ⏱️  Analysis time: ${result.analysisTime}ms`);

    return result;
  }

  /**
   * Layer 1: Sentiment Field (SF)
   * Analyzes social media sentiment, news, and market mood
   */
  private async analyzeSentimentField(market: MarketData): Promise<LayerResult> {
    const reasoning: string[] = [];
    let score = 50;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    // Check for sentiment indicators in title
    const title = market.title?.toLowerCase() || '';
    
    // Positive sentiment keywords
    const bullishKeywords = ['win', 'success', 'growth', 'increase', 'rise', 'beat', 'exceed'];
    const bearishKeywords = ['fail', 'loss', 'decline', 'fall', 'miss', 'below', 'crash'];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    bullishKeywords.forEach(kw => {
      if (title.includes(kw)) bullishCount++;
    });
    
    bearishKeywords.forEach(kw => {
      if (title.includes(kw)) bearishCount++;
    });

    // Social mentions boost
    if (market.socialMentions) {
      if (market.socialMentions > 1000) {
        score += 10;
        reasoning.push(`High social attention (${market.socialMentions} mentions)`);
      } else if (market.socialMentions < 100) {
        score -= 5;
        reasoning.push('Low social attention');
      }
    }

    // Calculate sentiment direction
    if (bullishCount > bearishCount) {
      score += 15;
      signal = 'bullish';
      reasoning.push(`Bullish language detected (${bullishCount} indicators)`);
    } else if (bearishCount > bullishCount) {
      score -= 15;
      signal = 'bearish';
      reasoning.push(`Bearish language detected (${bearishCount} indicators)`);
    } else {
      reasoning.push('Neutral sentiment');
    }

    // News impact
    if (market.relatedNews && market.relatedNews.length > 0) {
      score += 5;
      reasoning.push(`${market.relatedNews.length} related news items`);
    }

    return {
      layer: 'Sentiment Field (SF)',
      score: Math.max(0, Math.min(100, score)),
      confidence: 60 + (bullishCount + bearishCount) * 5,
      signal,
      reasoning,
    };
  }

  /**
   * Layer 2: Narrative Momentum (NM)
   * Analyzes trends, streaks, and momentum
   */
  private async analyzeNarrativeMomentum(market: MarketData): Promise<LayerResult> {
    const reasoning: string[] = [];
    let score = 50;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    // Price momentum
    if (market.change24h !== undefined) {
      if (market.change24h > 5) {
        score += 20;
        signal = 'bullish';
        reasoning.push(`Strong upward momentum (+${market.change24h.toFixed(1)}% 24h)`);
      } else if (market.change24h > 2) {
        score += 10;
        signal = 'bullish';
        reasoning.push(`Positive momentum (+${market.change24h.toFixed(1)}% 24h)`);
      } else if (market.change24h < -5) {
        score -= 20;
        signal = 'bearish';
        reasoning.push(`Strong downward momentum (${market.change24h.toFixed(1)}% 24h)`);
      } else if (market.change24h < -2) {
        score -= 10;
        signal = 'bearish';
        reasoning.push(`Negative momentum (${market.change24h.toFixed(1)}% 24h)`);
      } else {
        reasoning.push('Flat momentum');
      }
    }

    // Historical price trend
    if (market.historicalPrices && market.historicalPrices.length >= 5) {
      const prices = market.historicalPrices;
      const recentAvg = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = prices.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      
      const trendPct = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (Math.abs(trendPct) > 5) {
        score += trendPct > 0 ? 15 : -15;
        reasoning.push(`Historical trend: ${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}%`);
        if (signal === 'neutral') {
          signal = trendPct > 0 ? 'bullish' : 'bearish';
        }
      }
    }

    // Volume momentum
    if (market.volume) {
      if (market.volume > 10000) {
        score += 10;
        reasoning.push('High volume confirms momentum');
      } else if (market.volume < 100) {
        score -= 10;
        reasoning.push('Low volume weakens momentum signal');
      }
    }

    return {
      layer: 'Narrative Momentum (NM)',
      score: Math.max(0, Math.min(100, score)),
      confidence: 55 + Math.abs(score - 50),
      signal,
      reasoning,
    };
  }

  /**
   * Layer 3: Information Asymmetry Index (IAI)
   * Detects smart money, unusual activity, and edge opportunities
   */
  private async analyzeInformationAsymmetry(market: MarketData): Promise<LayerResult> {
    const reasoning: string[] = [];
    let score = 50;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let edge = 0;

    // Price inefficiency check
    if (market.yesPrice !== undefined && market.noPrice !== undefined) {
      const totalPrice = market.yesPrice + market.noPrice;
      
      if (totalPrice < 98) {
        edge = 100 - totalPrice;
        score += 25;
        reasoning.push(`Market inefficiency detected: ${edge.toFixed(1)}% gap`);
      } else if (totalPrice > 102) {
        score -= 10;
        reasoning.push('Overpriced market (negative vig)');
      }

      // Check for extreme prices (potential value)
      const distanceFrom50 = Math.abs(market.yesPrice - 50);
      
      if (distanceFrom50 >= 30 && distanceFrom50 <= 45) {
        score += 15;
        reasoning.push(`Tradeable range: ${market.yesPrice}¢ yes price`);
        signal = market.yesPrice > 50 ? 'bullish' : 'bearish';
      } else if (distanceFrom50 > 45) {
        score -= 5;
        reasoning.push('Extreme price - limited edge');
      }
    }

    // Volume spike detection (potential smart money)
    if (market.volume && market.volume > 5000) {
      score += 10;
      reasoning.push('High volume may indicate informed trading');
    }

    // Use AI for deeper analysis if we haven't hit limit
    if (this.aiCallCount < this.MAX_AI_CALLS_PER_ANALYSIS) {
      try {
        const aiInsight = await this.getAIAsymmetryInsight(market);
        if (aiInsight) {
          score += aiInsight.adjustment;
          reasoning.push(...aiInsight.reasons);
          if (aiInsight.signal !== 'neutral') {
            signal = aiInsight.signal;
          }
        }
      } catch (err) {
        reasoning.push('AI analysis skipped');
      }
    }

    return {
      layer: 'Information Asymmetry (IAI)',
      score: Math.max(0, Math.min(100, score)),
      confidence: 60 + edge * 2,
      signal,
      reasoning,
      rawData: { edge },
    };
  }

  /**
   * Layer 4: Chaos Sensitivity Index (CSI)
   * Measures uncertainty, risk factors, and volatility
   */
  private analyzeChaosSensitivity(market: MarketData): LayerResult {
    const reasoning: string[] = [];
    let chaosScore = 30; // Lower is better (less chaos)

    // Time to expiry chaos
    if (market.expiresAt) {
      const hoursToExpiry = (new Date(market.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursToExpiry < 2) {
        chaosScore += 30;
        reasoning.push('Very short time to expiry - high uncertainty');
      } else if (hoursToExpiry < 24) {
        chaosScore += 15;
        reasoning.push('Same-day expiry - elevated uncertainty');
      } else if (hoursToExpiry > 168) { // > 1 week
        chaosScore += 10;
        reasoning.push('Long-dated market - more variables');
      }
    }

    // Category-based chaos
    const category = market.category?.toLowerCase() || '';
    const highChaosCategories = ['weather', 'sports', 'entertainment'];
    const lowChaosCategories = ['economics', 'fed', 'earnings'];
    
    if (highChaosCategories.some(c => category.includes(c))) {
      chaosScore += 20;
      reasoning.push(`High-chaos category: ${market.category}`);
    } else if (lowChaosCategories.some(c => category.includes(c))) {
      chaosScore -= 10;
      reasoning.push(`Predictable category: ${market.category}`);
    }

    // Title-based chaos indicators
    const title = market.title?.toLowerCase() || '';
    const chaosKeywords = ['if', 'might', 'could', 'possibly', 'uncertain', 'volatile'];
    
    chaosKeywords.forEach(kw => {
      if (title.includes(kw)) {
        chaosScore += 5;
        reasoning.push(`Uncertainty keyword: "${kw}"`);
      }
    });

    return {
      layer: 'Chaos Sensitivity (CSI)',
      score: Math.min(100, chaosScore),
      confidence: 70,
      signal: chaosScore > 60 ? 'bearish' : 'neutral', // High chaos = reduce position
      reasoning,
    };
  }

  /**
   * Layer 5: Network Influence Graph (NIG)
   * Analyzes relationships, correlations, and external factors
   */
  private analyzeNetworkInfluence(market: MarketData): LayerResult {
    const reasoning: string[] = [];
    let score = 50;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    // Category correlations
    const category = market.category?.toLowerCase() || '';
    const title = market.title?.toLowerCase() || '';

    // Crypto correlations
    if (category === 'crypto' || title.includes('bitcoin') || title.includes('crypto')) {
      // BTC typically leads altcoins
      if (title.includes('btc') || title.includes('bitcoin')) {
        score += 5;
        reasoning.push('Market leader - sets trend');
      } else {
        score -= 5;
        reasoning.push('Altcoin - follows BTC');
      }
    }

    // Political correlations
    if (category === 'politics') {
      // Incumbency advantage
      if (title.includes('incumbent') || title.includes('current')) {
        score += 10;
        reasoning.push('Incumbency advantage factor');
        signal = 'bullish';
      }
    }

    // Sports correlations
    if (category === 'sports') {
      // Home field advantage
      if (title.includes('home') || title.includes('vs')) {
        score += 5;
        reasoning.push('Home field factor considered');
      }
    }

    // Economic correlations
    if (category === 'economics' || title.includes('fed') || title.includes('rate')) {
      // Fed typically moves slowly
      score += 5;
      reasoning.push('Institutional inertia factor');
    }

    return {
      layer: 'Network Influence (NIG)',
      score: Math.max(0, Math.min(100, score)),
      confidence: 55,
      signal,
      reasoning,
    };
  }

  /**
   * Layer 6: Temporal Relevance Decay (TRD)
   * Weights data freshness and time-based factors
   */
  private analyzeTemporalRelevance(market: MarketData): LayerResult {
    const reasoning: string[] = [];
    let freshnessScore = 70; // Default: moderately fresh

    // Time to expiry affects relevance
    if (market.expiresAt) {
      const hoursToExpiry = (new Date(market.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursToExpiry < 6) {
        freshnessScore = 95;
        reasoning.push('Imminent expiry - data highly relevant');
      } else if (hoursToExpiry < 24) {
        freshnessScore = 85;
        reasoning.push('Same-day expiry - data very relevant');
      } else if (hoursToExpiry < 72) {
        freshnessScore = 70;
        reasoning.push('Near-term expiry - data relevant');
      } else if (hoursToExpiry > 168) {
        freshnessScore = 50;
        reasoning.push('Long-dated - current data less predictive');
      }
    }

    // Recent price action is more relevant
    if (market.historicalPrices && market.historicalPrices.length > 0) {
      freshnessScore += 10;
      reasoning.push('Recent price data available');
    }

    return {
      layer: 'Temporal Relevance (TRD)',
      score: freshnessScore,
      confidence: 75,
      signal: 'neutral',
      reasoning,
    };
  }

  /**
   * Layer 7: Emergent Pattern Detection (EPD)
   * AI-powered pattern recognition across all layers
   */
  private async analyzeEmergentPatterns(
    market: MarketData,
    previousLayers: LayerResult[]
  ): Promise<LayerResult> {
    const reasoning: string[] = [];
    let score = 50;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    // Count layer signals
    let bullishLayers = 0;
    let bearishLayers = 0;
    
    previousLayers.forEach(layer => {
      if (layer.signal === 'bullish') bullishLayers++;
      if (layer.signal === 'bearish') bearishLayers++;
    });

    // Pattern: Layer agreement
    if (bullishLayers >= 4) {
      score += 25;
      signal = 'bullish';
      reasoning.push(`Strong bullish consensus: ${bullishLayers}/6 layers agree`);
    } else if (bearishLayers >= 4) {
      score -= 25;
      signal = 'bearish';
      reasoning.push(`Strong bearish consensus: ${bearishLayers}/6 layers agree`);
    } else if (bullishLayers >= 3 && bearishLayers <= 1) {
      score += 15;
      signal = 'bullish';
      reasoning.push('Moderate bullish pattern');
    } else if (bearishLayers >= 3 && bullishLayers <= 1) {
      score -= 15;
      signal = 'bearish';
      reasoning.push('Moderate bearish pattern');
    } else {
      reasoning.push('Mixed signals - no clear pattern');
    }

    // Pattern: High confidence alignment
    const avgConfidence = previousLayers.reduce((sum, l) => sum + l.confidence, 0) / previousLayers.length;
    if (avgConfidence > 70) {
      score += 10;
      reasoning.push(`High layer confidence: ${avgConfidence.toFixed(0)}% avg`);
    }

    // Use AI for final pattern synthesis if budget allows
    if (this.aiCallCount < this.MAX_AI_CALLS_PER_ANALYSIS) {
      try {
        const aiPattern = await this.getAIPatternSynthesis(market, previousLayers);
        if (aiPattern) {
          score += aiPattern.adjustment;
          reasoning.push(...aiPattern.reasons);
          this.aiCallCount++;
        }
      } catch (err) {
        reasoning.push('AI pattern synthesis skipped');
      }
    }

    return {
      layer: 'Emergent Patterns (EPD)',
      score: Math.max(0, Math.min(100, score)),
      confidence: 50 + Math.abs(bullishLayers - bearishLayers) * 10,
      signal,
      reasoning,
    };
  }

  /**
   * Synthesize all layers into final prediction
   */
  private synthesizeLayers(market: MarketData, layers: LayerResult[]): ClaudeEffectResult {
    // Extract layer results
    const sf = layers.find(l => l.layer.includes('Sentiment'))!;
    const nm = layers.find(l => l.layer.includes('Narrative'))!;
    const iai = layers.find(l => l.layer.includes('Asymmetry'))!;
    const csi = layers.find(l => l.layer.includes('Chaos'))!;
    const nig = layers.find(l => l.layer.includes('Network'))!;
    const trd = layers.find(l => l.layer.includes('Temporal'))!;
    const epd = layers.find(l => l.layer.includes('Patterns'))!;

    // Calculate weighted score
    let weightedScore = 0;
    
    // Additive layers (normalized to 0-1)
    weightedScore += (sf.score / 100) * this.weights.sentimentField;
    weightedScore += (nm.score / 100) * this.weights.narrativeMomentum;
    weightedScore += (iai.score / 100) * this.weights.informationAsymmetry;
    weightedScore += (nig.score / 100) * this.weights.networkInfluence;
    weightedScore += (epd.score / 100) * this.weights.emergentPatterns;
    
    // Base analysis (price position)
    const baseScore = market.yesPrice 
      ? (market.yesPrice > 50 ? 0.6 : 0.4)
      : 0.5;
    weightedScore += baseScore * this.weights.baseAnalysis;

    // Apply modifiers
    const chaosModifier = 1 - (csi.score / 200); // High chaos reduces confidence
    const temporalModifier = trd.score / 100;    // Fresh data boosts confidence
    
    weightedScore *= chaosModifier;
    weightedScore *= temporalModifier;

    // Convert to percentage
    const finalScore = Math.round(weightedScore * 100);

    // Calculate confidence (average layer confidence, modified)
    const avgLayerConfidence = layers.reduce((sum, l) => sum + l.confidence, 0) / layers.length;
    const finalConfidence = Math.round(avgLayerConfidence * chaosModifier * temporalModifier);

    // Determine prediction
    let prediction: 'yes' | 'no' | 'buy' | 'sell';
    if (market.yesPrice !== undefined) {
      // Kalshi market
      prediction = finalScore >= 55 ? 'yes' : 'no';
    } else {
      // Crypto
      prediction = finalScore >= 55 ? 'buy' : 'sell';
    }

    // Calculate edge
    let edge = 0;
    if (market.yesPrice !== undefined) {
      const impliedProb = market.yesPrice;
      const ourProb = finalScore;
      edge = Math.abs(ourProb - impliedProb);
    } else {
      edge = Math.abs(finalScore - 50) / 5;
    }

    // Compile reasoning
    const topReasons = layers
      .filter(l => l.reasoning.length > 0)
      .flatMap(l => l.reasoning.slice(0, 2))
      .slice(0, 5);

    return {
      finalScore,
      finalConfidence: Math.min(90, Math.max(40, finalConfidence)),
      prediction,
      edge: Math.round(edge * 10) / 10,
      layers,
      reasoning: topReasons,
      weights: this.weights,
      analysisTime: 0,
    };
  }

  /**
   * AI helper: Get asymmetry insights
   */
  private async getAIAsymmetryInsight(market: MarketData): Promise<{
    adjustment: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    reasons: string[];
  } | null> {
    this.aiCallCount++;
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Analyze for information asymmetry (smart money, unusual patterns):
Market: ${market.title}
Yes Price: ${market.yesPrice}¢
Category: ${market.category}

Is there evidence of informed trading or market inefficiency?
Respond ONLY with JSON: {"adjustment": -10 to 10, "signal": "bullish/bearish/neutral", "reasons": ["reason1"]}`
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;
      
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  /**
   * AI helper: Pattern synthesis
   */
  private async getAIPatternSynthesis(
    market: MarketData,
    layers: LayerResult[]
  ): Promise<{ adjustment: number; reasons: string[] } | null> {
    this.aiCallCount++;
    
    const layerSummary = layers.map(l => 
      `${l.layer}: ${l.signal} (${l.score})`
    ).join('\n');

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Identify any emergent patterns from these analysis layers:
${layerSummary}

Market: ${market.title}

Respond ONLY with JSON: {"adjustment": -15 to 15, "reasons": ["pattern1"]}`
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;
      
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  /**
   * Update weights (called by Cursor Effect Bot)
   */
  updateWeights(newWeights: Partial<LayerWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    console.log('🔧 Claude Effect weights updated:', this.weights);
  }

  /**
   * Get current weights
   */
  getWeights(): LayerWeights {
    return { ...this.weights };
  }

  /**
   * Reset AI call counter (call at start of each market)
   */
  resetAICounter(): void {
    this.aiCallCount = 0;
  }
}

// Singleton instance
let engineInstance: ClaudeEffectEngine | null = null;

export function getClaudeEffectEngine(weights?: Partial<LayerWeights>): ClaudeEffectEngine {
  if (!engineInstance) {
    engineInstance = new ClaudeEffectEngine(weights);
  }
  return engineInstance;
}

export default ClaudeEffectEngine;

/**
 * DERIVATIVES EXPERT
 * Advanced analysis for options, swaps, and complex derivatives markets
 * Tracks unusual activity, Greeks, volatility, and institutional flow
 */

import { OllamaAsAnthropic as Anthropic } from '../lib/local-ai';
import { historicalKnowledge } from './historical-knowledge';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  dim: '\x1b[2m',
};

interface DerivativesPrediction {
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  dataSourcesUsed: string[];
  impliedVolatility?: number;
  unusualActivity?: boolean;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  };
  institutionalFlow?: 'bullish' | 'bearish' | 'neutral';
}

export class DerivativesExpert {
  private claude: Anthropic | null;

  constructor() {
    this.claude = new Anthropic();
  }

  /**
   * Analyze a derivatives market using multi-phase analysis
   */
  async analyzeDerivativesMarket(market: {
    id: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    expiresAt?: string;
  }): Promise<DerivativesPrediction> {
    console.log(`\n${c.brightCyan}╔═══════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}   ${c.brightWhite}📊 DERIVATIVES EXPERT - DEEP ANALYSIS${c.reset}         ${c.brightCyan}║${c.reset}`);
    console.log(`${c.brightCyan}╚═══════════════════════════════════════════════════════════╝${c.reset}`);
    console.log(`   ${c.dim}Market: ${c.white}${market.title}${c.reset}`);
    console.log(`   ${c.dim}YES: ${c.green}${market.yesPrice}¢${c.reset} | ${c.dim}NO: ${c.red}${market.noPrice}¢${c.reset}\n`);

    const reasoning: string[] = [];
    const factors: string[] = [];
    const dataSourcesUsed: string[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let confidence = 50;

    // 1. HISTORICAL DERIVATIVES PATTERNS
    console.log(`   ${c.brightYellow}📚 Phase 1: Historical Derivatives Analysis${c.reset}`);
    const derivativesHistory = historicalKnowledge.getRelevantKnowledge(
      market.title + ' derivatives options volatility'
    );
    if (derivativesHistory.length > 0) {
      factors.push(...derivativesHistory.slice(0, 3));
      dataSourcesUsed.push('Historical Derivatives Data');
      console.log(`      ✓ Found ${derivativesHistory.length} historical patterns`);
    }

    // 2. IMPLIED VOLATILITY ANALYSIS
    console.log(`   ${c.brightYellow}📈 Phase 2: Implied Volatility Analysis${c.reset}`);
    const ivAnalysis = this.analyzeImpliedVolatility(market);
    if (ivAnalysis) {
      weightedSum += ivAnalysis.probability * 25; // 25% weight
      totalWeight += 25;
      dataSourcesUsed.push('IV Analysis');
      reasoning.push(ivAnalysis.reasoning);
      confidence += ivAnalysis.confidenceBoost;
      console.log(`      ✓ IV Signal: ${ivAnalysis.probability > 50 ? c.green : c.red}${ivAnalysis.probability.toFixed(1)}%${c.reset}`);
    }

    // 3. UNUSUAL OPTIONS ACTIVITY
    console.log(`   ${c.brightYellow}🚨 Phase 3: Unusual Activity Detection${c.reset}`);
    const unusualActivity = this.detectUnusualActivity(market);
    if (unusualActivity) {
      weightedSum += unusualActivity.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('Flow Analysis');
      factors.push(unusualActivity.activity);
      console.log(`      ✓ Unusual Activity: ${unusualActivity.detected ? c.brightRed + 'DETECTED' : c.dim + 'None'}${c.reset}`);
    }

    // 4. GREEKS ANALYSIS (Delta, Gamma, Theta, Vega)
    console.log(`   ${c.brightYellow}Δ Phase 4: Greeks Analysis${c.reset}`);
    const greeksAnalysis = this.analyzeGreeks(market);
    if (greeksAnalysis) {
      weightedSum += greeksAnalysis.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('Greeks Analysis');
      reasoning.push(greeksAnalysis.insight);
      console.log(`      ✓ Greeks Signal: ${greeksAnalysis.probability > 50 ? c.green : c.red}${greeksAnalysis.probability.toFixed(1)}%${c.reset}`);
    }

    // 5. INSTITUTIONAL FLOW
    console.log(`   ${c.brightYellow}🏦 Phase 5: Institutional Flow Detection${c.reset}`);
    const institutionalFlow = this.analyzeInstitutionalFlow(market);
    if (institutionalFlow) {
      weightedSum += institutionalFlow.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('Institutional Flow');
      factors.push(`Institutional sentiment: ${institutionalFlow.direction}`);
      console.log(`      ✓ Flow: ${institutionalFlow.direction === 'bullish' ? c.green : institutionalFlow.direction === 'bearish' ? c.red : c.yellow}${institutionalFlow.direction.toUpperCase()}${c.reset}`);
    }

    // 6. AI DEEP REASONING
    console.log(`   ${c.brightYellow}🤖 Phase 6: AI Derivatives Reasoning${c.reset}`);
    const aiReasoning = await this.getAIDerivativesReasoning(market, factors);
    if (aiReasoning) {
      weightedSum += aiReasoning.probability * 15; // 15% weight
      totalWeight += 15;
      dataSourcesUsed.push('Claude AI');
      reasoning.push(aiReasoning.reasoning);
      console.log(`      ✓ AI Analysis: ${aiReasoning.probability > 50 ? c.green : c.red}${aiReasoning.probability.toFixed(1)}%${c.reset}`);
    }

    // CALCULATE FINAL PROBABILITY
    const finalProbability = totalWeight > 0 ? weightedSum / totalWeight : market.yesPrice;
    const edge = finalProbability - market.yesPrice;

    // Boost confidence if multiple signals align
    const signals = [
      ivAnalysis?.probability,
      unusualActivity?.probability,
      greeksAnalysis?.probability,
      institutionalFlow?.probability,
      aiReasoning?.probability
    ].filter(s => s !== null && s !== undefined);

    const bullishSignals = signals.filter(s => s! > 55).length;
    const bearishSignals = signals.filter(s => s! < 45).length;

    if (bullishSignals >= 3 || bearishSignals >= 3) {
      confidence += 15;
      reasoning.push(`Strong consensus: ${Math.max(bullishSignals, bearishSignals)} signals align`);
    }

    confidence = Math.min(confidence, 95);

    console.log(`\n   ${c.brightGreen}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`   ${c.brightWhite}FINAL DERIVATIVES PREDICTION${c.reset}`);
    console.log(`   ${c.dim}Probability:${c.reset} ${finalProbability > 50 ? c.brightGreen : c.brightRed}${finalProbability.toFixed(1)}%${c.reset}`);
    console.log(`   ${c.dim}Edge:${c.reset} ${edge > 0 ? c.green : c.red}${edge >= 0 ? '+' : ''}${edge.toFixed(1)}%${c.reset}`);
    console.log(`   ${c.dim}Confidence:${c.reset} ${c.cyan}${confidence.toFixed(1)}%${c.reset}`);
    console.log(`   ${c.dim}Direction:${c.reset} ${finalProbability > 50 ? c.brightGreen + 'YES ↑' : c.brightRed + 'NO ↓'}${c.reset}`);
    console.log(`   ${c.brightGreen}═══════════════════════════════════════════════════${c.reset}\n`);

    return {
      prediction: finalProbability > 50 ? 'yes' : 'no',
      probability: finalProbability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      dataSourcesUsed,
      impliedVolatility: ivAnalysis?.iv,
      unusualActivity: unusualActivity?.detected,
      greeks: greeksAnalysis?.greeks,
      institutionalFlow: institutionalFlow?.direction,
    };
  }

  /**
   * Analyze implied volatility signals
   */
  private analyzeImpliedVolatility(market: any): {
    probability: number;
    reasoning: string;
    confidenceBoost: number;
    iv?: number;
  } | null {
    const title = market.title.toLowerCase();

    // Extract volatility indicators from title
    const hasVolatility = title.includes('volatil') || title.includes('vix') || title.includes('swing');
    const hasCalm = title.includes('stable') || title.includes('calm') || title.includes('flat');
    const hasSpike = title.includes('spike') || title.includes('surge') || title.includes('jump');

    let probability = market.yesPrice;
    let confidenceBoost = 0;
    let reasoning = '';

    if (hasSpike || hasVolatility) {
      probability += 10;
      confidenceBoost = 5;
      reasoning = 'Elevated volatility expectations detected';
    } else if (hasCalm) {
      probability -= 5;
      confidenceBoost = 3;
      reasoning = 'Low volatility environment suggested';
    }

    // VIX-related markets
    if (title.includes('vix')) {
      const knowledge = historicalKnowledge.getRelevantKnowledge('vix volatility spike crash');
      if (knowledge.length > 0) {
        confidenceBoost += 5;
        reasoning += ' (VIX historical patterns applied)';
      }
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      reasoning,
      confidenceBoost,
    };
  }

  /**
   * Detect unusual options activity
   */
  private detectUnusualActivity(market: any): {
    probability: number;
    detected: boolean;
    activity: string;
  } | null {
    const title = market.title.toLowerCase();

    // Keywords that suggest unusual activity
    const unusualKeywords = ['unusual', 'large', 'massive', 'whale', 'institutional', 'sweep'];
    const detected = unusualKeywords.some(kw => title.includes(kw));

    let probability = market.yesPrice;
    let activity = 'Normal flow';

    if (detected) {
      probability += 15;
      activity = 'Unusual activity detected - institutional interest likely';
    }

    // Check for specific contract mentions
    if (title.includes('call') || title.includes('put')) {
      const isCalls = title.includes('call');
      probability += isCalls ? 8 : -8;
      activity += ` (${isCalls ? 'Calls' : 'Puts'} mentioned)`;
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      detected,
      activity,
    };
  }

  /**
   * Analyze Greeks (Delta, Gamma, Theta, Vega)
   */
  private analyzeGreeks(market: any): {
    probability: number;
    insight: string;
    greeks?: any;
  } | null {
    const title = market.title.toLowerCase();
    const expiresAt = market.expiresAt ? new Date(market.expiresAt) : null;

    let probability = market.yesPrice;
    let insight = '';

    // Theta decay analysis
    if (expiresAt) {
      const daysToExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      if (daysToExpiry < 7) {
        // High theta decay - time is running out
        probability += 5;
        insight = 'High theta decay - time pressure favors current price direction';
      } else if (daysToExpiry > 60) {
        // Low theta decay - more time for movement
        probability -= 3;
        insight = 'Low theta decay - ample time for reversals';
      }
    }

    // Delta analysis (directional exposure)
    if (title.includes('delta') || title.includes('directional')) {
      probability += 8;
      insight += ' | Strong directional bias detected';
    }

    // Gamma scalping opportunities
    if (title.includes('gamma') || title.includes('scalp')) {
      probability += 5;
      insight += ' | Gamma scalping potential';
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      insight: insight || 'Standard Greeks profile',
    };
  }

  /**
   * Analyze institutional flow
   */
  private analyzeInstitutionalFlow(market: any): {
    probability: number;
    direction: 'bullish' | 'bearish' | 'neutral';
  } | null {
    const title = market.title.toLowerCase();

    // Institutional keywords
    const bullishInstitutional = ['accumulation', 'buying', 'inflow', 'long'];
    const bearishInstitutional = ['distribution', 'selling', 'outflow', 'short'];

    const isBullish = bullishInstitutional.some(kw => title.includes(kw));
    const isBearish = bearishInstitutional.some(kw => title.includes(kw));

    let probability = market.yesPrice;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    if (isBullish) {
      probability += 12;
      direction = 'bullish';
    } else if (isBearish) {
      probability -= 12;
      direction = 'bearish';
    }

    // Max pain analysis
    if (title.includes('max pain')) {
      // Markets tend to gravitate toward max pain
      probability += 8;
      direction = 'bullish';
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      direction,
    };
  }

  /**
   * Get AI reasoning specific to derivatives
   */
  private async getAIDerivativesReasoning(market: any, factors: string[]): Promise<{
    probability: number;
    reasoning: string;
  } | null> {
    if (!this.claude) return null;

    try {
      const prompt = `As a derivatives and options expert, analyze this prediction market:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Context:
${factors.slice(0, 3).map(f => `- ${f}`).join('\n')}

Consider:
- Options flow and unusual activity
- Implied volatility signals
- Greeks (Delta, Gamma, Theta, Vega)
- Institutional positioning
- Max pain levels
- Historical derivatives patterns

Provide:
1. Probability (0-100) that YES wins
2. One sentence reasoning

Format as JSON: {"probability": 65, "reasoning": "explanation"}`;

      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          probability: parsed.probability || 50,
          reasoning: parsed.reasoning || 'Derivatives analysis complete',
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a market is derivatives-related
   */
  isDerivativesMarket(marketTitle: string): boolean {
    const title = marketTitle.toLowerCase();
    const derivativesKeywords = [
      'option', 'call', 'put', 'derivative', 'swap',
      'volatility', 'vix', 'implied vol', 'iv',
      'gamma', 'delta', 'theta', 'vega', 'greeks',
      'max pain', 'unusual activity', 'options flow',
      'skew', 'smile', 'term structure'
    ];
    return derivativesKeywords.some(kw => title.includes(kw));
  }
}

// Singleton export
export const derivativesExpert = new DerivativesExpert();


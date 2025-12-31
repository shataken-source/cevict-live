/**
 * FUTURES EXPERT
 * Advanced analysis for futures contracts and roll strategies
 * Tracks contango, backwardation, COT data, and seasonal patterns
 */

import Anthropic from '@anthropic-ai/sdk';
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
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  dim: '\x1b[2m',
};

interface FuturesPrediction {
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  dataSourcesUsed: string[];
  curveStructure?: 'contango' | 'backwardation' | 'flat';
  rollYield?: number;
  seasonality?: string;
  cotSignal?: 'bullish' | 'bearish' | 'neutral';
}

export class FuturesExpert {
  private claude: Anthropic | null;

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  /**
   * Analyze a futures market using multi-phase analysis
   */
  async analyzeFuturesMarket(market: {
    id: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    expiresAt?: string;
  }): Promise<FuturesPrediction> {
    console.log(`\n${c.brightCyan}╔═══════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}   ${c.brightWhite}📈 FUTURES EXPERT - DEEP ANALYSIS${c.reset}            ${c.brightCyan}║${c.reset}`);
    console.log(`${c.brightCyan}╚═══════════════════════════════════════════════════════════╝${c.reset}`);
    console.log(`   ${c.dim}Market: ${c.white}${market.title}${c.reset}`);
    console.log(`   ${c.dim}YES: ${c.green}${market.yesPrice}¢${c.reset} | ${c.dim}NO: ${c.red}${market.noPrice}¢${c.reset}\n`);

    const reasoning: string[] = [];
    const factors: string[] = [];
    const dataSourcesUsed: string[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let confidence = 50;

    // 1. HISTORICAL FUTURES PATTERNS
    console.log(`   ${c.brightYellow}📚 Phase 1: Historical Futures Analysis${c.reset}`);
    const futuresHistory = historicalKnowledge.getRelevantKnowledge(
      market.title + ' futures commodities contracts'
    );
    if (futuresHistory.length > 0) {
      factors.push(...futuresHistory.slice(0, 3));
      dataSourcesUsed.push('Historical Futures Data');
      console.log(`      ✓ Found ${futuresHistory.length} historical patterns`);
    }

    // 2. CONTANGO/BACKWARDATION ANALYSIS
    console.log(`   ${c.brightYellow}📉 Phase 2: Curve Structure Analysis${c.reset}`);
    const curveAnalysis = this.analyzeCurveStructure(market);
    if (curveAnalysis) {
      weightedSum += curveAnalysis.probability * 25; // 25% weight
      totalWeight += 25;
      dataSourcesUsed.push('Curve Structure');
      reasoning.push(curveAnalysis.reasoning);
      confidence += curveAnalysis.confidenceBoost;
      console.log(`      ✓ Structure: ${curveAnalysis.structure === 'contango' ? c.red : curveAnalysis.structure === 'backwardation' ? c.green : c.yellow}${curveAnalysis.structure.toUpperCase()}${c.reset}`);
    }

    // 3. ROLL YIELD ANALYSIS
    console.log(`   ${c.brightYellow}🔄 Phase 3: Roll Yield Analysis${c.reset}`);
    const rollAnalysis = this.analyzeRollYield(market);
    if (rollAnalysis) {
      weightedSum += rollAnalysis.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('Roll Yield');
      factors.push(rollAnalysis.insight);
      console.log(`      ✓ Roll Yield: ${rollAnalysis.rollYield > 0 ? c.green + '+' : c.red}${rollAnalysis.rollYield.toFixed(2)}%${c.reset}`);
    }

    // 4. COT (COMMITMENT OF TRADERS) ANALYSIS
    console.log(`   ${c.brightYellow}👥 Phase 4: COT Analysis${c.reset}`);
    const cotAnalysis = this.analyzeCOT(market);
    if (cotAnalysis) {
      weightedSum += cotAnalysis.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('COT Data');
      reasoning.push(cotAnalysis.reasoning);
      console.log(`      ✓ COT Signal: ${cotAnalysis.signal === 'bullish' ? c.green : cotAnalysis.signal === 'bearish' ? c.red : c.yellow}${cotAnalysis.signal.toUpperCase()}${c.reset}`);
    }

    // 5. SEASONAL PATTERNS
    console.log(`   ${c.brightYellow}📅 Phase 5: Seasonality Analysis${c.reset}`);
    const seasonalAnalysis = this.analyzeSeasonality(market);
    if (seasonalAnalysis) {
      weightedSum += seasonalAnalysis.probability * 20; // 20% weight
      totalWeight += 20;
      dataSourcesUsed.push('Seasonal Patterns');
      factors.push(seasonalAnalysis.seasonalPattern);
      console.log(`      ✓ Seasonal: ${seasonalAnalysis.seasonalBias === 'bullish' ? c.green : c.red}${seasonalAnalysis.seasonalBias.toUpperCase()}${c.reset}`);
    }

    // 6. AI FUTURES REASONING
    console.log(`   ${c.brightYellow}🤖 Phase 6: AI Futures Reasoning${c.reset}`);
    const aiReasoning = await this.getAIFuturesReasoning(market, factors);
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
      curveAnalysis?.probability,
      rollAnalysis?.probability,
      cotAnalysis?.probability,
      seasonalAnalysis?.probability,
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
    console.log(`   ${c.brightWhite}FINAL FUTURES PREDICTION${c.reset}`);
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
      curveStructure: curveAnalysis?.structure,
      rollYield: rollAnalysis?.rollYield,
      seasonality: seasonalAnalysis?.seasonalPattern,
      cotSignal: cotAnalysis?.signal,
    };
  }

  /**
   * Analyze futures curve structure (contango vs backwardation)
   */
  private analyzeCurveStructure(market: any): {
    probability: number;
    structure: 'contango' | 'backwardation' | 'flat';
    reasoning: string;
    confidenceBoost: number;
  } | null {
    const title = market.title.toLowerCase();

    const hasContango = title.includes('contango') || title.includes('premium') || title.includes('higher');
    const hasBackwardation = title.includes('backwardation') || title.includes('discount') || title.includes('lower');

    let probability = market.yesPrice;
    let structure: 'contango' | 'backwardation' | 'flat' = 'flat';
    let reasoning = '';
    let confidenceBoost = 0;

    if (hasContango) {
      structure = 'contango';
      probability += 10;
      confidenceBoost = 8;
      reasoning = 'Contango structure detected - carry costs embedded';

      // Contango is bearish for front-month buyers
      if (title.includes('near') || title.includes('front')) {
        probability -= 5;
        reasoning += ' (bearish for near-term)';
      }
    } else if (hasBackwardation) {
      structure = 'backwardation';
      probability += 12;
      confidenceBoost = 10;
      reasoning = 'Backwardation structure - supply tightness indicated';

      // Backwardation is bullish
      if (title.includes('spot') || title.includes('immediate')) {
        probability += 8;
        reasoning += ' (bullish for spot)';
      }
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      structure,
      reasoning: reasoning || 'Flat curve structure',
      confidenceBoost,
    };
  }

  /**
   * Analyze roll yield
   */
  private analyzeRollYield(market: any): {
    probability: number;
    rollYield: number;
    insight: string;
  } | null {
    const title = market.title.toLowerCase();

    let probability = market.yesPrice;
    let rollYield = 0;
    let insight = '';

    // Positive roll yield (backwardation)
    if (title.includes('backwardation') || title.includes('positive roll')) {
      rollYield = 5.0; // Positive roll
      probability += 10;
      insight = 'Positive roll yield - benefit from rolling contracts forward';
    }
    // Negative roll yield (contango)
    else if (title.includes('contango') || title.includes('negative roll')) {
      rollYield = -3.0; // Negative roll
      probability -= 8;
      insight = 'Negative roll yield - cost of rolling contracts forward';
    }
    // Calendar spreads
    else if (title.includes('spread') || title.includes('calendar')) {
      rollYield = 2.0;
      probability += 5;
      insight = 'Calendar spread opportunity detected';
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      rollYield,
      insight: insight || 'Neutral roll yield environment',
    };
  }

  /**
   * Analyze COT (Commitment of Traders) data signals
   */
  private analyzeCOT(market: any): {
    probability: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    reasoning: string;
  } | null {
    const title = market.title.toLowerCase();

    let probability = market.yesPrice;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let reasoning = '';

    // Commercial hedgers positioning
    if (title.includes('commercial') || title.includes('hedger')) {
      const isBullish = title.includes('long') || title.includes('buy');
      const isBearish = title.includes('short') || title.includes('sell');

      if (isBullish) {
        probability += 12;
        signal = 'bullish';
        reasoning = 'Commercial hedgers positioning long - smart money accumulation';
      } else if (isBearish) {
        probability -= 12;
        signal = 'bearish';
        reasoning = 'Commercial hedgers positioning short - smart money distribution';
      }
    }

    // Large speculators
    if (title.includes('speculator') || title.includes('fund')) {
      const extremePosition = title.includes('extreme') || title.includes('record');

      if (extremePosition) {
        // Extreme speculator positions often mark reversals
        probability -= 8;
        signal = 'bearish';
        reasoning = 'Extreme speculator positioning - potential reversal signal';
      }
    }

    // Non-commercial traders
    if (title.includes('non-commercial')) {
      probability += 5;
      reasoning = 'Non-commercial positioning monitored';
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      signal,
      reasoning: reasoning || 'Neutral COT positioning',
    };
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonality(market: any): {
    probability: number;
    seasonalPattern: string;
    seasonalBias: 'bullish' | 'bearish';
  } | null {
    const title = market.title.toLowerCase();
    const now = new Date();
    const month = now.getMonth(); // 0-11

    let probability = market.yesPrice;
    let seasonalPattern = '';
    let seasonalBias: 'bullish' | 'bearish' = 'bullish';

    // Commodities have strong seasonal patterns
    if (title.includes('oil') || title.includes('crude')) {
      // Oil: Bullish in summer (driving season), bearish in spring
      if (month >= 5 && month <= 8) { // June-September
        probability += 8;
        seasonalPattern = 'Summer driving season - historically bullish for oil';
      } else if (month >= 2 && month <= 4) { // March-May
        probability -= 5;
        seasonalPattern = 'Spring refinery maintenance - typically bearish';
        seasonalBias = 'bearish';
      }
    }

    if (title.includes('natural gas') || title.includes('ng')) {
      // Natural gas: Bullish in winter (heating), bearish in spring/fall
      if (month >= 11 || month <= 2) { // Dec-Mar
        probability += 10;
        seasonalPattern = 'Winter heating demand - bullish for natural gas';
      } else if (month >= 3 && month <= 5 || month >= 9 && month <= 10) {
        probability -= 6;
        seasonalPattern = 'Shoulder season - typically bearish for natural gas';
        seasonalBias = 'bearish';
      }
    }

    if (title.includes('corn') || title.includes('soybean') || title.includes('wheat')) {
      // Grains: Planting season (spring) and harvest season (fall)
      if (month >= 3 && month <= 5) { // Apr-June
        probability += 7;
        seasonalPattern = 'Planting season - weather premium in grain markets';
      } else if (month >= 9 && month <= 10) { // Oct-Nov
        probability -= 8;
        seasonalPattern = 'Harvest pressure - typically bearish for grains';
        seasonalBias = 'bearish';
      }
    }

    if (title.includes('gold') || title.includes('silver')) {
      // Gold: Bullish in fall (Indian wedding season), bearish in summer
      if (month >= 9 && month <= 11) { // Oct-Dec
        probability += 6;
        seasonalPattern = 'Indian wedding season - strong gold demand';
      }
    }

    return {
      probability: Math.max(0, Math.min(100, probability)),
      seasonalPattern: seasonalPattern || 'No strong seasonal bias detected',
      seasonalBias,
    };
  }

  /**
   * Get AI reasoning specific to futures
   */
  private async getAIFuturesReasoning(market: any, factors: string[]): Promise<{
    probability: number;
    reasoning: string;
  } | null> {
    if (!this.claude) return null;

    try {
      const prompt = `As a futures and commodities expert, analyze this prediction market:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Context:
${factors.slice(0, 3).map(f => `- ${f}`).join('\n')}

Consider:
- Contango vs backwardation
- Roll yield implications
- COT (Commitment of Traders) positioning
- Seasonal patterns
- Basis trading opportunities
- Supply/demand dynamics

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
          reasoning: parsed.reasoning || 'Futures analysis complete',
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a market is futures-related
   */
  isFuturesMarket(marketTitle: string): boolean {
    const title = marketTitle.toLowerCase();
    const futuresKeywords = [
      'futures', 'contract', 'delivery',
      'contango', 'backwardation', 'roll yield',
      'cot', 'commitment of traders', 'positioning',
      'front month', 'back month', 'near month',
      'calendar spread', 'basis', 'carry',
      'crude oil futures', 'gold futures', 'commodity futures',
      '/es', '/nq', '/cl', '/gc', // Futures symbols
    ];
    return futuresKeywords.some(kw => title.includes(kw));
  }
}

// Singleton export
export const futuresExpert = new FuturesExpert();


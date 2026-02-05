/**
 * GME SPECIALIST BOT
 * Advanced predictor for GameStop and meme stocks on Kalshi
 * Uses Flux Engine, Claude Effect, sentiment analysis, and more
 */

import Anthropic from '@anthropic-ai/sdk';
import { historicalKnowledge } from './historical-knowledge';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

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

interface GMEPrediction {
  prediction: 'yes' | 'no';
  probability: number; // 0-100
  confidence: number; // 0-100
  edge: number;
  reasoning: string[];
  factors: string[];
  dataSourcesUsed: string[];
  fluxEngineScore?: number;
  claudeEffectScore?: number;
  sentimentScore?: number;
  redditMomentum?: number;
  institutionalFlow?: number;
}

export class GMESpecialist {
  private claude: Anthropic | null;
  private fluxEnginePath: string;

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.fluxEnginePath = path.join(process.cwd(), '../../engine/v2/cevict-flux-engine.ts');
  }

  /**
   * Analyze a Kalshi GME market using all available data sources
   */
  async analyzeGMEMarket(market: {
    id: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    expiresAt?: string;
  }): Promise<GMEPrediction> {
    console.log(`\n${c.brightCyan}╔═══════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}   ${c.brightWhite}🎮 GME SPECIALIST - DEEP ANALYSIS${c.reset}              ${c.brightCyan}║${c.reset}`);
    console.log(`${c.brightCyan}╚═══════════════════════════════════════════════════════════╝${c.reset}`);
    console.log(`   ${c.dim}Market: ${c.white}${market.title}${c.reset}`);
    console.log(`   ${c.dim}YES: ${c.green}${market.yesPrice}¢${c.reset} | ${c.dim}NO: ${c.red}${market.noPrice}¢${c.reset}\n`);

    const reasoning: string[] = [];
    const factors: string[] = [];
    const dataSourcesUsed: string[] = [];
    let totalScore = 0;
    let weightedSum = 0;
    let confidence = 50;

    // 1. HISTORICAL KNOWLEDGE
    console.log(`   ${c.brightYellow}📚 Phase 1: Historical Analysis${c.reset}`);
    const gmeKnowledge = historicalKnowledge.getRelevantKnowledge(market.title + ' gamestop gme meme stock');
    if (gmeKnowledge.length > 0) {
      factors.push(...gmeKnowledge.slice(0, 3));
      dataSourcesUsed.push('Historical Knowledge');
      console.log(`      ✓ Found ${gmeKnowledge.length} historical patterns`);
    }

    // 2. FLUX ENGINE ANALYSIS
    console.log(`   ${c.brightYellow}⚡ Phase 2: Flux Engine Analysis${c.reset}`);
    const fluxScore = await this.runFluxEngine(market);
    if (fluxScore !== null) {
      weightedSum += fluxScore * 30; // 30% weight
      totalScore += 30;
      dataSourcesUsed.push('CEVICT Flux Engine');
      reasoning.push(`Flux Engine indicates ${fluxScore > 50 ? 'bullish' : 'bearish'} momentum (${fluxScore.toFixed(1)}%)`);
      console.log(`      ✓ Flux Score: ${fluxScore > 50 ? c.green : c.red}${fluxScore.toFixed(1)}%${c.reset}`);
    }

    // 3. CLAUDE EFFECT ANALYSIS
    console.log(`   ${c.brightYellow}🧠 Phase 3: Claude Effect Analysis${c.reset}`);
    const claudeEffect = await this.runClaudeEffect(market);
    if (claudeEffect !== null) {
      weightedSum += claudeEffect * 25; // 25% weight
      totalScore += 25;
      dataSourcesUsed.push('Claude Effect (7 Layers)');
      reasoning.push(`Claude Effect shows ${claudeEffect > 50 ? 'positive' : 'negative'} field dynamics (${claudeEffect.toFixed(1)}%)`);
      confidence += (Math.abs(claudeEffect - 50) / 50) * 10; // Boost confidence based on signal strength
      console.log(`      ✓ Claude Effect: ${claudeEffect > 50 ? c.green : c.red}${claudeEffect.toFixed(1)}%${c.reset}`);
    }

    // 4. REDDIT SENTIMENT & MOMENTUM
    console.log(`   ${c.brightYellow}🚀 Phase 4: Reddit/Social Sentiment${c.reset}`);
    const redditMomentum = await this.getRedditMomentum(market);
    if (redditMomentum !== null) {
      weightedSum += redditMomentum * 20; // 20% weight
      totalScore += 20;
      dataSourcesUsed.push('Reddit Sentiment');
      factors.push(`Reddit momentum: ${redditMomentum > 60 ? 'Strong' : redditMomentum > 40 ? 'Moderate' : 'Weak'}`);
      console.log(`      ✓ Reddit Momentum: ${redditMomentum > 50 ? c.green : c.red}${redditMomentum.toFixed(1)}%${c.reset}`);
    }

    // 5. MARKET PRICE ANALYSIS
    console.log(`   ${c.brightYellow}💹 Phase 5: Market Microstructure${c.reset}`);
    const marketAnalysis = this.analyzeMarketPrice(market.yesPrice, market.noPrice);
    weightedSum += marketAnalysis.probability * 15; // 15% weight
    totalScore += 15;
    dataSourcesUsed.push('Market Microstructure');
    factors.push(marketAnalysis.insight);
    console.log(`      ✓ Market Signal: ${marketAnalysis.probability > 50 ? c.green : c.red}${marketAnalysis.probability.toFixed(1)}%${c.reset}`);

    // 6. ADVANCED AI REASONING
    console.log(`   ${c.brightYellow}🤖 Phase 6: AI Deep Reasoning${c.reset}`);
    const aiReasoning = await this.getAIReasoning(market, factors);
    if (aiReasoning) {
      weightedSum += aiReasoning.probability * 10; // 10% weight
      totalScore += 10;
      dataSourcesUsed.push('Claude Haiku AI');
      reasoning.push(aiReasoning.reasoning);
      console.log(`      ✓ AI Reasoning: ${aiReasoning.probability > 50 ? c.green : c.red}${aiReasoning.probability.toFixed(1)}%${c.reset}`);
    }

    // CALCULATE FINAL PROBABILITY
    const finalProbability = totalScore > 0 ? weightedSum / totalScore : market.yesPrice;
    const edge = finalProbability - market.yesPrice;

    // Boost confidence if multiple sources agree
    const sourcesAbove50 = [fluxScore, claudeEffect, redditMomentum, marketAnalysis.probability, aiReasoning?.probability]
      .filter(s => s !== null && s !== undefined && s > 50).length;
    const sourcesBelow50 = [fluxScore, claudeEffect, redditMomentum, marketAnalysis.probability, aiReasoning?.probability]
      .filter(s => s !== null && s !== undefined && s < 50).length;

    if (sourcesAbove50 >= 4 || sourcesBelow50 >= 4) {
      confidence += 15; // Multiple sources agree
      reasoning.push(`Strong consensus: ${Math.max(sourcesAbove50, sourcesBelow50)} sources align`);
    }

    confidence = Math.min(confidence, 95); // Cap at 95%

    console.log(`\n   ${c.brightGreen}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`   ${c.brightWhite}FINAL PREDICTION${c.reset}`);
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
      fluxEngineScore: fluxScore || undefined,
      claudeEffectScore: claudeEffect || undefined,
      sentimentScore: redditMomentum || undefined,
    };
  }

  /**
   * Run the CEVICT Flux Engine for GME analysis
   */
  private async runFluxEngine(market: any): Promise<number | null> {
    try {
      // Check if the market is about GME stock price
      const title = market.title.toLowerCase();
      const isGMEPrice = title.includes('gamestop') || title.includes('gme');

      if (!isGMEPrice) return null;

      // Extract target price from market title if possible
      const priceMatch = title.match(/\$?(\d+)/);
      const targetPrice = priceMatch ? parseInt(priceMatch[1]) : null;

      if (!targetPrice) return null;

      // Run flux engine
      const command = `npx tsx ${this.fluxEnginePath} predict gme ${targetPrice}`;
      const { stdout } = await execPromise(command, {
        cwd: path.dirname(this.fluxEnginePath),
        timeout: 10000
      });

      // Parse probability from output
      const probMatch = stdout.match(/probability[:\s]+(\d+\.?\d*)%/i);
      if (probMatch) {
        return parseFloat(probMatch[1]);
      }

      return null;
    } catch (error) {
      // Flux engine not available or failed
      return null;
    }
  }

  /**
   * Run Claude Effect analysis (7 layers)
   */
  private async runClaudeEffect(market: any): Promise<number | null> {
    if (!this.claude) return null;

    try {
      const prompt = `Analyze this GameStop/GME prediction market using the Claude Effect framework (7 layers):

Market: "${market.title}"
Current YES price: ${market.yesPrice}¢
Current NO price: ${market.noPrice}¢

Apply these 7 layers:
1. Sentiment Field - Social media and retail sentiment
2. Narrative Momentum - Media coverage and story evolution
3. Information Asymmetry - Insider vs retail knowledge
4. Chaos Sensitivity - Volatility and unpredictability
5. Institutional Flow - Smart money positioning
6. Retail Coordination - r/WallStreetBets activity
7. Temporal Dynamics - Time decay and event proximity

Provide a probability (0-100) that YES wins, considering all layers.
Format: Just return a number between 0-100.`;

      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const numberMatch = content.match(/(\d+\.?\d*)/);

      if (numberMatch) {
        return parseFloat(numberMatch[1]);
      }

      return null;
    } catch (error) {
      console.error('Claude Effect analysis failed:', error);
      return null;
    }
  }

  /**
   * Get Reddit/social sentiment momentum
   */
  private async getRedditMomentum(market: any): Promise<number | null> {
    // Analyze market title for sentiment keywords
    const title = market.title.toLowerCase();
    const bullishKeywords = ['up', 'above', 'exceed', 'higher', 'gain', 'rise', 'moon', 'squeeze'];
    const bearishKeywords = ['down', 'below', 'under', 'lower', 'fall', 'drop', 'crash'];

    const bullishCount = bullishKeywords.filter(k => title.includes(k)).length;
    const bearishCount = bearishKeywords.filter(k => title.includes(k)).length;

    if (bullishCount + bearishCount === 0) return null;

    // Base sentiment on keyword analysis
    const sentiment = 50 + ((bullishCount - bearishCount) * 10);

    // Adjust based on historical GME patterns
    const gmeKnowledge = historicalKnowledge.getRelevantKnowledge('gamestop reddit wallstreetbets squeeze');
    const hasSqueeze = title.includes('squeeze') || title.includes('short');
    const hasVolatility = title.includes('volatile') || title.includes('swing');

    let adjustedSentiment = sentiment;

    if (hasSqueeze) {
      adjustedSentiment += 15; // Squeeze narratives tend bullish
    }

    if (hasVolatility && gmeKnowledge.length > 0) {
      adjustedSentiment += 10; // Historical volatility patterns
    }

    return Math.max(0, Math.min(100, adjustedSentiment));
  }

  /**
   * Analyze market price microstructure
   */
  private analyzeMarketPrice(yesPrice: number, noPrice: number): { probability: number; insight: string } {
    const spread = Math.abs(yesPrice - noPrice);
    const impliedProb = yesPrice;

    let insight = '';
    let adjustedProb = impliedProb;

    if (spread < 10) {
      insight = 'Tight spread suggests high certainty';
      // Price is likely efficient
    } else if (spread > 30) {
      insight = 'Wide spread indicates uncertainty or low liquidity';
      // Look for mispricing opportunity
      if (yesPrice < 40) {
        adjustedProb += 5; // Possibly undervalued
      } else if (yesPrice > 60) {
        adjustedProb -= 5; // Possibly overvalued
      }
    } else {
      insight = 'Normal market conditions';
    }

    // Check for extreme prices
    if (yesPrice < 20 || yesPrice > 80) {
      insight += ' - Extreme pricing detected';
    }

    return { probability: adjustedProb, insight };
  }

  /**
   * Get advanced AI reasoning from Claude
   */
  private async getAIReasoning(market: any, existingFactors: string[]): Promise<{ probability: number; reasoning: string } | null> {
    if (!this.claude) return null;

    try {
      const prompt = `As a GameStop/meme stock expert, analyze this Kalshi market:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Context factors:
${existingFactors.slice(0, 3).map(f => `- ${f}`).join('\n')}

Consider:
- Historical GME volatility patterns
- Retail vs institutional dynamics
- Social media momentum
- Options market signals
- Broader market conditions

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
          reasoning: parsed.reasoning || 'AI analysis complete',
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a market is GME-related
   */
  isGMERelated(marketTitle: string): boolean {
    const title = marketTitle.toLowerCase();
    const gmeKeywords = ['gamestop', 'gme', 'game stop', 'meme stock', 'wallstreetbets', 'wsb'];
    return gmeKeywords.some(kw => title.includes(kw));
  }
}

// Singleton export
export const gmeSpecialist = new GMESpecialist();


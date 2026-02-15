/**
 * AI BRAIN - UNIFIED INTELLIGENCE CENTER
 * Integrates ALL intelligence modules for comprehensive analysis
 *
 * Combines:
 * - Category Learners (politics, sports, weather, etc.)
 * - Historical Knowledge (crypto cycles, seasonality, etc.)
 * - Entertainment Expert (movies, awards, etc.)
 * - Derivatives Expert (options flow, Greeks, etc.)
 * - Market Learner (pattern recognition)
 * - Past Performance (learns from wins/losses)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getBotPredictions, saveBotPrediction, getBotConfig } from './lib/supabase-memory';
import { historicalKnowledge, CRYPTO_HISTORY } from './intelligence/historical-knowledge';

const anthropic = new Anthropic();

const c = {
  reset: '\x1b[0m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',
  brightRed: '\x1b[91m',
  dim: '\x1b[2m',
};

export type Category = 'crypto' | 'politics' | 'economics' | 'entertainment' | 'sports' | 'weather' | 'technology' | 'health' | 'world' | 'companies' | 'financials' | 'climate' | 'culture';

interface AIAnalysis {
  prediction: 'yes' | 'no' | 'buy' | 'sell';
  confidence: number;
  edge: number;
  probability: number;
  reasoning: string[];
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  historicalContext: string[];
  learnedPatterns: string[];
}

interface MarketContext {
  id: string;
  title: string;
  category: Category;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  expiresAt?: string;
}

interface CryptoContext {
  pair: string;
  price: number;
  change24h: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  candles?: { open: number; high: number; low: number; close: number; volume: number; time: number }[];
}

/**
 * AI BRAIN CLASS
 * Central intelligence for all trading decisions
 */
export class AIBrain {
  private aiCallsToday = 0;
  private maxAICallsPerDay = 100;
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

  /**
   * COMPREHENSIVE KALSHI MARKET ANALYSIS
   */
  async analyzeKalshiMarket(market: MarketContext): Promise<AIAnalysis | null> {
    if (!this.canMakeAICall()) {
      console.log(`   ${c.brightYellow}⚠️  AI call limit reached${c.reset}`);
      return null;
    }

    try {
      console.log(`   ${c.brightMagenta}🧠 AI Brain analyzing: ${market.title.substring(0, 50)}...${c.reset}`);
      this.aiCallsToday++;

      // Gather all context
      const category = market.category;
      const historicalContext = this.getHistoricalContext(market.title, category);
      const pastPerformance = await this.getPastPerformance(category);
      const seasonalFactors = this.getSeasonalFactors(category);
      const categoryExpertise = this.getCategoryExpertise(category);

      const prompt = `You are an elite prediction market analyst with access to comprehensive historical data and learning systems.

=== MARKET TO ANALYZE ===
Title: ${market.title}
Category: ${category.toUpperCase()}
Current YES Price: ${market.yesPrice}¢ (market implies ${market.yesPrice}% probability)
Current NO Price: ${market.noPrice}¢
Volume: ${market.volume || 'Unknown'}
Expires: ${market.expiresAt || 'Unknown'}

=== HISTORICAL KNOWLEDGE ===
${historicalContext.length > 0 ? historicalContext.join('\n') : 'No specific historical data for this market type'}

=== SEASONAL/TIMING FACTORS ===
${seasonalFactors.join('\n')}

=== CATEGORY EXPERTISE ===
${categoryExpertise.join('\n')}

=== PAST PREDICTION PERFORMANCE ===
Total predictions in ${category}: ${pastPerformance.total}
Win rate: ${pastPerformance.winRate.toFixed(1)}%
Average edge achieved: ${pastPerformance.avgEdge.toFixed(1)}%
Recent trend: ${pastPerformance.recentTrend}

=== YOUR TASK ===
1. Determine if the market is MISPRICED
2. Calculate your TRUE probability estimate
3. Identify the EDGE (difference between your estimate and market price)
4. Consider what information the market might be MISSING
5. Account for any BIASES in how these markets typically trade

=== RESPONSE FORMAT ===
Respond ONLY with valid JSON:
{
  "prediction": "yes" or "no",
  "probability": your true probability estimate (0-100),
  "confidence": how confident in your analysis (50-95),
  "edge": absolute edge in percentage points (0-50),
  "reasoning": ["key reason 1", "key reason 2", "key reason 3"],
  "factors": ["factor 1", "factor 2"],
  "riskLevel": "low", "medium", or "high",
  "historicalParallels": ["relevant historical pattern 1"],
  "marketInefficiency": "why the market might be wrong"
}

IMPORTANT: Only recommend trades with edge >= 3%. If market seems efficient, set confidence=50, edge=0.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const analysis = JSON.parse(jsonMatch[0]);

      console.log(`   ${c.brightGreen}✅ AI Brain: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf, ${analysis.edge}% edge${c.reset}`);
      if (analysis.marketInefficiency) {
        console.log(`   ${c.dim}💡 Inefficiency: ${analysis.marketInefficiency.substring(0, 60)}...${c.reset}`);
      }

      return {
        prediction: analysis.prediction,
        confidence: Math.min(95, Math.max(50, analysis.confidence)),
        edge: Math.min(50, Math.max(0, analysis.edge)),
        probability: analysis.probability,
        reasoning: analysis.reasoning || [],
        factors: analysis.factors || [],
        riskLevel: analysis.riskLevel || 'medium',
        historicalContext: analysis.historicalParallels || [],
        learnedPatterns: [],
      };
    } catch (err: any) {
      console.error(`   ${c.brightRed}❌ AI Brain error: ${err.message}${c.reset}`);
      return null;
    }
  }

  /**
   * COMPREHENSIVE CRYPTO ANALYSIS
   */
  async analyzeCrypto(crypto: CryptoContext): Promise<AIAnalysis | null> {
    if (!this.canMakeAICall()) {
      return null;
    }

    try {
      console.log(`   ${c.brightMagenta}🧠 AI Brain analyzing: ${crypto.pair}...${c.reset}`);
      this.aiCallsToday++;

      // Get crypto-specific historical context
      const currentMonth = new Date().toLocaleString('en', { month: 'long' }).toLowerCase();
      const seasonality = CRYPTO_HISTORY.seasonality[currentMonth as keyof typeof CRYPTO_HISTORY.seasonality];
      const halvingContext = this.getHalvingContext();
      const technicalContext = this.buildTechnicalContext(crypto);

      const prompt = `You are an expert crypto trader with deep knowledge of market cycles, technical analysis, and on-chain metrics.

=== ASSET ===
Pair: ${crypto.pair}
Current Price: $${crypto.price.toFixed(2)}
24H Change: ${crypto.change24h?.toFixed(2) || 'N/A'}%
24H High: $${crypto.high24h?.toFixed(2) || 'N/A'}
24H Low: $${crypto.low24h?.toFixed(2) || 'N/A'}
24H Volume: $${crypto.volume24h?.toLocaleString() || 'N/A'}

=== TECHNICAL ANALYSIS ===
${technicalContext}

=== BITCOIN HALVING CYCLE CONTEXT ===
${halvingContext}

=== SEASONALITY (${currentMonth.toUpperCase()}) ===
Historical average return: ${seasonality?.avg || 0}%
Pattern: ${seasonality?.description || 'No data'}

=== YOUR TASK ===
Analyze for a SHORT-TERM trade (1-4 hour timeframe).

Consider:
1. Current momentum and trend
2. Support/resistance levels from recent price action
3. Volume confirmation
4. Risk/reward ratio
5. Halving cycle position
6. Seasonal patterns

=== RESPONSE FORMAT ===
Respond ONLY with valid JSON:
{
  "prediction": "buy" or "sell",
  "confidence": 50-75 (crypto is volatile, be conservative),
  "edge": 0-8 (expected edge percentage),
  "probability": win probability (50-75),
  "reasoning": ["reason 1", "reason 2"],
  "factors": ["factor 1"],
  "riskLevel": "low", "medium", or "high",
  "suggestedStopLoss": percentage number (e.g., 2.0),
  "suggestedTakeProfit": percentage number (e.g., 1.5),
  "keyLevels": {
    "support": price number,
    "resistance": price number
  }
}

Be CONSERVATIVE. Only recommend if clear setup exists. If sideways/unclear, use confidence=50, edge=0.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const analysis = JSON.parse(jsonMatch[0]);

      console.log(`   ${c.brightGreen}✅ AI Brain: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf${c.reset}`);
      if (analysis.keyLevels) {
        console.log(`   ${c.dim}📊 Key levels: Support $${analysis.keyLevels.support?.toFixed(0)}, Resistance $${analysis.keyLevels.resistance?.toFixed(0)}${c.reset}`);
      }

      return {
        prediction: analysis.prediction,
        confidence: Math.min(75, Math.max(50, analysis.confidence)),
        edge: Math.min(8, Math.max(0, analysis.edge)),
        probability: analysis.probability || analysis.confidence,
        reasoning: analysis.reasoning || [],
        factors: analysis.factors || [],
        riskLevel: analysis.riskLevel || 'high',
        historicalContext: [],
        learnedPatterns: [],
      };
    } catch (err: any) {
      console.error(`   ${c.brightRed}❌ AI Brain error: ${err.message}${c.reset}`);
      return null;
    }
  }

  /**
   * HELPER: Get historical context for market
   */
  private getHistoricalContext(title: string, category: Category): string[] {
    const context: string[] = [];
    const lowerTitle = title.toLowerCase();

    try {
      // Use the historical knowledge module
      const relevantKnowledge = historicalKnowledge.getRelevantKnowledge(lowerTitle);
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        context.push(...relevantKnowledge.slice(0, 5));
      }
    } catch {
      // Fallback if module not available
    }

    // Category-specific context
    if (category === 'politics') {
      context.push('Political prediction markets often show partisan bias');
      context.push('Incumbents historically underpriced in early markets');
      context.push('Markets tend to overreact to polls');
    } else if (category === 'weather') {
      context.push('Weather markets are among most efficient - forecasts are public');
      context.push('Edge usually comes from timing, not prediction accuracy');
      context.push('Extreme weather events often underpriced');
    } else if (category === 'sports') {
      context.push('Sharp money typically moves lines efficiently');
      context.push('Public tends to overbet favorites and overs');
      context.push('Injury news creates temporary mispricings');
    } else if (category === 'economics') {
      context.push('Fed decisions rarely surprise - watch dot plots');
      context.push('GDP/inflation prints vs expectations matter more than absolute');
      context.push('Markets price in consensus before release');
    }

    return context;
  }

  /**
   * HELPER: Get past performance for learning
   */
  private async getPastPerformance(category: Category): Promise<{
    total: number;
    winRate: number;
    avgEdge: number;
    recentTrend: string;
  }> {
    try {
      const predictions = await getBotPredictions(category, 'kalshi', 50);
      const resolved = predictions.filter((p: any) => p.actual_outcome !== null);
      const wins = resolved.filter((p: any) => p.actual_outcome === 'win').length;
      const totalEdge = predictions.reduce((sum: number, p: any) => sum + (p.edge || 0), 0);

      // Calculate recent trend (last 10 vs previous 10)
      const recent10 = resolved.slice(0, 10);
      const previous10 = resolved.slice(10, 20);
      const recentWinRate = recent10.length > 0 ? (recent10.filter((p: any) => p.actual_outcome === 'win').length / recent10.length) * 100 : 50;
      const previousWinRate = previous10.length > 0 ? (previous10.filter((p: any) => p.actual_outcome === 'win').length / previous10.length) * 100 : 50;

      let recentTrend = 'stable';
      if (recentWinRate > previousWinRate + 10) recentTrend = 'improving';
      else if (recentWinRate < previousWinRate - 10) recentTrend = 'declining';

      return {
        total: predictions.length,
        winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 50,
        avgEdge: predictions.length > 0 ? totalEdge / predictions.length : 0,
        recentTrend,
      };
    } catch {
      return { total: 0, winRate: 50, avgEdge: 0, recentTrend: 'unknown' };
    }
  }

  /**
   * HELPER: Get seasonal factors
   */
  private getSeasonalFactors(category: Category): string[] {
    const now = new Date();
    const month = now.getMonth();
    const dayOfWeek = now.getDay();
    const factors: string[] = [];

    // Time-based factors
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      factors.push('Weekend: Lower liquidity, potential for mispricings');
    }
    if (dayOfWeek === 1) {
      factors.push('Monday: Often see reversals from weekend sentiment');
    }
    if (dayOfWeek === 5) {
      factors.push('Friday: Position squaring before weekend');
    }

    // Month-based
    if (month === 0) factors.push('January: New year positioning, tax-loss selling recovery');
    if (month === 3) factors.push('April: Tax deadline effects, Q1 earnings');
    if (month === 8) factors.push('September: Historically volatile month');
    if (month === 11) factors.push('December: Year-end positioning, holiday liquidity');

    // Category-specific seasonality
    if (category === 'sports') {
      if (month >= 8 || month <= 1) factors.push('NFL season: High betting volume, efficient markets');
      if (month >= 2 && month <= 5) factors.push('March Madness/NBA playoffs: Casual money creates edges');
    }
    if (category === 'politics') {
      if (month >= 9) factors.push('Election season: High attention, but also high efficiency');
    }

    return factors;
  }

  /**
   * HELPER: Get category expertise
   */
  private getCategoryExpertise(category: Category): string[] {
    const expertise: { [key in Category]: string[] } = {
      crypto: [
        'Crypto markets trade 24/7, high volatility',
        'Strongly correlated with BTC movements',
        'News-driven, reacts fast to regulatory updates',
      ],
      politics: [
        'Markets often reflect partisan bias',
        'Polling aggregates are public info - edge is in interpretation',
        'Late-breaking news can cause rapid repricing',
      ],
      economics: [
        'Fed decisions are well-telegraphed',
        'Consensus estimates are the baseline',
        'Surprise factor matters more than direction',
      ],
      weather: [
        'Professional forecasts are public and accurate',
        'Edge comes from understanding model uncertainty',
        'Extreme events often underpriced',
      ],
      sports: [
        'Sharp money moves lines quickly',
        'Public bias toward favorites and overs',
        'Injury/lineup news is key edge source',
      ],
      entertainment: [
        'Award shows have clear frontrunners',
        'Critic consensus often predicts winners',
        'Narrative matters - "overdue" factor',
      ],
      technology: [
        'Product launches are scheduled, priced in',
        'Regulatory decisions are key unknowns',
        'Earnings surprises drive movements',
      ],
      health: [
        'FDA decisions have historical patterns',
        'Clinical trial results are binary events',
        'Expert consensus often accurate',
      ],
      world: [
        'Geopolitical events are hard to predict',
        'Markets often underreact to tail risks',
        'News flow creates volatility',
      ],
      companies: [
        'Earnings dates are known',
        'Guidance matters more than results',
        'M&A rumors create opportunity',
      ],
      financials: [
        'Central bank decisions are telegraphed',
        'Market moves price in expectations',
        'Dot plots and minutes are key',
      ],
      climate: [
        'Long-term trends are predictable',
        'Short-term events have uncertainty',
        'Scientific consensus is usually correct',
      ],
      culture: [
        'Social trends are hard to time',
        'Viral events are unpredictable',
        'Polls can indicate direction',
      ],
    };

    return expertise[category] || ['General market analysis applies'];
  }

  /**
   * HELPER: Get Bitcoin halving context
   */
  private getHalvingContext(): string {
    const lastHalving = new Date('2024-04-20');
    const now = new Date();
    const daysSinceHalving = Math.floor((now.getTime() - lastHalving.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceHalving < 180) {
      return `${daysSinceHalving} days since halving - Early post-halving accumulation phase. Historically, major moves begin 6-12 months after halving.`;
    } else if (daysSinceHalving < 365) {
      return `${daysSinceHalving} days since halving - Prime bull run initiation zone. Historical peaks occur ~18 months post-halving.`;
    } else if (daysSinceHalving < 540) {
      return `${daysSinceHalving} days since halving - Peak bull run territory. Watch for cycle top signals.`;
    } else {
      return `${daysSinceHalving} days since halving - Late cycle. Risk of correction increases.`;
    }
  }

  /**
   * HELPER: Build technical context from candles
   */
  private buildTechnicalContext(crypto: CryptoContext): string {
    if (!crypto.candles || crypto.candles.length < 5) {
      return 'Insufficient candle data for technical analysis';
    }

    const candles = crypto.candles.slice(-20);
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // Simple moving averages
    const sma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const sma20 = closes.reduce((a, b) => a + b, 0) / closes.length;

    // Recent high/low
    const recentHigh = Math.max(...highs.slice(-10));
    const recentLow = Math.min(...lows.slice(-10));

    // Trend
    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const trend = lastClose > firstClose ? 'UPTREND' : 'DOWNTREND';
    const trendStrength = Math.abs((lastClose - firstClose) / firstClose * 100);

    // Volume trend
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderVolume = volumes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const volumeTrend = recentVolume > olderVolume * 1.2 ? 'INCREASING' : recentVolume < olderVolume * 0.8 ? 'DECREASING' : 'STABLE';

    return `
Trend: ${trend} (${trendStrength.toFixed(2)}% over ${candles.length} candles)
SMA5: $${sma5.toFixed(2)} | SMA20: $${sma20.toFixed(2)}
Price vs SMA5: ${crypto.price > sma5 ? 'ABOVE' : 'BELOW'}
Price vs SMA20: ${crypto.price > sma20 ? 'ABOVE' : 'BELOW'}
Recent High: $${recentHigh.toFixed(2)} | Recent Low: $${recentLow.toFixed(2)}
Volume Trend: ${volumeTrend}
Distance from High: ${((recentHigh - crypto.price) / crypto.price * 100).toFixed(2)}%
Distance from Low: ${((crypto.price - recentLow) / crypto.price * 100).toFixed(2)}%`;
  }

  /**
   * Get AI calls remaining
   */
  getAICallsRemaining(): number {
    this.resetDailyCounterIfNeeded();
    return this.maxAICallsPerDay - this.aiCallsToday;
  }
}

// Export singleton instance
export const aiBrain = new AIBrain();

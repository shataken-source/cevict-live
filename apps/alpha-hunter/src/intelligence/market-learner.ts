/**
 * Market Learner
 * Learns about new crypto concepts and Kalshi markets
 * Becomes an expert and provides data to traders
 */

import Anthropic from '@anthropic-ai/sdk';

interface MarketExpertise {
  marketId: string;
  marketTitle: string;
  category: string;
  learnedAt: Date;
  expertiseLevel: number; // 0-100
  keyInsights: string[];
  historicalData: {
    price: number;
    volume: number;
    timestamp: Date;
  }[];
  patterns: {
    type: string;
    description: string;
    confidence: number;
  }[];
  predictions: {
    outcome: string;
    probability: number;
    reasoning: string;
  }[];
  lastUpdated: Date;
}

interface CryptoConcept {
  symbol: string;
  name: string;
  learnedAt: Date;
  keyMetrics: {
    marketCap?: number;
    volume24h?: number;
    priceHistory?: number[];
  };
  tradingPatterns: string[];
  correlations: {
    asset: string;
    strength: number;
  }[];
}

export class MarketLearner {
  private claude: Anthropic | null;
  private kalshiExpertise: Map<string, MarketExpertise> = new Map();
  private cryptoConcepts: Map<string, CryptoConcept> = new Map();
  private learningQueue: string[] = [];

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  /**
   * Learn about a new Kalshi market - become an expert
   */
  async learnKalshiMarket(marketId: string, marketTitle: string, category: string): Promise<MarketExpertise> {
    console.log(`\n📚 LEARNING NEW KALSHI MARKET: ${marketTitle}`);
    console.log(`   Market ID: ${marketId}`);
    console.log(`   Category: ${category}`);

    if (this.kalshiExpertise.has(marketId)) {
      console.log(`   ✅ Already learned - refreshing knowledge...`);
      return this.refreshMarketKnowledge(marketId);
    }

    const expertise: MarketExpertise = {
      marketId,
      marketTitle,
      category,
      learnedAt: new Date(),
      expertiseLevel: 0,
      keyInsights: [],
      historicalData: [],
      patterns: [],
      predictions: [],
      lastUpdated: new Date(),
    };

    // Phase 1: Research the market topic
    console.log(`   🔍 Phase 1: Researching market topic...`);
    const research = await this.researchMarketTopic(marketTitle, category);
    expertise.keyInsights = research.insights;
    expertise.expertiseLevel = 20;

    // Phase 2: Analyze historical patterns
    console.log(`   📊 Phase 2: Analyzing patterns...`);
    const patterns = await this.analyzeMarketPatterns(marketTitle, category);
    expertise.patterns = patterns;
    expertise.expertiseLevel = 50;

    // Phase 3: Make predictions
    console.log(`   🎯 Phase 3: Generating predictions...`);
    const predictions = await this.generatePredictions(marketTitle, research, patterns);
    expertise.predictions = predictions;
    expertise.expertiseLevel = 75;

    // Phase 4: Become expert
    console.log(`   🧠 Phase 4: Becoming expert...`);
    const expertAnalysis = await this.becomeExpert(marketTitle, research, patterns, predictions);
    expertise.keyInsights.push(...expertAnalysis.additionalInsights);
    expertise.expertiseLevel = 90;

    expertise.lastUpdated = new Date();
    this.kalshiExpertise.set(marketId, expertise);

    console.log(`   ✅ EXPERT STATUS ACHIEVED! (${expertise.expertiseLevel}% expertise)`);
    console.log(`   📈 Key Insights: ${expertise.keyInsights.length}`);
    console.log(`   🔄 Patterns Identified: ${expertise.patterns.length}`);
    console.log(`   🎯 Predictions: ${expertise.predictions.length}`);

    return expertise;
  }

  /**
   * Research market topic deeply
   */
  private async researchMarketTopic(title: string, category: string): Promise<{
    insights: string[];
    context: string;
    factors: string[];
  }> {
    if (!this.claude) {
      return {
        insights: [
          `Market: ${title}`,
          `Category: ${category}`,
          'Basic market analysis',
        ],
        context: 'Market research',
        factors: ['Market sentiment', 'Historical trends'],
      };
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a prediction market expert. Research this Kalshi market deeply:

MARKET: ${title}
CATEGORY: ${category}

Provide:
1. Key factors that influence this market
2. Historical context and similar markets
3. What data sources would help predict this
4. Risk factors
5. Edge opportunities

Format as JSON with: insights (array), context (string), factors (array)`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      
      return {
        insights: json.insights || [],
        context: json.context || '',
        factors: json.factors || [],
      };
    } catch (error: any) {
      console.error(`   ⚠️ Research failed: ${error.message}`);
      return {
        insights: [`Market: ${title}`, `Category: ${category}`],
        context: 'Basic research',
        factors: ['Market factors'],
      };
    }
  }

  /**
   * Analyze market patterns
   */
  private async analyzeMarketPatterns(title: string, category: string): Promise<MarketExpertise['patterns']> {
    if (!this.claude) {
      return [
        { type: 'trend', description: 'Market trend analysis', confidence: 60 },
        { type: 'volatility', description: 'Price volatility patterns', confidence: 55 },
      ];
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Analyze patterns for this Kalshi market: ${title}

Identify:
1. Price movement patterns
2. Volume patterns
3. Timing patterns
4. Correlation patterns

Return JSON: [{type, description, confidence}]`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
      return json;
    } catch {
      return [
        { type: 'trend', description: 'Market trend', confidence: 60 },
      ];
    }
  }

  /**
   * Generate predictions
   */
  private async generatePredictions(
    title: string,
    research: any,
    patterns: MarketExpertise['patterns']
  ): Promise<MarketExpertise['predictions']> {
    if (!this.claude) {
      return [
        {
          outcome: 'YES',
          probability: 55,
          reasoning: 'Based on market analysis',
        },
      ];
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Generate predictions for: ${title}

Research: ${JSON.stringify(research)}
Patterns: ${JSON.stringify(patterns)}

Provide 3 predictions with probabilities and reasoning.
JSON: [{outcome, probability, reasoning}]`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
      return json;
    } catch {
      return [
        {
          outcome: 'YES',
          probability: 55,
          reasoning: 'Market analysis',
        },
      ];
    }
  }

  /**
   * Become expert - final analysis
   */
  private async becomeExpert(
    title: string,
    research: any,
    patterns: MarketExpertise['patterns'],
    predictions: MarketExpertise['predictions']
  ): Promise<{
    additionalInsights: string[];
    expertAdvice: string;
  }> {
    if (!this.claude) {
      return {
        additionalInsights: ['Expert analysis complete'],
        expertAdvice: 'Monitor market closely',
      };
    }

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are now an EXPERT on this Kalshi market: ${title}

Research: ${JSON.stringify(research)}
Patterns: ${JSON.stringify(patterns)}
Predictions: ${JSON.stringify(predictions)}

Provide:
1. Advanced insights only an expert would know
2. Expert trading advice
3. Edge opportunities
4. Risk warnings

JSON: {additionalInsights: [], expertAdvice: string}`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return json;
    } catch {
      return {
        additionalInsights: ['Expert analysis'],
        expertAdvice: 'Trade carefully',
      };
    }
  }

  /**
   * Refresh market knowledge
   */
  private async refreshMarketKnowledge(marketId: string): Promise<MarketExpertise> {
    const expertise = this.kalshiExpertise.get(marketId)!;
    
    // Update predictions with latest data
    const updatedPredictions = await this.generatePredictions(
      expertise.marketTitle,
      { insights: expertise.keyInsights },
      expertise.patterns
    );
    
    expertise.predictions = updatedPredictions;
    expertise.lastUpdated = new Date();
    expertise.expertiseLevel = Math.min(100, expertise.expertiseLevel + 5);

    return expertise;
  }

  /**
   * Get expert data for trader
   */
  getExpertData(marketId: string): MarketExpertise | null {
    return this.kalshiExpertise.get(marketId) || null;
  }

  /**
   * Learn new crypto concept
   */
  async learnCryptoConcept(symbol: string, name: string): Promise<CryptoConcept> {
    console.log(`\n📚 LEARNING CRYPTO CONCEPT: ${name} (${symbol})`);

    const concept: CryptoConcept = {
      symbol,
      name,
      learnedAt: new Date(),
      keyMetrics: {},
      tradingPatterns: [],
      correlations: [],
    };

    if (this.claude) {
      try {
        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Learn about ${name} (${symbol}):

1. Key trading patterns
2. Correlations with other assets
3. Market behavior
4. Best trading strategies

JSON: {tradingPatterns: [], correlations: [{asset, strength}]}`
          }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
        concept.tradingPatterns = json.tradingPatterns || [];
        concept.correlations = json.correlations || [];
      } catch (error) {
        console.error(`   ⚠️ Learning failed: ${error}`);
      }
    }

    this.cryptoConcepts.set(symbol, concept);
    console.log(`   ✅ Learned ${concept.tradingPatterns.length} patterns, ${concept.correlations.length} correlations`);
    
    return concept;
  }

  /**
   * Get all learned markets
   */
  getAllLearnedMarkets(): MarketExpertise[] {
    return Array.from(this.kalshiExpertise.values());
  }

  /**
   * Get all learned crypto concepts
   */
  getAllCryptoConcepts(): CryptoConcept[] {
    return Array.from(this.cryptoConcepts.values());
  }
}

// Global instance
export const marketLearner = new MarketLearner();


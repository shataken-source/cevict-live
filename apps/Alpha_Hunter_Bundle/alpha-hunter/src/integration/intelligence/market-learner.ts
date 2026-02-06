/**
 * Market Learner - ZERO API COST VERSION
 * Uses simple math and heuristics instead of Claude API calls
 * Saves your Anthropic credits for actual important tasks
 */

// NO ANTHROPIC IMPORT - We don't need it!

interface MarketExpertise {
  marketId: string;
  marketTitle: string;
  category: string;
  learnedAt: Date;
  expertiseLevel: number;
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
  // NO CLAUDE CLIENT - Saves money!
  private kalshiExpertise: Map<string, MarketExpertise> = new Map();
  private cryptoConcepts: Map<string, CryptoConcept> = new Map();

  constructor() {
    // No API initialization needed - we use math, not AI
    console.log('   📊 Market Learner initialized (zero API cost mode)');
  }

  /**
   * Learn about a new Kalshi market using simple analysis
   * NO API CALLS - Just smart heuristics
   */
  async learnKalshiMarket(marketId: string, marketTitle: string, category: string): Promise<MarketExpertise> {
    // Skip if already learned
    if (this.kalshiExpertise.has(marketId)) {
      return this.kalshiExpertise.get(marketId)!;
    }

    // Simple keyword-based analysis (FREE!)
    const insights = this.extractInsights(marketTitle, category);
    const patterns = this.identifyPatterns(marketTitle, category);
    const predictions = this.generateSimplePredictions(marketTitle, category);

    const expertise: MarketExpertise = {
      marketId,
      marketTitle,
      category,
      learnedAt: new Date(),
      expertiseLevel: 75, // We're honest about our heuristic-based approach
      keyInsights: insights,
      historicalData: [],
      patterns,
      predictions,
      lastUpdated: new Date(),
    };

    this.kalshiExpertise.set(marketId, expertise);
    
    // Minimal logging - don't spam console
    if (this.kalshiExpertise.size % 10 === 0) {
      console.log(`   📚 Learned ${this.kalshiExpertise.size} markets (zero API cost)`);
    }

    return expertise;
  }

  /**
   * Extract insights using keyword matching (FREE!)
   */
  private extractInsights(title: string, category: string): string[] {
    const insights: string[] = [];
    const lowerTitle = title.toLowerCase();

    // Category-specific insights
    if (lowerTitle.includes('temperature') || lowerTitle.includes('weather')) {
      insights.push('Weather markets have historical data patterns');
      insights.push('NOAA forecasts provide baseline predictions');
    } else if (lowerTitle.includes('bitcoin') || lowerTitle.includes('crypto') || lowerTitle.includes('btc')) {
      insights.push('Crypto markets are highly volatile');
      insights.push('24/7 trading affects price dynamics');
    } else if (lowerTitle.includes('election') || lowerTitle.includes('vote')) {
      insights.push('Polling data affects market prices');
      insights.push('Historical voting patterns matter');
    } else if (lowerTitle.includes('tesla') || lowerTitle.includes('deliveries') || lowerTitle.includes('production')) {
      insights.push('Company guidance provides baseline');
      insights.push('Quarterly patterns are predictable');
    } else if (lowerTitle.includes('fed') || lowerTitle.includes('rate')) {
      insights.push('Fed dot plots indicate likely decisions');
      insights.push('Market pricing reflects consensus');
    }

    // Add generic insight
    insights.push(`Market category: ${category}`);

    return insights;
  }

  /**
   * Identify patterns using simple rules (FREE!)
   */
  private identifyPatterns(title: string, category: string): MarketExpertise['patterns'] {
    const patterns: MarketExpertise['patterns'] = [];
    const lowerTitle = title.toLowerCase();

    // Time-based patterns
    if (lowerTitle.includes('daily') || lowerTitle.includes('today')) {
      patterns.push({
        type: 'time_decay',
        description: 'Short-term market - price converges to outcome',
        confidence: 70,
      });
    }

    // Range-based patterns
    if (lowerTitle.match(/\d+[-–]\d+/)) {
      patterns.push({
        type: 'range_bound',
        description: 'Specific range target - check historical frequency',
        confidence: 65,
      });
    }

    // Binary outcome patterns
    if (lowerTitle.includes('will') || lowerTitle.includes('?')) {
      patterns.push({
        type: 'binary',
        description: 'Yes/No outcome - look for edge in probability',
        confidence: 60,
      });
    }

    // Default pattern
    if (patterns.length === 0) {
      patterns.push({
        type: 'general',
        description: 'Standard market dynamics apply',
        confidence: 55,
      });
    }

    return patterns;
  }

  /**
   * Generate simple predictions based on market structure (FREE!)
   */
  private generateSimplePredictions(title: string, category: string): MarketExpertise['predictions'] {
    const lowerTitle = title.toLowerCase();
    
    // Default: slight bias toward NO (most specific predictions fail)
    let outcome = 'NO';
    let probability = 45;
    let reasoning = 'Specific predictions typically have lower success rates';

    // Adjust based on keywords
    if (lowerTitle.includes('temperature')) {
      // Weather tends to be near historical averages
      outcome = 'CHECK_HISTORICAL';
      probability = 50;
      reasoning = 'Compare to historical temperature data for this date';
    } else if (lowerTitle.includes('above') || lowerTitle.includes('over') || lowerTitle.includes('more than')) {
      // "Above X" markets - check if threshold is reasonable
      outcome = 'ANALYZE_THRESHOLD';
      probability = 50;
      reasoning = 'Compare threshold to historical averages';
    } else if (lowerTitle.includes('below') || lowerTitle.includes('under') || lowerTitle.includes('less than')) {
      outcome = 'ANALYZE_THRESHOLD';
      probability = 50;
      reasoning = 'Compare threshold to historical averages';
    }

    return [{
      outcome,
      probability,
      reasoning,
    }];
  }

  /**
   * Get expert data for trader
   */
  getExpertData(marketId: string): MarketExpertise | null {
    return this.kalshiExpertise.get(marketId) || null;
  }

  /**
   * Learn crypto concept (simple version - NO API)
   */
  async learnCryptoConcept(symbol: string, name: string): Promise<CryptoConcept> {
    // Skip if already learned
    if (this.cryptoConcepts.has(symbol)) {
      return this.cryptoConcepts.get(symbol)!;
    }

    const concept: CryptoConcept = {
      symbol,
      name,
      learnedAt: new Date(),
      keyMetrics: {},
      tradingPatterns: this.getCryptoPatterns(symbol),
      correlations: this.getCryptoCorrelations(symbol),
    };

    this.cryptoConcepts.set(symbol, concept);
    return concept;
  }

  /**
   * Get standard crypto trading patterns (FREE!)
   */
  private getCryptoPatterns(symbol: string): string[] {
    const patterns = [
      'Follows overall crypto market sentiment',
      'Higher volatility during US market hours',
      'Weekend volume typically lower',
    ];

    if (symbol === 'BTC' || symbol === 'BTC-USD') {
      patterns.push('Bitcoin dominance affects altcoin correlation');
      patterns.push('Halving cycles create 4-year patterns');
    } else if (symbol === 'ETH' || symbol === 'ETH-USD') {
      patterns.push('Gas fees affect network usage');
      patterns.push('Staking yields influence holding patterns');
    } else if (symbol === 'SOL' || symbol === 'SOL-USD') {
      patterns.push('High throughput attracts DeFi activity');
      patterns.push('Network outages can cause sharp drops');
    }

    return patterns;
  }

  /**
   * Get standard crypto correlations (FREE!)
   */
  private getCryptoCorrelations(symbol: string): CryptoConcept['correlations'] {
    const correlations: CryptoConcept['correlations'] = [];

    if (symbol !== 'BTC' && symbol !== 'BTC-USD') {
      correlations.push({ asset: 'BTC', strength: 0.75 });
    }
    if (symbol !== 'ETH' && symbol !== 'ETH-USD') {
      correlations.push({ asset: 'ETH', strength: 0.65 });
    }
    correlations.push({ asset: 'SPY', strength: 0.45 }); // Stock market correlation
    correlations.push({ asset: 'DXY', strength: -0.35 }); // Inverse dollar correlation

    return correlations;
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

  /**
   * Get stats
   */
  getStats(): { marketsLearned: number; cryptoLearned: number; apiCalls: number } {
    return {
      marketsLearned: this.kalshiExpertise.size,
      cryptoLearned: this.cryptoConcepts.size,
      apiCalls: 0, // ZERO!
    };
  }
}

// Global instance
export const marketLearner = new MarketLearner();
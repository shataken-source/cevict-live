/**
 * CATEGORY-SPECIFIC LEARNING BOTS - ZERO API COST VERSION
 * Uses math and heuristics instead of Claude API calls
 * Saves your Anthropic credits!
 */

// NO ANTHROPIC IMPORT - Saves money!
import { KalshiTrader } from './kalshi-trader';
import { historicalKnowledge } from './historical-knowledge';
import { getBotPredictions } from '../../lib/supabase-memory.js';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
};

export type KalshiCategory = 'crypto' | 'politics' | 'economics' | 'entertainment' | 'sports' | 'weather' | 'technology' | 'health' | 'world' | 'companies' | 'financials' | 'climate' | 'culture' | 'general';

interface MarketPrediction {
  marketId: string;
  title: string;
  category: KalshiCategory;
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  learnedFrom: string[];
}

interface TrainingData {
  marketId: string;
  title: string;
  category: KalshiCategory;
  prediction: 'yes' | 'no';
  predictedProbability: number;
  actualOutcome: 'yes' | 'no' | null;
  actualProbability: number | null;
  wasCorrect: boolean | null;
  edge: number;
  timestamp: Date;
}

interface CategoryBot {
  category: KalshiCategory;
  trainingData: TrainingData[];
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  averageEdge: number;
  lastTrained: Date;
  expertise: string[];
  patterns: string[];
}

export class CategoryLearner {
  // NO CLAUDE CLIENT - Zero API cost!
  private kalshi: KalshiTrader;
  private bots: Map<KalshiCategory, CategoryBot> = new Map();

  constructor() {
    this.kalshi = new KalshiTrader();
    this.initializeBots();
    this.loadTrainingDataFromDatabase();
  }

  private async loadTrainingDataFromDatabase(): Promise<void> {
    for (const [category, bot] of this.bots.entries()) {
      try {
        const predictions = await getBotPredictions(category, 'kalshi', 200);

        if (predictions.length > 0) {
          const trainingData = predictions.map(p => ({
            marketId: p.market_id,
            title: p.market_title,
            category: category,
            prediction: (p.prediction === 'yes' || p.prediction === 'no') ? p.prediction : (p.prediction === 'buy' ? 'yes' : 'no'),
            predictedProbability: p.probability,
            actualOutcome: p.actual_outcome === 'win' ? 'yes' as const : p.actual_outcome === 'loss' ? 'no' as const : null,
            actualProbability: p.actual_outcome === 'win' ? 100 : p.actual_outcome === 'loss' ? 0 : null,
            wasCorrect: p.actual_outcome === 'win' ? true : p.actual_outcome === 'loss' ? false : null,
            edge: p.edge,
            timestamp: p.predicted_at,
          }));

          bot.trainingData = trainingData;

          const withOutcomes = trainingData.filter(t => t.actualOutcome !== null);
          if (withOutcomes.length > 0) {
            bot.totalPredictions = withOutcomes.length;
            bot.correctPredictions = withOutcomes.filter(t => t.wasCorrect === true).length;
            bot.accuracy = (bot.correctPredictions / bot.totalPredictions) * 100;

            const edges = withOutcomes.map(t => t.edge);
            bot.averageEdge = edges.reduce((sum, e) => sum + e, 0) / edges.length;
          }
        }
      } catch (error) {
        // Silent fail
      }
    }
  }

  private initializeBots(): void {
    const categories: KalshiCategory[] = [
      'crypto', 'politics', 'economics', 'entertainment', 'sports',
      'weather', 'technology', 'health', 'world', 'companies',
      'financials', 'climate', 'culture'
    ];

    categories.forEach(cat => {
      this.bots.set(cat, {
        category: cat,
        trainingData: [],
        accuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        averageEdge: 0,
        lastTrained: new Date(),
        expertise: this.getInitialExpertise(cat),
        patterns: [],
      });
    });
  }

  private getInitialExpertise(category: KalshiCategory): string[] {
    const keywords: Record<KalshiCategory, string> = {
      crypto: 'bitcoin',
      politics: 'election',
      economics: 'fed',
      entertainment: 'oscar',
      sports: 'nfl',
      weather: 'temperature',
      technology: 'ai',
      health: 'health',
      world: 'global',
      companies: 'stock',
      financials: 'market',
      climate: 'climate',
      culture: 'culture',
      general: '',
    };
    const knowledge = historicalKnowledge.getRelevantKnowledge(keywords[category] || '');
    return knowledge.slice(0, 10);
  }

  /**
   * CRYPTO - Simple heuristics, no API
   */
  async learnCrypto(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 60;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Crypto seasonality
    const month = new Date().getMonth();
    const seasonality = this.getCryptoSeasonality(month);

    if (title.includes('bitcoin') || title.includes('btc')) {
      if (seasonality.bullish) {
        probability += seasonality.adjustment;
        confidence += 5;
        factors.push(`${seasonality.month}: ${seasonality.note}`);
      }
    }

    // Price threshold analysis
    if (title.includes('above') || title.includes('over')) {
      const priceMatch = title.match(/\$?([\d,]+)/);
      if (priceMatch) {
        reasoning.push('Price threshold market - check current price');
      }
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'crypto',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Crypto seasonality', 'Price analysis'],
    };
  }

  /**
   * POLITICS - Simple heuristics
   */
  async learnPolitics(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Incumbency advantage
    if (title.includes('incumbent') || title.includes('reelect')) {
      probability += 5;
      factors.push('Incumbency advantage');
    }

    // Historical knowledge
    const knowledge = historicalKnowledge.getRelevantKnowledge(title, 'politics');
    if (knowledge.length > 0) {
      factors.push(...knowledge.slice(0, 2));
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'politics',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Political patterns'],
    };
  }

  /**
   * ECONOMICS - Simple heuristics
   */
  async learnEconomics(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Fed rate analysis
    if (title.includes('fed') || title.includes('rate')) {
      factors.push('Fed dot plot guidance');
      reasoning.push('Check FOMC projections');
    }

    // Recession/GDP
    if (title.includes('recession') || title.includes('gdp')) {
      factors.push('Economic indicators');
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'economics',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Economic analysis'],
    };
  }

  /**
   * SPORTS - Simple heuristics
   */
  async learnSports(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Home advantage
    if (title.includes('home') || title.includes('vs')) {
      factors.push('Home field advantage typically +3');
    }

    // Favorites tend to cover
    if (probability > 65) {
      confidence += 5;
      factors.push('Heavy favorite');
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'sports',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Sports analysis'],
    };
  }

  /**
   * WEATHER - Simple heuristics
   */
  async learnWeather(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 60;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Temperature ranges tend toward historical averages
    if (title.includes('temperature')) {
      factors.push('Historical temperature data');
      reasoning.push('Compare to historical averages for this date');

      // Specific ranges are less likely
      if (title.match(/\d+[-–]\d+/)) {
        probability -= 5; // Specific ranges are harder to hit
        factors.push('Narrow range penalty');
      }
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'weather',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Weather patterns'],
    };
  }

  /**
   * TECHNOLOGY - Simple heuristics
   */
  async learnTechnology(market: any): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    if (title.includes('ai') || title.includes('openai')) {
      factors.push('AI sector momentum');
    }

    if (title.includes('launch') || title.includes('release')) {
      probability -= 5; // Launches often delayed
      factors.push('Launch delay risk');
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'technology',
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning,
      factors,
      learnedFrom: ['Tech analysis'],
    };
  }

  /**
   * GENERIC - For all other categories (NO API CALLS!)
   */
  async learnGeneric(market: any, category: KalshiCategory): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Get historical knowledge (FREE - uses local data)
    const knowledge = historicalKnowledge.getRelevantKnowledge(title, category === 'general' ? undefined : category);
    if (knowledge.length > 0) {
      factors.push(...knowledge.slice(0, 3));
    }

    // Simple heuristics based on title
    if (title.includes('will') && title.includes('?')) {
      // Question format - typically uncertain
      confidence = 50;
    }

    if (title.includes('above') || title.includes('over') || title.includes('more than')) {
      reasoning.push('Threshold market - compare to baseline');
    }

    const edge = Math.abs(probability - market.yesPrice);

    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category,
      prediction: probability > 50 ? 'yes' : 'no',
      probability: Math.min(95, Math.max(5, probability)),
      confidence,
      edge,
      reasoning: reasoning.length > 0 ? reasoning : ['Basic market analysis'],
      factors,
      learnedFrom: ['Historical knowledge', 'Heuristic analysis'],
    };
  }

  /**
   * Record prediction for training
   */
  recordPrediction(category: KalshiCategory, prediction: MarketPrediction): void {
    const bot = this.bots.get(category);
    if (!bot) return;

    bot.trainingData.push({
      marketId: prediction.marketId,
      title: prediction.title,
      category,
      prediction: prediction.prediction,
      predictedProbability: prediction.probability,
      actualOutcome: null,
      actualProbability: null,
      wasCorrect: null,
      edge: prediction.edge,
      timestamp: new Date(),
    });
  }

  /**
   * Get stats for all bots
   */
  getAllStats(): Map<KalshiCategory, { totalPredictions: number; accuracy: number; lastTrained: Date }> {
    const stats = new Map<KalshiCategory, { totalPredictions: number; accuracy: number; lastTrained: Date }>();

    for (const [category, bot] of this.bots.entries()) {
      stats.set(category, {
        totalPredictions: bot.totalPredictions,
        accuracy: bot.accuracy,
        lastTrained: bot.lastTrained,
      });
    }

    return stats;
  }

  /**
   * Main analysis function - routes to appropriate category
   */
  async analyzeMarket(market: any): Promise<MarketPrediction> {
    const title = market.title?.toLowerCase() || '';
    const category = market.category?.toLowerCase() || '';

    // Detect category
    let detectedCategory: KalshiCategory = 'general';

    if (category.includes('crypto') || title.includes('bitcoin') || title.includes('btc') || title.includes('ethereum') || title.includes('crypto')) {
      detectedCategory = 'crypto';
    } else if (category.includes('politics') || title.includes('election') || title.includes('president') || title.includes('congress')) {
      detectedCategory = 'politics';
    } else if (category.includes('economics') || title.includes('fed') || title.includes('gdp') || title.includes('inflation') || title.includes('recession')) {
      detectedCategory = 'economics';
    } else if (category.includes('entertainment') || title.includes('oscar') || title.includes('emmy') || title.includes('movie') || title.includes('box office')) {
      detectedCategory = 'entertainment';
    } else if (category.includes('sports') || title.includes('nfl') || title.includes('nba') || title.includes('mlb')) {
      detectedCategory = 'sports';
    } else if (category.includes('weather') || title.includes('temperature') || title.includes('hurricane') || title.includes('storm')) {
      detectedCategory = 'weather';
    } else if (category.includes('tech') || title.includes('ai') || title.includes('openai') || title.includes('tech')) {
      detectedCategory = 'technology';
    } else if (title.includes('tesla') || title.includes('deliveries') || title.includes('production')) {
      detectedCategory = 'companies';
    }

    // Route to appropriate handler
    switch (detectedCategory) {
      case 'crypto':
        return this.learnCrypto(market);
      case 'politics':
        return this.learnPolitics(market);
      case 'economics':
        return this.learnEconomics(market);
      case 'sports':
        return this.learnSports(market);
      case 'weather':
        return this.learnWeather(market);
      case 'technology':
        return this.learnTechnology(market);
      default:
        return this.learnGeneric(market, detectedCategory);
    }
  }

  private getCryptoSeasonality(month: number): { bullish: boolean; adjustment: number; month: string; note: string } {
    const seasonality: Record<number, { bullish: boolean; adjustment: number; month: string; note: string }> = {
      0: { bullish: true, adjustment: 5, month: 'January', note: 'Post-holiday recovery' },
      1: { bullish: true, adjustment: 8, month: 'February', note: 'Recovery month' },
      2: { bullish: false, adjustment: -5, month: 'March', note: 'Tax season selling' },
      3: { bullish: true, adjustment: 15, month: 'April', note: 'Halving hype' },
      4: { bullish: false, adjustment: -10, month: 'May', note: 'Sell in May effect' },
      5: { bullish: false, adjustment: -5, month: 'June', note: 'Summer doldrums' },
      6: { bullish: true, adjustment: 10, month: 'July', note: 'Mid-year bounce' },
      7: { bullish: false, adjustment: -2, month: 'August', note: 'Low volume' },
      8: { bullish: false, adjustment: -8, month: 'September', note: 'Worst month' },
      9: { bullish: true, adjustment: 20, month: 'October', note: 'Uptober - best month' },
      10: { bullish: true, adjustment: 15, month: 'November', note: 'Strong continuation' },
      11: { bullish: true, adjustment: 10, month: 'December', note: 'Year-end rally' },
    };

    return seasonality[month] || { bullish: false, adjustment: 0, month: 'Unknown', note: '' };
  }
}

// Export singleton
export const categoryLearners = new CategoryLearner();

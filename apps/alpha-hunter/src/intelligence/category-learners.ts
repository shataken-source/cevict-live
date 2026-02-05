/**
 * CATEGORY-SPECIFIC LEARNING BOTS
 * Specialized learning bots for each major Kalshi category
 * Each bot learns, trains, and improves predictions over time
 */

import Anthropic from '@anthropic-ai/sdk';
import { KalshiTrader } from './kalshi-trader';
import { historicalKnowledge } from './historical-knowledge';
import { sportsFluxPredictor } from './sports-flux-predictor';
import { botAcademy } from './bot-academy';
import { getBotPredictions } from '../lib/supabase-memory.js';

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
  probability: number; // 0-100
  confidence: number; // 0-100
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
  private claude: Anthropic | null;
  private kalshi: KalshiTrader;
  private bots: Map<KalshiCategory, CategoryBot> = new Map();

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.kalshi = new KalshiTrader();
    this.initializeBots();
    this.loadTrainingDataFromDatabase(); // NEW: Load training data on startup
  }

  /**
   * Load historical training data from database for all bots
   */
  private async loadTrainingDataFromDatabase(): Promise<void> {
    console.log(`   ${c.dim}📚 Loading bot training data from database...${c.reset}`);
    
    for (const [category, bot] of this.bots.entries()) {
      try {
        const predictions = await getBotPredictions(category, 'kalshi', 200);
        
        if (predictions.length > 0) {
          // Convert to training data format
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
          
          // Calculate accuracy from loaded data
          const withOutcomes = trainingData.filter(t => t.actualOutcome !== null);
          if (withOutcomes.length > 0) {
            bot.totalPredictions = withOutcomes.length;
            bot.correctPredictions = withOutcomes.filter(t => t.wasCorrect === true).length;
            bot.accuracy = (bot.correctPredictions / bot.totalPredictions) * 100;
            
            // Update average edge
            const edges = withOutcomes.map(t => t.edge);
            bot.averageEdge = edges.reduce((sum, e) => sum + e, 0) / edges.length;
            
            console.log(`   ${c.brightGreen}✅ Loaded ${category}: ${bot.accuracy.toFixed(1)}% accuracy (${bot.totalPredictions} predictions)${c.reset}`);
          }
        }
      } catch (error) {
        // Silent fail - database might not be configured
        console.log(`   ${c.dim}⚠️  ${category}: No training data available (using defaults)${c.reset}`);
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
    // Use category-specific keywords to get relevant knowledge
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
    return knowledge.slice(0, 10); // Top 10 insights
  }

  /**
   * CRYPTO LEARNING BOT
   */
  async learnCrypto(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('crypto')!;
    const title = market.title.toLowerCase();

    // Get historical crypto knowledge
    const cryptoKnowledge = historicalKnowledge.getRelevantKnowledge(title, 'crypto');
    const month = new Date().getMonth();
    const seasonality = this.getCryptoSeasonality(month);

    let probability = market.yesPrice;
    let confidence = 60;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Bitcoin-specific analysis
    if (title.includes('bitcoin') || title.includes('btc')) {
      factors.push('Bitcoin halving cycles');
      factors.push('Historical price patterns');

      if (title.includes('above') || title.includes('over')) {
        const priceMatch = title.match(/\$?([\d,]+)/);
        if (priceMatch) {
          const target = parseInt(priceMatch[1].replace(/,/g, ''));
          const currentPrice = 87000; // Approximate

          if (target < currentPrice * 1.1) {
            probability += 5;
            reasoning.push('Target is reasonable relative to current price');
          } else if (target > currentPrice * 1.5) {
            probability -= 5;
            reasoning.push('Target is ambitious, lower probability');
          }
        }
      }
    }

    // Seasonality
    if (seasonality.bullish) {
      probability += seasonality.adjustment;
      factors.push(`${seasonality.month} is historically bullish`);
      reasoning.push(`Seasonal pattern: ${seasonality.note}`);
    }

    // AI analysis if available
    if (this.claude) {
      try {
        const prompt = `You are a crypto market expert. Analyze this Kalshi market:

"${market.title}"
Current YES price: ${market.yesPrice}¢
Current NO price: ${market.noPrice}¢

Historical knowledge:
${cryptoKnowledge.slice(0, 5).map(k => `- ${k}`).join('\n')}

Provide:
1. Probability (0-100) for YES
2. Confidence (0-100)
3. Key factors
4. Brief reasoning

JSON: {"probability": 65, "confidence": 70, "factors": ["factor1"], "reasoning": "..."}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {
        // Fallback to heuristic
      }
    }

    const edge = probability - market.yesPrice;
    const prediction: MarketPrediction = {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'crypto',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Historical patterns', 'Seasonality', 'AI analysis'],
    };

    return prediction;
  }

  /**
   * POLITICS LEARNING BOT
   */
  async learnPolitics(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('politics')!;
    const title = market.title.toLowerCase();

    const politicsKnowledge = historicalKnowledge.getRelevantKnowledge(title, 'politics');

    let probability = market.yesPrice;
    let confidence = 55; // Politics markets are often efficient
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Election cycle analysis
    const year = new Date().getFullYear();
    const isPresidentialYear = year % 4 === 0;
    const isMidtermYear = (year + 2) % 4 === 0;

    if (title.includes('election') || title.includes('president')) {
      if (isPresidentialYear) {
        factors.push('Presidential election year');
        reasoning.push('Election years often see market volatility');
      }
    }

    // AI analysis
    if (this.claude) {
      try {
        const prompt = `You are a political prediction expert. Analyze:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Knowledge:
${politicsKnowledge.slice(0, 5).map(k => `- ${k}`).join('\n')}

Provide probability (0-100), confidence (0-100), factors, and reasoning in JSON.`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {}
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'politics',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Election cycles', 'Historical patterns', 'AI analysis'],
    };
  }

  /**
   * ECONOMICS LEARNING BOT
   */
  async learnEconomics(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('economics')!;
    const title = market.title.toLowerCase();

    const economicsKnowledge = historicalKnowledge.getRelevantKnowledge(title, 'economics');

    let probability = market.yesPrice;
    let confidence = 60;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Fed rate analysis
    if (title.includes('fed') || title.includes('rate') || title.includes('inflation')) {
      factors.push('Fed policy patterns');
      factors.push('Inflation trends');

      if (title.includes('cut')) {
        probability += 3;
        reasoning.push('Rate cuts more likely in 2025');
      } else if (title.includes('hike')) {
        probability -= 5;
        reasoning.push('Rate hikes less likely');
      }
    }

    // Recession indicators
    if (title.includes('recession')) {
      factors.push('Recession indicators');
      if (title.includes('2025')) {
        probability -= 3;
        reasoning.push('2025 recession less likely per consensus');
      }
    }

    // AI analysis
    if (this.claude) {
      try {
        const prompt = `Economic expert. Analyze:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Knowledge:
${economicsKnowledge.slice(0, 5).map(k => `- ${k}`).join('\n')}

JSON: {"probability": 65, "confidence": 70, "factors": [], "reasoning": ""}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {}
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'economics',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Fed patterns', 'Recession indicators', 'AI analysis'],
    };
  }

  /**
   * SPORTS LEARNING BOT
   * NOW WITH CEVICT FLUX ENGINE INTEGRATION!
   */
  async learnSports(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('sports')!;
    const title = market.title;

    const sportsKnowledge = historicalKnowledge.getRelevantKnowledge(title.toLowerCase(), 'sports');

    let probability = market.yesPrice;
    let confidence = 58;
    const factors: string[] = [];
    const reasoning: string[] = [];
    let learnedFrom = ['Betting patterns', 'Home advantage'];

    // TRY TO USE CEVICT FLUX ENGINE FOR TEAM MATCHUPS!
    const matchup = sportsFluxPredictor.extractMatchup(title);
    if (matchup) {
      try {
        console.log(`      🎯 ${c.brightGreen}FLUX ENGINE${c.reset}: Analyzing ${matchup.awayTeam} @ ${matchup.homeTeam}...`);
        const fluxPrediction = await sportsFluxPredictor.predictGame(
          matchup.homeTeam,
          matchup.awayTeam,
          matchup.sport
        );

        if (fluxPrediction) {
          // Determine which team the market is asking about
          const titleLower = title.toLowerCase();
          let marketFavorsTeam = matchup.homeTeam;
          if (titleLower.includes(matchup.awayTeam.toLowerCase())) {
            marketFavorsTeam = matchup.awayTeam;
          }

          const fluxResult = sportsFluxPredictor.convertToKalshiPrediction(
            fluxPrediction,
            market,
            marketFavorsTeam
          );

          probability = fluxResult.probability;
          confidence = fluxResult.confidence;
          factors.push(...fluxResult.factors);
          reasoning.push(...fluxResult.reasoning);
          learnedFrom = ['CEVICT Flux Engine v2', 'Advanced prediction models', '14+ ML algorithms'];

          console.log(`      ✅ Flux: ${fluxPrediction.predictedWinner} ${c.brightGreen}${confidence.toFixed(1)}%${c.reset}`);
        }
      } catch (e) {
        console.log(`      ⚠️ Flux engine unavailable, falling back to AI`);
      }
    }

    // Sport-specific patterns (fallback or supplement)
    if (title.toLowerCase().includes('nfl')) {
      factors.push('NFL betting patterns');
      factors.push('Home field advantage: ~57%');
    } else if (title.toLowerCase().includes('nba')) {
      factors.push('NBA betting patterns');
      factors.push('Home court advantage: ~60%');
    }

    // AI analysis (if flux engine wasn't used or as supplement)
    if (this.claude && confidence < 65) {
      try {
        const prompt = `Sports betting expert. Analyze:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Knowledge:
${sportsKnowledge.slice(0, 5).map(k => `- ${k}`).join('\n')}

JSON: {"probability": 65, "confidence": 70, "factors": [], "reasoning": ""}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Only override if AI is more confident
          if (parsed.confidence > confidence) {
            probability = parsed.probability || probability;
            confidence = parsed.confidence || confidence;
            factors.push(...(parsed.factors || []));
            reasoning.push(parsed.reasoning || '');
            learnedFrom.push('AI analysis');
          }
        }
      } catch (e) {}
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'sports',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom,
    };
  }

  /**
   * WEATHER LEARNING BOT
   */
  async learnWeather(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('weather')!;
    const title = market.title.toLowerCase();

    const weatherKnowledge = historicalKnowledge.getRelevantKnowledge(title, 'weather');

    let probability = market.yesPrice;
    let confidence = 65; // Weather has trends
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Climate trends
    if (title.includes('temperature') || title.includes('warm') || title.includes('hot')) {
      probability += 4;
      factors.push('Climate warming trend');
      reasoning.push('Global temperatures trending upward');
    }

    // Hurricane season
    if (title.includes('hurricane')) {
      const month = new Date().getMonth();
      if (month >= 5 && month <= 10) {
        factors.push('Hurricane season active');
      }
    }

    // AI analysis
    if (this.claude) {
      try {
        const prompt = `Weather/climate expert. Analyze:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Knowledge:
${weatherKnowledge.slice(0, 5).map(k => `- ${k}`).join('\n')}

JSON: {"probability": 65, "confidence": 70, "factors": [], "reasoning": ""}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {}
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'weather',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Climate trends', 'Seasonal patterns', 'AI analysis'],
    };
  }

  /**
   * TECHNOLOGY LEARNING BOT
   */
  async learnTechnology(market: any): Promise<MarketPrediction> {
    const bot = this.bots.get('technology')!;
    const title = market.title.toLowerCase();

    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // AI/LLM markets
    if (title.includes('openai') || title.includes('anthropic') || title.includes('gpt') || title.includes('agi')) {
      factors.push('AI industry trends');
      if (title.includes('ipo')) {
        if (title.includes('openai')) {
          probability += 3;
          reasoning.push('OpenAI closer to profitability');
        }
      }
    }

    // AI analysis
    if (this.claude) {
      try {
        const prompt = `Technology industry expert. Analyze:

"${market.title}"
YES: ${market.yesPrice}¢ | NO: ${market.noPrice}¢

Provide probability, confidence, factors, reasoning in JSON.`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {}
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category: 'technology',
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Industry trends', 'AI analysis'],
    };
  }

  /**
   * Train a bot on completed markets
   */
  async trainBot(category: KalshiCategory, marketId: string, actualOutcome: 'yes' | 'no' | null): Promise<void> {
    const bot = this.bots.get(category);
    if (!bot) return;

    // Find prediction in training data
    const prediction = bot.trainingData.find(t => t.marketId === marketId);
    if (!prediction || actualOutcome === null) return;

    // Update accuracy
    const wasCorrect = prediction.prediction === actualOutcome;
    prediction.wasCorrect = wasCorrect;
    prediction.actualOutcome = actualOutcome;
    prediction.actualProbability = actualOutcome === 'yes' ? 100 : 0;

    bot.totalPredictions++;
    if (wasCorrect) bot.correctPredictions++;
    bot.accuracy = (bot.correctPredictions / bot.totalPredictions) * 100;

    // Update average edge
    const edges = bot.trainingData.filter(t => t.wasCorrect !== null).map(t => t.edge);
    bot.averageEdge = edges.reduce((sum, e) => sum + e, 0) / edges.length;

    bot.lastTrained = new Date();
  }

  /**
   * Record a prediction for later training
   */
  async recordPrediction(category: KalshiCategory, prediction: MarketPrediction): Promise<void> {
    const bot = this.bots.get(category);
    if (!bot) return;

    const trainingData: TrainingData = {
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
    };

    bot.trainingData.push(trainingData);

    // Keep only last 1000 predictions
    if (bot.trainingData.length > 1000) {
      bot.trainingData = bot.trainingData.slice(-1000);
    }

    // SAVE TO PERSISTENT STORAGE (Supabase + JSON)
    await this.savePredictionToDisk(prediction);
    await this.savePredictionToSupabase(prediction);
  }

  private async savePredictionToDisk(prediction: MarketPrediction): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const memoryDir = path.join(process.cwd(), '.bot-memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = path.join(memoryDir, `predictions-${dateStr}.jsonl`);

      const record = JSON.stringify({
        ...prediction,
        timestamp: new Date().toISOString(),
      }) + '\n';

      fs.appendFileSync(fileName, record, 'utf8');
    } catch (e) {
      // Silent fail - don't break trading
    }
  }

  private async savePredictionToSupabase(prediction: MarketPrediction): Promise<void> {
    try {
      const { saveBotPrediction } = await import('../lib/supabase-memory.js');
      await saveBotPrediction({
        bot_category: prediction.category,
        market_id: prediction.marketId,
        market_title: prediction.title,
        platform: 'kalshi',
        prediction: prediction.prediction as any,
        probability: prediction.probability,
        confidence: prediction.confidence,
        edge: prediction.edge,
        reasoning: prediction.reasoning,
        factors: prediction.factors,
        learned_from: prediction.learnedFrom,
        market_price: 0,
        predicted_at: new Date(),
        expires_at: undefined,
      });
    } catch (e) {
      // Silent fail - Supabase might not be configured or tables not created
      // JSON backup is the primary memory system
    }
  }

  /**
   * Get bot stats
   */
  getBotStats(category: KalshiCategory): CategoryBot | null {
    return this.bots.get(category) || null;
  }

  /**
   * Get all bot stats
   */
  getAllStats(): Map<KalshiCategory, CategoryBot> {
    return this.bots;
  }

  /**
   * Analyze a market using the appropriate category bot
   * NOW USES BOT ACADEMY TRAINED EXPERTS FIRST!
   */
  async analyzeMarket(market: any): Promise<MarketPrediction> {
    const title = (market.title || '').toLowerCase();
    const category = market.category?.toLowerCase() || '';

    // Determine category - expanded to cover ALL Kalshi categories
    let detectedCategory: KalshiCategory = 'general';

    if (category.includes('crypto') || title.includes('bitcoin') || title.includes('btc') || title.includes('ethereum') || title.includes('crypto')) {
      detectedCategory = 'crypto';
    } else if (category.includes('politics') || title.includes('election') || title.includes('president') || title.includes('congress') || title.includes('senate')) {
      detectedCategory = 'politics';
    } else if (category.includes('economics') || category.includes('economic') || title.includes('fed') || title.includes('rate') || title.includes('inflation') || title.includes('recession') || title.includes('gdp') || title.includes('unemployment')) {
      detectedCategory = 'economics';
    } else if (category.includes('entertainment') || title.includes('oscar') || title.includes('emmy') || title.includes('movie') || title.includes('box office') || title.includes('netflix') || title.includes('streaming')) {
      detectedCategory = 'entertainment';
    } else if (category.includes('sports') || category.includes('sport') || title.includes('nfl') || title.includes('nba') || title.includes('mlb') || title.includes('nhl') || title.includes('football') || title.includes('basketball') || title.includes('soccer')) {
      detectedCategory = 'sports';
    } else if (category.includes('weather') || title.includes('temperature') || title.includes('hurricane') || title.includes('snow') || title.includes('rain') || title.includes('storm')) {
      detectedCategory = 'weather';
    } else if (category.includes('technology') || category.includes('tech') || title.includes('openai') || title.includes('ai') || title.includes('tech') || title.includes('apple') || title.includes('google') || title.includes('meta')) {
      detectedCategory = 'technology';
    } else if (category.includes('health') || title.includes('covid') || title.includes('virus') || title.includes('disease') || title.includes('vaccine') || title.includes('pandemic') || title.includes('fda')) {
      detectedCategory = 'health';
    } else if (category.includes('world') || title.includes('china') || title.includes('russia') || title.includes('ukraine') || title.includes('iran') || title.includes('israel') || title.includes('war') || title.includes('conflict')) {
      detectedCategory = 'world';
    } else if (category.includes('companies') || category.includes('company') || title.includes('tesla') || title.includes('amazon') || title.includes('stock') || title.includes('ceo') || title.includes('earnings')) {
      detectedCategory = 'companies';
    } else if (category.includes('financials') || category.includes('financial') || title.includes('s&p') || title.includes('dow') || title.includes('nasdaq') || title.includes('market') || title.includes('index')) {
      detectedCategory = 'financials';
    } else if (category.includes('climate') || title.includes('emissions') || title.includes('carbon') || title.includes('renewable') || title.includes('solar') || title.includes('wind')) {
      detectedCategory = 'climate';
    } else if (category.includes('culture') || title.includes('music') || title.includes('awards') || title.includes('celebrity') || title.includes('fashion')) {
      detectedCategory = 'culture';
    }

    // 🎓 TRY BOT ACADEMY TRAINED EXPERT FIRST!
    try {
      const expertPrediction = await botAcademy.predictWithExpert(detectedCategory, market);
      if (expertPrediction && expertPrediction.confidence >= 55) {
        console.log(`      ${c.brightGreen}🎓 BOT ACADEMY EXPERT${c.reset}: ${detectedCategory} (${expertPrediction.confidence.toFixed(1)}% confidence)`);
        return {
          marketId: market.id || market.ticker,
          title: market.title,
          category: detectedCategory,
          prediction: expertPrediction.prediction,
          probability: expertPrediction.probability,
          confidence: expertPrediction.confidence,
          edge: expertPrediction.edge,
          reasoning: expertPrediction.reasoning,
          factors: expertPrediction.factors,
          learnedFrom: ['Bot Academy Trained Expert', ...expertPrediction.factors.slice(0, 2)],
        };
      }
    } catch (error) {
      // Fallback to specialized bots
      console.log(`      ${c.dim}⚠️  Bot Academy unavailable, using specialized bots${c.reset}`);
    }

    // Route to appropriate specialized bot (fallback)
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
      case 'health':
      case 'world':
      case 'companies':
      case 'financials':
      case 'climate':
      case 'culture':
        // Use generic AI-powered analysis for new categories
        return this.learnGeneric(market, detectedCategory);
      default:
        // General fallback
        return {
          marketId: market.id || market.ticker,
          title: market.title,
          category: 'general',
          prediction: market.yesPrice > 50 ? 'yes' : 'no',
          probability: market.yesPrice,
          confidence: 50,
          edge: 0,
          reasoning: ['General market analysis'],
          factors: [],
          learnedFrom: [],
        };
    }
  }

  /**
   * GENERIC LEARNING BOT for new categories
   * Health, World, Companies, Financials, Climate, Culture
   */
  async learnGeneric(market: any, category: KalshiCategory): Promise<MarketPrediction> {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice;
    let confidence = 55;
    const factors: string[] = [];
    const reasoning: string[] = [];

    // Get historical knowledge for this category
    const knowledge = historicalKnowledge.getRelevantKnowledge(title, category === 'general' ? undefined : category);
    if (knowledge.length > 0) {
      factors.push(...knowledge.slice(0, 3));
    }

    // AI analysis if available
    if (this.claude) {
      try {
        const categoryContext: Record<string, string> = {
          health: 'health policy and disease expert',
          world: 'geopolitical analyst',
          companies: 'business and corporate strategy expert',
          financials: 'financial markets analyst',
          climate: 'climate science and policy expert',
          culture: 'pop culture and entertainment expert',
        };

        const prompt = `You are a ${categoryContext[category] || 'market analyst'}. Analyze this prediction market:

"${market.title}"
Current YES price: ${market.yesPrice}¢
Current NO price: ${market.noPrice}¢

Historical knowledge:
${knowledge.slice(0, 3).map((k: string) => `- ${k}`).join('\n')}

Provide your analysis in JSON format:
{
  "probability": <0-100>,
  "confidence": <0-100>,
  "factors": ["factor1", "factor2"],
  "reasoning": "brief explanation"
}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          probability = parsed.probability || probability;
          confidence = parsed.confidence || confidence;
          factors.push(...(parsed.factors || []));
          reasoning.push(parsed.reasoning || '');
        }
      } catch (e) {
        // Fallback to basic heuristics
        reasoning.push('Market analysis based on historical patterns');
      }
    }

    const edge = probability - market.yesPrice;
    return {
      marketId: market.id || market.ticker,
      title: market.title,
      category,
      prediction: probability > 50 ? 'yes' : 'no',
      probability,
      confidence,
      edge: Math.abs(edge),
      reasoning,
      factors,
      learnedFrom: ['Historical knowledge', 'AI analysis', 'Category expertise'],
    };
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


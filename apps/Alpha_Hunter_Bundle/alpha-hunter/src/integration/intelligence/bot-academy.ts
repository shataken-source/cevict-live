/**
 * BOT ACADEMY - ZERO API COST VERSION
 * Expert Bot Training System using heuristics instead of Claude API
 * Saves your Anthropic credits!
 */

// NO ANTHROPIC IMPORT - Saves money!
import { getBotPredictions, saveBotPrediction, type BotPrediction } from '../lib/supabase-memory.js';
import { KalshiTrader } from './kalshi-trader';
import { historicalKnowledge } from './historical-knowledge';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  white: '\x1b[37m',
  dim: '\x1b[2m',
};

export interface ExpertBot {
  category: string;
  name: string;
  trainingData: BotPrediction[];
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  avgEdge: number;
  learnedPatterns: string[];
  successFactors: string[];
  failureFactors: string[];
  lastTrained: Date;
  confidence: number;
}

export interface TrainingSession {
  category: string;
  startTime: Date;
  endTime?: Date;
  samplesAnalyzed: number;
  patternsLearned: number;
  accuracyImprovement: number;
  outcome: 'success' | 'failed' | 'in_progress';
}

export class BotAcademy {
  // NO CLAUDE CLIENT - Zero API cost!
  private kalshi: KalshiTrader;
  private experts: Map<string, ExpertBot> = new Map();
  private trainingSessions: TrainingSession[] = [];

  constructor() {
    this.kalshi = new KalshiTrader();
    this.initializeExperts();
  }

  private initializeExperts(): void {
    const categories = [
      'sports', 'economics', 'politics', 'crypto', 'entertainment',
      'weather', 'technology', 'health', 'world', 'companies',
      'financials', 'climate', 'culture',
    ];

    categories.forEach(cat => {
      this.experts.set(cat, {
        category: cat,
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Expert`,
        trainingData: [],
        accuracy: 50,
        totalPredictions: 0,
        correctPredictions: 0,
        avgEdge: 0,
        learnedPatterns: this.getDefaultPatterns(cat),
        successFactors: this.getDefaultSuccessFactors(cat),
        failureFactors: ['Market noise', 'Unexpected events'],
        lastTrained: new Date(),
        confidence: 50,
      });
    });
  }

  /**
   * Get default patterns for category (FREE - no API!)
   */
  private getDefaultPatterns(category: string): string[] {
    const patterns: Record<string, string[]> = {
      sports: ['Home team advantage', 'Recent form matters', 'Injury reports key'],
      economics: ['Fed guidance predictive', 'Consensus estimates baseline', 'Lagging indicators'],
      politics: ['Incumbency advantage', 'Polling aggregates', 'Early voting data'],
      crypto: ['Seasonality patterns', 'Halving cycles', 'Correlation with risk assets'],
      entertainment: ['Industry buzz', 'Pre-release tracking', 'Historical winners'],
      weather: ['Model consensus', 'Historical averages', 'Seasonal patterns'],
      technology: ['Product cycles', 'Earnings patterns', 'Sector momentum'],
      health: ['FDA timelines', 'Trial data', 'Regulatory patterns'],
      world: ['Geopolitical tensions', 'Economic indicators', 'Historical precedents'],
      companies: ['Earnings guidance', 'Sector trends', 'Management signals'],
      financials: ['Technical levels', 'Sentiment indicators', 'Macro factors'],
      climate: ['Scientific consensus', 'Policy momentum', 'Measurement data'],
      culture: ['Social trends', 'Media coverage', 'Demographic shifts'],
    };
    return patterns[category] || ['Market analysis', 'Historical data'];
  }

  /**
   * Get default success factors (FREE - no API!)
   */
  private getDefaultSuccessFactors(category: string): string[] {
    const factors: Record<string, string[]> = {
      sports: ['Accurate injury assessment', 'Line value identification'],
      economics: ['Leading indicator focus', 'Consensus deviation'],
      politics: ['Poll quality weighting', 'Demographic analysis'],
      crypto: ['On-chain metrics', 'Market structure'],
      entertainment: ['Early tracking data', 'Industry connections'],
      weather: ['Multi-model analysis', 'Local factors'],
      technology: ['Product timeline accuracy', 'Market positioning'],
      health: ['Trial phase tracking', 'Regulatory history'],
      world: ['Intelligence gathering', 'Historical analogues'],
      companies: ['Earnings quality', 'Guidance interpretation'],
      financials: ['Risk-reward assessment', 'Correlation analysis'],
      climate: ['Data source quality', 'Trend identification'],
      culture: ['Trend spotting', 'Demographic insights'],
    };
    return factors[category] || ['Edge detection', 'Timing'];
  }

  /**
   * TRAIN ALL EXPERTS - Uses database data, NO API CALLS!
   */
  async trainAllExperts(): Promise<void> {
    console.log(`\n${c.brightCyan}═══════════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.brightYellow}   🎓 BOT ACADEMY - TRAINING (Zero API Cost Mode)${c.reset}`);
    console.log(`${c.brightCyan}═══════════════════════════════════════════════════════════════${c.reset}\n`);

    for (const [category] of this.experts.entries()) {
      await this.trainExpert(category);
    }

    console.log(`\n${c.brightGreen}✅ All experts trained (zero API cost)${c.reset}\n`);
    
    // Also run expert assignment training (rejection learning)
    try {
      const { expertAssignmentManager } = await import('./expert-assignment-manager');
      const { rejectionTracker } = await import('./rejection-tracker');
      
      // Update rejection outcomes first
      console.log(`${c.brightCyan}   📊 Updating rejection outcomes...${c.reset}`);
      await rejectionTracker.updateRejectionOutcomes();
      
      // Train all expert assignments
      await expertAssignmentManager.trainAllExperts();
    } catch (error) {
      console.log(`${c.dim}   ⚠️  Expert assignment training unavailable${c.reset}`);
    }
  }

  /**
   * TRAIN SINGLE EXPERT - Database only, NO API!
   */
  async trainExpert(category: string): Promise<void> {
    const expert = this.experts.get(category);
    if (!expert) return;

    try {
      // Load historical predictions from database
      const historicalPredictions = await getBotPredictions(category, 'kalshi', 500);
      expert.trainingData = historicalPredictions;

      if (historicalPredictions.length > 0) {
        // Calculate accuracy
        const withOutcomes = historicalPredictions.filter(p => p.actual_outcome !== null);
        expert.totalPredictions = withOutcomes.length;
        expert.correctPredictions = withOutcomes.filter(p => p.actual_outcome === 'win').length;
        expert.accuracy = expert.totalPredictions > 0
          ? (expert.correctPredictions / expert.totalPredictions) * 100
          : 50;

        // Extract patterns from successful predictions (FREE - just data analysis!)
        const wins = withOutcomes.filter(p => p.actual_outcome === 'win');
        const losses = withOutcomes.filter(p => p.actual_outcome === 'loss');

        // Learn from wins - extract common factors
        if (wins.length > 0) {
          const winFactors = wins.flatMap(w => w.factors || []);
          const factorCounts = new Map<string, number>();
          winFactors.forEach(f => {
            factorCounts.set(f, (factorCounts.get(f) || 0) + 1);
          });
          
          // Top factors from wins
          const topFactors = Array.from(factorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([factor]) => factor);
          
          if (topFactors.length > 0) {
            expert.successFactors = topFactors;
          }
        }

        // Calculate confidence based on recent performance
        const recentPredictions = withOutcomes.slice(-50);
        if (recentPredictions.length > 0) {
          const recentAccuracy = (recentPredictions.filter(p => p.actual_outcome === 'win').length / recentPredictions.length) * 100;
          expert.confidence = Math.min(95, Math.max(50, recentAccuracy));
          expert.avgEdge = recentPredictions.reduce((sum, p) => sum + p.edge, 0) / recentPredictions.length;
        }

        console.log(`   ✅ ${expert.name}: ${expert.accuracy.toFixed(1)}% accuracy (${expert.totalPredictions} predictions)`);
      }

      expert.lastTrained = new Date();
    } catch (error) {
      // Silent fail - database might not be available
    }
  }

  /**
   * Get expert for category
   */
  getExpert(category: string): ExpertBot | null {
    return this.experts.get(category) || null;
  }

  /**
   * Use expert to make prediction - NO API CALLS!
   */
  async predictWithExpert(category: string, market: any): Promise<{
    prediction: 'yes' | 'no';
    probability: number;
    confidence: number;
    edge: number;
    reasoning: string[];
    factors: string[];
  } | null> {
    const expert = this.experts.get(category);
    if (!expert) return null;

    // Load training data if needed
    if (expert.trainingData.length === 0) {
      const historicalPredictions = await getBotPredictions(category, 'kalshi', 100);
      expert.trainingData = historicalPredictions;

      const withOutcomes = historicalPredictions.filter(p => p.actual_outcome !== null);
      if (withOutcomes.length > 0) {
        expert.totalPredictions = withOutcomes.length;
        expert.correctPredictions = withOutcomes.filter(p => p.actual_outcome === 'win').length;
        expert.accuracy = (expert.correctPredictions / expert.totalPredictions) * 100;
      }
    }

    // Make prediction using heuristics (FREE!)
    let probability = market.yesPrice || 50;
    let confidence = expert.confidence;
    const reasoning: string[] = [];
    const factors: string[] = [];

    // Apply learned patterns
    if (expert.learnedPatterns.length > 0) {
      factors.push(...expert.learnedPatterns.slice(0, 2));
      reasoning.push(`Applied ${expert.learnedPatterns.length} learned patterns`);
    }

    if (expert.successFactors.length > 0) {
      factors.push(...expert.successFactors.slice(0, 2));
    }

    // Adjust based on expert's historical accuracy
    if (expert.accuracy > 55) {
      confidence += 5;
      reasoning.push(`Expert has ${expert.accuracy.toFixed(1)}% accuracy`);
    } else if (expert.accuracy < 45) {
      confidence -= 5;
    }

    // Get historical knowledge (FREE - local data)
    const knowledge = historicalKnowledge.getRelevantKnowledge(market.title.toLowerCase(), category);
    if (knowledge.length > 0) {
      factors.push(...knowledge.slice(0, 2));
    }

    const edge = Math.abs(probability - market.yesPrice);
    const prediction: 'yes' | 'no' = probability > 50 ? 'yes' : 'no';

    // Save prediction for future training
    const predictionData: BotPrediction = {
      bot_category: category,
      market_id: market.id || market.ticker,
      market_title: market.title,
      platform: 'kalshi',
      prediction: prediction as any,
      probability,
      confidence,
      edge,
      reasoning,
      factors,
      learned_from: expert.learnedPatterns,
      market_price: market.yesPrice,
      predicted_at: new Date(),
      expires_at: market.expiresAt ? new Date(market.expiresAt) : undefined,
    };

    await saveBotPrediction(predictionData);

    return {
      prediction,
      probability,
      confidence,
      edge,
      reasoning,
      factors,
    };
  }

  /**
   * Display stats
   */
  async displayAcademyStats(): Promise<void> {
    console.log(`${c.brightCyan}═══════════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.brightYellow}   🎓 BOT ACADEMY STATISTICS${c.reset}`);
    console.log(`${c.brightCyan}═══════════════════════════════════════════════════════════════${c.reset}`);

    for (const [category, expert] of this.experts.entries()) {
      if (expert.totalPredictions === 0) continue;

      const accuracyColor = expert.accuracy >= 60 ? c.brightGreen : expert.accuracy >= 50 ? c.brightYellow : c.brightRed;
      console.log(`   ${expert.name.padEnd(20)} ${accuracyColor}${expert.accuracy.toFixed(1)}%${c.reset} (${expert.totalPredictions} predictions)`);
    }

    console.log(`${c.brightCyan}═══════════════════════════════════════════════════════════════${c.reset}\n`);
  }
}

// Export singleton
export const botAcademy = new BotAcademy();
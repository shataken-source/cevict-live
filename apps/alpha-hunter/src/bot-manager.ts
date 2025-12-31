/**
 * BOT MANAGER - Unified System
 * Manages all bots, ensures data flow, and coordinates learning
 */

import 'dotenv/config';
import { categoryLearners } from './intelligence/category-learners';
import { entertainmentExpert } from './intelligence/entertainment-expert';
import { marketLearner } from './intelligence/market-learner';
import { historicalKnowledge } from './intelligence/historical-knowledge';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { dataAggregator } from './intelligence/data-aggregator';

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

const color = {
  success: (text: string) => `${c.brightGreen}${text}${c.reset}`,
  error: (text: string) => `${c.brightRed}${text}${c.reset}`,
  warning: (text: string) => `${c.brightYellow}${text}${c.reset}`,
  info: (text: string) => `${c.brightCyan}${text}${c.reset}`,
  highlight: (text: string) => `${c.brightMagenta}${text}${c.reset}`,
};

interface BotStatus {
  name: string;
  category: string;
  status: 'running' | 'idle' | 'error';
  predictions: number;
  accuracy: number;
  lastUpdate: Date;
}

export class BotManager {
  private kalshi: KalshiTrader;
  private bots: Map<string, BotStatus> = new Map();
  private isRunning = false;
  private dataFlowInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.kalshi = new KalshiTrader();
    this.initializeBots();
  }

  private initializeBots(): void {
    // Category Learning Bots - ALL Kalshi Categories
    const categories = [
      'crypto', 'politics', 'economics', 'entertainment', 'sports',
      'weather', 'technology', 'health', 'world', 'companies',
      'financials', 'climate', 'culture'
    ];

    categories.forEach(cat => {
      this.bots.set(`category-${cat}`, {
        name: `${cat.toUpperCase()} Learning Bot`,
        category: cat,
        status: 'idle',
        predictions: 0,
        accuracy: 0,
        lastUpdate: new Date(),
      });
    });

    // Specialized Bots
    this.bots.set('entertainment-expert', {
      name: 'Entertainment Expert',
      category: 'entertainment',
      status: 'idle',
      predictions: 0,
      accuracy: 0,
      lastUpdate: new Date(),
    });

    this.bots.set('market-learner', {
      name: 'Market Learner',
      category: 'general',
      status: 'idle',
      predictions: 0,
      accuracy: 0,
      lastUpdate: new Date(),
    });
  }

  async start(): Promise<void> {
    console.log(`
${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.brightCyan}║${c.reset}         ${c.brightYellow}🤖 BOT MANAGER - UNIFIED SYSTEM 🤖${c.reset}                    ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}                                                              ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.white}Starting all bots and enabling data flow...${c.reset}              ${c.brightCyan}║${c.reset}
${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}
    `);

    this.isRunning = true;

    // Start data flow loop
    this.startDataFlow();

    // Initial bot activation
    await this.activateAllBots();

    // Show status
    this.displayStatus();

    console.log(`\n${color.success('✅ All bots initialized and data flow started!')}`);
    console.log(`${c.dim}Press Ctrl+C to stop${c.reset}\n`);
  }

  private async activateAllBots(): Promise<void> {
    console.log(`${c.brightWhite}🚀 ACTIVATING BOTS:${c.reset}\n`);

    // Activate category learners - ALL Kalshi Categories
    const categories = [
      'crypto', 'politics', 'economics', 'entertainment', 'sports',
      'weather', 'technology', 'health', 'world', 'companies',
      'financials', 'climate', 'culture'
    ];
    for (const cat of categories) {
      const botKey = `category-${cat}`;
      const bot = this.bots.get(botKey);
      if (bot) {
        bot.status = 'running';
        bot.lastUpdate = new Date();
        console.log(`   ${color.success('✅')} ${bot.name} - ${color.info('ACTIVE')}`);
      }
    }

    // Activate specialized bots
    const expertBot = this.bots.get('entertainment-expert');
    if (expertBot) {
      expertBot.status = 'running';
      expertBot.lastUpdate = new Date();
      console.log(`   ${color.success('✅')} ${expertBot.name} - ${color.info('ACTIVE')}`);
    }

    const learnerBot = this.bots.get('market-learner');
    if (learnerBot) {
      learnerBot.status = 'running';
      learnerBot.lastUpdate = new Date();
      console.log(`   ${color.success('✅')} ${learnerBot.name} - ${color.info('ACTIVE')}`);
    }

    console.log('');
  }

  private startDataFlow(): void {
    // Data flow cycle every 2 minutes
    this.dataFlowInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.dataFlowCycle();
      } catch (error) {
        console.error(`${color.error('❌ Data flow error:')}`, error);
      }
    }, 120000); // 2 minutes

    // Run first cycle immediately
    setTimeout(() => this.dataFlowCycle(), 5000);
  }

  private async dataFlowCycle(): Promise<void> {
    console.log(`\n${c.brightCyan}${'─'.repeat(60)}${c.reset}`);
    console.log(`${c.brightWhite}🔄 DATA FLOW CYCLE${c.reset} - ${new Date().toLocaleTimeString()}`);
    console.log(`${c.brightCyan}${'─'.repeat(60)}${c.reset}`);

    try {
      // 1. Fetch fresh market data
      console.log(`\n${c.dim}1. Fetching market data...${c.reset}`);
      const markets = await this.kalshi.getMarkets();
      console.log(`   ${color.success('✅')} Fetched ${markets.length} markets`);

      // 2. Feed data to category learners
      console.log(`\n${c.dim}2. Feeding data to category learners...${c.reset}`);
      await this.feedCategoryLearners(markets);

      // 3. Feed entertainment markets to entertainment expert
      console.log(`\n${c.dim}3. Feeding entertainment markets...${c.reset}`);
      await this.feedEntertainmentExpert(markets);

      // 4. Update historical knowledge
      console.log(`\n${c.dim}4. Updating historical knowledge...${c.reset}`);
      this.updateHistoricalKnowledge();

      // 5. Learn from market patterns
      console.log(`\n${c.dim}5. Learning market patterns...${c.reset}`);
      await this.learnMarketPatterns(markets);

      // 6. Update bot statistics
      this.updateBotStats();

      console.log(`\n${color.success('✅ Data flow cycle complete!')}`);
    } catch (error) {
      console.error(`${color.error('❌ Data flow cycle error:')}`, error);
    }
  }

  private async feedCategoryLearners(markets: any[]): Promise<void> {
    const categories: Record<string, any[]> = {
      crypto: [],
      politics: [],
      economics: [],
      entertainment: [],
      sports: [],
      weather: [],
      technology: [],
    };

    // Categorize markets
    markets.forEach(market => {
      const title = (market.title || '').toLowerCase();
      const category = market.category?.toLowerCase() || '';

      if (category.includes('crypto') || title.includes('bitcoin') || title.includes('btc')) {
        categories.crypto.push(market);
      } else if (category.includes('politics') || title.includes('election')) {
        categories.politics.push(market);
      } else if (category.includes('economics') || title.includes('fed')) {
        categories.economics.push(market);
      } else if (category.includes('entertainment') || title.includes('oscar')) {
        categories.entertainment.push(market);
      } else if (category.includes('sports') || title.includes('nfl')) {
        categories.sports.push(market);
      } else if (category.includes('weather') || title.includes('temperature')) {
        categories.weather.push(market);
      } else if (category.includes('technology') || title.includes('ai')) {
        categories.technology.push(market);
      }
    });

    // Feed to each category bot
    let totalAnalyzed = 0;
    for (const [category, categoryMarkets] of Object.entries(categories)) {
      if (categoryMarkets.length === 0) continue;

      const botKey = `category-${category}`;
      const bot = this.bots.get(botKey);
      if (!bot) continue;

      try {
        // Analyze a sample of markets (top 5 per category)
        const sample = categoryMarkets.slice(0, 5);
        for (const market of sample) {
          const prediction = await categoryLearners.analyzeMarket(market);
          categoryLearners.recordPrediction(prediction.category as any, prediction);
          bot.predictions++;
          totalAnalyzed++;
        }
        bot.lastUpdate = new Date();
        console.log(`   ${color.success('✅')} ${bot.name}: Analyzed ${sample.length} markets`);
      } catch (error) {
        bot.status = 'error';
        console.log(`   ${color.error('❌')} ${bot.name}: Error - ${error}`);
      }
    }

    console.log(`   ${c.dim}Total analyzed: ${totalAnalyzed} markets${c.reset}`);
  }

  private async feedEntertainmentExpert(markets: any[]): Promise<void> {
    const entertainmentMarkets = markets.filter(m => {
      const title = (m.title || '').toLowerCase();
      return title.includes('oscar') || title.includes('emmy') || title.includes('movie') ||
             title.includes('box office') || title.includes('awards');
    });

    if (entertainmentMarkets.length === 0) {
      console.log(`   ${c.dim}No entertainment markets found${c.reset}`);
      return;
    }

    const bot = this.bots.get('entertainment-expert');
    if (!bot) return;

    try {
      const sample = entertainmentMarkets.slice(0, 3);
      for (const market of sample) {
        const entertainmentMarket = {
          id: market.id || market.ticker,
          title: market.title,
          category: entertainmentExpert.categorizeMarket(market.title),
          yesPrice: market.yesPrice || 50,
          noPrice: market.noPrice || 50,
          expiresAt: market.expiresAt || '',
        };
        await entertainmentExpert.analyzeMarket(entertainmentMarket);
        bot.predictions++;
      }
      bot.lastUpdate = new Date();
      console.log(`   ${color.success('✅')} Entertainment Expert: Analyzed ${sample.length} markets`);
    } catch (error) {
      bot.status = 'error';
      console.log(`   ${color.error('❌')} Entertainment Expert: Error - ${error}`);
    }
  }

  private updateHistoricalKnowledge(): void {
    // Historical knowledge is static, but we can log current insights
    const marketPhase = historicalKnowledge.getCryptoMarketPhase();
    console.log(`   ${color.success('✅')} Historical Knowledge: ${marketPhase.phase}`);
    console.log(`   ${c.dim}Recommendation: ${marketPhase.recommendation}${c.reset}`);
  }

  private async learnMarketPatterns(markets: any[]): Promise<void> {
    const bot = this.bots.get('market-learner');
    if (!bot) return;

    try {
      // Learn from a sample of markets
      const sample = markets.slice(0, 5);
      for (const market of sample) {
        await marketLearner.learnKalshiMarket(
          market.id || market.ticker,
          market.title,
          market.category || 'general'
        );
        bot.predictions++;
      }
      bot.lastUpdate = new Date();
      console.log(`   ${color.success('✅')} Market Learner: Learned from ${sample.length} markets`);
    } catch (error) {
      bot.status = 'error';
      console.log(`   ${color.error('❌')} Market Learner: Error - ${error}`);
    }
  }

  private updateBotStats(): void {
    // Update statistics from category learners
    const allStats = categoryLearners.getAllStats();

    for (const [category, stats] of allStats.entries()) {
      const botKey = `category-${category}`;
      const bot = this.bots.get(botKey);
      if (bot) {
        bot.predictions = stats.totalPredictions;
        bot.accuracy = stats.accuracy;
        bot.lastUpdate = stats.lastTrained;
      }
    }
  }

  displayStatus(): void {
    console.log(`\n${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}              ${c.brightYellow}📊 BOT STATUS 📊${c.reset}                        ${c.brightCyan}║${c.reset}`);
    console.log(`${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`);

    for (const [key, bot] of this.bots.entries()) {
      const statusColor = bot.status === 'running' ? color.success : bot.status === 'error' ? color.error : color.warning;
      const statusIcon = bot.status === 'running' ? '🟢' : bot.status === 'error' ? '🔴' : '🟡';

      console.log(`${c.brightCyan}║${c.reset}  ${statusIcon} ${c.white}${bot.name.padEnd(30)}${c.reset}`);
      console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Status:${c.reset} ${statusColor(bot.status.toUpperCase())}  ${c.dim}Predictions:${c.reset} ${c.brightWhite}${bot.predictions}${c.reset}  ${c.dim}Accuracy:${c.reset} ${bot.accuracy > 0 ? (bot.accuracy >= 55 ? color.success(bot.accuracy.toFixed(1) + '%') : color.warning(bot.accuracy.toFixed(1) + '%')) : 'N/A'}  ${c.brightCyan}║${c.reset}`);
      console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Last Update:${c.reset} ${c.dim}${bot.lastUpdate.toLocaleTimeString()}${c.reset}                          ${c.brightCyan}║${c.reset}`);
      console.log(`${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`);
    }

    console.log(`${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);
  }

  async stop(): Promise<void> {
    console.log(`\n${color.warning('⚠️ Stopping bot manager...')}`);
    this.isRunning = false;

    if (this.dataFlowInterval) {
      clearInterval(this.dataFlowInterval);
    }

    // Update all bots to idle
    for (const bot of this.bots.values()) {
      bot.status = 'idle';
    }

    console.log(`${color.success('✅ Bot manager stopped')}\n`);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];

  const manager = new BotManager();

  if (command === 'status') {
    await manager.start();
    // Keep running to show periodic updates
    setInterval(() => {
      manager.displayStatus();
    }, 300000); // Every 5 minutes

    // Keep process alive
    setInterval(() => {}, 1000);
  } else {
    await manager.start();

    // Handle shutdown
    process.on('SIGINT', async () => {
      await manager.stop();
      process.exit(0);
    });

    // Keep running
    setInterval(() => {}, 1000);
  }
}

if (require.main === module) {
  main().catch(console.error);
}


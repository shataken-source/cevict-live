/**
 * TRAIN ALL CATEGORY LEARNING BOTS
 * Trains each category bot on historical Kalshi market data
 * Improves accuracy and predictions over time
 */

import 'dotenv/config';
import { categoryLearners } from './intelligence/category-learners';
import { KalshiTrader } from './intelligence/kalshi-trader';

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

async function trainAllBots() {
  console.log(`
${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.brightCyan}║${c.reset}         ${c.brightYellow}🤖 CATEGORY BOT TRAINING SYSTEM 🤖${c.reset}                    ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}                                                              ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.white}Training specialized bots for each Kalshi category${c.reset}        ${c.brightCyan}║${c.reset}
${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}
  `);

  const kalshi = new KalshiTrader();

  console.log(`${c.brightWhite}📡 Fetching Kalshi markets for training...${c.reset}`);
  const markets = await kalshi.getMarkets();

  console.log(`${color.success('✅ Found ' + markets.length + ' markets')}\n`);

  // Categorize markets
  const categorized: Record<string, any[]> = {
    crypto: [],
    politics: [],
    economics: [],
    entertainment: [],
    sports: [],
    weather: [],
    technology: [],
    general: [],
  };

  markets.forEach(market => {
    const title = (market.title || '').toLowerCase();
    const category = market.category?.toLowerCase() || '';

    if (category.includes('crypto') || title.includes('bitcoin') || title.includes('btc') || title.includes('ethereum')) {
      categorized.crypto.push(market);
    } else if (category.includes('politics') || title.includes('election') || title.includes('president')) {
      categorized.politics.push(market);
    } else if (category.includes('economics') || title.includes('fed') || title.includes('rate') || title.includes('inflation')) {
      categorized.economics.push(market);
    } else if (category.includes('entertainment') || title.includes('oscar') || title.includes('emmy') || title.includes('movie')) {
      categorized.entertainment.push(market);
    } else if (category.includes('sports') || title.includes('nfl') || title.includes('nba') || title.includes('football')) {
      categorized.sports.push(market);
    } else if (category.includes('weather') || title.includes('temperature') || title.includes('hurricane')) {
      categorized.weather.push(market);
    } else if (category.includes('technology') || title.includes('openai') || title.includes('ai') || title.includes('tech')) {
      categorized.technology.push(market);
    } else {
      categorized.general.push(market);
    }
  });

  // Train each category
  console.log(`${c.brightWhite}🎓 TRAINING BOTS:${c.reset}\n`);

  for (const [category, markets] of Object.entries(categorized)) {
    if (markets.length === 0 || category === 'general') continue;

    console.log(`${c.brightCyan}${'─'.repeat(60)}${c.reset}`);
    console.log(`${color.highlight('📚 ' + category.toUpperCase() + ' BOT')} - ${c.white}${markets.length} markets${c.reset}`);
    console.log(`${c.brightCyan}${'─'.repeat(60)}${c.reset}`);

    let analyzed = 0;
    let opportunities = 0;

    for (const market of markets.slice(0, 20)) { // Train on top 20 per category
      try {
        const prediction = await categoryLearners.analyzeMarket(market);
        categoryLearners.recordPrediction(prediction.category as any, prediction);

        analyzed++;

        if (prediction.edge >= 1.0 && prediction.confidence >= 50) {
          opportunities++;
          console.log(`   ${color.success('✅')} ${market.title.substring(0, 50)}...`);
          console.log(`      ${c.dim}Edge:${c.reset} ${color.success('+' + prediction.edge.toFixed(1) + '%')} | ${c.dim}Confidence:${c.reset} ${color.info(prediction.confidence + '%')} | ${c.dim}Side:${c.reset} ${prediction.prediction.toUpperCase()}`);
        }
      } catch (e) {
        console.log(`   ${color.warning('⚠️ Error analyzing:')} ${market.title.substring(0, 40)}...`);
      }
    }

    const bot = categoryLearners.getBotStats(category as any);
    if (bot) {
      console.log(`\n   ${c.dim}Bot Stats:${c.reset}`);
      console.log(`      ${c.dim}Total Predictions:${c.reset} ${c.white}${bot.totalPredictions}${c.reset}`);
      console.log(`      ${c.dim}Accuracy:${c.reset} ${bot.accuracy > 0 ? (bot.accuracy >= 55 ? color.success(bot.accuracy.toFixed(1) + '%') : color.warning(bot.accuracy.toFixed(1) + '%')) : 'N/A'}`);
      console.log(`      ${c.dim}Average Edge:${c.reset} ${bot.averageEdge > 0 ? color.success('+' + bot.averageEdge.toFixed(1) + '%') : 'N/A'}`);
    }

    console.log(`   ${color.info('📊 Analyzed: ' + analyzed + ' | Opportunities: ' + opportunities)}\n`);
  }

  // Show summary
  console.log(`${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.brightCyan}║${c.reset}              ${c.brightYellow}📊 TRAINING SUMMARY 📊${c.reset}                        ${c.brightCyan}║${c.reset}`);
  console.log(`${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`);

  const allStats = categoryLearners.getAllStats();
  for (const [category, bot] of allStats.entries()) {
    if (bot.totalPredictions === 0) continue;

    const accuracyColor = bot.accuracy >= 55 ? color.success : bot.accuracy >= 50 ? color.warning : color.error;
    console.log(`${c.brightCyan}║${c.reset}  ${c.white}${category.toUpperCase().padEnd(15)}${c.reset}  ${c.dim}Accuracy:${c.reset} ${accuracyColor(bot.accuracy.toFixed(1) + '%')}  ${c.dim}(${bot.totalPredictions} predictions)${c.reset}     ${c.brightCyan}║${c.reset}`);
  }

  console.log(`${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${color.success('✅ Training complete!')} All category bots are ready.\n`);
}

async function showBotStats() {
  console.log(`
${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.brightCyan}║${c.reset}              ${c.brightYellow}📊 CATEGORY BOT STATS 📊${c.reset}                        ${c.brightCyan}║${c.reset}
${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}
  `);

  const allStats = categoryLearners.getAllStats();

  for (const [category, bot] of allStats.entries()) {
    const accuracyColor = bot.accuracy >= 55 ? color.success : bot.accuracy >= 50 ? color.warning : color.error;
    const edgeColor = bot.averageEdge > 2 ? color.success : bot.averageEdge > 0 ? color.warning : color.error;

    console.log(`${c.brightCyan}║${c.reset}  ${color.highlight(category.toUpperCase())}${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Predictions:${c.reset} ${c.white}${bot.totalPredictions}${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Accuracy:${c.reset} ${accuracyColor(bot.accuracy.toFixed(1) + '%')} ${c.dim}(${bot.correctPredictions}/${bot.totalPredictions})${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Avg Edge:${c.reset} ${edgeColor((bot.averageEdge >= 0 ? '+' : '') + bot.averageEdge.toFixed(1) + '%')}`);
    console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Last Trained:${c.reset} ${c.dim}${bot.lastTrained.toLocaleString()}${c.reset}`);
    console.log(`${c.brightCyan}║${c.reset}     ${c.dim}Expertise:${c.reset} ${c.dim}${bot.expertise.length} insights${c.reset}`);
    console.log(`${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`);
  }

  console.log(`${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);
}

async function main() {
  const command = process.argv[2];

  if (command === 'stats' || command === 'status') {
    await showBotStats();
  } else {
    await trainAllBots();
  }
}



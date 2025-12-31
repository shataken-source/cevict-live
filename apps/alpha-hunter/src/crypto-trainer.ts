/**
 * Crypto Training Bot
 * Learns to trade by making small real trades
 * Tracks wins/losses and adapts strategy
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local from the app directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { CoinbaseExchange } from './exchanges/coinbase';
import Anthropic from '@anthropic-ai/sdk';
import { fundManager } from './fund-manager';
import { dataAggregator } from './intelligence/data-aggregator';
import { marketLearner } from './intelligence/market-learner';

// ANSI Color Codes & Beep Utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  const color = pnl >= 0 ? colors.green : colors.red;
  return colorize(`${sign}${pnl.toFixed(2)}`, color);
}

function formatPercent(value: number, isGood: boolean = true): string {
  const color = isGood ? colors.green : colors.red;
  const sign = value >= 0 ? '+' : '';
  return colorize(`${sign}${value.toFixed(1)}%`, color);
}

function beep(count: number = 1, interval: number = 100): void {
  for (let i = 0; i < count; i++) {
    process.stdout.write('\x07'); // ASCII bell
    if (i < count - 1) {
      setTimeout(() => {}, interval);
    }
  }
}

function celebrateWin(message: string): void {
  beep(2, 150);
  console.log(colorize(`\n🎉 ${message} 🎉\n`, colors.green + colors.bright));
}

function alertLoss(message: string): void {
  beep(1, 200);
  console.log(colorize(`\n⚠️  ${message}\n`, colors.red));
}


// ANSI Color Codes


// Complete Knowledge System for the Trading Bot
class BotKnowledge {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private priceHistory: Map<string, number[]> = new Map();

  // Cache data for 30 seconds
  private async cached<T>(key: string, fetcher: () => Promise<T>, ttl = 30000): Promise<T | null> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expires > now) return cached.data;

    try {
      const data = await fetcher();
      this.cache.set(key, { data, expires: now + ttl });
      return data;
    } catch {
      return cached?.data || null;
    }
  }

  // Track price for momentum analysis
  trackPrice(pair: string, price: number): void {
    const history = this.priceHistory.get(pair) || [];
    history.push(price);
    if (history.length > 20) history.shift(); // Keep last 20
    this.priceHistory.set(pair, history);
  }

  getMomentum(pair: string): { trend: string; strength: number } {
    const history = this.priceHistory.get(pair) || [];
    if (history.length < 3) return { trend: 'unknown', strength: 0 };

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      trend: change > 0.1 ? 'UP' : change < -0.1 ? 'DOWN' : 'SIDEWAYS',
      strength: Math.abs(change)
    };
  }

  async getMarketIntelligence(): Promise<string> {
    const [fearGreed, btcDominance, trending, news] = await Promise.all([
      this.getFearGreedIndex(),
      this.getBTCDominance(),
      this.getTrendingCoins(),
      this.getCryptoNews(),
    ]);

    return `
📊 REAL-TIME MARKET INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fear & Greed Index: ${fearGreed}
BTC Dominance: ${btcDominance}
Trending: ${trending}
News: ${news}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
  }

  private async getFearGreedIndex(): Promise<string> {
    const data = await this.cached('feargreed', async () => {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      return res.ok ? res.json() : null;
    }, 300000); // 5 min cache

    if (data?.data?.[0]) {
      const fg = data.data[0];
      return `${fg.value} (${fg.value_classification})`;
    }
    return 'N/A';
  }

  private async getBTCDominance(): Promise<string> {
    const data = await this.cached('btcdom', async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/global');
      return res.ok ? res.json() : null;
    }, 300000);

    if (data?.data?.market_cap_percentage?.btc) {
      return `${data.data.market_cap_percentage.btc.toFixed(1)}%`;
    }
    return 'N/A';
  }

  private async getTrendingCoins(): Promise<string> {
    const data = await this.cached('trending', async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
      return res.ok ? res.json() : null;
    }, 600000); // 10 min cache

    if (data?.coins) {
      return data.coins.slice(0, 3).map((c: any) => c.item.symbol).join(', ');
    }
    return 'N/A';
  }

  private async getCryptoNews(): Promise<string> {
    // Simplified - in production would use news API
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 16) {
      return 'US markets open - higher volatility expected';
    } else if (hour >= 0 && hour <= 6) {
      return 'Asian markets active - watch for BTC moves';
    }
    return 'After-hours - lower liquidity';
  }

  async getPrognoMassager(): Promise<string> {
    const baseUrl = process.env.PROGNO_MASSAGER_URL || 'https://progno-massager.vercel.app';

    const data = await this.cached('progno', async () => {
      const [sentiment, signals] = await Promise.all([
        fetch(`${baseUrl}/api/market/sentiment`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${baseUrl}/api/signals/crypto`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      return { sentiment, signals };
    }, 60000);

    let result = 'PROGNO MASSAGER:\n';
    if (data?.sentiment) {
      result += `- Sentiment: ${data.sentiment.overall || 'neutral'}\n`;
    }
    if (data?.signals?.length) {
      result += `- Signals: ${data.signals.slice(0, 2).map((s: any) => s.action).join(', ')}\n`;
    }
    return result || 'PROGNO: No data';
  }

  async getFullBriefing(pairs: string[]): Promise<string> {
    const [market, progno] = await Promise.all([
      this.getMarketIntelligence(),
      this.getPrognoMassager(),
    ]);

    // Get momentum for each pair
    const momentums = pairs.map(p => {
      const m = this.getMomentum(p);
      return `${p}: ${m.trend} (${m.strength.toFixed(2)}% strength)`;
    }).join('\n');

    return `
${market}

${progno}

📈 MOMENTUM TRACKER:
${momentums || 'Building history...'}

🕐 Updated: ${new Date().toLocaleTimeString()}
`.trim();
  }
}

const knowledge = new BotKnowledge();

interface TradeRecord {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  usdValue: number;
  profit?: number;
  profitPercent?: number;
  reason: string;
  timestamp: Date;
  closed: boolean;
  takeProfitPrice: number;
  stopLossPrice: number;
}

interface LearningState {
  totalTrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
  patterns: {
    winningStrategies: string[];
    losingStrategies: string[];
  };
}

class CryptoTrainer {
  private coinbase: CoinbaseExchange;
  private claude: Anthropic | null;
  private trades: TradeRecord[] = [];
  private learning: LearningState;
  private maxTradeUSD = 10; // Increased to $10 max per trade
  private minProfitPercent = 1.5; // Take profit at 1.5%
  private maxLossPercent = 2; // Stop loss at 2%
  private tradingPairs = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
  private isRunning = false;
  private learnedConcepts: Set<string> = new Set(); // Track learned crypto concepts

  // SAFETY: Prevent runaway conversions
  private conversionAttempted = false;
  private totalConvertedThisSession = 0;
  private maxConversionPerSession = 500; // Never convert more than this per session

  // Track estimated USD (invisible to API but usable)
  private estimatedUSD = 0;
  private tradesThisSession = 0;
  private lastBalanceRefresh: Date = new Date(0);
  private balanceRefreshInterval = 60000; // Refresh every 60 seconds minimum

  constructor() {
    this.coinbase = new CoinbaseExchange();
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.learning = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      bestTrade: null,
      worstTrade: null,
      patterns: {
        winningStrategies: [],
        losingStrategies: []
      }
    };
  }

  async initialize(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║          🎓 CRYPTO TRAINING MODE - ALPHA HUNTER 🎓           ║
║                                                              ║
║  Learning with real trades • Small amounts • Building skill  ║
╚══════════════════════════════════════════════════════════════╝
    `);

    if (!this.coinbase.isConfigured()) {
      console.log('❌ Coinbase not configured!');
      return;
    }

    // Show AI status
    console.log(`🧠 AI Brain: ${this.claude ? '✅ Claude connected' : '⚠️ No AI (using basic logic)'}`);

    // Check available funds and sync balance
    await this.showPortfolio();
    await this.refreshBalances(true); // Force initial sync
  }

  async showPortfolio(): Promise<void> {
    console.log('\n💰 PORTFOLIO STATUS:');
    console.log('━'.repeat(50));

    // Check if Coinbase is configured
    if (!this.coinbase.isConfigured()) {
      console.log('  ⚠️ Coinbase running in SIMULATION mode');
      console.log('  Set COINBASE_API_KEY and COINBASE_API_SECRET for real balances');
    }

    const accounts = await this.coinbase.getAccounts();
    console.log(`  📋 Found ${accounts.length} accounts from Coinbase`);

    // Show accounts with balance OR hold (unstaking)
    const withAssets = accounts.filter(a => a.available > 0.000001 || a.hold > 0.000001);

    let totalUSD = 0;
    let totalHeldUSD = 0;
    let usdCash = 0;

    for (const acc of withAssets) {
      if (acc.currency === 'USD') {
        usdCash = acc.available;
        totalUSD += acc.available;
        totalHeldUSD += acc.hold || 0;
        let line = `  💵 USD: $${acc.available.toFixed(2)}`;
        if (acc.hold > 0) line += ` (+ $${acc.hold.toFixed(2)} held)`;
        console.log(line);
      } else {
        // Handle stablecoins (USDC, DAI, USDT = $1)
        const stablecoins = ['USDC', 'DAI', 'USDT', 'GUSD', 'PAX', 'BUSD'];
        if (stablecoins.includes(acc.currency)) {
          const availValue = acc.available;
          const holdValue = acc.hold || 0;
          totalUSD += availValue;
          totalHeldUSD += holdValue;
          console.log(`  💵 ${acc.currency}: $${availValue.toFixed(2)} (stablecoin)`);
          continue;
        }

        // Get price for this asset
        try {
          const ticker = await this.coinbase.getTicker(`${acc.currency}-USD`);
          const availValue = acc.available * ticker.price;
          const holdValue = (acc.hold || 0) * ticker.price;
          totalUSD += availValue;
          totalHeldUSD += holdValue;

          let line = `  🪙 ${acc.currency}: ${acc.available.toFixed(8)} @ $${ticker.price.toLocaleString()} = $${availValue.toFixed(2)}`;
          if (acc.hold > 0.000001) {
            line += `\n     ⏳ Unstaking: ${acc.hold.toFixed(8)} (~$${holdValue.toFixed(2)})`;
          }
          console.log(line);
        } catch {
          // Silently skip delisted coins (no price available)
        }
      }
    }

    console.log('━'.repeat(50));
    console.log(`  💵 USD Cash: $${usdCash.toFixed(2)}`);
    console.log(`  📊 Available: ~$${totalUSD.toFixed(2)}`);
    if (totalHeldUSD > 0.01) {
      console.log(`  ⏳ Unstaking: ~$${totalHeldUSD.toFixed(2)}`);
      console.log(`  💰 Total (when unlocked): ~$${(totalUSD + totalHeldUSD).toFixed(2)}`);
    }
    console.log('');

    // Update unified fund manager with crypto balance
    const openPositionValue = this.trades.filter(t => !t.closed).reduce((sum, t) => sum + t.usdValue, 0);
    fundManager.updateCryptoBalance(totalUSD - openPositionValue, openPositionValue);
  }

  async getUSDBalance(): Promise<number> {
    const accounts = await this.coinbase.getAccounts();
    const usd = accounts.find(a => a.currency === 'USD');
    return usd?.available || 0;
  }

  /**
   * Refresh balances from Coinbase and sync estimatedUSD
   * Call this after trades complete or periodically
   */
  async refreshBalances(force: boolean = false): Promise<void> {
    const now = new Date();
    const timeSinceRefresh = now.getTime() - this.lastBalanceRefresh.getTime();

    // Skip if recently refreshed (unless forced)
    if (!force && timeSinceRefresh < this.balanceRefreshInterval) {
      return;
    }

    console.log('\n💫 Refreshing balances from Coinbase...');

    try {
      const accounts = await this.coinbase.getAccounts();
      const withAssets = accounts.filter(a => a.available > 0.000001 || a.hold > 0.000001);

      let totalPortfolioUSD = 0;
      let unstakingUSD = 0;
      let usdCash = 0;
      let cryptoValueUSD = 0;

      const stablecoins = ['USDC', 'DAI', 'USDT', 'GUSD', 'PAX', 'BUSD'];

      for (const acc of withAssets) {
        if (acc.currency === 'USD') {
          usdCash = acc.available;
          totalPortfolioUSD += acc.available;
          unstakingUSD += acc.hold || 0;
        } else if (stablecoins.includes(acc.currency)) {
          // Stablecoins = $1
          usdCash += acc.available; // Count as spendable USD
          totalPortfolioUSD += acc.available;
          unstakingUSD += acc.hold || 0;
        } else {
          // Get price for this asset
          try {
            const ticker = await this.coinbase.getTicker(`${acc.currency}-USD`);
            const availValue = acc.available * ticker.price;
            const holdValue = (acc.hold || 0) * ticker.price;
            cryptoValueUSD += availValue;
            totalPortfolioUSD += availValue;
            unstakingUSD += holdValue;
          } catch {
            // Skip delisted coins
          }
        }
      }

      // Calculate how much is tied up in open positions
      const openPositionValue = this.trades
        .filter(t => !t.closed)
        .reduce((sum, t) => sum + t.usdValue, 0);

      // Sync estimatedUSD with actual USD cash (what we can actually trade with)
      const previousEstimate = this.estimatedUSD;
      this.estimatedUSD = usdCash;

      // Update fund manager with TOTAL portfolio value (USD + crypto)
      fundManager.updateCryptoBalance(totalPortfolioUSD - openPositionValue, openPositionValue);

      this.lastBalanceRefresh = now;

      console.log(`   💵 USD Cash: $${usdCash.toFixed(2)}`);
      console.log(`   🪙 Crypto (available): $${cryptoValueUSD.toFixed(2)}`);
      if (unstakingUSD > 0.01) {
        console.log(`   ⏳ Unstaking: $${unstakingUSD.toFixed(2)}`);
      }
      console.log(`   📊 Total Available: $${totalPortfolioUSD.toFixed(2)}`);

      if (Math.abs(this.estimatedUSD - previousEstimate) > 0.01) {
        console.log(`   🔄 USD synced: $${previousEstimate.toFixed(2)} → $${this.estimatedUSD.toFixed(2)}`);
      }

    } catch (err: any) {
      console.log(`   ⚠️ Balance refresh failed: ${err.message}`);
    }
  }

  async convertToUSD(currency: string, amount: number): Promise<boolean> {
    console.log(`\n💱 Converting ${amount} ${currency} to USD...`);

    try {
      const order = await this.coinbase.marketSell(`${currency}-USD`, amount);
      console.log(`  ✅ Sold ${amount} ${currency}`);
      console.log(`  📝 Order ID: ${order.id}`);
      return true;
    } catch (err: any) {
      console.log(`  ❌ Failed: ${err.message}`);
      return false;
    }
  }

  async analyzeMarket(pair: string): Promise<{
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
    reason: string;
    price: number;
  }> {
    const ticker = await this.coinbase.getTicker(pair);
    const spread = ((ticker.ask - ticker.bid) / ticker.price) * 100;

    // ALWAYS track price for momentum (even if AI fails)
    knowledge.trackPrice(pair, ticker.price);

    // If Claude is available, use AI analysis
    if (this.claude) {
      try {
        const aiAnalysis = await this.getClaudeAnalysis(pair, ticker, spread);
        return aiAnalysis;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        if (errMsg.includes('credit') || errMsg.includes('balance')) {
          console.log(`   ⚠️ AI: Need API credits`);
        } else if (errMsg.includes('rate')) {
          console.log(`   ⚠️ AI: Rate limited, waiting...`);
        } else {
          console.log(`   ⚠️ AI offline: ${errMsg.substring(0, 60)}`);
        }
      }
    }

    // Fallback to momentum-based analysis
    const momentum = knowledge.getMomentum(pair);

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 50;
    let reason = 'Building data...';

    // Use momentum if we have enough history
    if (momentum.trend !== 'unknown') {
      if (momentum.trend === 'UP' && momentum.strength > 0.05) {
        signal = 'buy';
        confidence = 55 + Math.min(momentum.strength * 10, 15);
        reason = `Upward momentum ${momentum.strength.toFixed(2)}%`;
      } else if (momentum.trend === 'DOWN' && momentum.strength > 0.05) {
        signal = 'sell';
        confidence = 55 + Math.min(momentum.strength * 10, 15);
        reason = `Downward momentum ${momentum.strength.toFixed(2)}%`;
      } else {
        reason = 'Sideways - waiting for trend';
      }
    }

    return { signal, confidence, reason, price: ticker.price };
  }

  private async getClaudeAnalysis(pair: string, ticker: any, spread: number): Promise<{
    signal: 'buy' | 'sell' | 'hold';
    confidence: number;
    reason: string;
    price: number;
  }> {
    const winRate = this.learning.totalTrades > 0
      ? (this.learning.wins / this.learning.totalTrades * 100).toFixed(1)
      : 'N/A';

    const recentTrades = this.trades.slice(-5).map(t =>
      `${t.side} ${t.pair} @ $${t.entryPrice} - ${t.closed ? (t.profit! >= 0 ? 'WIN' : 'LOSS') : 'OPEN'}`
    ).join(', ') || 'None yet';

    // Track price for momentum
    knowledge.trackPrice(pair, ticker.price);

    // Get full market intelligence briefing
    const briefing = await knowledge.getFullBriefing(this.tradingPairs);
    const momentum = knowledge.getMomentum(pair);

    const response = await this.claude!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are ALPHA, an AI crypto trader learning to profit. You have $5 max per trade.

═══════════════════════════════════════
CURRENT TRADE ANALYSIS: ${pair}
═══════════════════════════════════════
Price: $${ticker.price.toLocaleString()}
Bid: $${ticker.bid} | Ask: $${ticker.ask}
Spread: ${spread.toFixed(3)}%
Momentum: ${momentum.trend} (${momentum.strength.toFixed(2)}%)

${briefing}

═══════════════════════════════════════
YOUR LEARNING HISTORY
═══════════════════════════════════════
Total trades: ${this.learning.totalTrades}
Win rate: ${winRate}%
Total P&L: $${this.learning.totalProfit.toFixed(2)}
Best trade: ${this.learning.bestTrade ? '$' + this.learning.bestTrade.profit?.toFixed(2) : 'None'}
Worst trade: ${this.learning.worstTrade ? '$' + this.learning.worstTrade.profit?.toFixed(2) : 'None'}
Recent: ${recentTrades}

═══════════════════════════════════════
TRADING RULES
═══════════════════════════════════════
- Max $5 per trade
- Take profit: +1.5%
- Stop loss: -2%
- Learn from EVERY trade
- Use momentum + market intel
- Be patient - only trade high confidence

DECISION TIME: Should you BUY, SELL, or HOLD ${pair}?
Respond JSON only: {"signal": "buy|sell|hold", "confidence": 0-100, "reason": "your reasoning"}`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');

    return {
      signal: json.signal || 'hold',
      confidence: json.confidence || 50,
      reason: json.reason || 'AI analysis',
      price: ticker.price
    };
  }

  async executeTrade(pair: string, side: 'buy' | 'sell', usdAmount: number, reason: string): Promise<TradeRecord | null> {
    console.log(`\n🎯 Executing ${side.toUpperCase()} on ${pair}`);
    console.log(`   Amount: $${usdAmount.toFixed(2)}`);
    console.log(`   Reason: ${reason}`);

    try {
      const ticker = await this.coinbase.getTicker(pair);
      let order;

      if (side === 'buy') {
        order = await this.coinbase.marketBuy(pair, usdAmount);
      } else {
        const cryptoAmount = usdAmount / ticker.price;
        order = await this.coinbase.marketSell(pair, cryptoAmount);
      }

      // Calculate TP and SL prices
      const entryPrice = ticker.price;
      const takeProfitPrice = entryPrice * (1 + this.minProfitPercent / 100);
      const stopLossPrice = entryPrice * (1 - this.maxLossPercent / 100);

      // Calculate entry fee (Coinbase: 0.6% taker fee for market orders)
      const entryFee = order.fillFees || (usdAmount * 0.006);
      const netEntryValue = usdAmount - entryFee;

      const trade: TradeRecord = {
        id: order.id,
        pair,
        side,
        entryPrice,
        size: order.filledSize || usdAmount / ticker.price,
        usdValue: netEntryValue, // Store net value after entry fee
        reason,
        timestamp: new Date(),
        closed: false,
        takeProfitPrice,
        stopLossPrice
      };

      this.trades.push(trade);
      console.log(`   ✅ Order filled at $${entryPrice.toLocaleString()}`);
      if (entryFee > 0.01) {
        console.log(`   💰 Entry fee: $${entryFee.toFixed(4)} (0.6% taker fee)`);
      }
      console.log(`   🎯 Take Profit: $${takeProfitPrice.toFixed(2)} (+${this.minProfitPercent}%)`);
      console.log(`   🛑 Stop Loss: $${stopLossPrice.toFixed(2)} (-${this.maxLossPercent}%)`);

      // Wait for order to settle, then refresh balance
      console.log(`   ⏳ Waiting for order to settle...`);
      await new Promise(r => setTimeout(r, 2000));
      await this.refreshBalances(true); // Force refresh after trade

      return trade;
    } catch (err: any) {
      console.log(`   ❌ Trade failed: ${err.message}`);
      return null;
    }
  }

  async checkOpenTrades(): Promise<void> {
    const openTrades = this.trades.filter(t => !t.closed && t.side === 'buy');

    if (openTrades.length === 0) return;

    console.log(`\n📋 OPEN POSITIONS (${openTrades.length}):`);

    for (const trade of openTrades) {
      try {
        const ticker = await this.coinbase.getTicker(trade.pair);
        const currentPrice = ticker.price;
        const pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
        const pnlUSD = (currentPrice - trade.entryPrice) * trade.size;

        const emoji = pnlPercent >= 0 ? '📈' : '📉';
        console.log(`   ${emoji} ${trade.pair}: $${currentPrice.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}% / $${pnlUSD.toFixed(4)})`);
        console.log(`      Entry: $${trade.entryPrice.toFixed(2)} | TP: $${trade.takeProfitPrice.toFixed(2)} | SL: $${trade.stopLossPrice.toFixed(2)}`);

        // Take profit - AUTO SELL
        if (currentPrice >= trade.takeProfitPrice) {
          console.log(`   🎉 TAKE PROFIT HIT! Auto-selling...`);
          await this.autoSellPosition(trade, currentPrice, 'Take profit +' + this.minProfitPercent + '%');
        }
        // Stop loss - AUTO SELL
        else if (currentPrice <= trade.stopLossPrice) {
          console.log(`   🛑 STOP LOSS HIT! Auto-selling...`);
          await this.autoSellPosition(trade, currentPrice, 'Stop loss -' + this.maxLossPercent + '%');
        }
      } catch (err: any) {
        console.log(`   ⚠️ Error checking ${trade.pair}: ${err.message.substring(0, 40)}`);
      }
    }
  }

  async autoSellPosition(trade: TradeRecord, currentPrice: number, reason: string): Promise<void> {
    try {
      // Execute sell
      console.log(`   📉 Selling ${trade.size.toFixed(8)} ${trade.pair.split('-')[0]}...`);
      const sellOrder = await this.coinbase.marketSell(trade.pair, trade.size);

      // Calculate P&L with fees
      // Coinbase fees: 0.6% taker fee for market orders (both buy and sell)
      const grossPnL = (currentPrice - trade.entryPrice) * trade.size;
      const buyFee = trade.usdValue * 0.006; // 0.6% on entry
      const sellFee = (currentPrice * trade.size) * 0.006; // 0.6% on exit
      const totalFees = buyFee + sellFee;
      const pnl = grossPnL - totalFees;
      const pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      // Use actual fees from order if available
      const actualSellFee = sellOrder.fillFees || sellFee;
      const actualTotalFees = buyFee + actualSellFee;
      const actualPnL = grossPnL - actualTotalFees;

      // Update trade record
      trade.exitPrice = currentPrice;
      trade.profit = actualPnL; // Use actual P&L with fees
      trade.profitPercent = pnlPercent;
      trade.closed = true;

      // Log fee information
      if (actualTotalFees > 0.01) {
        console.log(`   💰 Fees: $${actualTotalFees.toFixed(4)} (Buy: $${buyFee.toFixed(4)}, Sell: $${actualSellFee.toFixed(4)})`);
        console.log(`   📊 Gross P&L: $${grossPnL.toFixed(4)} → Net P&L: $${actualPnL.toFixed(4)}`);
      }

      // Update learning state
      this.learning.totalTrades++;
      this.learning.totalProfit += actualPnL; // Use net profit after fees

      if (actualPnL > 0) {
        this.learning.wins++;
      fundManager.updateCryptoStats(actualPnL, true);
        celebrateWin(`💰 WIN: +${actualPnL.toFixed(4)} (+${pnlPercent.toFixed(2)}%)`);
      } else {
        this.learning.losses++;
      fundManager.updateCryptoStats(actualPnL, false);
        alertLoss(`💸 LOSS: ${actualPnL.toFixed(4)} (${pnlPercent.toFixed(2)}%)`);
      }

      // Track best/worst (using net profit after fees)
      if (!this.learning.bestTrade || actualPnL > (this.learning.bestTrade.profit || 0)) {
        this.learning.bestTrade = trade;
      }
      if (!this.learning.worstTrade || actualPnL < (this.learning.worstTrade.profit || 0)) {
        this.learning.worstTrade = trade;
      }

      // Wait for order to settle, then refresh actual balance from Coinbase
      console.log(`   ⏳ Waiting for order to settle...`);
      await new Promise(r => setTimeout(r, 2000));
      await this.refreshBalances(true); // Force refresh after trade

    } catch (err: any) {
      console.log(`   ❌ Auto-sell failed: ${err.message}`);
    }
  }


    showLearningStats(): void {
    const winRate = this.learning.totalTrades > 0
      ? (this.learning.wins / this.learning.totalTrades * 100)
      : 0;

    // Sync cumulative stats to fund manager
    const cryptoStats = fundManager.getCryptoStats();
    const pnlDelta = this.learning.totalProfit - cryptoStats.pnl;
    if (Math.abs(pnlDelta) > 0.01) {
      fundManager.updateCryptoStats(pnlDelta, pnlDelta > 0);
    }
    console.log('\n' + fundManager.getStatus());

    const winRateColor = winRate >= 60 ? colors.green : winRate >= 50 ? colors.yellow : colors.red;
    const pnlColor = this.learning.totalProfit >= 0 ? colors.green : colors.red;
    const tradesColor = this.learning.totalTrades > 0 ? colors.cyan : colors.dim;

    console.log(`
${colors.bright}╔══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.bright}║${colors.reset}                   ${colors.cyan}📊 LEARNING PROGRESS 📊${colors.reset}                    ${colors.bright}║${colors.reset}
${colors.bright}╠══════════════════════════════════════════════════════════════╣${colors.reset}
${colors.bright}║${colors.reset}  Total Trades:  ${colorize(String(this.learning.totalTrades).padEnd(10), tradesColor)}                              ${colors.bright}║${colors.reset}
${colors.bright}║${colors.reset}  Wins:          ${colorize(String(this.learning.wins).padEnd(10), colors.green)} Losses: ${colorize(String(this.learning.losses).padEnd(10), colors.red)}       ${colors.bright}║${colors.reset}
${colors.bright}║${colors.reset}  Win Rate:      ${colorize((winRate.toFixed(1) + '%').padEnd(10), winRateColor)}                              ${colors.bright}║${colors.reset}
${colors.bright}║${colors.reset}  Total P&L:     ${formatPnL(this.learning.totalProfit).padEnd(20)}                              ${colors.bright}║${colors.reset}
${colors.bright}╚══════════════════════════════════════════════════════════════╝${colors.reset}
    `);
  }

  async runTrainingCycle(): Promise<void> {
    console.log('\n🔄 Starting training cycle...\n');

    // ALWAYS refresh balances at start of cycle (respects interval)
    await this.refreshBalances();

    // Get and display FULL market intelligence from all sources
    console.log('📡 Fetching market intelligence from all sources...');
    try {
      const enhancedBriefing = await dataAggregator.getFormattedBriefing();
      console.log(enhancedBriefing);
    } catch (err) {
      // Fallback to basic briefing if aggregator fails
      const intel = await knowledge.getFullBriefing(this.tradingPairs);
      console.log(intel);
    }
    console.log('');

    // Show current USD balance (now synced with Coinbase)
    console.log(`💵 Available USD: $${this.estimatedUSD.toFixed(2)}`);
    console.log(`📊 Trades this session: ${this.tradesThisSession}`);
    console.log('');

    // If low on USD, convert some crypto to get trading capital
    if (this.estimatedUSD < 10 && !this.conversionAttempted) {
      console.log('💱 Getting trading capital...');
      const accounts = await this.coinbase.getAccounts();

      // Debug: Show all accounts with any balance
      console.log('   📋 Accounts found:');
      for (const acc of accounts) {
        if (acc.available > 0 || acc.hold > 0) {
          console.log(`      ${acc.currency}: ${acc.available} avail, ${acc.hold} held`);
        }
      }

      // Try BTC first (most liquid)
      const btc = accounts.find(a => a.currency === 'BTC' && a.available > 0.0001);
      if (btc) {
        this.conversionAttempted = true;
        const ticker = await this.coinbase.getTicker('BTC-USD');
        // Sell $50 worth of BTC for trading capital
        const targetUSD = 50;
        const sellAmount = Math.min(targetUSD / ticker.price, btc.available * 0.1); // Max 10% of BTC
        const expectedUSD = sellAmount * ticker.price;

        console.log(`   💰 BTC Balance: ${btc.available.toFixed(8)} (~$${(btc.available * ticker.price).toFixed(2)})`);
        console.log(`   📤 Selling ${sellAmount.toFixed(8)} BTC (~$${expectedUSD.toFixed(2)}) for trading capital...`);
        await this.convertToUSD('BTC', sellAmount);
        this.estimatedUSD += expectedUSD * 0.99; // Account for fees
        console.log(`   ✅ USD now: $${this.estimatedUSD.toFixed(2)}`);
        await new Promise(r => setTimeout(r, 3000));
        await this.refreshBalances(true);
        return;
      }

      // Try ETH next
      const eth = accounts.find(a => a.currency === 'ETH' && a.available > 0.01);
      if (eth) {
        this.conversionAttempted = true;
        const ticker = await this.coinbase.getTicker('ETH-USD');
        const targetUSD = 50;
        const sellAmount = Math.min(targetUSD / ticker.price, eth.available * 0.1);
        const expectedUSD = sellAmount * ticker.price;

        console.log(`   📤 Selling ${sellAmount.toFixed(6)} ETH (~$${expectedUSD.toFixed(2)}) for trading capital...`);
        await this.convertToUSD('ETH', sellAmount);
        this.estimatedUSD += expectedUSD * 0.99;
        console.log(`   ✅ USD now: $${this.estimatedUSD.toFixed(2)}`);
        await new Promise(r => setTimeout(r, 3000));
        await this.refreshBalances(true);
        return;
      }

      // Try MON as last resort
      const mon = accounts.find(a => a.currency === 'MON' && a.available > 200);
      if (mon) {
        this.conversionAttempted = true;
        const sellAmount = Math.min(300, mon.available);
        const ticker = await this.coinbase.getTicker('MON-USD');
        const expectedUSD = sellAmount * ticker.price;

        console.log(`   📤 Selling ${sellAmount} MON (~$${expectedUSD.toFixed(2)})...`);
        await this.convertToUSD('MON', sellAmount);
        this.estimatedUSD += expectedUSD * 0.99;
        console.log(`   ✅ USD now: $${this.estimatedUSD.toFixed(2)}`);
        await new Promise(r => setTimeout(r, 3000));
        await this.refreshBalances(true);
        return;
      }

      console.log('   ⚠️ No crypto available to convert to USD');
    }

    // ALWAYS check open trades first - auto take profit / stop loss
    await this.checkOpenTrades();

    // Show session stats
    const openCount = this.trades.filter(t => !t.closed).length;
    console.log(`\n📊 Session: ${this.tradesThisSession} trades | ${openCount} open | P&L: $${this.learning.totalProfit.toFixed(2)}`);
    console.log('');

    // LEARN NEW CRYPTO CONCEPTS: Learn about pairs we haven't studied yet
    for (const pair of this.tradingPairs) {
      const symbol = pair.split('-')[0];
      if (!this.learnedConcepts.has(symbol)) {
        console.log(`\n📚 LEARNING NEW CRYPTO CONCEPT: ${symbol}`);
        await marketLearner.learnCryptoConcept(symbol, symbol);
        this.learnedConcepts.add(symbol);
      }
    }

    // Analyze each trading pair
    for (const pair of this.tradingPairs) {
      try {
        console.log(`\n📈 Analyzing ${pair}...`);

        // Use learned concept data if available
        const symbol = pair.split('-')[0];
        const concept = marketLearner.getAllCryptoConcepts().find(c => c.symbol === symbol);
        if (concept && concept.tradingPatterns.length > 0) {
          console.log(`   🧠 Using learned patterns: ${concept.tradingPatterns.slice(0, 2).join(', ')}`);
        }

        const analysis = await this.analyzeMarket(pair);

        console.log(`   Signal: ${analysis.signal.toUpperCase()}`);
        console.log(`   Confidence: ${analysis.confidence}%`);
        console.log(`   Price: $${analysis.price.toLocaleString()}`);
        console.log(`   Reason: ${analysis.reason}`);

        // Trade if confidence > 55% and we have estimated USD (increased from $2 to $5 minimum)
        if (analysis.signal === 'buy' && analysis.confidence > 55 && this.estimatedUSD >= 5) {
          // Check with fund manager if we should trade on crypto
          if (!fundManager.shouldTradeOnPlatform('crypto', analysis.confidence)) {
            console.log(`   ⚠️ Fund manager: Crypto over-allocated, skipping...`);
            continue;
          }

          // Get max allowed from fund manager
          const maxFromFunds = fundManager.getMaxTradeAmount('crypto', this.maxTradeUSD);
          const tradeAmount = Math.min(maxFromFunds, this.estimatedUSD * 0.4);

          if (tradeAmount < 5) {
            console.log(`   ⚠️ Insufficient funds allocated to crypto ($${tradeAmount.toFixed(2)})`);
            continue;
          }

          const trade = await this.executeTrade(pair, 'buy', tradeAmount, analysis.reason);
          if (trade) {
            this.estimatedUSD -= tradeAmount;
            this.tradesThisSession++;
          }
        } else if (analysis.signal === 'sell' && analysis.confidence > 55) {
          // Check if we have open positions to sell
          const openTrade = this.trades.find(t => t.pair === pair && !t.closed && t.side === 'buy');
          if (openTrade) {
            console.log(`   📉 Closing position on ${pair}...`);
            await this.checkOpenTrades();
          }
        }

        // Small delay between pairs
        await new Promise(r => setTimeout(r, 1000));

      } catch (err: any) {
        console.log(`   ⚠️ Error analyzing ${pair}: ${err.message}`);
      }
    }

    // Show stats
    this.showLearningStats();
  }

  async startTraining(intervalSeconds: number = 30): Promise<void> {
    console.log(`\n🚀 Starting continuous training (every ${intervalSeconds} sec)...`);
    console.log('   Press Ctrl+C to stop\n');

    this.isRunning = true;

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping training...');
      this.isRunning = false;
      this.showLearningStats();
      console.log('\n👋 Training session ended.\n');
      process.exit(0);
    });

    // Continuous loop
    while (this.isRunning) {
      await this.runTrainingCycle();

      // Countdown to next cycle
      console.log(`\n⏳ Next cycle in ${intervalSeconds} seconds...`);
      for (let i = intervalSeconds; i > 0 && this.isRunning; i -= 5) {
        await new Promise(r => setTimeout(r, 5000));
        if (i > 5) console.log(`   ${i - 5}s...`);
      }
    }
  }
}

// Main
async function main() {
  console.log('\n🤖 AUTONOMOUS CRYPTO TRADER STARTING...\n');

  const trainer = new CryptoTrainer();
  await trainer.initialize();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              🚀 RUNNING FULLY AUTONOMOUS 🚀                  ║
║                                                              ║
║  • Monitoring BTC, ETH, SOL every 20 seconds                 ║
║  • Auto take-profit at +1.5%                                 ║
║  • Auto stop-loss at -2%                                     ║
║  • AI-powered decisions (Claude Haiku)                       ║
║  • Max $5 per trade                                          ║
║                                                              ║
║  Watch your Coinbase app for live trades!                    ║
╚══════════════════════════════════════════════════════════════╝
  `);

  await trainer.startTraining(20); // Run every 20 seconds for faster monitoring
}

main().catch(console.error);

export { CryptoTrainer };



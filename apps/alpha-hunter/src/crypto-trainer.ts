/**
 * Crypto Training Bot
 * Learns to trade by making small real trades
 * Tracks wins/losses and adapts strategy
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from the alpha-hunter app directory (stable regardless of cwd)
const alphaRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });

import { CoinbaseExchange } from './exchanges/coinbase';
import { fundManager } from './fund-manager';
import { dataAggregator } from './intelligence/data-aggregator';
import { marketLearner } from './intelligence/market-learner';
import { localAI } from './lib/local-ai';
import { tradeLogger } from './lib/logger';
import { beeper } from './lib/beep';
import { smsAlerter } from './lib/sms-alerter';
import { tradeLimiter } from './lib/trade-limiter';
import { emergencyStop } from './lib/emergency-stop';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
      setTimeout(() => { }, interval);
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
    const data: any = await this.cached('feargreed', async () => {
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
    const data: any = await this.cached('btcdom', async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/global');
      return res.ok ? res.json() : null;
    }, 300000);

    if (data?.data?.market_cap_percentage?.btc) {
      return `${data.data.market_cap_percentage.btc.toFixed(1)}%`;
    }
    return 'N/A';
  }

  private async getTrendingCoins(): Promise<string> {
    const data: any = await this.cached('trending', async () => {
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

    const data: any = await this.cached('progno', async () => {
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
  private trades: TradeRecord[] = [];
  private learning: LearningState;
  private maxTradeUSD = parseFloat(process.env.CRYPTO_MAX_TRADE_SIZE || '50');
  private minProfitPercent = parseFloat(process.env.CRYPTO_TAKE_PROFIT || '5');
  private maxLossPercent = parseFloat(process.env.CRYPTO_STOP_LOSS || '3');
  private tradingPairs = process.env.CRYPTO_USE_USDC === 'true'
    ? ['BTC-USDC', 'ETH-USDC', 'SOL-USDC']
    : ['BTC-USD', 'ETH-USD', 'SOL-USD'];
  private useUSDC = process.env.CRYPTO_USE_USDC === 'true';
  private disableAutoConvert = process.env.CRYPTO_DISABLE_AUTO_CONVERT === 'true';
  private isRunning = false;
  private learnedConcepts: Set<string> = new Set();

  // SAFETY: Prevent runaway conversions
  private conversionAttempted = false;
  private totalConvertedThisSession = 0;
  private maxConversionPerSession = 500;
  private baseCurrency = process.env.CRYPTO_USE_USDC === 'true' ? 'USDC' : 'USD';

  // Track estimated USD (invisible to API but usable)
  private estimatedUSD = 0;
  private tradesThisSession = 0;
  private lastBalanceRefresh: Date = new Date(0);
  private balanceRefreshInterval = 60000;

  // Production 24/7 additions
  private supabase: SupabaseClient | null = null;
  private cycleCount = 0;
  private startTime = new Date();
  private lastDailySummary: string = ''; // Track last daily summary date
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 10; // Pause trading after N consecutive errors

  constructor() {
    // Debug: Verify env vars are loaded
    if (!process.env.COINBASE_API_KEY) {
      console.error('❌ COINBASE_API_KEY not found in environment!');
    }
    if (!process.env.COINBASE_API_SECRET) {
      console.error('❌ COINBASE_API_SECRET not found in environment!');
    }

    this.coinbase = new CoinbaseExchange();

    // Initialize Supabase for trade persistence
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) {
      this.supabase = createClient(sbUrl, sbKey);
      console.log('📦 Supabase connected for trade persistence');
    } else {
      console.warn('⚠️ Supabase not configured — trades will be in-memory only');
    }

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

  // ═══════════════════════════════════════════════════════════
  // SUPABASE TRADE PERSISTENCE
  // ═══════════════════════════════════════════════════════════

  private async persistTrade(trade: TradeRecord): Promise<void> {
    if (!this.supabase) return;
    try {
      await this.supabase.from('alpha_hunter_trades').upsert({
        id: trade.id,
        pair: trade.pair,
        side: trade.side,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice || null,
        size: trade.size,
        usd_value: trade.usdValue,
        profit: trade.profit || null,
        profit_percent: trade.profitPercent || null,
        reason: trade.reason,
        opened_at: trade.timestamp.toISOString(),
        closed: trade.closed,
        take_profit_price: trade.takeProfitPrice,
        stop_loss_price: trade.stopLossPrice,
        platform: 'coinbase',
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn(`   ⚠️ Failed to persist trade: ${err.message}`);
    }
  }

  private async loadOpenTrades(): Promise<void> {
    if (!this.supabase) return;
    try {
      const { data } = await this.supabase
        .from('alpha_hunter_trades')
        .select('*')
        .eq('closed', false)
        .eq('platform', 'coinbase');
      if (data && data.length > 0) {
        for (const row of data) {
          this.trades.push({
            id: row.id,
            pair: row.pair,
            side: row.side,
            entryPrice: row.entry_price,
            exitPrice: row.exit_price,
            size: row.size,
            usdValue: row.usd_value,
            profit: row.profit,
            profitPercent: row.profit_percent,
            reason: row.reason,
            timestamp: new Date(row.opened_at),
            closed: false,
            takeProfitPrice: row.take_profit_price,
            stopLossPrice: row.stop_loss_price,
          });
        }
        console.log(`📦 Restored ${data.length} open positions from Supabase`);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Failed to load trades: ${err.message}`);
    }
  }

  private async persistHeartbeat(): Promise<void> {
    if (!this.supabase) return;
    try {
      const openTrades = this.trades.filter(t => !t.closed);
      await this.supabase.from('alpha_hunter_accounts').upsert({
        id: 'crypto-trainer-heartbeat',
        data: {
          last_heartbeat: new Date().toISOString(),
          cycle_count: this.cycleCount,
          uptime_minutes: Math.round((Date.now() - this.startTime.getTime()) / 60000),
          open_positions: openTrades.length,
          session_pnl: this.learning.totalProfit,
          session_trades: this.learning.totalTrades,
          estimated_usd: this.estimatedUSD,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch { /* silent */ }
  }

  // ═══════════════════════════════════════════════════════════
  // SMS DAILY SUMMARY
  // ═══════════════════════════════════════════════════════════

  private async sendDailySummaryIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    // Send summary at 9 PM CT
    if (hour !== 21 || this.lastDailySummary === today) return;
    this.lastDailySummary = today;

    const winRate = this.learning.totalTrades > 0
      ? (this.learning.wins / this.learning.totalTrades * 100).toFixed(1)
      : '0';
    const openCount = this.trades.filter(t => !t.closed).length;
    const uptimeHrs = ((Date.now() - this.startTime.getTime()) / 3600000).toFixed(1);

    const msg = [
      `📊 CRYPTO TRADER DAILY SUMMARY`,
      `Date: ${today}`,
      `Trades: ${this.learning.totalTrades} (${this.learning.wins}W/${this.learning.losses}L)`,
      `Win Rate: ${winRate}%`,
      `P&L: $${this.learning.totalProfit.toFixed(2)}`,
      `Open: ${openCount} positions`,
      `USD: $${this.estimatedUSD.toFixed(2)}`,
      `Uptime: ${uptimeHrs}h | Cycles: ${this.cycleCount}`,
    ].join('\n');

    await smsAlerter.tradeExecuted('DAILY_SUMMARY', 0, 'BUY', 'Coinbase');
    console.log('\n📱 Daily summary SMS sent');
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
    const ollamaReady = localAI.isEnabled() && await localAI.isAvailable();
    console.log(`🧠 AI Brain: ${ollamaReady ? `✅ Ollama (${localAI.getModel()})` : '⚠️ No AI (using momentum logic)'}`);

    // Load open trades from Supabase (survive restarts)
    await this.loadOpenTrades();

    // Check available funds and sync balance
    await this.showPortfolio();
    await this.refreshBalances(true); // Force initial sync

    // Startup SMS removed — too noisy on every restart
    // await smsAlerter.botStarted();
  }

  async showPortfolio(): Promise<void> {
    console.log('\n💰 PORTFOLIO STATUS:');
    console.log('━'.repeat(50));

    if (!this.coinbase.isConfigured()) {
      console.log('  ⚠️ Coinbase running in SIMULATION mode');
      console.log('  Set COINBASE_API_KEY and COINBASE_API_SECRET for real balances');
    }

    // Use portfolio breakdown endpoint (includes staked funds)
    const portfolio = await this.coinbase.getPortfolio();

    // Show top positions
    const sorted = [...portfolio.positions].sort((a, b) => b.value - a.value);
    for (const p of sorted) {
      if (p.value < 0.50) continue;
      const tag = p.staked ? ' [STAKED]' : '';
      console.log(`  🪙 ${p.symbol}: ${p.amount.toFixed(6)} = $${p.value.toFixed(2)}${tag}`);
    }

    console.log('━'.repeat(50));
    console.log(`  💵 Cash (USD/USDC): $${portfolio.usdBalance.toFixed(2)}`);
    if (portfolio.stakedValue > 0.01) {
      console.log(`  🔒 Staked: $${portfolio.stakedValue.toFixed(2)}`);
    }
    console.log(`  � Total Portfolio: $${portfolio.totalValue.toFixed(2)}`);
    console.log('');

    // Update unified fund manager with FULL portfolio value
    const openPositionValue = this.trades.filter(t => !t.closed).reduce((sum, t) => sum + t.usdValue, 0);
    fundManager.updateCryptoBalance(portfolio.totalValue - openPositionValue, openPositionValue);
  }

  async getUSDBalance(): Promise<number> {
    const accounts = await this.coinbase.getAccounts();
    const currency = this.baseCurrency;
    const account = accounts.find(a => a.currency === currency);
    return account?.available || 0;
  }

  /**
   * Refresh balances from Coinbase and sync estimatedUSD
   * Uses portfolio breakdown endpoint to include staked funds
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
      const portfolio = await this.coinbase.getPortfolio();

      // Calculate how much is tied up in open positions
      const openPositionValue = this.trades
        .filter(t => !t.closed)
        .reduce((sum, t) => sum + t.usdValue, 0);

      // Sync estimatedUSD with actual USD cash (what we can actually trade with)
      const previousEstimate = this.estimatedUSD;
      this.estimatedUSD = portfolio.usdBalance;

      // Update fund manager with FULL portfolio value (wallet + staked)
      fundManager.updateCryptoBalance(portfolio.totalValue - openPositionValue, openPositionValue);

      this.lastBalanceRefresh = now;

      console.log(`   💵 USD Cash: $${portfolio.usdBalance.toFixed(2)}`);
      if (portfolio.stakedValue > 0.01) {
        console.log(`   🔒 Staked: $${portfolio.stakedValue.toFixed(2)}`);
      }
      console.log(`   📊 Total Portfolio: $${portfolio.totalValue.toFixed(2)}`);

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

  private formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
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

    // Use local Ollama AI for analysis
    if (localAI.isEnabled() && await localAI.isAvailable()) {
      try {
        const momentum = knowledge.getMomentum(pair);
        const localAnalysis = await localAI.analyzeCrypto({
          symbol: pair,
          price: ticker.price,
          momentum,
          fearGreed: 50, // Would get from real API
          btcDominance: 56.3, // Would get from real API
          volume24h: ticker.volume * ticker.price
        });

        console.log(`   🤖 Local AI (${localAI.getModel()}): ${localAnalysis.signal}`);

        return {
          signal: localAnalysis.signal.toLowerCase() as 'buy' | 'sell' | 'hold',
          confidence: localAnalysis.confidence,
          reason: localAnalysis.reason,
          price: ticker.price
        };
      } catch (err: any) {
        console.log(`   ⚠️ Local AI failed: ${err.message}`);
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
      await this.persistTrade(trade);
      console.log(`   ✅ Order filled at $${entryPrice.toLocaleString()}`);
      if (entryFee > 0.01) {
        console.log(`   💰 Entry fee: $${entryFee.toFixed(4)} (0.6% taker fee)`);
      }
      console.log(`   🎯 Take Profit: $${takeProfitPrice.toFixed(2)} (+${this.minProfitPercent}%)`);
      console.log(`   🛑 Stop Loss: $${stopLossPrice.toFixed(2)} (-${this.maxLossPercent}%)`);

      // SMS alert for trade
      await smsAlerter.tradeExecuted(pair, usdAmount, side.toUpperCase() as 'BUY' | 'SELL', 'Coinbase');

      // Log trade and beep
      tradeLogger.logTrade({
        action: side.toUpperCase() as 'BUY' | 'SELL',
        pair,
        amount: order.filledSize || usdAmount / ticker.price,
        price: entryPrice,
        total: usdAmount,
        confidence: 0, // Will be set by caller
        reason
      });
      await beeper.tradeExecuted();

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
      // trade.usdValue is already net of entry fee, so recover gross for fee calc
      const grossEntryValue = trade.usdValue / (1 - 0.006); // reverse the fee deduction
      const buyFee = grossEntryValue * 0.006; // 0.6% on entry
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
      await this.persistTrade(trade);

      // Log fee information
      if (actualTotalFees > 0.01) {
        console.log(`   💰 Fees: $${actualTotalFees.toFixed(4)} (Buy: $${buyFee.toFixed(4)}, Sell: $${actualSellFee.toFixed(4)})`);
        console.log(`   📊 Gross P&L: $${grossPnL.toFixed(4)} → Net P&L: $${actualPnL.toFixed(4)}`);
      }

      // Update learning state
      this.learning.totalTrades++;
      this.learning.totalProfit += actualPnL; // Use net profit after fees

      // Log trade close
      const duration = this.formatDuration(trade.timestamp, new Date());
      tradeLogger.logTradeClose({
        pair: trade.pair,
        entryPrice: trade.entryPrice,
        exitPrice: currentPrice,
        profit: actualPnL,
        profitPercent: pnlPercent,
        duration
      });
      await beeper.tradeClosed(actualPnL);

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
    this.cycleCount++;
    console.log(`\n🔄 Cycle #${this.cycleCount} starting...\n`);

    // Safety checks
    const eStop = emergencyStop.canTrade();
    if (!eStop.allowed) {
      console.log(`🛑 Emergency stop active: ${eStop.reason}`);
      return;
    }

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

    // If low on USD, convert some crypto to get trading capital (DISABLED if CRYPTO_DISABLE_AUTO_CONVERT=true)
    if (this.estimatedUSD < 10 && !this.conversionAttempted && !this.disableAutoConvert) {
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

    // Log cycle stats
    tradeLogger.logCycle({
      timestamp: new Date().toISOString(),
      usdcBalance: this.estimatedUSD,
      openTrades: openCount,
      sessionPnL: this.learning.totalProfit,
      totalTrades: this.learning.totalTrades
    });

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

        // Trade if confidence > min and we have estimated USD
        const minConfidence = parseInt(process.env.CRYPTO_MIN_CONFIDENCE || '65');
        if (analysis.signal === 'buy' && analysis.confidence >= minConfidence && this.estimatedUSD >= 5) {
          // Safety: check trade limiter
          const limitCheck = tradeLimiter.canTrade(this.maxTradeUSD, 'crypto');
          if (!limitCheck.allowed) {
            console.log(`   ⛔ Trade limiter: ${limitCheck.reason}`);
            continue;
          }

          // Safety: check emergency spending limit
          const stats = tradeLimiter.getStats();
          const spendOk = await emergencyStop.checkSpendingLimit(stats.totalSpent, this.maxTradeUSD);
          if (!spendOk) {
            console.log(`   🛑 Emergency stop triggered — spending limit`);
            break;
          }

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
            tradeLimiter.recordTrade(pair, tradeAmount, 'crypto');
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

    // Production: heartbeat + daily summary
    await this.persistHeartbeat();
    await this.sendDailySummaryIfNeeded();
    this.consecutiveErrors = 0; // Reset error counter on successful cycle
  }

  async startTraining(intervalSeconds: number = 60): Promise<void> {
    console.log(`\n🚀 Starting 24/7 production trading (cycle every ${intervalSeconds}s)...`);
    console.log('   Press Ctrl+C to stop\n');

    this.isRunning = true;

    // Handle shutdown gracefully
    const shutdown = async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      this.isRunning = false;
      this.showLearningStats();
      await smsAlerter.botStopped('Manual shutdown (Ctrl+C)');
      console.log('\n👋 Crypto trader stopped.\n');
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle uncaught errors — log but keep running
    process.on('uncaughtException', (err) => {
      console.error(`\n💥 UNCAUGHT EXCEPTION: ${err.message}`);
      console.error(err.stack);
      this.consecutiveErrors++;
    });
    process.on('unhandledRejection', (reason: any) => {
      console.error(`\n💥 UNHANDLED REJECTION: ${reason?.message || reason}`);
      this.consecutiveErrors++;
    });

    // Production loop with crash recovery
    while (this.isRunning) {
      try {
        // Pause if too many consecutive errors
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.error(`\n🛑 ${this.consecutiveErrors} consecutive errors — pausing 5 minutes...`);
          await smsAlerter.emergencyStop(`${this.consecutiveErrors} consecutive errors`, 0);
          await new Promise(r => setTimeout(r, 300000)); // 5 min cooldown
          this.consecutiveErrors = 0;
          console.log('🔄 Resuming after cooldown...');
        }

        await this.runTrainingCycle();
      } catch (err: any) {
        this.consecutiveErrors++;
        console.error(`\n❌ Cycle error #${this.consecutiveErrors}: ${err.message}`);
        // Don't crash — wait and retry
        await new Promise(r => setTimeout(r, 10000));
      }

      // Wait for next cycle
      if (this.isRunning) {
        const openCount = this.trades.filter(t => !t.closed).length;
        // Shorter interval when positions are open (monitor TP/SL)
        const waitSec = openCount > 0 ? Math.min(intervalSeconds, 30) : intervalSeconds;
        console.log(`\n⏳ Next cycle in ${waitSec}s${openCount > 0 ? ' (open positions — faster monitoring)' : ''}...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
    }
  }
}

// Main
async function main() {
  const maxTrade = process.env.CRYPTO_MAX_TRADE_SIZE || '50';
  const tp = process.env.CRYPTO_TAKE_PROFIT || '5';
  const sl = process.env.CRYPTO_STOP_LOSS || '3';
  const minConf = process.env.CRYPTO_MIN_CONFIDENCE || '65';
  const maxDaily = process.env.CRYPTO_MAX_DAILY_TRADES || '5';
  const maxLoss = process.env.MAX_DAILY_LOSS || '150';
  const useUsdc = process.env.CRYPTO_USE_USDC === 'true';
  const pairs = useUsdc ? 'BTC-USDC, ETH-USDC, SOL-USDC' : 'BTC-USD, ETH-USD, SOL-USD';
  const aiMode = process.env.ANTHROPIC_API_KEY ? 'Claude AI' : (process.env.USE_LOCAL_AI === 'true' ? 'Ollama Local AI' : 'Momentum-only');

  console.log('\n🤖 AUTONOMOUS CRYPTO TRADER STARTING...\n');

  const trainer = new CryptoTrainer();
  await trainer.initialize();

  // Check if running via scheduled task (single cycle mode)
  const isCronMode = process.env.CRON_MODE === 'true' || process.argv.includes('--single-cycle');

  if (isCronMode) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🔄 SINGLE CYCLE MODE (Scheduled Task) 🔄           ║
║  Pairs: ${pairs.padEnd(48)}║
║  AI: ${aiMode.padEnd(51)}║
╚══════════════════════════════════════════════════════════════╝
    `);
    await trainer.runTrainingCycle();
    console.log('\n✅ Cycle complete. Exiting.\n');
    process.exit(0);
  } else {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║            🚀 24/7 PRODUCTION CRYPTO TRADER 🚀               ║
║                                                              ║
║  Pairs: ${pairs.padEnd(48)}║
║  AI: ${aiMode.padEnd(51)}║
║  Max Trade: $${maxTrade.padEnd(44)}║
║  Take Profit: +${tp}% | Stop Loss: -${sl}%${' '.repeat(Math.max(0, 28 - tp.length - sl.length))}║
║  Min Confidence: ${minConf}%${' '.repeat(Math.max(0, 38 - minConf.length))}║
║  Daily Limits: ${maxDaily} trades / $${maxLoss} max loss${' '.repeat(Math.max(0, 26 - maxDaily.length - maxLoss.length))}║
║  Persistence: Supabase (trades survive restarts)             ║
║  Safety: Emergency stop + Trade limiter + SMS alerts         ║
║                                                              ║
║  Press Ctrl+C for graceful shutdown                          ║
╚══════════════════════════════════════════════════════════════╝
    `);

    const interval = parseInt(process.env.CRYPTO_CYCLE_SECONDS || '60');
    await trainer.startTraining(interval);
  }
}

main().catch(async (err) => {
  console.error('💥 FATAL ERROR:', err);
  await smsAlerter.emergencyStop(`Fatal crash: ${err.message}`, 0);
  process.exit(1);
});

export { CryptoTrainer };



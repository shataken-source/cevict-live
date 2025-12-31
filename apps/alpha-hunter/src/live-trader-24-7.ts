/**
 * LIVE 24/7 TRADING BOT
 * Runs both Coinbase (Crypto) and Kalshi (Predictions) continuously
 * Learning, adapting, and trading around the clock
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from alpha-hunter root (process.cwd() is already apps/alpha-hunter when using npm run)
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { BotManager } from './bot-manager';
import { dashboardReporter } from './dashboard-reporter';
import { CoinbaseExchange } from './exchanges/coinbase';
import { fundManager } from './fund-manager';
import { categoryLearners } from './intelligence/category-learners';
import { dataAggregator } from './intelligence/data-aggregator';
import { derivativesExpert } from './intelligence/derivatives-expert';
import { entertainmentExpert } from './intelligence/entertainment-expert';
import { futuresExpert } from './intelligence/futures-expert';
import { gmeSpecialist } from './intelligence/gme-specialist';
import { CRYPTO_HISTORY, historicalKnowledge } from './intelligence/historical-knowledge';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { marketLearner } from './intelligence/market-learner';
import { PrognoIntegration } from './intelligence/progno-integration';
import { PrognosticationSync } from './intelligence/prognostication-sync';
import { PrognoMassagerIntegration } from './intelligence/progno-massager';

// ============================================================================
// COLORS (ANSI escape codes)
// ============================================================================

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright text colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Helper functions for colored output
const color = {
  success: (text: string) => `${c.brightGreen}${text}${c.reset}`,
  error: (text: string) => `${c.brightRed}${text}${c.reset}`,
  warning: (text: string) => `${c.brightYellow}${text}${c.reset}`,
  info: (text: string) => `${c.brightCyan}${text}${c.reset}`,
  highlight: (text: string) => `${c.brightMagenta}${text}${c.reset}`,
  money: (text: string) => `${c.brightGreen}${c.bright}${text}${c.reset}`,
  price: (value: number) => value >= 0 ? `${c.brightGreen}+$${value.toFixed(2)}${c.reset}` : `${c.brightRed}-$${Math.abs(value).toFixed(2)}${c.reset}`,
  percent: (value: number) => value >= 0 ? `${c.brightGreen}+${value.toFixed(1)}%${c.reset}` : `${c.brightRed}${value.toFixed(1)}%${c.reset}`,
  crypto: (text: string) => `${c.brightYellow}${text}${c.reset}`,
  kalshi: (text: string) => `${c.brightMagenta}${text}${c.reset}`,
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Trading intervals (in seconds)
  cryptoInterval: 30,        // Check crypto every 30 seconds
  kalshiInterval: 60,        // Check Kalshi every 1 minute (more frequent)
  learningInterval: 300,     // Deep learning every 5 minutes
  rebalanceCheck: 3600,      // Check rebalance every hour

  // Risk parameters (AGGRESSIVE)
  maxTradeSize: 5,           // Max $5 per trade
  minConfidence: 55,         // Lowered from 65% to 55%
  maxOpenPositions: 5,       // Max 5 open positions total
  dailyLossLimit: 25,        // Stop if down $25 in a day
  dailySpendingLimit: 50,    // Max $50 total spending per day (crypto + Kalshi)

  // Profit targets
  takeProfitPercent: 1.5,    // Take profit at +1.5% (faster exits)
  stopLossPercent: 2.5,      // Stop loss at -2.5%

  // Learning
  learnFromEveryTrade: true,
  adaptStrategy: true,
};

// ============================================================================
// TYPES
// ============================================================================

interface Position {
  id: string;
  platform: 'crypto' | 'kalshi';
  symbol: string;
  side: 'long' | 'short' | 'yes' | 'no';
  entryPrice: number;
  amount: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
  entryFees: number;    // Fees paid when opening position
  exitFees: number;     // Estimated fees for closing (updated on close)
  totalFees: number;    // Entry + Exit fees
}

interface TradeSignal {
  platform: 'crypto' | 'kalshi';
  symbol: string;
  action: 'buy' | 'sell' | 'yes' | 'no';
  confidence: number;
  reasoning: string;
  suggestedSize: number;
}

interface LearningData {
  totalTrades: number;
  wins: number;
  losses: number;
  bestStrategy: string;
  patterns: string[];
  lastLearned: Date;
}

// ============================================================================
// LIVE TRADER CLASS
// ============================================================================

class LiveTrader24_7 {
  private coinbase: CoinbaseExchange;
  private kalshi: KalshiTrader;
  private progno: PrognoIntegration; // PROGNO Flex integration
  private prognosticationSync: PrognosticationSync; // Syncs picks to homepage
  private massager: PrognoMassagerIntegration; // AI Safety 2025 validated analysis
  private claude: Anthropic | null;
  private positions: Position[] = [];
  private isRunning = false;
  private dailyPnL = 0;
  private sessionStartTime: Date;
  private learningData: LearningData;
  private tradeHistory: any[] = [];
  private kalshiOpenBets = 0;
  private lastKalshiScan = 0;
  private totalFeesPaid = 0;  // Track total fees across session
  private kalshiFeesPaid = 0; // Track Kalshi-specific fees
  private kalshiBetMarkets: Set<string> = new Set(); // Track markets we've already bet on
  private kalshiBalance = 0; // Cache Kalshi balance
  private lastHourlyReport = Date.now();
  private hourlyPnL = 0; // Track P&L for hourly reports
  private dailySpending = 0; // Track total spending today (crypto + Kalshi)
  private lastDayReset = new Date().toDateString(); // Track when we last reset daily counters
  private botManager: BotManager | null = null; // Bot manager for unified system
  private lastKalshiPredictions: any[] = []; // Store latest Kalshi predictions for export
  private coinbaseBalance = 0; // Cache Coinbase balance
  private lastPrognoFetch = 0; // Cache PROGNO picks
  private prognoPicks: any[] = []; // Cached PROGNO picks with Claude Effect

  constructor() {
    this.coinbase = new CoinbaseExchange();
    this.kalshi = new KalshiTrader();
    this.progno = new PrognoIntegration(); // Initialize PROGNO integration
    this.prognosticationSync = new PrognosticationSync(); // Initialize homepage sync
    this.massager = new PrognoMassagerIntegration(); // Initialize massager integration
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.sessionStartTime = new Date();
    this.learningData = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      bestStrategy: 'momentum',
      patterns: [],
      lastLearned: new Date(),
    };
  }

  async initialize(): Promise<void> {
    console.log(`
${c.brightCyan}╔══════════════════════════════════════════════════════════════════════════════╗
║${c.brightYellow}              🤖 LIVE 24/7 TRADING BOT - ALPHA HUNTER 🤖                      ${c.brightCyan}║
║                                                                              ║
║${c.white}     ${color.crypto('Coinbase')} + ${color.kalshi('Kalshi')} • ${color.info('AI-Powered')} • ${color.success('Auto-Learning')}    ${c.brightCyan}║
╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}
    `);

    // Check configurations
    console.log(`${c.brightWhite}📋 CONFIGURATION CHECK:${c.reset}`);
    console.log(`   ${color.crypto('Coinbase API')}: ${process.env.COINBASE_API_KEY ? color.success('✅ Configured') : color.warning('⚠️ Demo Mode')}`);
    console.log(`   ${color.kalshi('Kalshi API')}: ${process.env.KALSHI_API_KEY_ID ? color.success('✅ Configured') : color.warning('⚠️ Demo Mode')}`);
    console.log(`   ${color.info('Claude AI')}: ${this.claude ? color.success('✅ Connected') : color.warning('⚠️ Disabled')}`);
    
    // Check progno-massager availability
    const massagerAvailable = await this.massager.checkAvailability();
    console.log(`   ${color.info('Progno-Massager')}: ${massagerAvailable ? color.success('✅ Available (AI Safety 2025)') : color.warning('⚠️ Unavailable')}`);
    
    console.log('');

    // Load initial balances
    await this.refreshBalances();

    // Start bot manager for unified data flow
    console.log(`\n${c.brightWhite}🤖 INITIALIZING BOT SYSTEM:${c.reset}`);
    this.botManager = new BotManager();
    await this.botManager.start();
    console.log(`${color.success('✅ All bots activated and data flow started!')}\n`);

    console.log(`${c.brightWhite}⚙️ TRADING PARAMETERS:${c.reset}`);
    console.log(`   Max Trade Size: ${color.money('$' + CONFIG.maxTradeSize)}`);
    console.log(`   Min Confidence: ${color.info(CONFIG.minConfidence + '%')}`);
    console.log(`   Take Profit: ${color.success('+' + CONFIG.takeProfitPercent + '%')}`);
    console.log(`   Stop Loss: ${color.error('-' + CONFIG.stopLossPercent + '%')}`);
    console.log(`   Daily Loss Limit: ${color.error('-$' + CONFIG.dailyLossLimit)}`);
    console.log(`   Daily Spending Limit: ${color.warning('$' + CONFIG.dailySpendingLimit)}`);
    console.log('');
  }

  checkAndResetDailySpending(): void {
    const today = new Date().toDateString();
    if (today !== this.lastDayReset) {
      // New day - reset daily spending
      console.log(`\n${color.info('📅 New day - resetting daily spending counter')}`);
      this.dailySpending = 0;
      this.lastDayReset = today;
    }
  }

  canSpendToday(amount: number): boolean {
    this.checkAndResetDailySpending();
    const remaining = CONFIG.dailySpendingLimit - this.dailySpending;
    return remaining >= amount;
  }

  recordSpending(amount: number): void {
    this.dailySpending += amount;
    const remaining = CONFIG.dailySpendingLimit - this.dailySpending;
    if (remaining < 5) {
      console.log(`   ${color.warning('⚠️ Daily spending limit nearly reached!')} Remaining: ${color.money('$' + remaining.toFixed(2))}`);
    }
  }

  async refreshBalances(): Promise<void> {
    console.log(`${c.brightWhite}💰 BALANCE STATUS:${c.reset}`);
    try {
      // Coinbase
      const portfolio = await this.coinbase.getPortfolio();
      const cryptoValue = portfolio.positions.reduce((sum, p) => sum + p.value, 0);
      fundManager.updateCryptoBalance(portfolio.usdBalance, cryptoValue);

      const total = portfolio.usdBalance + cryptoValue;
      console.log(`   ${color.crypto('📊 Coinbase')}: ${color.money('$' + total.toFixed(2))} ${c.dim}(USD: $${portfolio.usdBalance.toFixed(2)})${c.reset}`);
    } catch (e) {
      console.log(`   ${color.warning('⚠️ Coinbase')}: Using simulated balance`);
      fundManager.updateCryptoBalance(500, 300);
    }

    try {
      // Kalshi balance
      const kalshiBalance = await this.kalshi.getBalance();
      fundManager.updateKalshiBalance(kalshiBalance, 0);
      console.log(`   ${color.kalshi('🎯 Kalshi')}: ${color.money('$' + kalshiBalance.toFixed(2))}`);
    } catch (e) {
      fundManager.updateKalshiBalance(100, 0);
      console.log(`   ${color.kalshi('🎯 Kalshi')}: ${color.warning('$100.00 (simulated)')}`);
    }

    console.log('');
    console.log(fundManager.getStatus());
  }

  // ============================================================================
  // CRYPTO TRADING
  // ============================================================================

  async analyzeCrypto(): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];
    const pairs = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

    for (const pair of pairs) {
      try {
        const symbol = pair.split('-')[0];

        // Get market data
        const price = await this.coinbase.getPrice(pair);
        const candles = await this.coinbase.getCandles(pair, 300); // 5-min candles

        if (candles.length < 20) continue;

        // Calculate indicators
        const rsi = this.calculateRSI(candles.map(c => c.close));
        const macd = this.calculateMACD(candles.map(c => c.close));
        const momentum = this.calculateMomentum(candles);

        // Get AI analysis if available
        let aiConfidence = 50;
        let aiReasoning = '';

        if (this.claude) {
          const analysis = await this.getAIAnalysis(symbol, price, rsi, macd, momentum);
          aiConfidence = analysis.confidence;
          aiReasoning = analysis.reasoning;
        }

        // Determine signal
        let action: 'buy' | 'sell' | null = null;
        let confidence = 0;
        let reasoning = '';

        // RSI + MACD + Momentum combined strategy (AGGRESSIVE)
        if (rsi < 40 && macd.histogram > 0) { // Expanded from RSI < 30
          action = 'buy';
          confidence = Math.min(85, 50 + (40 - rsi) + Math.abs(macd.histogram) * 8);
          reasoning = `Low RSI (${rsi.toFixed(1)}), bullish MACD`;
        } else if (rsi > 60 && macd.histogram < 0) { // Expanded from RSI > 70
          action = 'sell';
          confidence = Math.min(85, 50 + (rsi - 60) + Math.abs(macd.histogram) * 8);
          reasoning = `High RSI (${rsi.toFixed(1)}), bearish MACD`;
        } else if (Math.abs(macd.histogram) > 50 && momentum !== 0) { // Pure momentum play
          action = momentum > 0 ? 'buy' : 'sell';
          confidence = Math.min(75, 55 + Math.abs(macd.histogram) / 10);
          reasoning = `Strong MACD signal (${macd.histogram.toFixed(2)}), ${momentum > 0 ? 'bullish' : 'bearish'} momentum`;
        }

        // Blend with AI confidence
        if (action && this.claude) {
          confidence = confidence * 0.6 + aiConfidence * 0.4;
          reasoning += `. AI: ${aiReasoning}`;
        }

        if (action && confidence >= CONFIG.minConfidence) {
          signals.push({
            platform: 'crypto',
            symbol: pair,
            action,
            confidence,
            reasoning,
            suggestedSize: this.calculatePositionSize(confidence),
          });
        }

        const rsiColor = rsi < 30 ? c.brightGreen : rsi > 70 ? c.brightRed : c.white;
        console.log(`   ${color.crypto(symbol)}: ${c.brightWhite}$${price.toFixed(2)}${c.reset} | RSI: ${rsiColor}${rsi.toFixed(1)}${c.reset} | MACD: ${macd.histogram > 0 ? c.brightGreen : c.brightRed}${macd.histogram.toFixed(4)}${c.reset}`);
      } catch (error) {
        console.error(`   ${color.warning('⚠️ Error analyzing ' + pair + ':')}`, error);
      }
    }

    return signals;
  }

  async executeCryptoTrade(signal: TradeSignal): Promise<boolean> {
    // Check daily spending limit
    if (!this.canSpendToday(signal.suggestedSize)) {
      const remaining = CONFIG.dailySpendingLimit - this.dailySpending;
      console.log(`\n${color.warning('⚠️ Daily spending limit reached!')}`);
      console.log(`   ${c.dim}Spent today:${c.reset} ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)}`);
      console.log(`   ${c.dim}Remaining:${c.reset} ${color.money('$' + remaining.toFixed(2))} (need ${color.money('$' + signal.suggestedSize.toFixed(2))})`);
      console.log(`   ${c.dim}Trade blocked to prevent overspending${c.reset}`);
      return false;
    }

    const actionColor = signal.action === 'buy' ? c.bgGreen + c.black : c.bgRed + c.white;
    console.log(`\n${actionColor} 🎯 ${signal.action.toUpperCase()} ${c.reset} ${color.crypto(signal.symbol)}`);
    console.log(`   ${c.dim}Confidence:${c.reset} ${color.info(signal.confidence.toFixed(1) + '%')}`);
    console.log(`   ${c.dim}Size:${c.reset} ${color.money('$' + signal.suggestedSize.toFixed(2))}`);
    console.log(`   ${c.dim}Reason:${c.reset} ${c.white}${signal.reasoning}${c.reset}`);

    try {
      // Type guard: Coinbase only accepts 'buy' | 'sell'
      if (signal.action !== 'buy' && signal.action !== 'sell') {
        console.error(`   ${color.error('❌ Invalid action for Coinbase:')} ${signal.action}`);
        return false;
      }

      const trade = await this.coinbase.marketOrder(
        signal.symbol,
        signal.action, // Now TypeScript knows it's 'buy' | 'sell'
        signal.suggestedSize
      );

      if (trade) {
        // Estimate exit fees (same as entry for market orders)
        const entryFees = trade.fees || (signal.suggestedSize * 0.006);
        const estimatedExitFees = signal.suggestedSize * 0.006; // 0.6% taker fee

        const position: Position = {
          id: trade.id || `pos_${Date.now()}`,
          platform: 'crypto',
          symbol: signal.symbol,
          side: signal.action === 'buy' ? 'long' : 'short',
          entryPrice: trade.price,
          amount: signal.suggestedSize,
          currentPrice: trade.price,
          pnl: -entryFees, // Start negative due to entry fees
          pnlPercent: -(entryFees / signal.suggestedSize) * 100,
          openedAt: new Date(),
          entryFees: entryFees,
          exitFees: estimatedExitFees,
          totalFees: entryFees + estimatedExitFees,
        };
        this.positions.push(position);
        this.learningData.totalTrades++;

        this.totalFeesPaid += entryFees; // Track session fees
        this.recordSpending(signal.suggestedSize); // Track daily spending

        console.log(`   ${color.success('✅ Trade executed')} at ${color.money('$' + trade.price.toFixed(2))}`);
        console.log(`   ${c.dim}Entry Fee:${c.reset} ${color.error('-$' + entryFees.toFixed(4))} ${c.dim}(Est. Exit: -$${estimatedExitFees.toFixed(4)})${c.reset}`);
        console.log(`   ${c.dim}Daily Spending:${c.reset} ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)}`);

        // Save trade to persistent memory
        await this.saveTradeToMemory({
          platform: 'coinbase',
          symbol: signal.symbol,
          type: signal.action,
          amount: signal.suggestedSize,
          price: trade.price,
          fees: entryFees,
          timestamp: new Date().toISOString(),
        });

        return true;
      }
    } catch (error) {
      console.error(`   ${color.error('❌ Trade failed:')}`, error);
    }
    return false;
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  async checkPositions(): Promise<void> {
    for (const position of this.positions) {
      try {
        if (position.platform === 'crypto') {
          const currentPrice = await this.coinbase.getPrice(position.symbol);
          position.currentPrice = currentPrice;

          // Calculate raw P&L before fees
          let rawPnl: number;
          let rawPnlPercent: number;

          if (position.side === 'long') {
            rawPnl = (currentPrice - position.entryPrice) / position.entryPrice * position.amount;
            rawPnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
          } else {
            rawPnl = (position.entryPrice - currentPrice) / position.entryPrice * position.amount;
            rawPnlPercent = (position.entryPrice - currentPrice) / position.entryPrice * 100;
          }

          // Subtract ALL fees (entry + estimated exit) from P&L
          const totalFees = position.entryFees + position.exitFees;
          position.pnl = rawPnl - totalFees;
          position.pnlPercent = ((rawPnl - totalFees) / position.amount) * 100;
          position.totalFees = totalFees;

          // Check take profit / stop loss (using fee-adjusted P&L)
          if (position.pnlPercent >= CONFIG.takeProfitPercent) {
            console.log(`\n${c.bgGreen}${c.black} 🎉 TAKE PROFIT ${c.reset} ${color.crypto(position.symbol)}: ${color.success('+' + position.pnlPercent.toFixed(2) + '%')} ${c.dim}(fees: -$${totalFees.toFixed(4)})${c.reset}`);
            await this.closePosition(position, 'take_profit');
          } else if (position.pnlPercent <= -CONFIG.stopLossPercent) {
            console.log(`\n${c.bgRed}${c.white} ⛔ STOP LOSS ${c.reset} ${color.crypto(position.symbol)}: ${color.error(position.pnlPercent.toFixed(2) + '%')} ${c.dim}(fees: -$${totalFees.toFixed(4)})${c.reset}`);
            await this.closePosition(position, 'stop_loss');
          }
        } else if (position.platform === 'kalshi') {
          // Update Kalshi position prices
          // Note: Kalshi positions can't be closed early easily, so we just track P&L
          // The position will resolve when the market closes
          try {
            const markets = await this.kalshi.getMarkets();
            const market = markets.find(m => m.id === position.id || m.title === position.symbol);

            if (market) {
              const currentPrice = position.side === 'yes' ? market.yesPrice : market.noPrice;
              position.currentPrice = currentPrice;

              // Calculate P&L: (current_price - entry_price) / 100 * amount
              // For Kalshi, prices are in cents (0-100)
              const priceChange = currentPrice - position.entryPrice;
              const rawPnl = (priceChange / 100) * position.amount;
              position.pnl = rawPnl - position.entryFees; // Subtract entry fees
              position.pnlPercent = (priceChange / position.entryPrice) * 100;

              // Note: Kalshi markets resolve automatically, so we don't close positions here
              // We just track the unrealized P&L
            }
          } catch (error) {
            // Market might have closed or be unavailable
            // Keep position as-is
          }
        }
      } catch (error) {
        console.error(`Error checking position ${position.id}:`, error);
      }
    }
  }

  async closePosition(position: Position, reason: string): Promise<void> {
    try {
      const side = position.side === 'long' ? 'sell' : 'buy';
      const closeOrder = await this.coinbase.marketOrder(position.symbol, side, position.amount);

      // Update exit fees with actual value if available
      const actualExitFees = closeOrder?.fees || position.exitFees;
      position.exitFees = actualExitFees;
      position.totalFees = position.entryFees + position.exitFees;

      // Recalculate final P&L with actual exit fees
      const rawPnl = position.side === 'long'
        ? (position.currentPrice - position.entryPrice) / position.entryPrice * position.amount
        : (position.entryPrice - position.currentPrice) / position.entryPrice * position.amount;
      position.pnl = rawPnl - position.totalFees;

      // Track session fees
      this.totalFeesPaid += actualExitFees;

      this.dailyPnL += position.pnl;

      if (position.pnl > 0) {
        this.learningData.wins++;
        fundManager.updateCryptoStats(position.pnl, true);
      } else {
        this.learningData.losses++;
        fundManager.updateCryptoStats(position.pnl, false);
      }

      // Learn from this trade
      if (CONFIG.learnFromEveryTrade) {
        await this.learnFromTrade(position, reason);
      }

      // Remove from positions
      this.positions = this.positions.filter(p => p.id !== position.id);

      const pnlStr = position.pnl >= 0 ? color.success('+$' + position.pnl.toFixed(2)) : color.error('-$' + Math.abs(position.pnl).toFixed(2));
      const feesStr = `${c.dim}(fees: -$${position.totalFees.toFixed(4)})${c.reset}`;
      console.log(`   ${c.dim}Closed${c.reset} ${color.crypto(position.symbol)} | ${c.dim}P&L:${c.reset} ${pnlStr} ${feesStr} (${reason})`);
    } catch (error) {
      console.error(`${color.error('Error closing position:')}`, error);
    }
  }

  // ============================================================================
  // AI & LEARNING
  // ============================================================================

  async getAIAnalysis(symbol: string, price: number, rsi: number, macd: any, momentum: number): Promise<{ confidence: number; reasoning: string }> {
    if (!this.claude) return { confidence: 50, reasoning: 'No AI' };

    try {
      const message = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Quick crypto analysis for ${symbol} at $${price}:
RSI: ${rsi.toFixed(1)}
MACD Histogram: ${macd.histogram.toFixed(4)}
Momentum: ${momentum > 0 ? 'Positive' : 'Negative'}

Give confidence 0-100 and one sentence reasoning. Format: CONFIDENCE: XX | REASON: ...`
        }]
      });

      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      const confMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
      const reasonMatch = response.match(/REASON:\s*(.+)/i);

      return {
        confidence: confMatch ? parseInt(confMatch[1]) : 50,
        reasoning: reasonMatch ? reasonMatch[1].trim() : 'AI analysis complete',
      };
    } catch (error) {
      return { confidence: 50, reasoning: 'AI unavailable' };
    }
  }

  async learnFromTrade(position: Position, outcome: string): Promise<void> {
    console.log(`   📚 Learning from trade: ${position.symbol} (${outcome})`);

    // Store trade for pattern analysis
    this.tradeHistory.push({
      ...position,
      outcome,
      timestamp: new Date(),
    });

    // Update learned patterns
    if (this.tradeHistory.length >= 10) {
      const recentWins = this.tradeHistory.slice(-10).filter(t => t.pnl > 0);
      const winRate = recentWins.length / 10 * 100;

      if (winRate < 40 && CONFIG.adaptStrategy) {
        console.log(`   ⚠️ Win rate low (${winRate}%), adapting strategy...`);
        CONFIG.minConfidence = Math.min(80, CONFIG.minConfidence + 5);
      } else if (winRate > 70) {
        CONFIG.minConfidence = Math.max(60, CONFIG.minConfidence - 2);
      }
    }

    this.learningData.lastLearned = new Date();
  }

  async deepLearning(): Promise<void> {
    console.log(`\n${c.brightBlue}📚 DEEP LEARNING CYCLE${c.reset}`);

    try {
      // Fetch market intelligence using available methods
      const fearGreed = await dataAggregator.getFearGreed();
      const globalData = await dataAggregator.getGlobalData();
      const trending = await dataAggregator.getTrending();

      const fgValue = fearGreed?.value || 50;
      const fgColor = fgValue < 25 ? c.brightRed : fgValue < 50 ? c.yellow : fgValue < 75 ? c.green : c.brightGreen;
      console.log(`   ${c.dim}Fear & Greed:${c.reset} ${fgColor}${fgValue}${c.reset} (${fearGreed?.classification || 'Unknown'})`);
      console.log(`   ${c.dim}BTC Dominance:${c.reset} ${color.crypto(globalData?.btcDominance?.toFixed(1) || 'N/A')}%`);
      console.log(`   ${c.dim}Trending:${c.reset} ${color.highlight(trending?.slice(0, 3).join(', ') || 'None')}`);

      // Historical knowledge insight
      const marketPhase = historicalKnowledge.getCryptoMarketPhase();
      console.log(`   ${c.dim}Market Phase:${c.reset} ${c.brightCyan}${marketPhase.phase}${c.reset}`);
      console.log(`   ${c.dim}Recommendation:${c.reset} ${marketPhase.recommendation}`);

      // Monthly seasonality
      const month = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase() as keyof typeof CRYPTO_HISTORY.seasonality;
      const seasonality = CRYPTO_HISTORY.seasonality[month];
      if (seasonality) {
        const seasonColor = seasonality.avg > 0 ? c.brightGreen : c.brightRed;
        console.log(`   ${c.dim}${month} Historical:${c.reset} ${seasonColor}${seasonality.avg > 0 ? '+' : ''}${seasonality.avg}%${c.reset} (${seasonality.description})`);
      }
    } catch (error) {
      console.log(`   ${color.warning('⚠️ Market data unavailable')}`);
    }

    // Learn crypto concepts
    for (const symbol of ['BTC', 'ETH', 'SOL']) {
      if (!this.learningData.patterns.includes(symbol)) {
        try {
          await marketLearner.learnCryptoConcept(symbol, symbol);
          this.learningData.patterns.push(symbol);
          console.log(`   ${color.success('✓')} Learned: ${color.crypto(symbol)} patterns`);
        } catch (e) {
          // Skip if learning fails
        }
      }
    }

    // Analyze win/loss patterns
    const winRate = this.learningData.totalTrades > 0
      ? (this.learningData.wins / this.learningData.totalTrades * 100)
      : 0;

    const winRateColor = winRate >= 50 ? c.brightGreen : winRate >= 40 ? c.yellow : c.brightRed;
    console.log(`   ${c.dim}Session Win Rate:${c.reset} ${winRateColor}${winRate.toFixed(1)}%${c.reset}`);
    console.log(`   ${c.dim}Total Trades:${c.reset} ${c.brightWhite}${this.learningData.totalTrades}${c.reset}`);
  }

  // ============================================================================
  // TECHNICAL INDICATORS
  // ============================================================================

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.2; // Simplified
    return { macd, signal, histogram: macd - signal };
  }

  calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  calculateMomentum(candles: any[]): number {
    if (candles.length < 10) return 0;
    const recent = candles.slice(-5);
    const older = candles.slice(-10, -5);
    const recentAvg = recent.reduce((s, c) => s + c.close, 0) / recent.length;
    const olderAvg = older.reduce((s, c) => s + c.close, 0) / older.length;
    return (recentAvg - olderAvg) / olderAvg * 100;
  }

  calculatePositionSize(confidence: number): number {
    const base = CONFIG.maxTradeSize;
    const multiplier = Math.min(1, (confidence - CONFIG.minConfidence) / 20 + 0.5);
    return Math.max(5, base * multiplier);
  }

  // ============================================================================
  // KALSHI TRADING
  // ============================================================================

  async analyzeKalshiMarkets(): Promise<void> {
    if (this.kalshiOpenBets >= 10) {
      console.log('   Max Kalshi bets reached (10), monitoring only');
      return;
    }

    try {
      // Check balance first - don't try to bet if we can't afford it
      this.kalshiBalance = await this.kalshi.getBalance();

      if (this.kalshiBalance < 2) {
        console.log(`   ${color.warning('⚠️ Kalshi balance too low:')} ${color.money('$' + this.kalshiBalance.toFixed(2))} - need at least $2`);
        return;
      }

      console.log(`   ${c.dim}Kalshi balance: ${color.money('$' + this.kalshiBalance.toFixed(2))}${c.reset}`);

      const markets = await this.kalshi.getMarkets();
      console.log(`   Scanning ${markets.length} markets...`);

      // PRIORITIZE: Sort markets - SPORTS FIRST, then entertainment, then others
      const sportsKeywords = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'college football', 'college basketball',
        'super bowl', 'playoffs', 'championship', 'football', 'basketball', 'baseball', 'hockey',
        'soccer', 'premier league', 'champions league', 'ufc', 'boxing', 'tennis', 'golf',
        'march madness', 'final four', 'world series', 'stanley cup', 'nba finals', 'nfl playoffs',
        'chiefs', 'ravens', '49ers', 'cowboys', 'lakers', 'celtics', 'warriors', 'yankees', 'dodgers'];

      const entertainmentKeywords = ['oscar', 'emmy', 'grammy', 'golden globe', 'box office', 'movie', 'film',
        'streaming', 'netflix', 'disney', 'hbo', 'tv', 'series', 'ratings', 'album', 'billboard',
        'celebrity', 'bachelor', 'halftime', 'awards', 'nomination', 'winner', 'director',
        'actor', 'actress', 'singer', 'song', 'chart', 'top 10', 'premiere', 'release'];

      const sortedMarkets = markets.slice(0, 100).sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aIsSports = sportsKeywords.some(kw => aTitle.includes(kw));
        const bIsSports = sportsKeywords.some(kw => bTitle.includes(kw));
        const aIsEntertainment = entertainmentKeywords.some(kw => aTitle.includes(kw));
        const bIsEntertainment = entertainmentKeywords.some(kw => bTitle.includes(kw));

        // SPORTS markets first (highest priority)
        if (aIsSports && !bIsSports) return -1;
        if (!aIsSports && bIsSports) return 1;

        // Entertainment markets second
        if (aIsEntertainment && !bIsEntertainment && !bIsSports) return -1;
        if (!aIsEntertainment && bIsEntertainment && !aIsSports) return 1;

        // Then by volume (if available)
        return (b.volume || 0) - (a.volume || 0);
      });

      const sportsCount = sortedMarkets.filter(m =>
        sportsKeywords.some(kw => (m.title || '').toLowerCase().includes(kw))
      ).length;

      const entertainmentCount = sortedMarkets.filter(m =>
        entertainmentKeywords.some(kw => (m.title || '').toLowerCase().includes(kw))
      ).length;

      if (sportsCount > 0) {
        console.log(`   ${color.highlight('🏈 Found ' + sportsCount + ' SPORTS markets - TOP PRIORITY!')}`);
      }
      if (entertainmentCount > 0) {
        console.log(`   ${c.dim}🎬 Found ${entertainmentCount} entertainment markets${c.reset}`);
      }

      // ========================================================================
      // PROGNO FLEX INTEGRATION: Fetch picks with 7-Dimensional Claude Effect
      // ========================================================================
      const now = Date.now();
      const PROGNO_CACHE_TIME = 5 * 60 * 1000; // Cache for 5 minutes
      
      if (now - this.lastPrognoFetch > PROGNO_CACHE_TIME) {
        try {
          console.log(`   ${color.highlight('🎯 Fetching PROGNO picks with Claude Effect...')}`);
          this.prognoPicks = await this.progno.getTodaysPicks();
          this.lastPrognoFetch = now;
          
          if (this.prognoPicks.length > 0) {
            const highConfidence = this.prognoPicks.filter(p => p.confidence >= 70).length;
            console.log(`   ${color.success('✅ PROGNO:')} ${this.prognoPicks.length} picks (${highConfidence} high-confidence)`);
            console.log(`   ${c.dim}   Using 7-Dimensional Claude Effect: SF, NM, IAI, CSI, NIG, TRD, EPD${c.reset}`);
          } else {
            console.log(`   ${c.dim}   No PROGNO picks available (using category bots)${c.reset}`);
          }
        } catch (error) {
          console.log(`   ${color.warning('⚠️ PROGNO fetch failed:')} ${(error as Error).message}`);
          // Continue with category bots if PROGNO fails
        }
      }

      let betsPlaced = 0;
      const maxBetsPerCycle = 2; // Limit per cycle

      for (const market of sortedMarkets.slice(0, 50)) { // Check top 50 (now sorted)
        if (betsPlaced >= maxBetsPerCycle) break;
        if (this.kalshiOpenBets >= 10) break;

        // Skip markets we've already bet on
        const marketId = market.id || (market as any).ticker;
        if (this.kalshiBetMarkets.has(marketId)) {
          continue; // Already bet on this market
        }

        // FILTER: Skip markets that expire too far in the future (max 3 days)
        const expirationDate = market.expiresAt || (market as any).expiration_time || (market as any).close_time;
        if (expirationDate) {
          const expiration = new Date(expirationDate);
          const now = new Date();
          const daysUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          const maxDays = 3; // 3 days max - only today through next 2-3 days

          if (daysUntilExpiration > maxDays || daysUntilExpiration < 0) {
            // Skip long-term bets and expired markets
            continue;
          }

          // Prefer shorter-term markets (under 30 days) for active trading
          if (daysUntilExpiration > 30) {
            // Still consider but with lower priority - skip if we have better options
            if (Math.random() > 0.3) { // 70% chance to skip longer-term markets
              continue;
            }
          }
        }

        // Skip if we don't have enough balance for minimum bet
        if (this.kalshiBalance < 2) {
          console.log(`   ${color.warning('⚠️ Insufficient balance for more bets')}`);
          break;
        }

        // Check market type - SPORTS FIRST PRIORITY
        const marketTitle = (market.title || '').toLowerCase();
        const isSports = sportsKeywords.some(kw => marketTitle.includes(kw));
        const isEntertainment = entertainmentKeywords.some(kw => marketTitle.includes(kw));

        if (isSports) {
          console.log(`   ${color.highlight('🏈 SPORTS MARKET (PRIORITY):')} ${c.white}${market.title.substring(0, 50)}...${c.reset}`);
        } else if (isEntertainment) {
          console.log(`   ${c.dim}🎬 ENTERTAINMENT MARKET:${c.reset} ${c.white}${market.title.substring(0, 50)}...${c.reset}`);
        }

        const analysis = await this.analyzeKalshiMarket(market);

        // Log market analysis results
        if (isSports) {
          if (analysis.shouldBet) {
            console.log(`   ${color.success('✅ Sports Bot found opportunity!')}`);
          } else {
            console.log(`   ${c.dim}Sports Bot: ${analysis.edge.toFixed(1)}% edge, ${analysis.confidence || 0}% confidence${c.reset}`);
          }
        } else if (isEntertainment) {
          if (analysis.shouldBet) {
            console.log(`   ${color.success('✅ Entertainment Expert found opportunity!')}`);
          } else {
            console.log(`   ${c.dim}Entertainment Expert: ${analysis.edge.toFixed(1)}% edge, ${analysis.confidence || 0}% confidence${c.reset}`);
          }
        }

        // Adjust minimum edge based on expiration date and market type
        // SPORTS gets lowest threshold (highest priority)
        let minEdge = 2; // Base minimum edge
        if (isSports) {
          // Sports markets get the LOWEST threshold (we have good edge here)
          minEdge = 1.0; // Very low threshold for sports
          if (analysis.confidence && analysis.confidence >= 60) {
            minEdge = 0.8; // Even lower if decent confidence
          }
          if (analysis.confidence && analysis.confidence >= 70) {
            minEdge = 0.5; // Very low if high confidence
          }
        } else if (isEntertainment) {
          // Lower edge requirement for entertainment markets (expert is more confident)
          minEdge = 1.5; // Entertainment expert gets lower threshold
          if (analysis.confidence && analysis.confidence >= 70) {
            minEdge = 1.0; // Even lower if high confidence
          }
        }

        if (expirationDate) {
          const expiration = new Date(expirationDate);
          const daysUntil = (expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntil > 30) {
            // Require higher edge for longer-term markets
            // Sports gets minimal penalty, entertainment gets half, others get full
            const extraEdge = isSports ? 0.3 : isEntertainment ? 0.5 : 1.0;
            minEdge += Math.floor((daysUntil - 30) / 30) * extraEdge;
            const maxEdge = isSports ? 3 : isEntertainment ? 4 : 5;
            minEdge = Math.min(minEdge, maxEdge);
          }
        }

        if (analysis.shouldBet && analysis.edge >= minEdge) {
          // Final balance check before placing bet
          const stakeAmount = Math.min(analysis.stake, this.kalshiBalance - 0.50); // Leave $0.50 buffer
          if (stakeAmount < 1) {
            console.log(`   ${color.warning('⚠️ Stake too small after balance check')}`);
            continue;
          }

          // Check daily spending limit
          if (!this.canSpendToday(stakeAmount)) {
            const remaining = CONFIG.dailySpendingLimit - this.dailySpending;
            console.log(`   ${color.warning('⚠️ Daily spending limit reached!')}`);
            console.log(`   ${c.dim}Spent today:${c.reset} ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)}`);
            console.log(`   ${c.dim}Remaining:${c.reset} ${color.money('$' + remaining.toFixed(2))} (need ${color.money('$' + stakeAmount.toFixed(2))})`);
            continue;
          }

          const sideColor = analysis.side === 'yes' ? c.brightGreen : c.brightRed;
          let expirationStr = '';
          if (expirationDate) {
            const expiration = new Date(expirationDate);
            const daysUntil = Math.ceil((expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            expirationStr = ` | ${c.dim}Expires:${c.reset} ${daysUntil}d (${expiration.toLocaleDateString()})`;
          }

          // Sports markets get special highlighting (highest priority)
          const marketIcon = isSports ? color.highlight('🏈') : isEntertainment ? color.highlight('🎬') : color.kalshi('🎯');
          const marketType = isSports ? `${color.highlight('[SPORTS - PRIORITY]')} ` : isEntertainment ? `${color.highlight('[ENTERTAINMENT]')} ` : '';
          const confidenceStr = analysis.confidence ? ` | ${c.dim}Conf:${c.reset} ${color.info(analysis.confidence + '%')}` : '';

          if (isSports) {
            console.log(`   ${marketIcon} ${marketType}${c.brightWhite}${market.title.substring(0, 45)}...${c.reset}`);
          } else {
            console.log(`   ${marketIcon} ${marketType}${c.white}${market.title.substring(0, 45)}...${c.reset}`);
          }
          console.log(`      ${c.dim}Edge:${c.reset} ${color.success('+' + analysis.edge.toFixed(1) + '%')} | ${c.dim}Side:${c.reset} ${sideColor}${analysis.side.toUpperCase()}${c.reset} | ${c.dim}Stake:${c.reset} ${color.money('$' + stakeAmount.toFixed(2))}${confidenceStr}${expirationStr}`);

          const trade = await this.kalshi.placeBet(
            marketId,
            analysis.side,
            stakeAmount,
            analysis.side === 'yes' ? market.yesPrice + 3 : market.noPrice + 3
          );

          if (trade) {
            // Mark this market as bet on - NEVER bet on it again this session
            this.kalshiBetMarkets.add(marketId);

            // Update our cached balance
            this.kalshiBalance -= stakeAmount;

            // Extract fees from Kalshi trade response (taker_fees is in cents)
            const kalshiFees = ((trade as any).taker_fees || (trade as any).total_fees || 0) / 100; // Convert cents to dollars
            this.kalshiFeesPaid += kalshiFees;
            this.totalFeesPaid += kalshiFees;
            this.recordSpending(stakeAmount); // Track daily spending

            // Create Kalshi position for tracking
            const entryPrice = analysis.side === 'yes' ? market.yesPrice : market.noPrice;
            const kalshiPosition: Position = {
              id: trade.id || `kalshi_${Date.now()}`,
              platform: 'kalshi',
              symbol: market.title, // Use market title as symbol for Kalshi
              side: analysis.side, // 'yes' | 'no'
              entryPrice: entryPrice,
              amount: stakeAmount,
              currentPrice: entryPrice, // Will update when checking positions
              pnl: -kalshiFees, // Start negative due to fees
              pnlPercent: -(kalshiFees / stakeAmount) * 100,
              openedAt: new Date(),
              entryFees: kalshiFees,
              exitFees: 0, // Kalshi fees are typically only on entry
              totalFees: kalshiFees,
            };
            this.positions.push(kalshiPosition);

            console.log(`      ${color.success('✅ Bet placed!')} ID: ${c.dim}${trade.id}${c.reset}`);
            if (kalshiFees > 0) {
              console.log(`      ${c.dim}Kalshi Fee:${c.reset} ${color.error('-$' + kalshiFees.toFixed(2))}`);
            }
            console.log(`      ${c.dim}Daily Spending:${c.reset} ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)}`);
            this.kalshiOpenBets++;

            // Save trade to persistent memory
            await this.saveTradeToMemory({
              platform: 'kalshi',
              marketId: marketId,
              type: analysis.side === 'yes' ? 'buy' : 'sell',
              amount: stakeAmount,
              price: entryPrice,
              fees: kalshiFees,
              timestamp: new Date().toISOString(),
            });

            betsPlaced++;
            this.learningData.totalTrades++;
          }
        }
      }

      if (betsPlaced === 0) {
        const sportsAnalyzed = sortedMarkets.slice(0, 50).filter(m => {
          const mTitle = (m.title || '').toLowerCase();
          return sportsKeywords.some(kw => mTitle.includes(kw));
        }).length;
        const entertainmentAnalyzed = sortedMarkets.slice(0, 50).filter(m => {
          const mTitle = (m.title || '').toLowerCase();
          return entertainmentKeywords.some(kw => mTitle.includes(kw));
        }).length;
        console.log(`   ${c.dim}No new opportunities found`);
        if (sportsAnalyzed > 0) {
          console.log(`   ${c.dim}Scanned: ${color.highlight(sportsAnalyzed + ' SPORTS')} markets (priority), ${entertainmentAnalyzed} entertainment, ${this.kalshiBetMarkets.size} already bet on${c.reset}`);
        } else {
          console.log(`   ${c.dim}Scanned: ${sportsAnalyzed} sports, ${entertainmentAnalyzed} entertainment, ${this.kalshiBetMarkets.size} already bet on${c.reset}`);
        }
      } else {
        console.log(`   ${color.success('✅ Placed ' + betsPlaced + ' bet(s) this cycle!')}`);
      }

      // ========================================================================
      // 📡 SYNC TO PROGNOSTICATION HOMEPAGE (EVERY CYCLE, EVEN IF NO TRADES)
      // ========================================================================
      // Collect all analyzed opportunities with their analysis data
      const allOpportunities = sortedMarkets.slice(0, 50).map(market => {
        const marketTitle = (market.title || '').toLowerCase();
        const sportsKeywords = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'football', 'basketball', 'baseball', 'hockey', 'soccer'];
        const entertainmentKeywords = ['oscar', 'emmy', 'grammy', 'golden globe', 'box office', 'movie', 'film'];
        
        return {
          id: market.id || market.ticker,
          marketId: market.id || market.ticker,
          title: market.title,
          category: sportsKeywords.some(kw => marketTitle.includes(kw)) ? 'sports' :
                    entertainmentKeywords.some(kw => marketTitle.includes(kw)) ? 'entertainment' : 'world',
          yesPrice: market.yesPrice || market.yes_price || 50,
          noPrice: market.noPrice || market.no_price || 50,
          expiresAt: market.expiresAt || market.expiration_time,
          volume: market.volume || 0,
          confidence: 50, // Default, will be enhanced by analysis
          edge: 0,
          side: 'yes',
          reasoning: [],
          factors: [],
          learnedFrom: [],
        };
      });

      // Update Prognostication homepage with high-confidence picks
      await this.prognosticationSync.updatePrognosticationHomepage(allOpportunities);

    } catch (error) {
      console.error(`   ${color.warning('⚠️ Kalshi analysis error:')}`, error);
    }
  }

  async analyzeKalshiMarket(market: any): Promise<{ shouldBet: boolean; side: 'yes' | 'no'; edge: number; stake: number; confidence?: number }> {
    // ========================================================================
    // PROGNO FLEX INTEGRATION: Use 7-Dimensional Claude Effect for Sports
    // ========================================================================
    const marketTitle = (market.title || '').toLowerCase();
    const isSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'football', 'basketball', 'baseball', 'hockey', 'soccer'].some(kw => marketTitle.includes(kw));
    
    if (isSports && this.prognoPicks.length > 0) {
      // Try to match this Kalshi market to a PROGNO pick
      for (const pick of this.prognoPicks) {
        const pickText = `${pick.homeTeam} ${pick.awayTeam} ${pick.pick} ${pick.league}`.toLowerCase();
        const teamMatch = pickText.includes(marketTitle) || marketTitle.includes(pick.homeTeam.toLowerCase()) || marketTitle.includes(pick.awayTeam.toLowerCase());
        
        if (teamMatch && pick.confidence >= 65) {
          // Found matching PROGNO pick with Claude Effect!
          const marketYesPrice = market.yesPrice || 50;
          const marketNoPrice = market.noPrice || 50;
          
          // Convert PROGNO pick to Kalshi side
          // PROGNO pick like "Chiefs -10.5" means Chiefs win by more than 10.5
          // We need to determine if this matches "YES" or "NO" on Kalshi
          let kalshiSide: 'yes' | 'no' = 'yes';
          let prognoProbability = pick.confidence / 100; // Use confidence as probability
          
          // If pick is a spread/total, we need to match it to the Kalshi market question
          // For now, assume higher confidence = YES side
          if (pick.pickType === 'moneyline' && pick.pick.toLowerCase().includes(pick.homeTeam.toLowerCase())) {
            // Home team moneyline pick
            kalshiSide = 'yes'; // Assuming Kalshi market is "Will home team win?"
          } else if (pick.pickType === 'moneyline' && pick.pick.toLowerCase().includes(pick.awayTeam.toLowerCase())) {
            kalshiSide = 'no'; // Away team moneyline pick
          }
          
          // Calculate edge: PROGNO probability vs market price
          const marketProbability = kalshiSide === 'yes' ? marketYesPrice / 100 : marketNoPrice / 100;
          const edge = (prognoProbability - marketProbability) * 100; // Edge in percentage points
          
          if (edge >= 1.0) { // Minimum 1% edge
            const stake = Math.min(5, Math.max(1, Math.floor(pick.expectedValue * 10))); // Scale stake based on EV
            
            console.log(`   ${color.highlight('🎯 PROGNO FLEX MATCH!')} ${c.white}${pick.league}: ${pick.pick}${c.reset}`);
            console.log(`      ${c.dim}Claude Effect:${c.reset} ${color.info(pick.confidence + '%')} | ${c.dim}EV:${c.reset} ${color.success('+' + pick.expectedValue.toFixed(1) + '%')}`);
            console.log(`      ${c.dim}7D Dimensions:${c.reset} SF, NM, IAI, CSI, NIG, TRD, EPD`);
            console.log(`      ${c.dim}Market Price:${c.reset} ${marketProbability.toFixed(1)}% | ${c.dim}PROGNO:${c.reset} ${prognoProbability.toFixed(1)}% | ${c.dim}Edge:${c.reset} ${color.success('+' + edge.toFixed(1) + '%')}`);
            
            return {
              shouldBet: true,
              side: kalshiSide,
              edge: edge,
              stake: stake,
              confidence: pick.confidence
            };
          }
        }
      }
    }
    
    // 🎮 PRIORITY 1: GME SPECIALIST
    if (gmeSpecialist.isGMERelated(market.title)) {
      console.log(`   ${color.highlight('🎮 GME MARKET DETECTED - USING SPECIALIST!')}`);
      try {
        const gmeAnalysis = await gmeSpecialist.analyzeGMEMarket({
          id: market.id || market.ticker,
          title: market.title,
          yesPrice: market.yesPrice || market.yes_price || 50,
          noPrice: market.noPrice || market.no_price || 50,
          expiresAt: market.expiresAt || market.expiration_time,
        });

        const minEdge = 1.0;
        const minConfidence = 55;

        if (gmeAnalysis.edge >= minEdge && gmeAnalysis.confidence >= minConfidence) {
          console.log(`      ${color.success('✅ GME SPECIALIST RECOMMENDS BET!')}`);
          const price = gmeAnalysis.prediction === 'yes' ? market.yesPrice : market.noPrice;
          const prob = gmeAnalysis.probability / 100;
          const odds = 100 / price - 1;
          const kelly = Math.max(0, (prob * odds - (1 - prob)) / odds);
          const stake = Math.min(Math.max(kelly * 0.25 * 100, 2), 10);

          return {
            shouldBet: true,
            side: gmeAnalysis.prediction,
            edge: gmeAnalysis.edge,
            stake,
            confidence: gmeAnalysis.confidence,
          };
        } else {
          console.log(`      ${c.dim}GME Specialist: Edge ${gmeAnalysis.edge.toFixed(1)}% (need ${minEdge}%)${c.reset}`);
          return { shouldBet: false, side: gmeAnalysis.prediction, edge: gmeAnalysis.edge, stake: 0, confidence: gmeAnalysis.confidence };
        }
      } catch (e) {
        console.error(`   ${color.warning('⚠️ GME Specialist error')}`, e);
      }
    }

    // 📊 PRIORITY 2: DERIVATIVES EXPERT
    if (derivativesExpert.isDerivativesMarket(market.title)) {
      console.log(`   ${color.highlight('📊 DERIVATIVES MARKET - USING EXPERT!')}`);
      try {
        const derivAnalysis = await derivativesExpert.analyzeDerivativesMarket({
          id: market.id || market.ticker,
          title: market.title,
          yesPrice: market.yesPrice || market.yes_price || 50,
          noPrice: market.noPrice || market.no_price || 50,
          expiresAt: market.expiresAt || market.expiration_time,
        });

        const minEdge = 1.5;
        const minConfidence = 55;

        if (derivAnalysis.edge >= minEdge && derivAnalysis.confidence >= minConfidence) {
          console.log(`      ${color.success('✅ DERIVATIVES EXPERT RECOMMENDS BET!')}`);
          const price = derivAnalysis.prediction === 'yes' ? market.yesPrice : market.noPrice;
          const prob = derivAnalysis.probability / 100;
          const odds = 100 / price - 1;
          const kelly = Math.max(0, (prob * odds - (1 - prob)) / odds);
          const stake = Math.min(Math.max(kelly * 0.25 * 100, 2), 8);

          return {
            shouldBet: true,
            side: derivAnalysis.prediction,
            edge: derivAnalysis.edge,
            stake,
            confidence: derivAnalysis.confidence,
          };
        } else {
          console.log(`      ${c.dim}Derivatives Expert: Edge ${derivAnalysis.edge.toFixed(1)}% (need ${minEdge}%)${c.reset}`);
          return { shouldBet: false, side: derivAnalysis.prediction, edge: derivAnalysis.edge, stake: 0, confidence: derivAnalysis.confidence };
        }
      } catch (e) {
        console.error(`   ${color.warning('⚠️ Derivatives Expert error')}`, e);
      }
    }

    // 📈 PRIORITY 3: FUTURES EXPERT
    if (futuresExpert.isFuturesMarket(market.title)) {
      console.log(`   ${color.highlight('📈 FUTURES MARKET - USING EXPERT!')}`);
      try {
        const futuresAnalysis = await futuresExpert.analyzeFuturesMarket({
          id: market.id || market.ticker,
          title: market.title,
          yesPrice: market.yesPrice || market.yes_price || 50,
          noPrice: market.noPrice || market.no_price || 50,
          expiresAt: market.expiresAt || market.expiration_time,
        });

        const minEdge = 1.5;
        const minConfidence = 55;

        if (futuresAnalysis.edge >= minEdge && futuresAnalysis.confidence >= minConfidence) {
          console.log(`      ${color.success('✅ FUTURES EXPERT RECOMMENDS BET!')}`);
          const price = futuresAnalysis.prediction === 'yes' ? market.yesPrice : market.noPrice;
          const prob = futuresAnalysis.probability / 100;
          const odds = 100 / price - 1;
          const kelly = Math.max(0, (prob * odds - (1 - prob)) / odds);
          const stake = Math.min(Math.max(kelly * 0.25 * 100, 2), 8);

          return {
            shouldBet: true,
            side: futuresAnalysis.prediction,
            edge: futuresAnalysis.edge,
            stake,
            confidence: futuresAnalysis.confidence,
          };
        } else {
          console.log(`      ${c.dim}Futures Expert: Edge ${futuresAnalysis.edge.toFixed(1)}% (need ${minEdge}%)${c.reset}`);
          return { shouldBet: false, side: futuresAnalysis.prediction, edge: futuresAnalysis.edge, stake: 0, confidence: futuresAnalysis.confidence };
        }
      } catch (e) {
        console.error(`   ${color.warning('⚠️ Futures Expert error')}`, e);
      }
    }

    // SAFETY CHECK: Reject markets that expire too far in the future
    const expirationDate = market.expiresAt || market.expiration_time || market.close_time;
    if (expirationDate) {
      const expiration = new Date(expirationDate);
      const daysUntilExpiration = (expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      // Hard limit: 6 months (180 days) - no exceptions
      if (daysUntilExpiration > 180) {
        return { shouldBet: false, side: 'yes', edge: 0, stake: 0 };
      }

      // Prefer markets under 30 days for active trading
      // Penalize longer-term markets by requiring higher edge
      if (daysUntilExpiration > 30) {
        // Require 1% more edge for every 30 days beyond 30
        const extraEdgeRequired = Math.floor((daysUntilExpiration - 30) / 30) * 1;
        // This will be checked in the calling function
      }
    }

    const title = market.title.toLowerCase();
    let aiPrediction = market.yesPrice;
    let confidence = 50;

    // Entertainment markets - use entertainment expert
    const entertainmentKeywords = ['oscar', 'emmy', 'grammy', 'golden globe', 'box office', 'movie', 'film',
      'streaming', 'netflix', 'disney', 'hbo', 'tv', 'series', 'ratings', 'album', 'billboard',
      'celebrity', 'bachelor', 'super bowl', 'halftime'];

    if (entertainmentKeywords.some(kw => title.includes(kw))) {
      try {
        const entertainmentMarket = {
          id: market.id || market.ticker,
          title: market.title,
          category: entertainmentExpert.categorizeMarket(market.title),
          yesPrice: market.yesPrice || market.yes_price || 50,
          noPrice: market.noPrice || market.no_price || 50,
          expiresAt: market.expiresAt || market.expiration_time || '',
        };

        const prediction = await entertainmentExpert.analyzeMarket(entertainmentMarket);

        // Lower threshold for entertainment markets (expert is more confident)
        const minEdge = 0.5; // Very low threshold to test entertainment betting
        const minConfidence = 45; // Lower confidence requirement

        const absEdge = Math.abs(prediction.edge);
        const meetsEdge = absEdge >= minEdge;
        const meetsConfidence = prediction.confidence >= minConfidence;

        if (meetsEdge && meetsConfidence) {
          console.log(`      ${color.success('✅ Entertainment Expert recommends bet!')}`);
          console.log(`      ${c.dim}Edge:${c.reset} ${color.success('+' + absEdge.toFixed(1) + '%')} | ${c.dim}Confidence:${c.reset} ${color.info(prediction.confidence + '%')} | ${c.dim}Side:${c.reset} ${prediction.prediction.toUpperCase()}`);
          return {
            shouldBet: true,
            side: prediction.prediction,
            edge: absEdge,
            stake: Math.min(CONFIG.maxTradeSize, 5),
            confidence: prediction.confidence,
          };
        } else {
          console.log(`      ${c.dim}Entertainment Expert: Edge ${absEdge.toFixed(1)}% (need ${minEdge}%) | Conf ${prediction.confidence}% (need ${minConfidence}%) - ${meetsEdge && !meetsConfidence ? 'low confidence' : !meetsEdge && meetsConfidence ? 'low edge' : 'both too low'}${c.reset}`);
        }

        return { shouldBet: false, side: 'yes', edge: absEdge, stake: 0, confidence: prediction.confidence };
      } catch (e) {
        console.log(`   ${c.dim}Entertainment expert error: ${e}${c.reset}`);
        // Fall through to general analysis
      }
    }

    // Use category-specific learning bots for all categories
    try {
      const categoryPrediction = await categoryLearners.analyzeMarket(market);

      // Record prediction for training
      await categoryLearners.recordPrediction(categoryPrediction.category, categoryPrediction);

      // Store prediction for export to prognostication.com (with marketId for referral links)
      const predictionForExport = {
        ...categoryPrediction,
        marketId: market.id || market.ticker, // Add marketId for Kalshi referral links
      };
      this.lastKalshiPredictions.push(predictionForExport);
      // Keep only last 50 predictions
      if (this.lastKalshiPredictions.length > 50) {
        this.lastKalshiPredictions.shift();
      }

      // Use category bot's prediction
      aiPrediction = categoryPrediction.probability;
      confidence = categoryPrediction.confidence;

      // Show which bot analyzed it
      const botEmoji: Record<string, string> = {
        'crypto': '🪙',
        'politics': '🗳️',
        'economics': '📊',
        'entertainment': '🎬',
        'sports': '🏈',
        'weather': '🌡️',
        'technology': '💻',
      };
      const emoji = botEmoji[categoryPrediction.category] || '📋';
      console.log(`      ${c.dim}${emoji} ${categoryPrediction.category.toUpperCase()} Bot:${c.reset} ${categoryPrediction.prediction.toUpperCase()} | Edge: ${categoryPrediction.edge.toFixed(1)}% | Conf: ${categoryPrediction.confidence}%`);

      if (categoryPrediction.factors.length > 0) {
        console.log(`      ${c.dim}Factors: ${categoryPrediction.factors.slice(0, 2).join(', ')}${c.reset}`);
      }
    } catch (e) {
      console.log(`   ${c.dim}Category learner error: ${e}${c.reset}`);
      // Fall through to general analysis
    }

    // Calculate edge
    const yesEdge = aiPrediction - market.yesPrice;
    const noEdge = (100 - aiPrediction) - market.noPrice;

    let shouldBet = false;
    let side: 'yes' | 'no' = 'yes';
    let edge = 0;

    if (yesEdge >= 2 && confidence >= 50) { // Lowered thresholds
      shouldBet = true;
      side = 'yes';
      edge = yesEdge;
    } else if (noEdge >= 2 && confidence >= 50) { // Lowered thresholds
      shouldBet = true;
      side = 'no';
      edge = noEdge;
    }

    // Quarter Kelly for stake
    const price = side === 'yes' ? market.yesPrice : market.noPrice;
    const prob = (price + edge) / 100;
    const odds = 100 / price - 1;
    const kelly = Math.max(0, (prob * odds - (1 - prob)) / odds);
    const stake = Math.min(Math.max(kelly * 0.25 * 100, 1), CONFIG.maxTradeSize);

    return { shouldBet, side, edge, stake, confidence };
  }

  // ============================================================================
  // MEMORY PERSISTENCE (Supabase + JSON)
  // ============================================================================

  private async saveTradeToMemory(trade: {
    platform: string;
    symbol?: string;
    marketId?: string;
    type: string;
    amount: number;
    price: number;
    fees: number;
    timestamp: string;
  }): Promise<void> {
    // Save to JSON (local backup)
    await this.saveTradeToJSON(trade);

    // Save to Supabase (cloud storage)
    await this.saveTradeToSupabase(trade);
  }

  private async saveTradeToJSON(trade: any): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const memoryDir = path.join(process.cwd(), '.bot-memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = path.join(memoryDir, `trades-${dateStr}.jsonl`);

      const record = JSON.stringify(trade) + '\n';
      fs.appendFileSync(fileName, record, 'utf8');
    } catch (e) {
      // Silent fail
    }
  }

  private async saveTradeToSupabase(trade: any): Promise<void> {
    try {
      const { saveTrade } = await import('./lib/supabase-memory');
      await saveTrade({
        platform: trade.platform as any,
        symbol: trade.symbol,
        market_id: trade.marketId,
        side: trade.type as any,
        amount: trade.amount,
        price: trade.price,
        fees: trade.fees,
        status: 'open',
        pnl: 0,
        executed_at: new Date(trade.timestamp),
      });
    } catch (e) {
      // Silent fail
    }
  }

  // ============================================================================
  // MAIN LOOP
  // ============================================================================

  async start(): Promise<void> {
    await this.initialize();
    this.isRunning = true;

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              🚀 BOT STARTED - RUNNING 24/7 🚀                ║
║                                                              ║
║     Crypto: Every ${CONFIG.cryptoInterval}s | Kalshi: Every ${CONFIG.kalshiInterval}s             ║
║     Learning: Every ${CONFIG.learningInterval}s | Press Ctrl+C to stop            ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n⚠️ Shutdown signal received...');
      this.isRunning = false;
      await this.shutdown();
    });

    let cryptoCounter = 0;
    let learningCounter = 0;
    let rebalanceCounter = 0;

    while (this.isRunning) {
      const now = new Date();
      console.log(`\n${c.brightCyan}${'═'.repeat(60)}${c.reset}`);
      console.log(`${c.brightWhite}📍 ${now.toLocaleTimeString()} - ${c.brightGreen}Trading Cycle${c.reset}`);
      console.log(`${c.brightCyan}${'═'.repeat(60)}${c.reset}`);

      // Check and reset daily spending counter (if new day)
      this.checkAndResetDailySpending();

      // Check daily loss limit
      if (this.dailyPnL <= -CONFIG.dailyLossLimit) {
        console.log(`${color.error('⛔ DAILY LOSS LIMIT REACHED')} - Pausing trades until tomorrow`);
        await this.sleep(3600000); // Sleep 1 hour
        continue;
      }

      // Check daily spending limit
      if (this.dailySpending >= CONFIG.dailySpendingLimit) {
        console.log(`${color.warning('⛔ DAILY SPENDING LIMIT REACHED')} - No more trades today`);
        console.log(`   ${c.dim}Spent:${c.reset} ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)}`);
        await this.sleep(3600000); // Sleep 1 hour, then check again
        continue;
      }

      // Check open positions
      await this.checkPositions();

      // Crypto analysis (every cycle)
      if (this.positions.filter(p => p.platform === 'crypto').length < 8) {
        console.log(`\n${color.crypto('📊 CRYPTO ANALYSIS:')}`);
        const cryptoSignals = await this.analyzeCrypto();

        for (const signal of cryptoSignals) {
          if (signal.confidence >= CONFIG.minConfidence) {
            await this.executeCryptoTrade(signal);
            break; // One trade per cycle
          }
        }
      } else {
        console.log(`\n${color.crypto('📊 CRYPTO')}: ${c.dim}Max positions reached, monitoring only${c.reset}`);
      }

      // Kalshi analysis (every kalshiInterval)
      const now_ts = Date.now();
      if (now_ts - this.lastKalshiScan >= CONFIG.kalshiInterval * 1000) {
        console.log(`\n${color.kalshi('🎯 KALSHI PREDICTION MARKETS:')}`);
        await this.analyzeKalshiMarkets();
        // Export predictions for prognostication.com
        await this.exportKalshiPicks();
        this.lastKalshiScan = now_ts;
      }

      // Deep learning (every 5 minutes)
      learningCounter += CONFIG.cryptoInterval;
      if (learningCounter >= CONFIG.learningInterval) {
        await this.deepLearning();
        learningCounter = 0;
      }

      // Rebalance check (every hour)
      rebalanceCounter += CONFIG.cryptoInterval;
      if (rebalanceCounter >= CONFIG.rebalanceCheck) {
        const suggestion = fundManager.getRebalanceSuggestion();
        if (suggestion) {
          console.log(`\n${color.warning('⚠️ REBALANCE NEEDED')}: ${suggestion.action}`);
          console.log(`   Move ${color.money('$' + suggestion.amount)} from ${color.highlight(suggestion.from)} to ${color.highlight(suggestion.to)}`);
        }
        rebalanceCounter = 0;
      }

      // Status display
      this.displayStatus();

      // Hourly P&L summary
      const currentTime = Date.now();
      if (currentTime - this.lastHourlyReport >= 3600000) { // Every hour
        this.printHourlyReport();
        this.lastHourlyReport = currentTime;
        this.hourlyPnL = this.dailyPnL; // Reset hourly tracking
      }

      // Wait for next cycle
      await this.sleep(CONFIG.cryptoInterval * 1000);
    }
  }

  printHourlyReport(): void {
    this.checkAndResetDailySpending(); // Ensure daily counter is current
    const hourPnL = this.dailyPnL - this.hourlyPnL;
    const totalPnL = this.positions.reduce((sum, p) => sum + p.pnl, 0);
    const totalValue = this.dailyPnL + totalPnL - this.totalFeesPaid;
    const runtime = Date.now() - this.sessionStartTime.getTime();
    const remainingSpending = CONFIG.dailySpendingLimit - this.dailySpending;

    console.log(`
${c.brightCyan}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.brightCyan}║${c.reset}              ${c.brightYellow}📊 HOURLY P&L REPORT 📊${c.reset}                        ${c.brightCyan}║${c.reset}
${c.brightCyan}╠══════════════════════════════════════════════════════════════╣${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Last Hour P&L:${c.reset}     ${hourPnL >= 0 ? color.success('+' + hourPnL.toFixed(2)) : color.error(hourPnL.toFixed(2))}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Session P&L:${c.reset}      ${this.dailyPnL >= 0 ? color.success('+' + this.dailyPnL.toFixed(2)) : color.error(this.dailyPnL.toFixed(2))}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Unrealized:${c.reset}       ${totalPnL >= 0 ? color.success('+' + totalPnL.toFixed(2)) : color.error(totalPnL.toFixed(2))}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Total Value:${c.reset}     ${totalValue >= 0 ? color.success('+' + totalValue.toFixed(2)) : color.error(totalValue.toFixed(2))}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Fees Paid:${c.reset}        ${color.error('-$' + this.totalFeesPaid.toFixed(2))}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Daily Spending:${c.reset}   ${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)} ${c.dim}(${color.money('$' + remainingSpending.toFixed(2))} left)${c.reset}  ${c.brightCyan}║${c.reset}
${c.brightCyan}├────────────────────────────────────────────────────────┤${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Positions:${c.reset}        ${c.brightWhite}${this.positions.length}${c.reset} open (${this.positions.filter(p => p.platform === 'crypto').length} crypto, ${this.kalshiOpenBets} Kalshi)  ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Total Trades:${c.reset}    ${c.brightWhite}${this.learningData.totalTrades}${c.reset} (${color.success(this.learningData.wins + 'W')} / ${color.error(this.learningData.losses + 'L')})              ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Win Rate:${c.reset}         ${this.learningData.totalTrades > 0 ? (this.learningData.wins / this.learningData.totalTrades * 100 >= 50 ? color.success((this.learningData.wins / this.learningData.totalTrades * 100).toFixed(1) + '%') : color.error((this.learningData.wins / this.learningData.totalTrades * 100).toFixed(1) + '%')) : '0.0%'}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.dim}Runtime:${c.reset}          ${c.dim}${this.formatDuration(runtime)}${c.reset}                          ${c.brightCyan}║${c.reset}
${c.brightCyan}╚══════════════════════════════════════════════════════════════╝${c.reset}
    `);

    // Show position details
    if (this.positions.length > 0) {
      console.log(`${c.brightWhite}📋 OPEN POSITIONS:${c.reset}`);
      this.positions.forEach((p, i) => {
        const pnlColor = p.pnl >= 0 ? color.success : color.error;
        const platformColor = p.platform === 'crypto' ? color.crypto : color.kalshi;
        const displaySymbol = p.platform === 'kalshi' && p.symbol.length > 30
          ? p.symbol.substring(0, 30) + '...'
          : p.symbol;
        console.log(`   ${i + 1}. ${platformColor(p.platform.toUpperCase())} ${c.dim}${displaySymbol}${c.reset} | ${pnlColor((p.pnl >= 0 ? '+' : '') + p.pnl.toFixed(2))} | ${c.dim}Entry:${c.reset} $${p.entryPrice.toFixed(2)}`);
      });
      console.log('');
    }
  }

  async pushToDashboard(): Promise<void> {
    try {
      const cryptoPositions = this.positions.filter(p => p.platform === 'crypto');
      const kalshiPositions = this.positions.filter(p => p.platform === 'kalshi');

      const cryptoPnL = cryptoPositions.reduce((sum, p) => sum + p.pnl, 0);
      const kalshiPnL = kalshiPositions.reduce((sum, p) => sum + p.pnl, 0);

      const stats = {
        coinbase: {
          balance: this.coinbaseBalance,
          totalTrades: this.learningData.totalTrades,
          wins: this.learningData.wins,
          losses: this.learningData.losses,
          buys: this.positions.filter(p => p.platform === 'crypto' && p.side === 'long').length,
          sells: this.positions.filter(p => p.platform === 'crypto' && p.side === 'short').length,
          totalPnL: this.dailyPnL + cryptoPnL,
          winRate: this.learningData.totalTrades > 0 ? (this.learningData.wins / this.learningData.totalTrades * 100) : 0,
          openPositions: cryptoPositions.length,
        },
        kalshi: {
          balance: this.kalshiBalance,
          totalTrades: this.kalshiOpenBets,
          wins: 0,
          losses: 0,
          buys: this.kalshiOpenBets,
          sells: 0,
          totalPnL: kalshiPnL,
          winRate: 0,
          openPositions: this.kalshiOpenBets,
        },
        combined: {
          totalBalance: this.coinbaseBalance + this.kalshiBalance,
          totalTrades: this.learningData.totalTrades + this.kalshiOpenBets,
          totalPnL: this.dailyPnL + cryptoPnL + kalshiPnL,
          totalWins: this.learningData.wins,
          totalLosses: this.learningData.losses,
          overallWinRate: this.learningData.totalTrades > 0 ? (this.learningData.wins / this.learningData.totalTrades * 100) : 0,
        },
      };

      await dashboardReporter.reportStats(stats as any);
    } catch (e) {
      // Silent fail - don't disrupt trading
    }
  }

  async exportKalshiPicks(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Export current Kalshi predictions for prognostication.com
      const picksFile = path.join(process.cwd(), '.kalshi-picks.json');
      const kalshiPicks = this.lastKalshiPredictions || [];

      const exportData = {
        picks: kalshiPicks,
        timestamp: new Date().toISOString(),
        totalPicks: kalshiPicks.length,
        categories: [...new Set(kalshiPicks.map((p: any) => p.category))],
      };

      fs.writeFileSync(picksFile, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (e) {
      // Silent fail
    }
  }

  displayStatus(): void {
    // Push to dashboard first
    this.pushToDashboard().catch(() => {});

    const openPositions = this.positions.length;
    const totalPnL = this.positions.reduce((sum, p) => sum + p.pnl, 0);
    const openFees = this.positions.reduce((sum, p) => sum + (p.totalFees || 0), 0);
    const winRate = this.learningData.totalTrades > 0
      ? (this.learningData.wins / this.learningData.totalTrades * 100)
      : 0;

    const pnlStr = this.dailyPnL >= 0 ? `${c.brightGreen}+$${this.dailyPnL.toFixed(2)}${c.reset}` : `${c.brightRed}-$${Math.abs(this.dailyPnL).toFixed(2)}${c.reset}`;
    const unrealizedStr = totalPnL >= 0 ? `${c.brightGreen}+$${totalPnL.toFixed(2)}${c.reset}` : `${c.brightRed}-$${Math.abs(totalPnL).toFixed(2)}${c.reset}`;
    const winRateStr = winRate >= 50 ? `${c.brightGreen}${winRate.toFixed(1)}%${c.reset}` : winRate >= 40 ? `${c.yellow}${winRate.toFixed(1)}%${c.reset}` : `${c.brightRed}${winRate.toFixed(1)}%${c.reset}`;
    const feesStr = `${c.brightRed}-$${this.totalFeesPaid.toFixed(2)}${c.reset}`;

    this.checkAndResetDailySpending(); // Ensure daily counter is current
    const cryptoPositions = this.positions.filter(p => p.platform === 'crypto').length;
    const cryptoPnL = this.positions.filter(p => p.platform === 'crypto').reduce((sum, p) => sum + p.pnl, 0);
    const kalshiPnL = this.positions.filter(p => p.platform === 'kalshi').reduce((sum, p) => sum + p.pnl, 0);
    const remainingSpending = CONFIG.dailySpendingLimit - this.dailySpending;
    const spendingStr = this.dailySpending >= CONFIG.dailySpendingLimit * 0.9
      ? `${color.error('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)} ${color.warning('(LIMIT!)')}`
      : `${color.money('$' + this.dailySpending.toFixed(2))} / ${color.money('$' + CONFIG.dailySpendingLimit)} ${c.dim}(${color.money('$' + remainingSpending.toFixed(2))} left)${c.reset}`;

    console.log(`
${c.brightCyan}╭────────────────────────────────────────────────────────╮${c.reset}
${c.brightCyan}│${c.reset}  ${c.brightWhite}💰 SESSION${c.reset}                                           ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}     ${c.dim}Realized P&L:${c.reset}  ${pnlStr}                             ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}     ${c.dim}Unrealized:${c.reset}    ${unrealizedStr}                             ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}     ${c.dim}Fees Paid:${c.reset}     ${feesStr}                             ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}     ${c.dim}Daily Spending:${c.reset} ${spendingStr}                    ${c.brightCyan}│${c.reset}
${c.brightCyan}├────────────────────────────────────────────────────────┤${c.reset}
${c.brightCyan}│${c.reset}  ${c.brightYellow}📊 CRYPTO${c.reset}: ${c.brightWhite}${cryptoPositions}${c.reset} positions ${cryptoPnL !== 0 ? `(${cryptoPnL >= 0 ? color.success('+' + cryptoPnL.toFixed(2)) : color.error(cryptoPnL.toFixed(2))})` : ''}              ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}  ${c.brightMagenta}🎯 KALSHI${c.reset}: ${c.brightWhite}${this.kalshiOpenBets}${c.reset} bets ${kalshiPnL !== 0 ? `(${kalshiPnL >= 0 ? color.success('+' + kalshiPnL.toFixed(2)) : color.error(kalshiPnL.toFixed(2))})` : ''}              ${c.brightCyan}│${c.reset}
${c.brightCyan}│${c.reset}  ${c.brightWhite}📈 WIN RATE${c.reset}: ${winRateStr}                             ${c.brightCyan}│${c.reset}
${c.brightCyan}╰────────────────────────────────────────────────────────╯${c.reset}`);
  }

  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down gracefully...');

    // Stop bot manager
    if (this.botManager) {
      await this.botManager.stop();
    }

    // Close all positions
    if (this.positions.length > 0) {
      console.log(`   Closing ${this.positions.length} open positions...`);
      for (const position of [...this.positions]) {
        await this.closePosition(position, 'shutdown');
      }
    }

    // Final stats
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              📊 SESSION SUMMARY 📊                           ║
╠══════════════════════════════════════════════════════════════╣
║  Duration: ${this.formatDuration(Date.now() - this.sessionStartTime.getTime())}
║  Total Trades: ${this.learningData.totalTrades}
║  Wins: ${this.learningData.wins} | Losses: ${this.learningData.losses}
║  Win Rate: ${this.learningData.totalTrades > 0 ? (this.learningData.wins / this.learningData.totalTrades * 100).toFixed(1) : 0}%
║  Session P&L: ${this.dailyPnL >= 0 ? '+' : ''}$${this.dailyPnL.toFixed(2)}
╚══════════════════════════════════════════════════════════════╝
    `);

    process.exit(0);
  }

  formatDuration(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// MAIN
// ============================================================================

const trader = new LiveTrader24_7();
trader.start().catch(console.error);


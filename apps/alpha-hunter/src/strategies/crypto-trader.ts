/**
 * Crypto Trader
 * Smart crypto trading strategies using exchange integrations
 * Runs on Coinbase, Crypto.com, and Binance
 */

import { ExchangeManager } from '../exchanges/exchange-manager';
import { Opportunity, Trade, LearningData } from '../types';
import { tradeLimiter } from '../lib/trade-limiter';
import { smsAlerter } from '../lib/sms-alerter';
import { emergencyStop } from '../lib/emergency-stop';
import { beeper } from '../lib/beep';

interface CryptoSignal {
  symbol: 'BTC' | 'ETH' | 'SOL';
  direction: 'long' | 'short';
  confidence: number;
  reasoning: string[];
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

interface StrategyConfig {
  maxTradeSize: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxDailyTrades: number;
  minConfidence: number;
  enabledStrategies: string[];
}

export class CryptoTrader {
  private exchanges: ExchangeManager;
  private config: StrategyConfig;
  private dailyTrades: number = 0;
  private dailyPnL: number = 0;

  constructor() {
    this.exchanges = new ExchangeManager();

    this.config = {
      maxTradeSize: parseFloat(process.env.CRYPTO_MAX_TRADE_SIZE || '50'),
      takeProfitPercent: parseFloat(process.env.CRYPTO_TAKE_PROFIT || '5'),
      stopLossPercent: parseFloat(process.env.CRYPTO_STOP_LOSS || '3'),
      maxDailyTrades: parseInt(process.env.CRYPTO_MAX_DAILY_TRADES || '5'),
      minConfidence: parseFloat(process.env.CRYPTO_MIN_CONFIDENCE || '65'),
      enabledStrategies: (process.env.CRYPTO_STRATEGIES || 'mean_reversion,momentum,breakout').split(','),
    };
  }

  /**
   * Generate trading signals based on enabled strategies
   */
  async generateSignals(): Promise<CryptoSignal[]> {
    const signals: CryptoSignal[] = [];

    for (const crypto of ['BTC', 'ETH', 'SOL'] as const) {
      // Get market data
      const prices = await this.exchanges.comparePrices(crypto);
      if (!prices.bestPrice) continue;

      // Run enabled strategies
      if (this.config.enabledStrategies.includes('mean_reversion')) {
        const mrSignal = await this.meanReversionStrategy(crypto, prices.bestPrice);
        if (mrSignal) signals.push(mrSignal);
      }

      if (this.config.enabledStrategies.includes('momentum')) {
        const momSignal = await this.momentumStrategy(crypto, prices.bestPrice);
        if (momSignal) signals.push(momSignal);
      }

      if (this.config.enabledStrategies.includes('breakout')) {
        const boSignal = await this.breakoutStrategy(crypto, prices.bestPrice);
        if (boSignal) signals.push(boSignal);
      }
    }

    // Filter by minimum confidence
    return signals
      .filter(s => s.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Mean Reversion Strategy
   * Trade against extreme moves expecting reversion
   */
  private async meanReversionStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Get real 24h price change from candles
    let change24h: number;
    try {
      const candles = await this.exchanges.getCoinbase().getCandles(`${symbol}-USD`, 3600); // 1h candles
      if (candles.length >= 24) {
        const price24hAgo = candles[candles.length - 24].close;
        change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      } else if (candles.length >= 2) {
        const oldest = candles[0].close;
        change24h = ((currentPrice - oldest) / oldest) * 100;
      } else {
        return null; // Not enough data
      }
    } catch {
      return null; // Can't get candle data
    }

    // Strong move = potential reversion opportunity
    if (Math.abs(change24h) < 2) return null;

    const direction = change24h > 0 ? 'short' : 'long';
    const confidence = Math.min(50 + Math.abs(change24h) * 3, 80);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} moved ${change24h.toFixed(1)}% in 24h`,
        `Mean reversion expected after ${Math.abs(change24h).toFixed(1)}% move`,
        `Historical reversion rate: ~70% (mean reversion after ${Math.abs(change24h) >= 5 ? 'large' : 'moderate'} moves)`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long'
        ? currentPrice * (1 + Math.abs(change24h) * 0.003)
        : currentPrice * (1 - Math.abs(change24h) * 0.003),
      stopLoss: direction === 'long'
        ? currentPrice * 0.97
        : currentPrice * 1.03,
    };
  }

  /**
   * Momentum Strategy
   * Ride strong trends using real candle data
   */
  private async momentumStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Use real 1h candles to detect trend
    let candles: { close: number }[];
    try {
      candles = await this.exchanges.getCoinbase().getCandles(`${symbol}-USD`, 3600);
      if (candles.length < 12) return null;
    } catch {
      return null;
    }

    // Check last 12 hours: count consecutive up/down closes
    const recent = candles.slice(-12);
    let upCount = 0, downCount = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].close > recent[i - 1].close) upCount++;
      else downCount++;
    }

    const totalMoves = upCount + downCount;
    if (totalMoves === 0) return null;
    const trendRatio = Math.max(upCount, downCount) / totalMoves;
    if (trendRatio < 0.7) return null; // Need 70%+ directional consistency

    const direction: 'long' | 'short' = upCount > downCount ? 'long' : 'short';
    const strength = trendRatio * 100;
    const pctMove = ((recent[recent.length - 1].close - recent[0].close) / recent[0].close) * 100;

    // Only signal if move is meaningful (>1%)
    if (Math.abs(pctMove) < 1) return null;

    const confidence = Math.min(50 + strength * 0.3, 78);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} trending ${direction.toUpperCase()} — ${Math.abs(pctMove).toFixed(1)}% over 12h`,
        `Directional consistency: ${(trendRatio * 100).toFixed(0)}% (${upCount}up/${downCount}down)`,
        `Momentum play at $${currentPrice.toFixed(2)}`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long'
        ? currentPrice * (1 + this.config.takeProfitPercent / 100)
        : currentPrice * (1 - this.config.takeProfitPercent / 100),
      stopLoss: direction === 'long'
        ? currentPrice * (1 - this.config.stopLossPercent / 100)
        : currentPrice * (1 + this.config.stopLossPercent / 100),
    };
  }

  /**
   * Breakout Strategy
   * Trade breakouts from consolidation using real candle data
   */
  private async breakoutStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    // Use real 1h candles to detect breakout from recent range
    let candles: { close: number; high: number; low: number }[];
    try {
      candles = await this.exchanges.getCoinbase().getCandles(`${symbol}-USD`, 3600);
      if (candles.length < 24) return null;
    } catch {
      return null;
    }

    // Calculate 24h range (exclude last 2 candles = "breakout" period)
    const rangeCandles = candles.slice(-26, -2);
    if (rangeCandles.length < 20) return null;
    const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
    const rangeLow = Math.min(...rangeCandles.map(c => c.low));
    const rangeWidth = ((rangeHigh - rangeLow) / rangeLow) * 100;

    // Only look for breakouts from tight ranges (< 3% consolidation)
    if (rangeWidth > 3 || rangeWidth < 0.5) return null;

    let direction: 'long' | 'short';
    let level: number;
    if (currentPrice > rangeHigh * 1.002) {
      direction = 'long';
      level = rangeHigh;
    } else if (currentPrice < rangeLow * 0.998) {
      direction = 'short';
      level = rangeLow;
    } else {
      return null; // No breakout
    }

    const breakoutPct = direction === 'long'
      ? ((currentPrice - rangeHigh) / rangeHigh) * 100
      : ((rangeLow - currentPrice) / rangeLow) * 100;

    const confidence = Math.min(55 + breakoutPct * 10, 75);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} broke ${direction === 'long' ? 'above' : 'below'} $${level.toFixed(2)} (${rangeWidth.toFixed(1)}% range)`,
        `Breakout magnitude: ${breakoutPct.toFixed(2)}%`,
        `24h consolidation range: $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)}`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long'
        ? currentPrice * 1.04
        : currentPrice * 0.96,
      stopLoss: direction === 'long'
        ? level * 0.995
        : level * 1.005,
    };
  }

  /**
   * Execute the best signal
   */
  async executeBestSignal(): Promise<Trade | null> {
    // Check emergency stop
    const emergencyCheck = emergencyStop.canTrade();
    if (!emergencyCheck.allowed) {
      console.log(`🛑 Emergency stop active: ${emergencyCheck.reason}`);
      return null;
    }

    // Check persistent daily limit
    const limitCheck = tradeLimiter.canTrade(this.config.maxTradeSize, 'crypto');
    if (!limitCheck.allowed) {
      console.log(`⏸️ ${limitCheck.reason}`);
      return null;
    }

    // Generate signals
    const signals = await this.generateSignals();
    if (signals.length === 0) {
      console.log('⏳ No high-confidence signals found');
      return null;
    }

    const best = signals[0];
    console.log(`\n🎯 Best Signal: ${best.symbol} ${best.direction.toUpperCase()}`);
    console.log(`   Confidence: ${best.confidence}%`);
    best.reasoning.forEach(r => console.log(`   • ${r}`));

    // Check spending limit before trade
    const stats = tradeLimiter.getStats();
    const canAfford = await emergencyStop.checkSpendingLimit(
      stats.totalSpent,
      this.config.maxTradeSize
    );
    if (!canAfford) {
      console.log('🛑 Trade blocked by emergency stop');
      return null;
    }

    // BEEP AND ALERT BEFORE EXECUTING TRADE
    await beeper.tradeExecuted();
    await smsAlerter.tradeExecuted(
      best.symbol,
      this.config.maxTradeSize,
      best.direction === 'long' ? 'BUY' : 'SELL',
      'Coinbase'
    );

    // Execute trade
    const result = await this.exchanges.smartTrade(
      best.symbol,
      best.direction === 'long' ? 'buy' : 'sell',
      this.config.maxTradeSize
    );

    if (!result.success) {
      console.log(`❌ Trade failed: ${result.error}`);
      return null;
    }

    // Record trade in persistent counter
    tradeLimiter.recordTrade(best.symbol, result.amount, 'crypto');
    this.dailyTrades++;

    return {
      id: result.orderId,
      opportunityId: `crypto_${best.symbol}_${Date.now()}`,
      type: 'crypto',
      platform: result.exchange,
      amount: result.amount,
      target: `${best.symbol} ${best.direction}`,
      entryPrice: result.price,
      status: 'active',
      profit: 0,
      reasoning: best.reasoning.join('; '),
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert signals to opportunities for Alpha Hunter
   */
  async getOpportunities(): Promise<Opportunity[]> {
    const signals = await this.generateSignals();
    const balances = await this.exchanges.getTotalBalance();

    return signals.map(signal => ({
      id: `crypto_${signal.symbol}_${signal.direction}_${Date.now()}`,
      type: 'crypto' as const,
      source: 'Crypto Trader',
      title: `${signal.symbol} ${signal.direction.toUpperCase()}`,
      description: signal.reasoning[0],
      confidence: signal.confidence,
      expectedValue: signal.direction === 'long'
        ? this.config.takeProfitPercent
        : this.config.takeProfitPercent,
      riskLevel: signal.confidence >= 70 ? 'medium' : 'high' as const,
      timeframe: '24-48 hours',
      requiredCapital: Math.min(this.config.maxTradeSize, balances.totalUSD * 0.1),
      potentialReturn: this.config.maxTradeSize * (1 + this.config.takeProfitPercent / 100),
      reasoning: signal.reasoning,
      dataPoints: [{
        source: 'Exchange Manager',
        metric: 'Entry Price',
        value: signal.entryPrice || 0,
        relevance: 100,
        timestamp: new Date().toISOString(),
      }],
      action: {
        platform: 'crypto_exchange' as const,
        actionType: signal.direction === 'long' ? 'buy' : 'sell' as const,
        amount: this.config.maxTradeSize,
        target: signal.symbol,
        instructions: [
          `${signal.direction === 'long' ? 'BUY' : 'SELL'} ${signal.symbol}`,
          `Entry: $${(signal.entryPrice || 0).toFixed(2)}`,
          `Target: $${(signal.targetPrice || 0).toFixed(2)} (+${this.config.takeProfitPercent}%)`,
          `Stop: $${(signal.stopLoss || 0).toFixed(2)} (-${this.config.stopLossPercent}%)`,
        ],
        autoExecute: signal.confidence >= 70,
      },
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    }));
  }

  /**
   * Get status summary
   */
  async getStatus(): Promise<string> {
    const exchangeStatus = await this.exchanges.getStatus();
    const signals = await this.generateSignals();
    const stats = tradeLimiter.getStats();
    const emergencyState = emergencyStop.getState();

    let status = exchangeStatus;
    status += '\n╔═══════════════════════════════════════════════╗\n';
    status += '║            📊 CRYPTO TRADER STATUS            ║\n';
    status += '╠═══════════════════════════════════════════════╣\n';
    status += `║  Daily Trades: ${stats.tradeCount}/${this.config.maxDailyTrades} (${stats.remainingTrades} left)`.padEnd(46) + '║\n';
    status += `║  Daily Spent: $${stats.totalSpent.toFixed(2)}/$${stats.totalSpent + stats.remainingBudget} ($${stats.remainingBudget.toFixed(2)} left)`.padEnd(46) + '║\n';
    status += `║  Daily P&L: ${this.dailyPnL >= 0 ? '+' : ''}$${this.dailyPnL.toFixed(2)}`.padEnd(46) + '║\n';
    status += `║  Emergency Stop: ${emergencyState.stopped ? '🛑 ACTIVE' : '✅ Ready'}`.padEnd(46) + '║\n';
    status += `║  Active Signals: ${signals.length}`.padEnd(46) + '║\n';
    status += '╠═══════════════════════════════════════════════╣\n';

    for (const signal of signals.slice(0, 3)) {
      status += `║  ${signal.symbol} ${signal.direction.toUpperCase().padEnd(5)} ${signal.confidence}% conf`.padEnd(46) + '║\n';
    }

    status += '╚═══════════════════════════════════════════════╝\n';

    return status;
  }

  // Helper methods
  private estimateVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      'BTC': 5,
      'ETH': 7,
      'SOL': 12,
    };
    return volatilities[symbol] || 8;
  }

  resetDailyCounters(): void {
    this.dailyTrades = 0;
    this.dailyPnL = 0;
  }
}


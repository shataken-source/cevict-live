/**
 * Crypto Trader
 * Smart crypto trading strategies using exchange integrations
 * Runs on Coinbase, Crypto.com, and Binance
 */

import { ExchangeManager } from '../exchanges/exchange-manager';
import { RobinhoodExchange } from '../exchanges/robinhood';
import { Opportunity, Trade, LearningData } from '../types';
import { tradeLimiter } from '../lib/trade-limiter';
import { smsAlerter } from '../lib/sms-alerter';
import { emergencyStop } from '../lib/emergency-stop';
import { beeper } from '../lib/beep';

// ── RSI Calculation ──────────────────────────────────────────────────────────
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // Not enough data
  let gainSum = 0, lossSum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  const avgGain = gainSum / period;
  const avgLoss = lossSum / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

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
  private lastTradeTime: Map<string, number> = new Map();
  private readonly TRADE_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown per asset

  constructor() {
    this.exchanges = new ExchangeManager();

    this.config = {
      maxTradeSize: parseFloat(process.env.CRYPTO_MAX_TRADE_SIZE || '50'),
      takeProfitPercent: parseFloat(process.env.CRYPTO_TAKE_PROFIT || '5'),
      stopLossPercent: parseFloat(process.env.CRYPTO_STOP_LOSS || '3'),
      maxDailyTrades: parseInt(process.env.CRYPTO_MAX_DAILY_TRADES || '5'),
      minConfidence: parseFloat(process.env.CRYPTO_MIN_CONFIDENCE || '65'),
      enabledStrategies: (process.env.CRYPTO_STRATEGIES || 'mean_reversion,momentum,breakout,spread').split(','),
    };
  }

  /**
   * Generate trading signals based on enabled strategies
   */
  async generateSignals(): Promise<CryptoSignal[]> {
    const signals: CryptoSignal[] = [];

    for (const crypto of ['BTC', 'ETH', 'SOL'] as const) {
      // Skip asset if recently traded (cooldown)
      const lastTrade = this.lastTradeTime.get(crypto) || 0;
      if (Date.now() - lastTrade < this.TRADE_COOLDOWN_MS) continue;

      // Get market data
      const prices = await this.exchanges.comparePrices(crypto);
      if (!prices.bestPrice) continue;

      // Collect per-asset signals to check for conflicts
      const assetSignals: CryptoSignal[] = [];

      if (this.config.enabledStrategies.includes('mean_reversion')) {
        const mrSignal = await this.meanReversionStrategy(crypto, prices.bestPrice);
        if (mrSignal) assetSignals.push(mrSignal);
      }

      if (this.config.enabledStrategies.includes('momentum')) {
        const momSignal = await this.momentumStrategy(crypto, prices.bestPrice);
        if (momSignal) assetSignals.push(momSignal);
      }

      if (this.config.enabledStrategies.includes('breakout')) {
        const boSignal = await this.breakoutStrategy(crypto, prices.bestPrice);
        if (boSignal) assetSignals.push(boSignal);
      }

      // Spread / market-maker strategy runs independently (always 'long' — buys the dip)
      if (this.config.enabledStrategies.includes('spread')) {
        const spreadSignal = await this.spreadStrategy(crypto, prices.bestPrice);
        if (spreadSignal) assetSignals.push(spreadSignal);
      }

      // Conflict detection: if strategies disagree on direction, skip this asset
      if (assetSignals.length >= 2) {
        const directions = new Set(assetSignals.map(s => s.direction));
        if (directions.size > 1) {
          console.log(`   [SKIP] ${crypto}: conflicting signals (${assetSignals.map(s => s.direction).join(' vs ')})`);
          continue;
        }
        // Agreement bonus: boost confidence when multiple strategies agree
        const best = assetSignals.sort((a, b) => b.confidence - a.confidence)[0];
        best.confidence = Math.min(best.confidence + 5, 85);
        best.reasoning.push(`Signal confirmed by ${assetSignals.length} strategies`);
        signals.push(best);
      } else {
        signals.push(...assetSignals);
      }
    }

    // Filter by minimum confidence
    return signals
      .filter(s => s.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate ALL signals including near-misses (for Robinhood sandbox).
   * Returns { primary: signals above minConfidence, secondChance: signals in 45-minConfidence range }
   */
  async generateAllSignals(): Promise<{ primary: CryptoSignal[]; secondChance: CryptoSignal[] }> {
    const signals: CryptoSignal[] = [];

    for (const crypto of ['BTC', 'ETH', 'SOL'] as const) {
      const lastTrade = this.lastTradeTime.get(crypto) || 0;
      if (Date.now() - lastTrade < this.TRADE_COOLDOWN_MS) continue;

      const prices = await this.exchanges.comparePrices(crypto);
      if (!prices.bestPrice) continue;

      const assetSignals: CryptoSignal[] = [];

      if (this.config.enabledStrategies.includes('mean_reversion')) {
        const mrSignal = await this.meanReversionStrategy(crypto, prices.bestPrice);
        if (mrSignal) assetSignals.push(mrSignal);
      }
      if (this.config.enabledStrategies.includes('momentum')) {
        const momSignal = await this.momentumStrategy(crypto, prices.bestPrice);
        if (momSignal) assetSignals.push(momSignal);
      }
      if (this.config.enabledStrategies.includes('breakout')) {
        const boSignal = await this.breakoutStrategy(crypto, prices.bestPrice);
        if (boSignal) assetSignals.push(boSignal);
      }
      if (this.config.enabledStrategies.includes('spread')) {
        const spreadSignal = await this.spreadStrategy(crypto, prices.bestPrice);
        if (spreadSignal) assetSignals.push(spreadSignal);
      }

      if (assetSignals.length >= 2) {
        const directions = new Set(assetSignals.map(s => s.direction));
        if (directions.size > 1) continue;
        const best = assetSignals.sort((a, b) => b.confidence - a.confidence)[0];
        best.confidence = Math.min(best.confidence + 5, 85);
        best.reasoning.push(`Signal confirmed by ${assetSignals.length} strategies`);
        signals.push(best);
      } else {
        signals.push(...assetSignals);
      }
    }

    const sorted = signals.sort((a, b) => b.confidence - a.confidence);
    const RH_MIN = 45; // minimum confidence for Robinhood sandbox
    return {
      primary: sorted.filter(s => s.confidence >= this.config.minConfidence),
      secondChance: sorted.filter(s => s.confidence >= RH_MIN && s.confidence < this.config.minConfidence),
    };
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
    let candles: { close: number; high: number; low: number; volume: number }[];
    try {
      candles = await this.exchanges.getCoinbase().getCandles(`${symbol}-USD`, 3600) as any; // 1h candles
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

    // Require stronger move to avoid noise (3.5% threshold, was 2%)
    if (Math.abs(change24h) < 3.5) return null;

    // RSI-like filter: count recent candles going against the move (signs of exhaustion)
    const recentCandles = candles.slice(-6);
    let reversalCandles = 0;
    for (let i = 1; i < recentCandles.length; i++) {
      if (change24h > 0 && recentCandles[i].close < recentCandles[i - 1].close) reversalCandles++;
      if (change24h < 0 && recentCandles[i].close > recentCandles[i - 1].close) reversalCandles++;
    }
    // Need at least 2 reversal candles in last 6 to confirm exhaustion
    if (reversalCandles < 2) return null;

    // RSI filter: confirm mean reversion setup
    const closes = candles.map(c => c.close);
    const rsi = calculateRSI(closes, 14);
    // For long (buying dip): RSI should be < 40 (oversold territory)
    // For short (selling top): RSI should be > 60 (overbought territory)
    if (change24h > 0 && rsi < 60) return null; // Not overbought enough to short
    if (change24h < 0 && rsi > 40) return null; // Not oversold enough to buy

    const direction = change24h > 0 ? 'short' : 'long';
    const rsiBonus = direction === 'long' ? Math.max(0, (40 - rsi) * 0.3) : Math.max(0, (rsi - 60) * 0.3);
    const confidence = Math.min(55 + Math.abs(change24h) * 2.5 + reversalCandles * 3 + rsiBonus, 82);

    return {
      symbol,
      direction,
      confidence,
      reasoning: [
        `${symbol} moved ${change24h.toFixed(1)}% in 24h`,
        `Mean reversion expected — ${reversalCandles}/5 recent candles show exhaustion`,
        `Historical reversion rate: ~70% after ${Math.abs(change24h) >= 5 ? 'large' : 'moderate'} moves`,
      ],
      entryPrice: currentPrice,
      targetPrice: direction === 'long'
        ? currentPrice * (1 + Math.abs(change24h) * 0.004)
        : currentPrice * (1 - Math.abs(change24h) * 0.004),
      stopLoss: direction === 'long'
        ? currentPrice * 0.98
        : currentPrice * 1.02,
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
    if (trendRatio < 0.75) return null; // Need 75%+ directional consistency (was 70%)

    const direction: 'long' | 'short' = upCount > downCount ? 'long' : 'short';
    const strength = trendRatio * 100;
    const pctMove = ((recent[recent.length - 1].close - recent[0].close) / recent[0].close) * 100;

    // Only signal if move is meaningful (>2%, was 1%)
    if (Math.abs(pctMove) < 2) return null;

    // Volume check: ensure recent candles have increasing volume (trend confirmation)
    let volIncreasing = 0;
    for (let i = Math.max(1, recent.length - 4); i < recent.length; i++) {
      if ((recent[i] as any).volume > (recent[i - 1] as any).volume) volIncreasing++;
    }
    if (volIncreasing < 2) return null; // Need volume expanding with trend

    // RSI filter: avoid chasing exhausted trends
    const closes = candles.map(c => c.close);
    const rsi = calculateRSI(closes, 14);
    if (direction === 'long' && rsi > 75) return null;  // Too overbought to chase
    if (direction === 'short' && rsi < 25) return null;  // Too oversold to chase

    const confidence = Math.min(52 + strength * 0.3 + volIncreasing * 2, 80);

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
    if (currentPrice > rangeHigh * 1.003) {
      direction = 'long';
      level = rangeHigh;
    } else if (currentPrice < rangeLow * 0.997) {
      direction = 'short';
      level = rangeLow;
    } else {
      return null; // No breakout (widened threshold from 0.2% to 0.3%)
    }

    // Volume confirmation: breakout candles should have higher volume than range average
    const rangeAvgVol = rangeCandles.reduce((s, c) => s + ((c as any).volume || 0), 0) / rangeCandles.length;
    const breakoutCandles = candles.slice(-2);
    const breakoutAvgVol = breakoutCandles.reduce((s, c) => s + ((c as any).volume || 0), 0) / breakoutCandles.length;
    const volMultiple = rangeAvgVol > 0 ? breakoutAvgVol / rangeAvgVol : 1;
    if (volMultiple < 1.3) return null; // Need 30%+ more volume on breakout

    const breakoutPct = direction === 'long'
      ? ((currentPrice - rangeHigh) / rangeHigh) * 100
      : ((rangeLow - currentPrice) / rangeLow) * 100;

    const confidence = Math.min(55 + breakoutPct * 8 + (volMultiple - 1) * 15, 78);

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
   * Spread / Market-Maker Strategy
   * Like Kalshi's market-maker: capture the bid-ask spread by placing limit orders.
   * Buys slightly below mid-price when spread is wide enough to cover fees.
   * Coinbase taker fee = 0.6%, maker fee = 0.4%. Need spread > 1% to profit.
   */
  private async spreadStrategy(
    symbol: 'BTC' | 'ETH' | 'SOL',
    currentPrice: number
  ): Promise<CryptoSignal | null> {
    try {
      const cb = this.exchanges.getCoinbase();
      const pair = `${symbol}-USD`;
      const ticker = await cb.getTicker(pair);

      // Calculate spread as percentage of price
      const bid = ticker.bid;
      const ask = ticker.ask;
      if (bid <= 0 || ask <= 0 || ask <= bid) return null;

      const spreadPct = ((ask - bid) / bid) * 100;
      const midPrice = (bid + ask) / 2;

      // Round-trip fees: 0.4% maker (entry) + 0.6% taker (exit) = 1.0% minimum
      // Need spread > 1.0% to profit. Use 1.2% for safety margin.
      if (spreadPct < 1.2) return null;

      // Check recent candles: only buy if price is near support (not falling knife)
      const candles = await cb.getCandles(pair, 300); // 5-min candles
      if (candles.length < 12) return null;

      // Check if price is near recent low (within 0.5%) — good entry for spread capture
      const recent12 = candles.slice(-12);
      const recentLow = Math.min(...recent12.map(c => c.low));
      const recentHigh = Math.max(...recent12.map(c => c.high));
      const range = recentHigh - recentLow;
      if (range <= 0) return null;

      // Price position in range: 0 = at low, 1 = at high
      const positionInRange = (currentPrice - recentLow) / range;

      // Only signal buy if price is in lower 40% of recent range (buying the dip)
      if (positionInRange > 0.4) return null;

      // Volume check: need decent volume for spread capture to work
      const avgVolume = recent12.reduce((s, c) => s + c.volume, 0) / recent12.length;
      const currentVolume = recent12[recent12.length - 1].volume;
      if (currentVolume < avgVolume * 0.5) return null; // Below-average volume = wide spreads unreliable

      // Confidence based on spread width and position in range
      const spreadBonus = Math.min(spreadPct * 20, 10); // Up to +10 for wide spread
      const positionBonus = (1 - positionInRange) * 10; // Up to +10 for being at the low
      const confidence = Math.min(58 + spreadBonus + positionBonus, 80);

      // Entry at bid price (limit order), target at ask price
      return {
        symbol,
        direction: 'long',
        confidence,
        reasoning: [
          `${symbol} spread: ${spreadPct.toFixed(3)}% ($${bid.toFixed(2)} / $${ask.toFixed(2)})`,
          `Price in lower ${(positionInRange * 100).toFixed(0)}% of 1h range — good entry`,
          `Market-maker style: buy at bid, target mid-price for ${(spreadPct / 2).toFixed(3)}% edge`,
        ],
        entryPrice: bid, // Enter at bid via limit order
        targetPrice: midPrice, // Target the mid-price
        stopLoss: bid * 0.995, // Tight stop: 0.5% below bid
      };
    } catch {
      return null;
    }
  }

  /**
   * Execute the best signal
   */
  async executeBestSignal(): Promise<Trade | null> {
    // Check emergency stop
    const emergencyCheck = emergencyStop.canTrade();
    if (!emergencyCheck.allowed) {
      console.log(`[STOP] Emergency stop active: ${emergencyCheck.reason}`);
      return null;
    }

    // Check persistent daily limit
    const limitCheck = tradeLimiter.canTrade(this.config.maxTradeSize, 'crypto');
    if (!limitCheck.allowed) {
      console.log(`[LIMIT] ${limitCheck.reason}`);
      return null;
    }

    // Generate signals
    const signals = await this.generateSignals();
    if (signals.length === 0) {
      console.log('No high-confidence signals found');
      return null;
    }

    const best = signals[0];
    console.log(`\nBest Signal: ${best.symbol} ${best.direction.toUpperCase()}`);
    console.log(`   Confidence: ${best.confidence}%`);
    best.reasoning.forEach(r => console.log(`   • ${r}`));

    // Check spending limit before trade (crypto spent only)
    const stats = tradeLimiter.getStats();
    const cryptoSpent = stats.platformSpent?.crypto ?? stats.totalSpent;
    const canAfford = await emergencyStop.checkSpendingLimit(
      cryptoSpent,
      this.config.maxTradeSize
    );
    if (!canAfford) {
      console.log('[STOP] Trade blocked by emergency stop');
      return null;
    }

    // For sell signals, verify we actually hold the asset before trying
    if (best.direction === 'short') {
      try {
        const balances = await this.exchanges.getTotalBalance();
        const cbBal = balances.byExchange.find(b => b.exchange === 'Coinbase');
        const held = best.symbol === 'BTC' ? cbBal?.btc
          : best.symbol === 'ETH' ? cbBal?.eth
            : (cbBal?.other?.[best.symbol] ?? 0);
        const price = (await this.exchanges.comparePrices(best.symbol)).bestPrice;
        const heldUsd = (held || 0) * price;
        if (heldUsd < 5) {
          console.log(`[SKIP] Sell ${best.symbol}: only $${heldUsd.toFixed(2)} held (need $5+)`);
          return null;
        }
      } catch (err) {
        console.log(`[WARN] Could not check ${best.symbol} holdings, skipping sell`);
        return null;
      }
    }

    // Execute trade
    const result = await this.exchanges.smartTrade(
      best.symbol,
      best.direction === 'long' ? 'buy' : 'sell',
      this.config.maxTradeSize
    );

    if (!result.success) {
      console.log(`[ERR] Trade failed: ${result.error}`);
      return null;
    }

    // Record cooldown for this asset
    this.lastTradeTime.set(best.symbol, Date.now());

    // BEEP AND ALERT AFTER successful trade (not before — avoids false alerts on INSUFFICIENT_FUND etc.)
    await beeper.tradeExecuted();
    await smsAlerter.tradeExecuted(
      best.symbol,
      this.config.maxTradeSize,
      best.direction === 'long' ? 'BUY' : 'SELL',
      'Coinbase'
    );

    // Record trade in persistent counter
    tradeLimiter.recordTrade(best.symbol, result.amount, 'crypto');
    this.dailyTrades++;

    // Record to Supabase alpha_hunter_trades
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey) {
        const sb = createClient(sbUrl, sbKey);
        await sb.from('alpha_hunter_trades').insert({
          pair: `${best.symbol}-USD`,
          side: best.direction === 'long' ? 'buy' : 'sell',
          amount: result.amount,
          price: result.price,
          platform: 'coinbase',
          confidence: best.confidence,
          reasoning: best.reasoning.join('; '),
          opened_at: new Date().toISOString(),
          closed: false,
          sandbox: false,
        });
      }
    } catch { /* non-fatal */ }

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
        autoExecute: signal.confidence >= this.config.minConfidence,
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
    const cryptoSpent = stats.platformSpent?.crypto ?? stats.totalSpent;
    status += `║  Daily Spent: $${cryptoSpent.toFixed(2)}/$${cryptoSpent + stats.remainingBudget} ($${stats.remainingBudget.toFixed(2)} left)`.padEnd(46) + '║\n';
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

  // ── Robinhood Second-Chance Sandbox ──────────────────────────────────────

  /**
   * Execute near-miss signals on Robinhood as a live sandbox.
   * Smaller position sizes ($10-25 vs $50 on Coinbase), buy-only for safety.
   * Returns number of trades executed.
   */
  async executeSecondChanceOnRobinhood(): Promise<{ executed: number; logs: string[] }> {
    const rh = new RobinhoodExchange();
    if (!rh.isConfigured()) return { executed: 0, logs: ['Robinhood not configured'] };

    const logs: string[] = [];
    const RH_MAX_TRADE = parseFloat(process.env.RH_MAX_TRADE || '15');
    const RH_MAX_DAILY_TRADES = parseInt(process.env.RH_MAX_DAILY_TRADES || '3', 10);

    const { secondChance } = await this.generateAllSignals();
    if (secondChance.length === 0) {
      logs.push('[RH] No second-chance signals this cycle');
      return { executed: 0, logs };
    }

    logs.push(`[RH] ${secondChance.length} second-chance signal(s): ${secondChance.map(s => `${s.symbol} ${s.direction} ${s.confidence}%`).join(', ')}`);

    // Check how many RH trades today (from Supabase)
    let rhTradesToday = 0;
    try {
      const { createClient } = require('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const sb = createClient(url, key);
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date());
        const { data } = await sb.from('alpha_hunter_trades')
          .select('id')
          .eq('platform', 'robinhood')
          .gte('opened_at', `${today}T00:00:00`);
        rhTradesToday = (data || []).length;
      }
    } catch { /* ignore */ }

    if (rhTradesToday >= RH_MAX_DAILY_TRADES) {
      logs.push(`[RH] Daily limit reached (${rhTradesToday}/${RH_MAX_DAILY_TRADES})`);
      return { executed: 0, logs };
    }

    let executed = 0;

    for (const signal of secondChance) {
      if (executed + rhTradesToday >= RH_MAX_DAILY_TRADES) break;

      // Sandbox safety: buy-only (no shorts on Robinhood sandbox)
      if (signal.direction === 'short') {
        logs.push(`[RH] Skip ${signal.symbol} short — sandbox is buy-only`);
        continue;
      }

      // Scale position by confidence: 45% conf → $10, 64% conf → $25
      const confPct = (signal.confidence - 45) / (this.config.minConfidence - 45);
      const tradeSize = Math.max(10, Math.min(RH_MAX_TRADE, Math.round(10 + confPct * 15)));

      const symbol = `${signal.symbol}-USD`;
      // Check if Robinhood supports this pair
      try {
        const pairs = await rh.getTradingPairs([symbol]);
        const pair = (pairs || []).find((p: any) => p.symbol === symbol && p.status === 'tradable');
        if (!pair) {
          logs.push(`[RH] ${symbol} not tradable on Robinhood`);
          continue;
        }
      } catch {
        logs.push(`[RH] Could not check ${symbol} tradability`);
        continue;
      }

      try {
        const order = await rh.marketBuy(symbol, tradeSize);
        const ok = order.state === 'filled' || order.state === 'confirmed' || order.state === 'queued' || order.state === 'open';
        if (ok) {
          executed++;
          logs.push(`[RH] ✅ ${symbol} BUY $${tradeSize} (conf ${signal.confidence}%, order ${order.id})`);

          // Record to Supabase alpha_hunter_trades
          try {
            const { createClient } = require('@supabase/supabase-js');
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (url && key) {
              const sb = createClient(url, key);
              await sb.from('alpha_hunter_trades').insert({
                pair: symbol,
                side: 'buy',
                amount: tradeSize,
                price: parseFloat(order.average_price || '0'),
                platform: 'robinhood',
                confidence: signal.confidence,
                reasoning: signal.reasoning.join('; '),
                opened_at: new Date().toISOString(),
                closed: false,
                sandbox: true,
              });
            }
          } catch { /* non-fatal */ }

          await smsAlerter.tradeExecuted(signal.symbol, tradeSize, 'BUY', 'Robinhood (sandbox)');
        } else {
          logs.push(`[RH] ❌ ${symbol} order state: ${order.state}`);
        }
      } catch (err: any) {
        logs.push(`[RH] ❌ ${symbol} error: ${err.message}`);
      }
    }

    return { executed, logs };
  }
}


/**
 * Alpha Hunter — Main Entry Point
 *
 * Orchestrates all trading subsystems:
 *   - Kalshi prediction market trading (via AIBrain + KalshiTrader)
 *   - Crypto trading (via CryptoTrader)
 *   - Progno sports pick execution (via PrognoIntegration)
 *   - News scanning, fund management, SMS alerts
 *
 * Scripts:
 *   npm run dev   → tsx watch src/index.ts   (hot-reload dev loop)
 *   npm run start → tsx src/index.ts         (production single run)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the alpha-hunter app directory (not repo root)
const alphaRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });

import { AIBrain } from './ai-brain';
import { UnifiedFundManager } from './fund-manager';
import { KalshiTrader, calcNetProfit, MIN_NET_PROFIT } from './intelligence/kalshi-trader';
import { CryptoTrader } from './strategies/crypto-trader';
import { ExchangeManager } from './exchanges/exchange-manager';
import { SMSNotifier } from './sms-notifier';
import { checkSetup, printSetupStatus } from './setup-check';
import { tradeLimiter } from './lib/trade-limiter';
import { recordActualBet } from './lib/supabase-memory';
import { emergencyStop } from './lib/emergency-stop';
import { smsAlerter } from './lib/sms-alerter';
import { beeper } from './lib/beep';

export class TradingBot {
  private brain: AIBrain;
  private funds: UnifiedFundManager;
  private kalshi: KalshiTrader;
  private crypto: CryptoTrader;
  private exchanges: ExchangeManager;
  private sms: SMSNotifier;

  private running = false;
  private executionLock = false;
  private cycleCount = 0;

  // Live balance tracking (refreshed each cycle)
  private kalshiBalance = 0;
  private coinbaseUsd = 0;

  private readonly INTERVAL = parseInt(process.env.ALPHA_CYCLE_SECONDS || '60', 10) * 1000;
  private readonly MAX_SINGLE_TRADE = parseFloat(process.env.MAX_SINGLE_TRADE || '5');
  private readonly PROFIT_TAKE_PCT = parseFloat(process.env.PROFIT_TAKE_PCT || '4');
  private readonly USD_RESERVE = parseFloat(process.env.USD_RESERVE_FLOOR || '50');

  constructor() {
    this.brain = new AIBrain();
    this.funds = new UnifiedFundManager();
    this.kalshi = new KalshiTrader();
    this.crypto = new CryptoTrader();
    this.exchanges = new ExchangeManager();
    this.sms = new SMSNotifier();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`
╔══════════════════════════════════════════════════════════╗
║          🦅 ALPHA HUNTER — UNIFIED TRADING BOT           ║
║  Kalshi • Crypto • Progno Sports • AI Analysis           ║
║  Cycle: ${(this.INTERVAL / 1000).toFixed(0)}s | Max Trade: $${this.MAX_SINGLE_TRADE} | Reserve: $${this.USD_RESERVE}          ║
╚══════════════════════════════════════════════════════════╝
`);

    // Validate environment
    const setup = checkSetup();
    if (!setup.ok) {
      printSetupStatus();
      return;
    }
    console.log('✅ Environment validated\n');

    // Auth probe for Kalshi
    const auth = await this.kalshi.probeAuth();
    if (auth.ok) {
      console.log(`✅ Kalshi authenticated (balance: $${(auth as any).balanceUsd?.toFixed(2) ?? '?'})`);
    } else {
      console.warn(`⚠️  Kalshi auth failed: ${(auth as any).message || 'unknown'} — Kalshi trading disabled`);
    }

    // Hydrate fund manager
    await this.funds.ready;
    console.log('✅ Fund manager ready\n');

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n🛑 Graceful shutdown...');
      this.running = false;
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Main loop
    while (this.running) {
      if (!this.executionLock) {
        this.executionLock = true;
        try {
          await this.cycle();
        } catch (err) {
          console.error('❌ Cycle error:', (err as Error).message);
        }
        this.executionLock = false;
      }
      await this.sleep(this.INTERVAL);
    }

    console.log('👋 Alpha Hunter stopped.');
  }

  /**
   * Profit-taking: check held crypto positions and sell any that are profitable.
   * This replenishes USD for new buys and Kalshi bets.
   */
  private async profitTake(): Promise<number> {
    let totalSold = 0;
    try {
      const cb = this.exchanges.getCoinbase();
      if (!cb.isConfigured()) return 0;

      const portfolio = await cb.getPortfolio();
      const tradeableAssets = ['BTC', 'ETH', 'SOL'];

      for (const pos of portfolio.positions) {
        if (pos.staked || !tradeableAssets.includes(pos.symbol) || pos.value < 10) continue;

        // Get current price and compare to 24h candle data for profit estimate
        const pair = `${pos.symbol}-USD`;
        try {
          const candles = await cb.getCandles(pair, 3600); // 1h candles
          if (candles.length < 24) continue;

          const price24hAgo = candles[candles.length - 24].close;
          const currentPrice = pos.price;
          const pctChange = ((currentPrice - price24hAgo) / price24hAgo) * 100;

          // Only sell if up more than PROFIT_TAKE_PCT in 24h
          if (pctChange >= this.PROFIT_TAKE_PCT && pos.value >= 15) {
            // Sell half the profitable position to lock in gains
            const sellValue = Math.floor(pos.value * 0.5);

            console.log(`   💰 PROFIT-TAKE: ${pos.symbol} up ${pctChange.toFixed(1)}% — selling $${sellValue} to lock gains`);

            const result = await this.exchanges.smartTrade(pos.symbol as 'BTC' | 'ETH' | 'SOL', 'sell', sellValue);
            if (result.success) {
              totalSold += sellValue;
              console.log(`   ✅ Sold $${sellValue} of ${pos.symbol} (profit-take)`);
              await smsAlerter.tradeExecuted(pos.symbol, sellValue, 'SELL', 'Coinbase');
            }
          }
        } catch (err: any) {
          // Skip this asset if candle fetch fails
          continue;
        }
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Profit-take check failed: ${err.message}`);
    }
    return totalSold;
  }

  private async cycle(): Promise<void> {
    this.cycleCount++;
    console.log(`\n─── Cycle ${this.cycleCount} @ ${new Date().toLocaleTimeString()} ───`);

    // Check emergency stop
    const stopCheck = emergencyStop.canTrade();
    if (!stopCheck.allowed) {
      console.log(`🛑 Emergency stop active: ${stopCheck.reason}`);
      return;
    }

    // ── BALANCE CHECK ──────────────────────────────────────────────
    try {
      this.kalshiBalance = await this.kalshi.getBalance();
      const balances = await this.exchanges.getTotalBalance();
      const cbBal = balances.byExchange.find(b => b.exchange === 'Coinbase');
      this.coinbaseUsd = cbBal?.usd || 0;
      const cbUsdc = cbBal?.usdc || 0;
      const spendable = Math.max(0, this.coinbaseUsd - Math.min(cbUsdc, this.USD_RESERVE));
      console.log(`💰 Balances — Kalshi: $${this.kalshiBalance.toFixed(2)} | Coinbase: $${this.coinbaseUsd.toFixed(2)} (USDC: $${cbUsdc.toFixed(2)}, spendable: $${spendable.toFixed(2)}, reserve: $${this.USD_RESERVE} USDC)`);

      // Update fund manager with real balances
      this.funds.updateKalshiBalance(this.kalshiBalance);
      this.funds.updateCryptoBalance(this.coinbaseUsd);
    } catch (err: any) {
      console.warn(`   ⚠️ Balance check failed: ${err.message}`);
    }

    // ── PROFIT-TAKING (every 5th cycle) ───────────────────────────
    if (this.cycleCount % 5 === 0) {
      const profitTaken = await this.profitTake();
      if (profitTaken > 0) {
        this.coinbaseUsd += profitTaken;
        console.log(`💰 Profit-take freed $${profitTaken.toFixed(2)} USD`);
      }
    }

    // Analyze all sources via AI Brain
    const analysis = await this.brain.analyzeAllSources();
    console.log(`📊 Found ${analysis.allOpportunities.length} opportunities (confidence ≥ min)`);

    if (analysis.allOpportunities.length === 0) {
      console.log('⏳ No actionable opportunities this cycle.');
      return;
    }

    if (process.env.AUTO_EXECUTE !== 'true') {
      console.log('⏸️  Auto-execute disabled. Review manually.');
      if (analysis.topOpportunity) {
        console.log(`🎯 Top: ${analysis.topOpportunity.title} (${analysis.topOpportunity.confidence}% conf)`);
      }
      return;
    }

    // Execute ALL qualifying opportunities (up to daily limits), not just the top one
    let kalshiExecuted = 0;
    let cryptoExecuted = 0;
    let kalshiLimitLogged = false;
    let cryptoLimitLogged = false;
    let kalshiDupeSkipped = 0;

    for (const opp of analysis.allOpportunities) {
      if (!opp.action.autoExecute) continue;

      const stake = Math.min(opp.requiredCapital, this.MAX_SINGLE_TRADE);
      const platform = opp.action.platform === 'kalshi' ? 'kalshi' : 'crypto';

      // Check trade limiter
      const canTrade = tradeLimiter.canTrade(stake, platform);
      if (!canTrade.allowed) {
        // Only log the limiter message ONCE per platform per cycle
        if (platform === 'kalshi' && !kalshiLimitLogged) {
          console.log(`⏸️  ${platform} limiter: ${canTrade.reason}`);
          kalshiLimitLogged = true;
        } else if (platform === 'crypto' && !cryptoLimitLogged) {
          console.log(`⏸️  ${platform} limiter: ${canTrade.reason}`);
          cryptoLimitLogged = true;
        }
        continue;
      }

      // Check spending limit
      const stats = tradeLimiter.getStats();
      const spendOk = await emergencyStop.checkSpendingLimit(stats.totalSpent, stake);
      if (!spendOk) break; // Hard stop — no more trades this cycle

      try {
        if (opp.action.platform === 'kalshi') {
          const parts = opp.action.target.split(' ');
          const ticker = parts[0];
          const sideRaw = parts[parts.length - 1]?.toUpperCase();
          const isKalshiTicker = ticker.startsWith('KX') || ticker.includes('-');
          const isValidSide = sideRaw === 'YES' || sideRaw === 'NO';

          if (isKalshiTicker && isValidSide) {
            // Skip if Kalshi balance is too low
            if (this.kalshiBalance < stake) {
              if (!kalshiLimitLogged) {
                console.log(`⛔ Kalshi balance too low ($${this.kalshiBalance.toFixed(2)} < $${stake.toFixed(2)}) — skipping bets`);
                kalshiLimitLogged = true;
              }
              continue;
            }

            // Duplicate bet prevention — skip if already bet on this ticker today
            if (tradeLimiter.hasAlreadyBet(ticker)) {
              kalshiDupeSkipped++;
              continue;
            }

            const side = sideRaw.toLowerCase() as 'yes' | 'no';
            const priceMatch = (opp.action.instructions[0] || '').match(/(\d+)¢/);
            if (!priceMatch) {
              continue; // Skip bet if no price found — defaulting to 50¢ is a coin flip with no edge
            }
            const price = parseInt(priceMatch[1], 10);

            // Fee-aware profit gate
            const profitCheck = calcNetProfit(stake, price);
            if (profitCheck.netProfit < MIN_NET_PROFIT) {
              continue;
            }

            const result = await this.kalshi.placeLimitOrderUsd(ticker, side, stake, price);
            if (result) {
              this.kalshiBalance -= stake; // Track spend locally
              tradeLimiter.recordTrade(ticker, stake, 'kalshi');
              kalshiExecuted++;
              console.log(`✅ Kalshi order placed: ${ticker} ${side} $${stake.toFixed(2)} (net $${profitCheck.netProfit.toFixed(2)})`);
              await this.sms.sendTradeExecuted(opp.title, stake, 'Kalshi');
              // Record to actual_bets so progno wallboard can display it
              await recordActualBet({
                ticker,
                side,
                stake_cents: Math.round(stake * 100),
                price_cents: price,
                pick: opp.title,
                market_title: opp.description || opp.title,
                confidence: opp.confidence,
                sport: opp.source?.includes('PROGNO') ? (opp.description?.match(/NBA|NHL|NFL|MLB|NCAAB|NCAAF|CBB/i)?.[0] || undefined) : undefined,
                dry_run: false,
              });
            }
          } else {
            console.log(`📋 Progno pick (needs Kalshi match): ${opp.title}`);
          }
        } else if (opp.action.platform === 'crypto_exchange') {
          // Duplicate prevention for crypto too
          if (tradeLimiter.hasAlreadyBet(opp.action.target)) {
            continue;
          }

          // NOTE: executeBestSignal() generates its own signals, manages its own
          // limiter checks, and records the trade internally. We only track the
          // execution count here — do NOT double-record in tradeLimiter.
          const trade = await this.crypto.executeBestSignal();
          if (trade) {
            cryptoExecuted++;
            // SMS already sent inside executeBestSignal after successful trade
          }
        } else {
          console.log(`📋 Manual action required: ${opp.action.instructions.join(' | ')}`);
        }
      } catch (err) {
        console.error(`❌ Execution failed for ${opp.title}: ${(err as Error).message}`);
      }
    }

    if (kalshiDupeSkipped > 0) console.log(`⏭️  Skipped ${kalshiDupeSkipped} duplicate Kalshi bets (already placed today)`);
    console.log(`📈 Cycle summary: ${kalshiExecuted} Kalshi + ${cryptoExecuted} crypto trades executed`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if invoked directly (not imported)
const isDirectRun = process.argv[1]?.includes('index');
if (isDirectRun) {
  const bot = new TradingBot();
  bot.start().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

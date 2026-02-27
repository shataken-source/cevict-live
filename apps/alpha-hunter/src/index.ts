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
import { SMSNotifier } from './sms-notifier';
import { checkSetup, printSetupStatus } from './setup-check';
import { tradeLimiter } from './lib/trade-limiter';
import { emergencyStop } from './lib/emergency-stop';

export class TradingBot {
  private brain: AIBrain;
  private funds: UnifiedFundManager;
  private kalshi: KalshiTrader;
  private crypto: CryptoTrader;
  private sms: SMSNotifier;

  private running = false;
  private executionLock = false;
  private cycleCount = 0;

  private readonly INTERVAL = parseInt(process.env.ALPHA_CYCLE_SECONDS || '60', 10) * 1000;
  private readonly MAX_SINGLE_TRADE = parseFloat(process.env.MAX_SINGLE_TRADE || '5');

  constructor() {
    this.brain = new AIBrain();
    this.funds = new UnifiedFundManager();
    this.kalshi = new KalshiTrader();
    this.crypto = new CryptoTrader();
    this.sms = new SMSNotifier();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`
╔══════════════════════════════════════════════════════════╗
║          🦅 ALPHA HUNTER — UNIFIED TRADING BOT           ║
║  Kalshi • Crypto • Progno Sports • AI Analysis           ║
║  Cycle: ${(this.INTERVAL / 1000).toFixed(0)}s | Max Trade: $${this.MAX_SINGLE_TRADE}                        ║
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

  private async cycle(): Promise<void> {
    this.cycleCount++;
    console.log(`\n─── Cycle ${this.cycleCount} @ ${new Date().toLocaleTimeString()} ───`);

    // Check emergency stop
    const stopCheck = emergencyStop.canTrade();
    if (!stopCheck.allowed) {
      console.log(`🛑 Emergency stop active: ${stopCheck.reason}`);
      return;
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
            // Duplicate bet prevention — skip if already bet on this ticker today
            if (tradeLimiter.hasAlreadyBet(ticker)) {
              kalshiDupeSkipped++;
              continue;
            }

            const side = sideRaw.toLowerCase() as 'yes' | 'no';
            const priceMatch = (opp.action.instructions[0] || '').match(/(\d+)¢/);
            const price = priceMatch ? parseInt(priceMatch[1], 10) : 50;

            // Fee-aware profit gate
            const profitCheck = calcNetProfit(stake, price);
            if (profitCheck.netProfit < MIN_NET_PROFIT) {
              continue;
            }

            const result = await this.kalshi.placeLimitOrderUsd(ticker, side, stake, price);
            if (result) {
              tradeLimiter.recordTrade(ticker, stake, 'kalshi');
              kalshiExecuted++;
              console.log(`✅ Kalshi order placed: ${ticker} ${side} $${stake.toFixed(2)} (net $${profitCheck.netProfit.toFixed(2)})`);
              await this.sms.sendTradeExecuted(opp.title, stake, 'Kalshi');
            }
          } else {
            console.log(`📋 Progno pick (needs Kalshi match): ${opp.title}`);
          }
        } else if (opp.action.platform === 'crypto_exchange') {
          // Duplicate prevention for crypto too
          if (tradeLimiter.hasAlreadyBet(opp.action.target)) {
            continue;
          }

          const trade = await this.crypto.executeBestSignal();
          if (trade) {
            tradeLimiter.recordTrade(trade.target, stake, 'crypto');
            cryptoExecuted++;
            console.log(`✅ Crypto trade executed: ${trade.target} $${stake.toFixed(2)}`);
            await this.sms.sendTradeExecuted(opp.title, stake, 'Coinbase');
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

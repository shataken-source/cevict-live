/**
 * Alpha Hunter — Serverless Trading Cycle Cron
 * GET /api/cron/trade-cycle
 *
 * Runs one full trading cycle (balance check, profit-take, signal generation,
 * trade execution) as a serverless function triggered by Vercel Cron.
 * This replaces the laptop-dependent while(running) loop in index.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIBrain } from '../../../../src/ai-brain';
import { KalshiTrader, calcNetProfit, MIN_NET_PROFIT } from '../../../../src/intelligence/kalshi-trader';
import { CryptoTrader } from '../../../../src/strategies/crypto-trader';
import { ExchangeManager } from '../../../../src/exchanges/exchange-manager';
import { SMSNotifier } from '../../../../src/sms-notifier';
import { tradeLimiter } from '../../../../src/lib/trade-limiter';
import { recordActualBet } from '../../../../src/lib/supabase-memory';
import { emergencyStop } from '../../../../src/lib/emergency-stop';
import { smsAlerter } from '../../../../src/lib/sms-alerter';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max (Pro plan)

function isAuthorized(req: NextRequest): boolean {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (isVercelCron) return true;

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const cronSecret = process.env.CRON_SECRET;
  const adminPwd = process.env.ADMIN_PASSWORD;
  return !!(token && ((cronSecret && token === cronSecret) || (adminPwd && token === adminPwd)));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    log(`─── Cron Trade Cycle @ ${new Date().toLocaleTimeString()} ───`);

    // Check emergency stop
    const stopCheck = emergencyStop.canTrade();
    if (!stopCheck.allowed) {
      log(`[STOP] Emergency stop active: ${stopCheck.reason}`);
      return NextResponse.json({ success: true, stopped: true, reason: stopCheck.reason, logs });
    }

    const brain = new AIBrain();
    const kalshi = new KalshiTrader();
    const crypto = new CryptoTrader();
    const exchanges = new ExchangeManager();
    const sms = new SMSNotifier();

    const MAX_SINGLE_TRADE = parseFloat(process.env.MAX_SINGLE_TRADE || '10');
    const USD_RESERVE = parseFloat(process.env.USD_RESERVE_FLOOR || '50');

    // ── BALANCE CHECK ──────────────────────────────────────────────
    let kalshiBalance = 0;
    let coinbaseUsd = 0;
    try {
      kalshiBalance = await kalshi.getBalance();
      const balances = await exchanges.getTotalBalance();
      const cbBal = balances.byExchange.find(b => b.exchange === 'Coinbase');
      coinbaseUsd = cbBal?.usd || 0;
      const cbUsdc = cbBal?.usdc || 0;
      log(`Balances — Kalshi: $${kalshiBalance.toFixed(2)} | Coinbase: $${coinbaseUsd.toFixed(2)} (USDC: $${cbUsdc.toFixed(2)})`);

      // USDC reserve top-up
      const toppedUp = await exchanges.ensureUsdcReserve();
      if (toppedUp) {
        const after = await exchanges.getTotalBalance();
        const cbAfter = after.byExchange.find(b => b.exchange === 'Coinbase');
        coinbaseUsd = cbAfter?.usd ?? coinbaseUsd;
        log(`USDC top-up done — Coinbase: $${coinbaseUsd.toFixed(2)}`);
      }
    } catch (err: any) {
      log(`[WARN] Balance check failed: ${err.message}`);
    }

    // ── PROFIT-TAKING & STOP-LOSS ─────────────────────────────────
    try {
      const cb = exchanges.getCoinbase();
      if (cb.isConfigured()) {
        const portfolio = await cb.getPortfolio();
        const tradeableAssets = ['BTC', 'ETH', 'SOL'];
        let profitSold = 0;

        for (const pos of portfolio.positions) {
          if (pos.staked || !tradeableAssets.includes(pos.symbol) || pos.value < 10) continue;

          const pair = `${pos.symbol}-USD`;
          try {
            const candles = await cb.getCandles(pair, 3600);
            if (candles.length < 24) continue;

            const price24hAgo = candles[candles.length - 24].close;
            const high24h = Math.max(...candles.slice(-24).map(c => c.high));
            const currentPrice = pos.price;
            const pctChange = ((currentPrice - price24hAgo) / price24hAgo) * 100;
            const pctFromHigh = ((currentPrice - high24h) / high24h) * 100;

            // Trailing stop-loss
            if (pctFromHigh < -2 && pctChange > 0.5 && pos.value >= 10) {
              const sellValue = Math.floor(pos.value * 0.9);
              log(`STOP-LOSS: ${pos.symbol} fell ${pctFromHigh.toFixed(1)}% from high — selling $${sellValue}`);
              const result = await exchanges.smartTrade(pos.symbol as 'BTC' | 'ETH' | 'SOL', 'sell', sellValue);
              if (result.success) {
                profitSold += sellValue;
                await smsAlerter.tradeExecuted(pos.symbol, sellValue, 'SELL', 'Coinbase');
              }
              continue;
            }

            // Tiered profit-take
            let sellPct = 0;
            if (pctChange >= 8) sellPct = 0.75;
            else if (pctChange >= 5) sellPct = 0.50;
            else if (pctChange >= 3) sellPct = 0.30;

            if (sellPct > 0 && pos.value >= 15) {
              const sellValue = Math.floor(pos.value * sellPct);
              log(`PROFIT-TAKE: ${pos.symbol} up ${pctChange.toFixed(1)}% — selling ${(sellPct * 100).toFixed(0)}% ($${sellValue})`);
              const result = await exchanges.smartTrade(pos.symbol as 'BTC' | 'ETH' | 'SOL', 'sell', sellValue);
              if (result.success) {
                profitSold += sellValue;
                await smsAlerter.tradeExecuted(pos.symbol, sellValue, 'SELL', 'Coinbase');
              }
            }
          } catch { continue; }
        }

        if (profitSold > 0) {
          coinbaseUsd += profitSold;
          log(`Profit-take freed $${profitSold.toFixed(2)} USD`);
        }
      }
    } catch (err: any) {
      log(`[WARN] Profit-take failed: ${err.message}`);
    }

    // ── ANALYZE & TRADE ───────────────────────────────────────────
    if (process.env.AUTO_EXECUTE !== 'true') {
      log('Auto-execute disabled. Skipping trade execution.');
      return NextResponse.json({ success: true, autoExecute: false, logs, durationMs: Date.now() - startTime });
    }

    const analysis = await brain.analyzeAllSources();
    const minConf = parseFloat(process.env.MIN_CONFIDENCE || '65');
    log(`Found ${analysis.allOpportunities.length} opportunities (conf >= ${minConf}%)`);

    if (analysis.allOpportunities.length === 0) {
      log('No actionable opportunities this cycle.');
      return NextResponse.json({ success: true, opportunities: 0, trades: 0, logs, durationMs: Date.now() - startTime });
    }

    let kalshiExecuted = 0;
    let cryptoExecuted = 0;
    let kalshiDupeSkipped = 0;

    for (const opp of analysis.allOpportunities) {
      if (!opp.action.autoExecute) continue;

      const stake = Math.min(opp.requiredCapital, MAX_SINGLE_TRADE);
      const platform = opp.action.platform === 'kalshi' ? 'kalshi' : 'crypto';

      const canTrade = tradeLimiter.canTrade(stake, platform);
      if (!canTrade.allowed) continue;

      if (platform === 'crypto') {
        const stats = tradeLimiter.getStats();
        const cryptoSpent = stats.platformSpent?.crypto ?? stats.totalSpent;
        const spendOk = await emergencyStop.checkSpendingLimit(cryptoSpent, stake);
        if (!spendOk) break;
      }

      try {
        if (opp.action.platform === 'kalshi') {
          const parts = opp.action.target.split(' ');
          const ticker = parts[0];
          const sideRaw = parts[parts.length - 1]?.toUpperCase();
          const isKalshiTicker = ticker.startsWith('KX') || ticker.includes('-');
          const isValidSide = sideRaw === 'YES' || sideRaw === 'NO';

          if (isKalshiTicker && isValidSide) {
            if (kalshiBalance < stake) continue;
            if (tradeLimiter.hasAlreadyBet(ticker)) { kalshiDupeSkipped++; continue; }

            const side = sideRaw.toLowerCase() as 'yes' | 'no';
            const priceMatch = (opp.action.instructions[0] || '').match(/(\d+)¢/);
            if (!priceMatch) continue;
            const price = parseInt(priceMatch[1], 10);

            const profitCheck = calcNetProfit(stake, price);
            if (profitCheck.netProfit < MIN_NET_PROFIT) continue;

            const result = await kalshi.placeLimitOrderUsd(ticker, side, stake, price);
            if (result?.status === 'skipped') { log(`[SKIP] ${ticker}: ${result.reason || 'market-maker'}`); continue; }
            if (result) {
              kalshiBalance -= stake;
              tradeLimiter.recordTrade(ticker, stake, 'kalshi');
              kalshiExecuted++;
              log(`[OK] Kalshi: ${ticker} ${side} $${stake.toFixed(2)} (net $${profitCheck.netProfit.toFixed(2)})`);
              await sms.sendTradeExecuted(opp.title, stake, 'Kalshi');
              await recordActualBet({
                ticker, side,
                stake_cents: Math.round(stake * 100),
                price_cents: price,
                pick: opp.title,
                market_title: opp.description || opp.title,
                confidence: opp.confidence,
                sport: opp.source?.includes('PROGNO') ? (opp.description?.match(/NBA|NHL|NFL|MLB|NCAAB|NCAAF|CBB/i)?.[0] || undefined) : undefined,
                dry_run: false,
              });
            }
          }
        } else if (opp.action.platform === 'crypto_exchange') {
          if (tradeLimiter.hasAlreadyBet(opp.action.target)) continue;
          const trade = await crypto.executeBestSignal();
          if (trade) {
            cryptoExecuted++;
            log(`[OK] Crypto: ${trade.target} $${trade.amount.toFixed(2)}`);
          }
        }
      } catch (err) {
        log(`[ERR] ${opp.title}: ${(err as Error).message}`);
      }
    }

    if (kalshiDupeSkipped > 0) log(`Skipped ${kalshiDupeSkipped} duplicate Kalshi bets`);
    log(`Cycle done: ${kalshiExecuted} Kalshi + ${cryptoExecuted} crypto trades`);

    return NextResponse.json({
      success: true,
      kalshiTrades: kalshiExecuted,
      cryptoTrades: cryptoExecuted,
      opportunities: analysis.allOpportunities.length,
      durationMs: Date.now() - startTime,
      logs,
    });
  } catch (err: any) {
    log(`[FATAL] ${err.message}`);
    return NextResponse.json({ success: false, error: err.message, logs, durationMs: Date.now() - startTime }, { status: 500 });
  }
}

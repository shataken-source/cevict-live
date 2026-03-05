/**
 * Alpha Hunter — Serverless Trading Cycle Cron
 * GET /api/cron/trade-cycle
 *
 * Runs one full trading cycle (balance check, profit-take, signal generation,
 * trade execution) as a serverless function triggered by Vercel Cron.
 * This replaces the laptop-dependent while(running) loop in index.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIBrain } from '../../../../src/ai-brain';
import { KalshiTrader, calcNetProfit, MIN_NET_PROFIT } from '../../../../src/intelligence/kalshi-trader';
import { CryptoTrader } from '../../../../src/strategies/crypto-trader';
import { ExchangeManager } from '../../../../src/exchanges/exchange-manager';
import { SMSNotifier } from '../../../../src/sms-notifier';
import { tradeLimiter } from '../../../../src/lib/trade-limiter';
import { recordActualBet } from '../../../../src/lib/supabase-memory';
import { emergencyStop } from '../../../../src/lib/emergency-stop';
import { smsAlerter } from '../../../../src/lib/sms-alerter';
import { getMetalsSignal } from '../../../../src/intelligence/economics-expert';
import { RobinhoodExchange } from '../../../../src/exchanges/robinhood';

// ── Supabase-backed guards (persist across Vercel invocations) ──────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getTodayCst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Check actual_bets in Supabase for today's tickers — TRUE dupe prevention on serverless */
async function getAlreadyBetTickers(): Promise<Set<string>> {
  const sb = getSupabase();
  if (!sb) return new Set();
  try {
    const { data } = await sb
      .from('actual_bets')
      .select('ticker')
      .eq('game_date', getTodayCst())
      .not('status', 'eq', 'cancelled');
    return new Set((data || []).map((r: any) => r.ticker).filter(Boolean));
  } catch { return new Set(); }
}

/** Get today's total Kalshi spend from actual_bets (cents) */
async function getTodayKalshiSpendCents(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  try {
    const { data } = await sb
      .from('actual_bets')
      .select('stake_cents')
      .eq('game_date', getTodayCst())
      .not('status', 'eq', 'cancelled')
      .not('dry_run', 'eq', true);
    return (data || []).reduce((s: number, r: any) => s + (r.stake_cents || 0), 0);
  } catch { return 0; }
}

/** Supabase-backed crypto trade tracking — prevents duplicate trades on serverless */
async function getCryptoTradesThisCycle(): Promise<Set<string>> {
  const sb = getSupabase();
  if (!sb) return new Set();
  try {
    const { data } = await sb
      .from('alpha_hunter_trades')
      .select('pair')
      .gte('opened_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // last 30 min
      .eq('platform', 'coinbase')
      .eq('closed', false);
    return new Set((data || []).map((r: any) => r.pair?.split('-')[0]).filter(Boolean));
  } catch { return new Set(); }
}

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

    // Check emergency stop (file-based — defense-in-depth)
    const stopCheck = emergencyStop.canTrade();
    if (!stopCheck.allowed) {
      log(`[STOP] Emergency stop active: ${stopCheck.reason}`);
      return NextResponse.json({ success: true, stopped: true, reason: stopCheck.reason, logs });
    }

    // Check Supabase kill switch (SMS-triggered, persists across serverless invocations)
    try {
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.from('kill_switch').select('active, reason').eq('id', 'alpha-hunter').single();
        if (data?.active) {
          log(`[STOP] SMS kill switch active: ${data.reason || 'no reason'}`);
          return NextResponse.json({ success: true, stopped: true, reason: `SMS kill switch: ${data.reason}`, logs });
        }
      }
    } catch { /* no kill_switch row = trading allowed */ }

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

    // ── Supabase-backed guards ──────────────────────────────────────
    const alreadyBet = await getAlreadyBetTickers();
    log(`Dupe guard: ${alreadyBet.size} tickers already bet today (from Supabase)`);

    const todaySpentCents = await getTodayKalshiSpendCents();
    const KALSHI_MAX_DAILY_SPEND = parseFloat(process.env.KALSHI_MAX_DAILY_SPEND || process.env.MAX_DAILY_SPEND || '100');
    const kalshiDailyBudgetLeft = KALSHI_MAX_DAILY_SPEND - (todaySpentCents / 100);
    log(`Kalshi daily budget: $${(todaySpentCents / 100).toFixed(2)} spent / $${KALSHI_MAX_DAILY_SPEND} max → $${kalshiDailyBudgetLeft.toFixed(2)} remaining`);

    // Price guardrails — reject longshots and heavy favorites
    const KALSHI_PRICE_FLOOR = parseInt(process.env.KALSHI_PRICE_FLOOR || '15', 10);
    const KALSHI_PRICE_CEIL = parseInt(process.env.KALSHI_PRICE_CEIL || '85', 10);

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
          const isKalshiTicker = ticker.startsWith('KX') || ticker.includes('-') || /^(FED|CPI|INF|UNRATE|GDP|RECESSION|ECON|HIGHTEMP|LOWTEMP|TEMP|SNOW|FREEZE|HEAT|WEATHER|GOLD|SILVER|COPPER|PLATINUM|EURUSD|FXPESO|JPY|GBP|DXY|OSCAR|EMMY|GRAMMY|GLOBE|STREAM|BOXOFFICE)/i.test(ticker);
          const isValidSide = sideRaw === 'YES' || sideRaw === 'NO';

          if (isKalshiTicker && isValidSide) {
            if (kalshiBalance < stake) continue;
            // Supabase-backed dupe check (persists across Vercel invocations)
            if (alreadyBet.has(ticker) || tradeLimiter.hasAlreadyBet(ticker)) { kalshiDupeSkipped++; continue; }
            // Daily spend cap (Supabase-backed)
            if (kalshiDailyBudgetLeft <= 0) { log('Kalshi daily spend cap reached — skipping'); continue; }

            const side = sideRaw.toLowerCase() as 'yes' | 'no';
            const priceMatch = (opp.action.instructions[0] || '').match(/(\d+)¢/);
            if (!priceMatch) continue;
            const price = parseInt(priceMatch[1], 10);

            // Price guardrails: reject longshots (< floor) and heavy favorites (> ceil)
            if (price < KALSHI_PRICE_FLOOR || price > KALSHI_PRICE_CEIL) {
              log(`[SKIP] ${ticker} price ${price}¢ outside ${KALSHI_PRICE_FLOOR}-${KALSHI_PRICE_CEIL}¢ range`);
              continue;
            }

            const profitCheck = calcNetProfit(stake, price);
            if (profitCheck.netProfit < MIN_NET_PROFIT) continue;

            const result = await kalshi.placeLimitOrderUsd(ticker, side, stake, price);
            if (result?.status === 'skipped') { log(`[SKIP] ${ticker}: ${result.reason || 'market-maker'}`); continue; }
            if (result) {
              kalshiBalance -= stake;
              tradeLimiter.recordTrade(ticker, stake, 'kalshi');
              alreadyBet.add(ticker); // Update in-memory set for this invocation
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
          // Only execute crypto once per cycle — executeBestSignal generates its own signals
          if (cryptoExecuted > 0) continue;
          // Supabase-backed dupe check: skip if we traded this asset in last 30 min
          const recentCrypto = await getCryptoTradesThisCycle();
          if (recentCrypto.size >= 3) { log('[SKIP] Crypto: all assets traded recently'); continue; }
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

    // ── ROBINHOOD SECOND-CHANCE SANDBOX ─────────────────────────────
    let rhExecuted = 0;
    try {
      const rhResult = await crypto.executeSecondChanceOnRobinhood();
      rhExecuted = rhResult.executed;
      for (const l of rhResult.logs) log(l);
    } catch (err: any) {
      log(`[RH] Second-chance error: ${err.message}`);
    }

    // ── ROBINHOOD METALS (PAXG-USD gold proxy) ──────────────────────
    // Position-aware: checks holdings, enforces max exposure, sells on TP/SL
    let rhMetalsExecuted = 0;
    try {
      const rh = new RobinhoodExchange();
      if (rh.isConfigured()) {
        const metalsSignal = await getMetalsSignal();
        log(`[METALS] Signal: ${metalsSignal.direction ?? 'none'} | Gold=$${metalsSignal.goldPrice?.toLocaleString() ?? '?'} | Conf=${metalsSignal.confidence}%`);
        for (const r of metalsSignal.reasoning) log(`[METALS]   ${r}`);

        const RH_METALS_MAX_POSITION = parseFloat(process.env.RH_METALS_MAX_POSITION || '25'); // max $ in PAXG
        const RH_METALS_TP_PCT = parseFloat(process.env.RH_METALS_TP_PCT || '3');   // take profit %
        const RH_METALS_SL_PCT = parseFloat(process.env.RH_METALS_SL_PCT || '2');   // stop loss %
        const sb = getSupabase();

        // ── Step 1: Check current PAXG holdings ──
        let paxgQty = 0;
        let paxgCostBasis = 0;
        let paxgCurrentValue = 0;
        let paxgPnlPct = 0;
        try {
          const holdings = await rh.getHoldings(['PAXG']);
          const paxg = holdings.find((h: any) => h.asset_code === 'PAXG');
          if (paxg && paxg.total_quantity > 0) {
            paxgQty = paxg.total_quantity;
            paxgCostBasis = paxg.cost_basis; // total $ spent
            paxgCurrentValue = paxgQty * (metalsSignal.goldPrice || 0);
            paxgPnlPct = paxgCostBasis > 0 ? ((paxgCurrentValue - paxgCostBasis) / paxgCostBasis) * 100 : 0;
            log(`[METALS] Holdings: ${paxgQty.toFixed(6)} PAXG | cost=$${paxgCostBasis.toFixed(2)} | value=$${paxgCurrentValue.toFixed(2)} | P/L=${paxgPnlPct >= 0 ? '+' : ''}${paxgPnlPct.toFixed(2)}%`);
          } else {
            log('[METALS] Holdings: no PAXG position');
          }
        } catch (e: any) {
          log(`[METALS] Could not check holdings (WAF?): ${e.message}`);
        }

        // ── Step 2: SELL — take profit or stop loss on existing position ──
        if (paxgQty > 0 && paxgCostBasis > 0) {
          const shouldSell = paxgPnlPct >= RH_METALS_TP_PCT || paxgPnlPct <= -RH_METALS_SL_PCT;
          const sellReason = paxgPnlPct >= RH_METALS_TP_PCT
            ? `TAKE PROFIT: +${paxgPnlPct.toFixed(2)}% >= +${RH_METALS_TP_PCT}%`
            : `STOP LOSS: ${paxgPnlPct.toFixed(2)}% <= -${RH_METALS_SL_PCT}%`;

          if (shouldSell) {
            log(`[METALS] ${sellReason} — selling ${paxgQty.toFixed(6)} PAXG ($${paxgCurrentValue.toFixed(2)})`);
            try {
              const sellOrder = await rh.marketSell('PAXG-USD', paxgQty);
              const ok = sellOrder.state === 'filled' || sellOrder.state === 'confirmed' || sellOrder.state === 'queued' || sellOrder.state === 'open';
              if (ok) {
                rhMetalsExecuted++;
                log(`[METALS] ✅ SOLD ${paxgQty.toFixed(6)} PAXG @ ~$${metalsSignal.goldPrice?.toLocaleString()} (${sellReason}, order ${sellOrder.id})`);
                if (sb) {
                  try {
                    await sb.from('alpha_hunter_trades').insert({
                      pair: 'PAXG-USD', side: 'sell', amount: paxgCurrentValue,
                      price: metalsSignal.goldPrice || 0, platform: 'robinhood',
                      confidence: metalsSignal.confidence,
                      reasoning: `${sellReason}; ${metalsSignal.reasoning.slice(0, 2).join('; ')}`,
                      opened_at: new Date().toISOString(), closed: true, sandbox: false,
                    });
                  } catch { /* non-fatal */ }
                }
                await smsAlerter.tradeExecuted('PAXG (Gold)', paxgCurrentValue, 'SELL', 'Robinhood');
                // After selling, reset position tracking — don't buy in same cycle
                paxgQty = 0;
                paxgCurrentValue = 0;
              } else {
                log(`[METALS] ❌ PAXG SELL order state: ${sellOrder.state}`);
              }
            } catch (err: any) {
              log(`[METALS] ❌ PAXG SELL error: ${err.message}`);
            }
          }
        }

        // ── Step 3: BUY — only if signal is long, under max position, and not just sold ──
        if (metalsSignal.direction === 'long' && metalsSignal.confidence >= 60 && paxgCurrentValue < RH_METALS_MAX_POSITION) {
          // Check daily trade limit + 30-min cooldown
          let metalsTradesToday = 0;
          let lastMetalsTradeAge = Infinity;
          if (sb) {
            try {
              const { data } = await sb.from('alpha_hunter_trades')
                .select('id, opened_at')
                .eq('platform', 'robinhood')
                .like('pair', '%PAXG%')
                .gte('opened_at', `${getTodayCst()}T00:00:00`)
                .order('opened_at', { ascending: false });
              metalsTradesToday = (data || []).length;
              if (data && data.length > 0 && data[0].opened_at) {
                lastMetalsTradeAge = (Date.now() - new Date(data[0].opened_at).getTime()) / 60000;
              }
            } catch { /* ignore */ }
          }

          const RH_METALS_MAX_DAILY = parseInt(process.env.RH_METALS_MAX_DAILY || '2', 10);
          if (metalsTradesToday >= RH_METALS_MAX_DAILY) {
            log(`[METALS] Daily limit reached (${metalsTradesToday}/${RH_METALS_MAX_DAILY})`);
          } else if (lastMetalsTradeAge < 30) {
            log(`[METALS] Cooldown: last PAXG trade ${lastMetalsTradeAge.toFixed(0)}min ago (need 30min)`);
          } else {
            // Cap buy size to not exceed max position
            const roomLeft = RH_METALS_MAX_POSITION - paxgCurrentValue;
            const tradeSize = Math.min(metalsSignal.suggestedSize, roomLeft);
            if (tradeSize < 1) {
              log(`[METALS] Position $${paxgCurrentValue.toFixed(2)} near max $${RH_METALS_MAX_POSITION} — skipping buy`);
            } else {
              try {
                const order = await rh.marketBuyWithPrice('PAXG-USD', tradeSize, metalsSignal.goldPrice!);
                const ok = order.state === 'filled' || order.state === 'confirmed' || order.state === 'queued' || order.state === 'open';
                if (ok) {
                  rhMetalsExecuted++;
                  log(`[METALS] ✅ PAXG-USD BUY $${tradeSize} (conf ${metalsSignal.confidence}%, gold $${metalsSignal.goldPrice?.toLocaleString()}, position $${(paxgCurrentValue + tradeSize).toFixed(2)}/$${RH_METALS_MAX_POSITION}, order ${order.id})`);
                  if (sb) {
                    try {
                      await sb.from('alpha_hunter_trades').insert({
                        pair: 'PAXG-USD', side: 'buy', amount: tradeSize,
                        price: parseFloat(order.average_price || '0'), platform: 'robinhood',
                        confidence: metalsSignal.confidence,
                        reasoning: metalsSignal.reasoning.join('; '),
                        opened_at: new Date().toISOString(), closed: false, sandbox: false,
                      });
                    } catch { /* non-fatal */ }
                  }
                  await smsAlerter.tradeExecuted('PAXG (Gold)', tradeSize, 'BUY', 'Robinhood');
                } else {
                  log(`[METALS] ❌ PAXG-USD order state: ${order.state}`);
                }
              } catch (err: any) {
                log(`[METALS] ❌ PAXG-USD error: ${err.message}`);
              }
            }
          }
        } else if (metalsSignal.direction === 'long' && paxgCurrentValue >= RH_METALS_MAX_POSITION) {
          log(`[METALS] Max position reached ($${paxgCurrentValue.toFixed(2)} >= $${RH_METALS_MAX_POSITION}) — holding, not buying`);
        }
      } else {
        log('[METALS] Robinhood not configured — skipping metals');
      }
    } catch (err: any) {
      log(`[METALS] Error: ${err.message}`);
    }

    log(`Cycle done: ${kalshiExecuted} Kalshi + ${cryptoExecuted} crypto + ${rhExecuted} RH-crypto + ${rhMetalsExecuted} RH-metals trades`);

    return NextResponse.json({
      success: true,
      kalshiTrades: kalshiExecuted,
      cryptoTrades: cryptoExecuted,
      robinhoodTrades: rhExecuted,
      robinhoodMetalsTrades: rhMetalsExecuted,
      opportunities: analysis.allOpportunities.length,
      durationMs: Date.now() - startTime,
      logs,
    });
  } catch (err: any) {
    log(`[FATAL] ${err.message}`);
    return NextResponse.json({ success: false, error: err.message, logs, durationMs: Date.now() - startTime }, { status: 500 });
  }
}

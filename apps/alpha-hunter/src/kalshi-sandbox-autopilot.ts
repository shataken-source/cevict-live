/**
 * Kalshi Sandbox Autopilot (DEMO ONLY)
 *
 * Runs continuously, places DEMO orders, records trades/predictions in Supabase,
 * settles outcomes, and updates learning/strategy parameters.
 *
 * Safety:
 * - KalshiTrader enforces demo-only execution and refuses KALSHI_ENV=production.
 */

import "dotenv/config";
import { KalshiTrader } from "./intelligence/kalshi-trader";
import {
  getBotConfig,
  getBotPredictions,
  getStrategyParams,
  saveBotPrediction,
  saveTradeRecord,
  getOpenTradeRecords,
} from "./lib/supabase-memory";
import { KalshiSettlementWorker, logTradeToLearningLoop } from "./services/kalshi/settlement-worker";
import { LearningUpdater } from "./intelligence/learning-updater";
import {
  preFlightTradeCheck,
  executeTradeWithLock,
  safeExecute,
  recordPosition,
  recordTradeCooldown,
  recordEventPosition,
  logPositionClose,
  apiCache,
  getKalshiEventId,
} from "./services/trade-safety";
import { SandboxMonitor } from "./services/kalshi/sandbox-monitor";
import { getPrognoProbabilities, matchKalshiMarketToProgno } from "./intelligence/probability-bridge";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function categorizeMarket(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("bitcoin") || lower.includes("crypto") || lower.includes("btc") || lower.includes("eth")) return "crypto";
  if (lower.includes("election") || lower.includes("president") || lower.includes("congress") || lower.includes("vote")) return "politics";
  if (lower.includes("fed") || lower.includes("gdp") || lower.includes("inflation") || lower.includes("recession")) return "economics";
  if (lower.includes("temperature") || lower.includes("hurricane") || lower.includes("storm") || lower.includes("weather")) return "weather";
  if (lower.includes("oscar") || lower.includes("movie") || lower.includes("box office")) return "entertainment";
  if (lower.includes("nfl") || lower.includes("nba") || lower.includes("mlb") || lower.includes("nhl") || lower.includes("soccer")) return "sports";
  return "world";
}

async function seedPredictionsIfEmpty(kalshi: KalshiTrader): Promise<void> {
  const existing = await getBotPredictions(undefined, "kalshi", 5);
  if (existing.length > 0) return;

  const prognoEvents = await getPrognoProbabilities();
  if (prognoEvents.length > 0) {
    console.log(`   📡 Progno: ${prognoEvents.length} picks — using for sports market seeding`);
  }

  // Use API cache to avoid redundant market fetches
  const cacheKey = "markets:seed";
  let markets = apiCache.get(cacheKey);
  if (!markets) {
    markets = await safeExecute(
      () => kalshi.getMarkets(),
      "Fetch markets for seeding"
    );
    if (markets?.result) {
      apiCache.set(cacheKey, markets.result);
      markets = markets.result;
    } else {
      return; // Failed to fetch
    }
  }
  const toAnalyze = markets.slice(0, 25);

  for (const m of toAnalyze) {
    const marketPrice = Number(m.yesPrice || 50);
    const category = categorizeMarket(m.title || "");

    // Try each Progno event to see if it matches this Kalshi market
    let prognoMatch: ReturnType<typeof matchKalshiMarketToProgno> = null;
    let matchedEvent: (typeof prognoEvents)[number] | null = null;
    for (const evt of prognoEvents) {
      const match = matchKalshiMarketToProgno(evt, [m]);
      if (match) {
        prognoMatch = match;
        matchedEvent = evt;
        break;
      }
    }

    let probability: number;
    let confidence: number;
    let reasoning: string[];
    let factors: string[];
    let learned_from: string[];

    if (prognoMatch && matchedEvent) {
      probability = matchedEvent.modelProbability;
      confidence = Math.min(92, Math.max(52, probability));
      reasoning = [`Progno: ${matchedEvent.label}`];
      factors = ["Progno sports model", "Monte Carlo + Claude Effect"];
      learned_from = ["progno"];
    } else {
      probability = marketPrice > 50 ? Math.max(1, marketPrice - 3) : Math.min(99, marketPrice + 3);
      confidence = Math.min(80, 50 + Math.abs(marketPrice - 50));
      reasoning = ["Bootstrap heuristic (demo sandbox)"];
      factors = ["Market price", "Small contrarian adjustment"];
      learned_from = ["bootstrap"];
    }

    const edge = Math.abs(probability - marketPrice);
    const prediction = probability >= 50 ? "yes" : "no";

    await saveBotPrediction({
      bot_category: category,
      market_id: m.id,
      market_title: m.title,
      platform: "kalshi",
      prediction: prediction as any,
      probability,
      confidence,
      edge,
      reasoning,
      factors,
      learned_from,
      market_price: marketPrice,
      predicted_at: new Date(),
      expires_at: m.expiresAt ? new Date(m.expiresAt) : undefined,
    });
  }
}

/**
 * Sync existing open positions from Supabase to in-memory tracking.
 * This ensures we don't place duplicate trades after a restart.
 */
async function syncExistingPositions(): Promise<void> {
  const openTrades = await getOpenTradeRecords("kalshi", 500);
  console.log(`📋 Syncing ${openTrades.length} existing open positions from Supabase...`);

  // DEBUG: Show what we actually got
  if (openTrades.length > 10) {
    console.log(`   ⚠️  WARNING: Found ${openTrades.length} open positions (expected ~2)`);
    console.log(`   🔍 First 5 positions:`, openTrades.slice(0, 5).map(t => ({
      market_id: t.market_id,
      outcome: t.outcome,
      closed_at: t.closed_at
    })));
  }

  for (const trade of openTrades) {
    if (!trade.market_id) continue;

    // Record position in tracking maps
    recordPosition(trade.market_id, trade.entry_price);
    recordEventPosition(trade.market_id);

    // Record cooldown (assume trade was placed recently, so we're on cooldown)
    recordTradeCooldown(trade.market_id);
  }

  if (openTrades.length > 0) {
    console.log(`✅ Position sync complete - ${openTrades.length} positions tracked`);
  }
}

async function main() {
  console.log("\n🧪 KALSHI SANDBOX AUTOPILOT (DEMO) — PROD-SIM MODE\n");

  const kalshi = new KalshiTrader();
  const settlement = new KalshiSettlementWorker();
  const learner = new LearningUpdater();
  const monitor = new SandboxMonitor();

  // Graceful shutdown handler
  let shutdownRequested = false;
  const shutdown = async (signal: string) => {
    console.log(`\n\n🛑 Received ${signal} - Initiating graceful shutdown...`);
    shutdownRequested = true;

    // Print final stats
    await monitor.getStats();
    monitor.printStats();

    const health = monitor.getHealthStatus();
    if (health.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      health.warnings.forEach(w => console.log(`   - ${w}`));
    }

    console.log("\n✅ Shutdown complete. Goodbye!\n");
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // DEMO auth preflight (do NOT hard-stop; run analysis-only until keys are ready)
  let kalshiAuthed = false;
  let lastAuthAttempt = 0;
  const AUTH_RETRY_MS = 2 * 60 * 1000; // retry every 2 minutes

  async function ensureKalshiAuth(): Promise<void> {
    const now = Date.now();
    if (kalshiAuthed) return;
    if (now - lastAuthAttempt < AUTH_RETRY_MS) return;
    lastAuthAttempt = now;

    const auth = await kalshi.probeAuth();
    if (auth.ok) {
      kalshiAuthed = true;
      console.log(`✅ Kalshi demo auth OK (balance: $${(auth.balanceUsd ?? 0).toFixed(2)})`);
      return;
    }

    const keyHint = (process.env.KALSHI_API_KEY_ID || "").slice(0, 8);
    const hasPriv = !!process.env.KALSHI_PRIVATE_KEY;
    const hasPrivPath = !!process.env.KALSHI_PRIVATE_KEY_PATH;

    console.log(
      [
        "⚠️  Kalshi DEMO auth not ready — continuing in analysis-only mode (no orders).",
        `   code=${auth.code || "unknown"}`,
        auth.message ? `   message=${auth.message}` : null,
        auth.details ? `   details=${auth.details}` : null,
        `   keyId=${keyHint ? keyHint + "…" : "(missing)"}`,
        `   hasPrivateKey=${hasPriv}`,
        `   hasPrivateKeyPath=${hasPrivPath}`,
      ].filter(Boolean).join("\n")
    );
  }

  await ensureKalshiAuth();

  // Sync existing positions on startup
  await syncExistingPositions();

  let dailySpending = 0;
  let lastSettlement = 0;
  let lastLearning = 0;
  let lastStatsPrint = 0;
  const STATS_PRINT_INTERVAL = 10 * 60 * 1000; // Print stats every 10 minutes
  const loggedCategories = new Set<string>(); // Track which categories we've logged limits for

  // Basic day rollover
  let dayKey = new Date().toDateString();

  while (!shutdownRequested) {
    const now = Date.now();
    const nowDay = new Date().toDateString();
    if (nowDay !== dayKey) {
      dayKey = nowDay;
      dailySpending = 0;
      loggedCategories.clear(); // Reset category logging for new day
      console.log(`\n📅 New day - Daily spending reset\n`);
    }

    const config = await getBotConfig();
    const intervalMs = config.trading.kalshiInterval || 60000;

    // Record cycle
    monitor.recordCycle();

    await ensureKalshiAuth();
    if (kalshiAuthed) {
      await seedPredictionsIfEmpty(kalshi);
    }

    // Pull highest-signal predictions first
    const preds = await getBotPredictions(undefined, "kalshi", 50);
    const tradable = preds
      .filter(p => p.actual_outcome === null)
      .filter(p => !!p.market_id)
      .sort((a, b) => (Number(b.confidence) + Number(b.edge)) - (Number(a.confidence) + Number(a.edge)));

    if (kalshiAuthed) {
      // Place at most 1 trade per cycle (keeps behavior stable while learning)
      for (const pred of tradable.slice(0, 10)) {
        const botCategory = pred.bot_category || "unknown";
        const params = await getStrategyParams("kalshi", botCategory);

        const minConfidence = params?.min_confidence ?? config.trading.minConfidence;
        const minEdge = params?.min_edge ?? config.trading.minEdge;
        const maxTrade = params?.max_trade_usd ?? config.trading.maxTradeSize;
        const dailyLimit = params?.daily_spending_limit ?? config.trading.dailySpendingLimit;

        // Debug: Log which limit is being used (only once per category per day)
        if (!loggedCategories.has(botCategory)) {
          const limitSource = params?.daily_spending_limit ? 'strategy_params' : 'bot_config';
          const paramValue = params?.daily_spending_limit ?? 'null';
          const configValue = config.trading.dailySpendingLimit;
          console.log(`   💰 Daily limit for ${botCategory}: $${dailyLimit} (params: ${paramValue}, config: ${configValue}, using: ${limitSource})`);
          loggedCategories.add(botCategory);
        }

        if (Number(pred.confidence) < minConfidence) continue;
        if (Number(pred.edge) < minEdge) continue;
        if (dailySpending >= dailyLimit) break;

        const tradeSize = Math.min(maxTrade, dailyLimit - dailySpending);
        if (tradeSize < 1) break;

        const side = (pred.prediction === "yes" ? "yes" : "no") as "yes" | "no";

        // CRITICAL: Pre-flight safety checks (BUGS #1, #2, #4, #5, #9)
        const preFlight = await preFlightTradeCheck(pred.market_id, tradeSize, "kalshi");
        if (!preFlight.allowed) {
          // Log why trade was blocked
          monitor.recordTradeBlocked();
          continue; // Try next prediction
        }

        // Maker pricing if possible (with API cache)
        let limitPrice = Math.round(Number(pred.market_price || 50));
        const obCacheKey = `orderbook:${pred.market_id}`;
        let ob = apiCache.get(obCacheKey);
        if (!ob) {
          monitor.recordAPICall();
          const obResult = await safeExecute(
            () => kalshi.getOrderBook(pred.market_id),
            `Fetch orderbook for ${pred.market_id}`
          );
          if (obResult.success && obResult.result) {
            ob = obResult.result;
            apiCache.set(obCacheKey, ob);
          }
        }
        if (ob) {
          const calc = kalshi.calculateMakerPrice(ob, side, "buy");
          if (calc && calc.spread >= 2) {
            limitPrice = calc.price;
          }
        }

        // Execute trade with lock and error handling (BUGS #6, #10)
        const tradeResult = await executeTradeWithLock(async () => {
          monitor.recordAPICall();
          const orderResult = await safeExecute(
            () => kalshi.placeLimitOrderUsd(pred.market_id, side, tradeSize, limitPrice),
            `Place order for ${pred.market_id}`
          );

          if (!orderResult.success || !orderResult.result) {
            return { success: false, reason: orderResult.error || "Order placement failed" };
          }

          const contracts = kalshi.usdToContracts(tradeSize, limitPrice);

          // Save trade record and log to learning loop (same id so settlement can update outcome)
          const tradeId = await safeExecute(
            async () => {
              const id = await saveTradeRecord({
                platform: "kalshi",
                trade_type: side,
                symbol: pred.market_title,
                market_id: pred.market_id,
                entry_price: limitPrice,
                amount: tradeSize,
                contracts,
                fees: 0,
                opened_at: new Date(),
                bot_category: botCategory,
                confidence: Number(pred.confidence),
                edge: Number(pred.edge),
                outcome: "open",
              });
              return id;
            },
            `Save trade record for ${pred.market_id}`
          );

          if (!tradeId.success || !tradeId.result) {
            console.log(`⚠️ Trade placed but record save failed for ${pred.market_id}`);
          } else {
            const marketCloseTs = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            logTradeToLearningLoop({
              tradeId: tradeId.result,
              marketTicker: pred.market_id,
              marketTitle: pred.market_title,
              marketCategory: categorizeMarket(pred.market_title ?? ''),
              predictedProbability: Number(pred.confidence),
              marketOdds: limitPrice,
              side,
              stakeUsd: tradeSize,
              contracts,
              entryPriceCents: limitPrice,
              marketCloseTs,
            }).catch((err) => console.warn('Learning loop log failed:', err?.message));
          }

          // Record position tracking (BUGS #1, #2, #4)
          recordPosition(pred.market_id, limitPrice);
          recordTradeCooldown(pred.market_id);
          recordEventPosition(pred.market_id);

          dailySpending += tradeSize;
          monitor.recordTradePlaced();
          console.log(
            `✅ DEMO trade placed: ${botCategory} ${side.toUpperCase()} ${pred.market_id} $${tradeSize.toFixed(2)} @ ${limitPrice}¢ (contracts=${contracts})`
          );

          return { success: true, contracts };
        }, `Trade execution for ${pred.market_id}`);

        if (!tradeResult.success) {
          console.log(`❌ Trade blocked/failed for ${pred.market_id}: ${tradeResult.reason}`);
        }

        break; // Only one trade per cycle
      }
    }

    // Settlement every 2 minutes
    if (now - lastSettlement > 120000) {
      lastSettlement = now;
      await settlement.runOnce();
    }

    // Learning every 5 minutes
    if (now - lastLearning > 300000) {
      lastLearning = now;
      await learner.runOnce();
    }

    // Print stats every 10 minutes
    if (now - lastStatsPrint > STATS_PRINT_INTERVAL) {
      lastStatsPrint = now;
      await monitor.getStats();
      monitor.printStats();
    }

    await sleep(intervalMs);
  }
}

main().catch(err => {
  console.error("Fatal sandbox autopilot error:", err);
  process.exit(1);
});


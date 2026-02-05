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
} from "./lib/supabase-memory";
import { KalshiSettlementWorker } from "./services/kalshi/settlement-worker";
import { LearningUpdater } from "./intelligence/learning-updater";

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

  const markets = await kalshi.getMarkets();
  const toAnalyze = markets.slice(0, 25);

  for (const m of toAnalyze) {
    const marketPrice = Number(m.yesPrice || 50);
    const probability = marketPrice > 50 ? Math.max(1, marketPrice - 3) : Math.min(99, marketPrice + 3);
    const edge = Math.abs(probability - marketPrice);
    const confidence = Math.min(80, 50 + Math.abs(marketPrice - 50));
    const prediction = probability >= 50 ? "yes" : "no";

    await saveBotPrediction({
      bot_category: categorizeMarket(m.title || ""),
      market_id: m.id,
      market_title: m.title,
      platform: "kalshi",
      prediction: prediction as any,
      probability,
      confidence,
      edge,
      reasoning: ["Bootstrap heuristic (demo sandbox)"],
      factors: ["Market price", "Small contrarian adjustment"],
      learned_from: ["bootstrap"],
      market_price: marketPrice,
      predicted_at: new Date(),
      expires_at: m.expiresAt ? new Date(m.expiresAt) : undefined,
    });
  }
}

async function main() {
  console.log("\n🧪 KALSHI SANDBOX AUTOPILOT (DEMO) — PROD-SIM MODE\n");

  const kalshi = new KalshiTrader();
  const settlement = new KalshiSettlementWorker();
  const learner = new LearningUpdater();

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

  let dailySpending = 0;
  let lastSettlement = 0;
  let lastLearning = 0;

  // Basic day rollover
  let dayKey = new Date().toDateString();

  while (true) {
    const now = Date.now();
    const nowDay = new Date().toDateString();
    if (nowDay !== dayKey) {
      dayKey = nowDay;
      dailySpending = 0;
    }

    const config = await getBotConfig();
    const intervalMs = config.trading.kalshiInterval || 60000;

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

        if (Number(pred.confidence) < minConfidence) continue;
        if (Number(pred.edge) < minEdge) continue;
        if (dailySpending >= dailyLimit) break;

        const tradeSize = Math.min(maxTrade, dailyLimit - dailySpending);
        if (tradeSize < 1) break;

        const side = (pred.prediction === "yes" ? "yes" : "no") as "yes" | "no";

        // Maker pricing if possible
        let limitPrice = Math.round(Number(pred.market_price || 50));
        const ob = await kalshi.getOrderBook(pred.market_id);
        if (ob) {
          const calc = kalshi.calculateMakerPrice(ob, side, "buy");
          if (calc && calc.spread >= 2) {
            limitPrice = calc.price;
          }
        }

        try {
          await kalshi.placeLimitOrderUsd(pred.market_id, side, tradeSize, limitPrice);
          const contracts = kalshi.usdToContracts(tradeSize, limitPrice);

          await saveTradeRecord({
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

          dailySpending += tradeSize;
          console.log(
            `✅ DEMO trade placed: ${botCategory} ${side.toUpperCase()} ${pred.market_id} $${tradeSize.toFixed(2)} @ ${limitPrice}¢ (contracts=${contracts})`
          );
        } catch (e: any) {
          console.log(`❌ Trade failed for ${pred.market_id}: ${String(e?.message || e)}`);
        }

        break;
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

    await sleep(intervalMs);
  }
}

main().catch(err => {
  console.error("Fatal sandbox autopilot error:", err);
  process.exit(1);
});


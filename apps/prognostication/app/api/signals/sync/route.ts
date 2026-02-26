import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/server"

/**
 * GET /api/signals/sync
 * Reads live data from trade_history (Kalshi) and polymarket_predictions,
 * then upserts into the signals table so the Signal Feed dashboard shows real data.
 * Called on page load and can be triggered by cron.
 */
export async function GET() {
  const signals: any[] = []

  // 1. Kalshi trades from trade_history
  try {
    const { data: kalshiTrades, error: kErr } = await supabase
      .from("trade_history")
      .select("*")
      .eq("platform", "kalshi")
      .eq("outcome", "open")
      .order("opened_at", { ascending: false })
      .limit(50)

    if (!kErr && kalshiTrades) {
      // Deduplicate by market_id
      const seen = new Set<string>()
      for (const t of kalshiTrades) {
        const mid = t.market_id || t.id
        if (!mid || seen.has(mid)) continue
        seen.add(mid)

        const pick = t.trade_type === "buy" ? "YES" : "NO"
        const entryPrice = t.entry_price || 50
        const edge = t.edge || 0
        const conf = t.confidence || 50

        signals.push({
          id: mid,
          market_id: mid,
          market: t.symbol || "Unknown Market",
          platform: "Kalshi",
          direction: pick,
          market_prob: Math.round(entryPrice) / 100,
          model_prob: Math.min(1, Math.round(entryPrice + edge) / 100),
          edge: Math.max(0, edge / 100),
          confidence: conf >= 75 ? "HIGH" : conf >= 50 ? "MEDIUM" : "LOW",
          liquidity: "$" + Math.round((t.amount || 1) * entryPrice / 100) + "",
          timeframe: "24h",
          status: "active",
          released_at: t.opened_at || t.created_at || new Date().toISOString(),
          audit_hash: mid.slice(0, 16),
        })
      }
    }
  } catch (e) {
    console.error("[sync-signals] Kalshi fetch error:", e)
  }

  // 2. Polymarket predictions
  try {
    const { data: polyPreds, error: pErr } = await supabase
      .from("polymarket_predictions")
      .select("*")
      .is("actual_outcome", null)
      .gte("confidence", 40)
      .order("predicted_at", { ascending: false })
      .limit(50)

    if (!pErr && polyPreds) {
      const seen = new Set<string>()
      for (const p of polyPreds) {
        const mid = p.market_id || p.condition_id || p.id
        if (!mid || seen.has(mid)) continue
        seen.add(mid)

        const pick = (p.prediction || "yes").toUpperCase()
        const mktProb = (p.market_probability || p.yes_price || 50) / 100
        const modelProb = (p.model_probability || p.confidence || 50) / 100
        const edge = Math.max(0, modelProb - mktProb)

        signals.push({
          id: "pm-" + mid,
          market_id: mid,
          market: p.market_title || p.question || "Polymarket Event",
          platform: "Polymarket",
          direction: pick === "NO" ? "NO" : "YES",
          market_prob: Math.round(mktProb * 100) / 100,
          model_prob: Math.round(modelProb * 100) / 100,
          edge: Math.round(edge * 1000) / 1000,
          confidence: (p.confidence || 50) >= 75 ? "HIGH" : (p.confidence || 50) >= 50 ? "MEDIUM" : "LOW",
          liquidity: p.volume ? "$" + p.volume : "$0",
          timeframe: "48h",
          status: "active",
          released_at: p.predicted_at || p.created_at || new Date().toISOString(),
          audit_hash: (mid + "").slice(0, 16),
        })
      }
    }
  } catch (e) {
    console.error("[sync-signals] Polymarket fetch error:", e)
  }

  if (signals.length === 0) {
    return NextResponse.json({ success: true, synced: 0, message: "No open trades found in trade_history or polymarket_predictions" })
  }

  // 3. Mark old signals as expired before upserting new ones
  try {
    const activeIds = signals.map(s => s.id)
    await supabase
      .from("signals")
      .update({ status: "expired" })
      .eq("status", "active")
      .not("id", "in", `(${activeIds.join(",")})`)
  } catch (e) {
    // Non-critical
  }

  // 4. Upsert signals
  const { error: upsertErr } = await supabase
    .from("signals")
    .upsert(signals, { onConflict: "id" })

  if (upsertErr) {
    console.error("[sync-signals] Upsert error:", upsertErr)
    return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, synced: signals.length, platforms: { kalshi: signals.filter(s => s.platform === "Kalshi").length, polymarket: signals.filter(s => s.platform === "Polymarket").length } })
}

/**
 * Kalshi Settlement Worker (DEMO ONLY)
 *
 * - Polls open Kalshi trades in Supabase `trade_history`
 * - Queries Kalshi demo `/portfolio/settlements` to detect resolved markets
 * - Computes win/loss + PnL and persists to:
 *   - trade_history (outcome, pnl, exit_price, closed_at)
 *   - bot_predictions (actual_outcome, pnl)
 */

import { KalshiTrader } from "../../intelligence/kalshi-trader";
import { closeTradeRecord, getOpenTradeRecords, markBotPredictionsResolved, saveTradeRecord } from "../../lib/supabase-memory";
import { logPositionClose } from "../trade-safety";
import { updateKalshiTradeOutcome, logKalshiTrade } from "./learning-loop";

/**
 * LEARNING LOOP MIDDLEWARE
 * Intercepts trade placement and logs to kalshi_learning_data
 */
export async function logTradeToLearningLoop(trade: {
  tradeId: string;
  marketTicker: string;
  marketTitle?: string;
  marketCategory: string;
  predictedProbability: number;
  marketOdds: number;
  side: 'yes' | 'no';
  stakeUsd: number;
  contracts: number;
  entryPriceCents: number;
  marketCloseTs: Date;
}): Promise<void> {
  await logKalshiTrade(trade);
}

type KalshiSettlement = {
  ticker: string;
  market_result: "yes" | "no";
  settled_time?: string;
  fee_cost?: string | number;
};

export class KalshiSettlementWorker {
  private kalshi: KalshiTrader;

  constructor() {
    this.kalshi = new KalshiTrader();
  }

  private computePnLUsd(params: {
    side: "yes" | "no";
    contracts: number;
    entryPriceCents: number;
    marketResult: "yes" | "no";
    feesUsd: number;
  }): { outcome: "win" | "loss"; pnlUsd: number; exitPriceCents: number } {
    const { side, contracts, entryPriceCents, marketResult, feesUsd } = params;
    const isWin = side === marketResult;

    const costUsd = (contracts * entryPriceCents) / 100;
    const payoutUsd = isWin ? contracts * 1 : 0;
    const pnlUsd = payoutUsd - costUsd - feesUsd;
    const exitPriceCents = isWin ? 100 : 0;

    return { outcome: isWin ? "win" : "loss", pnlUsd, exitPriceCents };
  }

  /**
   * Fetch settlements for a single ticker and return the most recent one.
   * We keep this simple and low-rate; the KalshiTrader already rate-limits.
   */
  private async getLatestSettlementForTicker(ticker: string): Promise<KalshiSettlement | null> {
    const settlements = await this.kalshi.getSettlementsForTicker(ticker, 1);
    return settlements?.[0] || null;
  }

  async runOnce(): Promise<void> {
    const openTrades = await getOpenTradeRecords("kalshi", 250);
    if (openTrades.length === 0) return;

    for (const trade of openTrades) {
      if (!trade.market_id) continue;
      if (trade.trade_type !== "yes" && trade.trade_type !== "no") continue;

      const settlement = await this.getLatestSettlementForTicker(trade.market_id);
      if (!settlement) continue;

      const contracts =
        typeof trade.contracts === "number" && trade.contracts > 0
          ? trade.contracts
          : this.kalshi.usdToContracts(trade.amount, Number(trade.entry_price));

      if (!contracts || contracts <= 0) continue;

      const feeUsd = typeof trade.fees === "number" ? trade.fees : Number(trade.fees || 0);
      const { outcome, pnlUsd, exitPriceCents } = this.computePnLUsd({
        side: trade.trade_type,
        contracts,
        entryPriceCents: Number(trade.entry_price),
        marketResult: settlement.market_result,
        feesUsd: feeUsd,
      });

      const closedAt = settlement.settled_time ? new Date(settlement.settled_time) : new Date();

      await closeTradeRecord(trade.id as string, {
        outcome,
        pnl: pnlUsd,
        exit_price: exitPriceCents,
        closed_at: closedAt,
        contracts,
      });

      await markBotPredictionsResolved("kalshi", trade.market_id, outcome, pnlUsd);

      // BUG #7: Exit/close logging
      await logPositionClose(trade.market_id, pnlUsd, exitPriceCents);

      // LEARNING LOOP: Update trade outcome (trigger will update calibration)
      await updateKalshiTradeOutcome({
        tradeId: trade.id as string,
        actualOutcome: settlement.market_result,
        pnlUsd,
      });
    }
  }
}


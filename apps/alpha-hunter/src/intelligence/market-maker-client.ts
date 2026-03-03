/**
 * Market-maker execution filter (Progno).
 * Fetches trade/wait/avoid + optional limit price for a Kalshi ticker.
 * Used before placing live Kalshi orders; on error or timeout we proceed (fallback).
 */

export interface MarketMakerAdvice {
  action: 'trade' | 'wait' | 'avoid';
  reason: string;
  suggestedLimitPrice?: number; // cents
  liquidity?: 'high' | 'medium' | 'low';
}

/** Progno production URL (Vercel). Override with PROGNO_BASE_URL for local or custom domain. */
const PROGNO_BASE = process.env.PROGNO_BASE_URL || 'https://cevict-monorepo-progno-one.vercel.app';
const TIMEOUT_MS = 3500;
const DISABLED = process.env.DISABLE_MARKET_MAKER === '1' || process.env.DISABLE_MARKET_MAKER === 'true';

/**
 * Get market-maker advice for a Kalshi ticker.
 * Returns null on error/timeout/disabled so callers can proceed (fallback).
 */
export async function getMarketMakerAdvice(ticker: string): Promise<MarketMakerAdvice | null> {
  if (DISABLED) return null;

  const url = `${PROGNO_BASE.replace(/\/$/, '')}/api/markets/market-makers?platform=kalshi&marketId=${encodeURIComponent(ticker)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.analysis) return null;
    const a = data.analysis;
    const rec = a.tradingRecommendation || {};
    return {
      action: (rec.action || 'wait') as 'trade' | 'wait' | 'avoid',
      reason: rec.reason || '',
      suggestedLimitPrice: rec.suggestedLimitPrice != null ? Number(rec.suggestedLimitPrice) : undefined,
      liquidity: a.liquidity?.level,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

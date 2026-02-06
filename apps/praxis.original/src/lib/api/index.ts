// Unified API exports and cross-platform utilities

export * from './kalshi';
export * from './polymarket';

import { kalshiDemo, type KalshiMarket } from './kalshi';
import { polymarket, PolymarketClient, type PolymarketMarket, type PolymarketEvent } from './polymarket';

// Cross-platform market types
export interface UnifiedMarket {
  id: string;
  title: string;
  platform: 'kalshi' | 'polymarket';
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  closeTime: string;
  status: 'open' | 'closed' | 'settled';
  originalData: KalshiMarket | PolymarketMarket;
}

export interface ArbitrageOpportunity {
  id: string;
  title: string;
  platform1: {
    name: 'kalshi' | 'polymarket';
    market: UnifiedMarket;
    yesPrice: number;
    noPrice: number;
  };
  platform2: {
    name: 'kalshi' | 'polymarket';
    market: UnifiedMarket;
    yesPrice: number;
    noPrice: number;
  };
  spread: number;
  profitPercent: number;
  totalLiquidity: number;
  riskLevel: 'low' | 'medium' | 'high';
  expiresAt: string;
  discoveredAt: string;
}

// Convert Kalshi market to unified format
export function normalizeKalshiMarket(market: KalshiMarket): UnifiedMarket {
  return {
    id: market.ticker,
    title: market.title,
    platform: 'kalshi',
    category: market.category,
    yesPrice: market.yes_ask / 100, // Convert cents to dollars
    noPrice: market.no_ask / 100,
    volume24h: market.volume_24h,
    liquidity: market.liquidity,
    closeTime: market.close_time,
    status: market.status,
    originalData: market,
  };
}

// Convert Polymarket market to unified format
export function normalizePolymarketMarket(market: PolymarketMarket, event?: PolymarketEvent): UnifiedMarket {
  const prices = PolymarketClient.parseOutcomePrices(market.outcome_prices);
  const outcomes = PolymarketClient.parseOutcomes(market.outcomes);

  // Find Yes/No prices (usually index 0 = Yes, 1 = No)
  const yesIndex = outcomes.findIndex(o => o.toLowerCase() === 'yes');
  const noIndex = outcomes.findIndex(o => o.toLowerCase() === 'no');

  return {
    id: market.id,
    title: market.question,
    platform: 'polymarket',
    category: event?.category || 'unknown',
    yesPrice: prices[yesIndex >= 0 ? yesIndex : 0] || 0,
    noPrice: prices[noIndex >= 0 ? noIndex : 1] || 0,
    volume24h: market.volume_24hr,
    liquidity: market.liquidity,
    closeTime: market.end_date_iso,
    status: market.closed ? 'closed' : market.active ? 'open' : 'settled',
    originalData: market,
  };
}

// Fetch markets from both platforms
export async function fetchAllMarkets(): Promise<{
  kalshi: UnifiedMarket[];
  polymarket: UnifiedMarket[];
}> {
  const [kalshiResult, polymarketEvents] = await Promise.allSettled([
    kalshiDemo.getMarkets({ status: 'open', limit: 100 }),
    polymarket.getEvents({ active: true, limit: 50 }),
  ]);

  const kalshiMarkets: UnifiedMarket[] =
    kalshiResult.status === 'fulfilled'
      ? kalshiResult.value.markets.map(normalizeKalshiMarket)
      : [];

  const polymarketMarkets: UnifiedMarket[] = [];
  if (polymarketEvents.status === 'fulfilled') {
    for (const event of polymarketEvents.value) {
      for (const market of event.markets || []) {
        polymarketMarkets.push(normalizePolymarketMarket(market, event));
      }
    }
  }

  return { kalshi: kalshiMarkets, polymarket: polymarketMarkets };
}

// Find similar markets across platforms using fuzzy matching
export function findSimilarMarkets(
  kalshiMarkets: UnifiedMarket[],
  polymarketMarkets: UnifiedMarket[],
  threshold: number = 0.6
): Array<{ kalshi: UnifiedMarket; polymarket: UnifiedMarket; similarity: number }> {
  const matches: Array<{ kalshi: UnifiedMarket; polymarket: UnifiedMarket; similarity: number }> = [];

  for (const k of kalshiMarkets) {
    for (const p of polymarketMarkets) {
      const similarity = calculateTitleSimilarity(k.title, p.title);
      if (similarity >= threshold) {
        matches.push({ kalshi: k, polymarket: p, similarity });
      }
    }
  }

  // Sort by similarity descending
  return matches.sort((a, b) => b.similarity - a.similarity);
}

// Simple title similarity using word overlap
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  const words1Array = Array.from(words1);
  for (const word of words1Array) {
    if (words2.has(word)) overlap++;
  }

  return overlap / Math.max(words1.size, words2.size);
}

// Detect arbitrage opportunities
export function detectArbitrageOpportunities(
  matches: Array<{ kalshi: UnifiedMarket; polymarket: UnifiedMarket; similarity: number }>
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const match of matches) {
    // Check for price discrepancy
    // Arbitrage exists if: yes_price_platform1 + no_price_platform2 < 1
    // Or: no_price_platform1 + yes_price_platform2 < 1

    const combo1 = match.kalshi.yesPrice + match.polymarket.noPrice;
    const combo2 = match.kalshi.noPrice + match.polymarket.yesPrice;

    // Ignore invalid data: both sides must have real prices (avoid 0+0 false arbs)
    const hasValidPrices =
      (match.kalshi.yesPrice > 0 || match.kalshi.noPrice > 0) &&
      (match.polymarket.yesPrice > 0 || match.polymarket.noPrice > 0);
    if (!hasValidPrices) continue;

    if (combo1 < 0.99 || combo2 < 0.99) {
      const isCombo1Better = combo1 < combo2;
      const spread = isCombo1Better ? (1 - combo1) : (1 - combo2);
      const profitPercent = spread * 100;

      // Determine risk level based on liquidity and spread size
      let riskLevel: 'low' | 'medium' | 'high' = 'high';
      const minLiquidity = Math.min(match.kalshi.liquidity, match.polymarket.liquidity);
      if (minLiquidity > 10000 && profitPercent > 2) riskLevel = 'low';
      else if (minLiquidity > 1000 && profitPercent > 1) riskLevel = 'medium';

      opportunities.push({
        id: `${match.kalshi.id}-${match.polymarket.id}`,
        title: match.kalshi.title,
        platform1: {
          name: 'kalshi',
          market: match.kalshi,
          yesPrice: match.kalshi.yesPrice,
          noPrice: match.kalshi.noPrice,
        },
        platform2: {
          name: 'polymarket',
          market: match.polymarket,
          yesPrice: match.polymarket.yesPrice,
          noPrice: match.polymarket.noPrice,
        },
        spread,
        profitPercent,
        totalLiquidity: match.kalshi.liquidity + match.polymarket.liquidity,
        riskLevel,
        expiresAt: match.kalshi.closeTime < match.polymarket.closeTime
          ? match.kalshi.closeTime
          : match.polymarket.closeTime,
        discoveredAt: new Date().toISOString(),
      });
    }
  }

  // Sort by profit potential
  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
}

// Single-platform arbitrage (yes + no prices don't equal 1)
export function detectSinglePlatformArbitrage(markets: UnifiedMarket[]): Array<{
  market: UnifiedMarket;
  spread: number;
  profitPercent: number;
}> {
  const opportunities: Array<{
    market: UnifiedMarket;
    spread: number;
    profitPercent: number;
  }> = [];

  for (const market of markets) {
    const combined = market.yesPrice + market.noPrice;
    if (combined < 0.01) continue; // skip zero/missing price data
    if (combined < 0.99) {
      const spread = 1 - combined;
      opportunities.push({
        market,
        spread,
        profitPercent: spread * 100,
      });
    }
  }

  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
}

// Full arbitrage scan
export async function scanForArbitrage(): Promise<{
  crossPlatform: ArbitrageOpportunity[];
  kalshiOnly: Array<{ market: UnifiedMarket; spread: number; profitPercent: number }>;
  polymarketOnly: Array<{ market: UnifiedMarket; spread: number; profitPercent: number }>;
  timestamp: string;
}> {
  const { kalshi, polymarket: poly } = await fetchAllMarkets();

  const matches = findSimilarMarkets(kalshi, poly);
  const crossPlatform = detectArbitrageOpportunities(matches);
  const kalshiOnly = detectSinglePlatformArbitrage(kalshi);
  const polymarketOnly = detectSinglePlatformArbitrage(poly);

  return {
    crossPlatform,
    kalshiOnly,
    polymarketOnly,
    timestamp: new Date().toISOString(),
  };
}

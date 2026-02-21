/**
 * Market Maker Analysis API
 * Analyzes market maker activity and liquidity on Kalshi and Polymarket
 */

import { NextRequest, NextResponse } from 'next/server';
import { KalshiClient } from '@/lib/markets/kalshi-client';
import { PolymarketClient } from '@/lib/markets/polymarket-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface MarketMakerAnalysis {
  platform: 'kalshi' | 'polymarket';
  marketId: string;
  question: string;
  liquidity: {
    level: 'high' | 'medium' | 'low';
    volume: number;
    openInterest?: number;
    spread: number;
  };
  marketMakerActivity: {
    detected: boolean;
    confidence: 'high' | 'medium' | 'low';
    indicators: string[];
  };
  orderBookDepth: {
    levels: number;
    totalSize: number;
    imbalance: number; // -1 to 1, negative = more asks, positive = more bids
  };
  tradingRecommendation: {
    action: 'trade' | 'wait' | 'avoid';
    reason: string;
    optimalEntry?: 'market' | 'limit';
    suggestedLimitPrice?: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'kalshi' | 'polymarket' | null;
    const marketId = searchParams.get('marketId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (marketId) {
      // Analyze specific market
      const analysis = await analyzeMarket(platform || 'kalshi', marketId);
      return NextResponse.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString(),
      });
    }

    // Analyze multiple markets
    const analyses: MarketMakerAnalysis[] = [];

    if (!platform || platform === 'kalshi') {
      const kalshiClient = new KalshiClient();
      if (kalshiClient.isConfigured()) {
        const markets = await kalshiClient.getSportsMarkets(limit, 'open');
        for (const market of markets) {
          try {
            const analysis = await analyzeKalshiMarket(kalshiClient, market);
            analyses.push(analysis);
          } catch (error) {
            console.error(`Error analyzing Kalshi market ${market.ticker}:`, error);
          }
        }
      }
    }

    if (!platform || platform === 'polymarket') {
      const polymarketClient = new PolymarketClient();
      const markets = await polymarketClient.getSportsMarkets(limit, true);
      for (const market of markets) {
        try {
          const analysis = await analyzePolymarketMarket(polymarketClient, market);
          analyses.push(analysis);
        } catch (error) {
          console.error(`Error analyzing Polymarket market ${market.conditionId}:`, error);
        }
      }
    }

    // Sort by liquidity (highest first)
    analyses.sort((a, b) => {
      const liquidityOrder = { high: 3, medium: 2, low: 1 };
      return liquidityOrder[b.liquidity.level] - liquidityOrder[a.liquidity.level];
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      count: analyses.length,
      analyses: analyses.slice(0, limit),
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    console.error('Error analyzing market makers:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Analyze specific market
 */
async function analyzeMarket(
  platform: 'kalshi' | 'polymarket',
  marketId: string
): Promise<MarketMakerAnalysis> {
  if (platform === 'kalshi') {
    const client = new KalshiClient();
    const market = await client.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }
    return analyzeKalshiMarket(client, market);
  } else {
    const client = new PolymarketClient();
    const market = await client.getMarket(marketId);
    if (!market) {
      throw new Error('Market not found');
    }
    return analyzePolymarketMarket(client, market);
  }
}

/**
 * Analyze Kalshi market for market maker activity
 */
async function analyzeKalshiMarket(
  client: KalshiClient,
  market: any
): Promise<MarketMakerAnalysis> {
  const prob = client.calculateImpliedProbability(market);
  const orderBook = await client.getOrderBook(market.ticker);

  // Detect market maker activity
  const mmIndicators: string[] = [];
  let mmDetected = false;
  let mmConfidence: 'high' | 'medium' | 'low' = 'low';

  // Indicators:
  // 1. Tight spread
  if (prob.spread < 2) {
    mmIndicators.push('Tight bid-ask spread');
    mmDetected = true;
    mmConfidence = 'high';
  }

  // 2. High volume relative to open interest
  if (market.volume > market.open_interest * 0.5) {
    mmIndicators.push('High trading volume');
    mmDetected = true;
    if (mmConfidence === 'low') mmConfidence = 'medium';
  }

  // 3. Order book depth
  let orderBookDepth = { levels: 0, totalSize: 0, imbalance: 0 };
  if (orderBook) {
    const yesBids = orderBook.yes_bids?.length || 0;
    const yesAsks = orderBook.yes_asks?.length || 0;
    const totalBids = orderBook.yes_bids?.reduce((sum, b) => sum + b.size, 0) || 0;
    const totalAsks = orderBook.yes_asks?.reduce((sum, a) => sum + a.size, 0) || 0;
    
    orderBookDepth = {
      levels: yesBids + yesAsks,
      totalSize: totalBids + totalAsks,
      imbalance: totalBids > 0 && totalAsks > 0
        ? (totalBids - totalAsks) / (totalBids + totalAsks)
        : 0,
    };

    if (orderBookDepth.levels > 5) {
      mmIndicators.push('Deep order book');
      mmDetected = true;
      if (mmConfidence === 'low') mmConfidence = 'medium';
    }
  }

  // Trading recommendation
  let action: 'trade' | 'wait' | 'avoid' = 'wait';
  let reason = '';
  let optimalEntry: 'market' | 'limit' | undefined;
  let suggestedLimitPrice: number | undefined;

  if (prob.liquidity === 'high' && prob.spread < 3) {
    action = 'trade';
    reason = 'High liquidity and tight spread - good execution conditions';
    optimalEntry = 'limit';
    suggestedLimitPrice = prob.yesProb * 100; // Mid-price in cents
  } else if (prob.liquidity === 'low' || prob.spread > 10) {
    action = 'avoid';
    reason = 'Low liquidity or wide spread - poor execution conditions';
  } else {
    action = 'wait';
    reason = 'Moderate conditions - wait for better entry';
  }

  return {
    platform: 'kalshi',
    marketId: market.ticker,
    question: market.title,
    liquidity: {
      level: prob.liquidity,
      volume: market.volume,
      openInterest: market.open_interest,
      spread: prob.spread,
    },
    marketMakerActivity: {
      detected: mmDetected,
      confidence: mmConfidence,
      indicators: mmIndicators,
    },
    orderBookDepth,
    tradingRecommendation: {
      action,
      reason,
      optimalEntry,
      suggestedLimitPrice,
    },
  };
}

/**
 * Analyze Polymarket market for market maker activity
 */
async function analyzePolymarketMarket(
  client: PolymarketClient,
  market: any
): Promise<MarketMakerAnalysis> {
  const prob = client.calculateImpliedProbability(market);
  const orderBook = await client.getOrderBook(market.conditionId);

  // Detect market maker activity (decentralized on Polymarket)
  const mmIndicators: string[] = [];
  let mmDetected = false;
  let mmConfidence: 'high' | 'medium' | 'low' = 'low';

  // Indicators:
  // 1. High liquidity
  if (market.liquidity > 10000) {
    mmIndicators.push('High liquidity pool');
    mmDetected = true;
    mmConfidence = 'high';
  }

  // 2. Tight spread
  if (prob.spread < 0.02) {
    mmIndicators.push('Tight price spread');
    mmDetected = true;
    if (mmConfidence === 'low') mmConfidence = 'medium';
  }

  // 3. Consistent pricing
  if (client.hasMarketMakerActivity(market)) {
    mmIndicators.push('Market maker activity detected');
    mmDetected = true;
    mmConfidence = 'high';
  }

  // Order book analysis
  let orderBookDepth = { levels: 0, totalSize: 0, imbalance: 0 };
  if (orderBook) {
    const bids = orderBook.bids?.length || 0;
    const asks = orderBook.asks?.length || 0;
    const totalBids = orderBook.bids?.reduce((sum, b) => sum + b.size, 0) || 0;
    const totalAsks = orderBook.asks?.reduce((sum, a) => sum + a.size, 0) || 0;
    
    orderBookDepth = {
      levels: bids + asks,
      totalSize: totalBids + totalAsks,
      imbalance: totalBids > 0 && totalAsks > 0
        ? (totalBids - totalAsks) / (totalBids + totalAsks)
        : 0,
    };
  }

  // Trading recommendation
  let action: 'trade' | 'wait' | 'avoid' = 'wait';
  let reason = '';
  let optimalEntry: 'market' | 'limit' | undefined;

  if (prob.liquidity === 'high' && prob.spread < 0.03) {
    action = 'trade';
    reason = 'High liquidity and tight spread - good execution conditions';
    optimalEntry = 'limit';
  } else if (prob.liquidity === 'low' || prob.spread > 0.1) {
    action = 'avoid';
    reason = 'Low liquidity or wide spread - poor execution conditions';
  } else {
    action = 'wait';
    reason = 'Moderate conditions - wait for better entry';
  }

  return {
    platform: 'polymarket',
    marketId: market.conditionId,
    question: market.question,
    liquidity: {
      level: prob.liquidity,
      volume: market.volume,
      spread: prob.spread,
    },
    marketMakerActivity: {
      detected: mmDetected,
      confidence: mmConfidence,
      indicators: mmIndicators,
    },
    orderBookDepth,
    tradingRecommendation: {
      action,
      reason,
      optimalEntry,
    },
  };
}

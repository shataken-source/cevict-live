import { NextResponse } from 'next/server';
import { scanForArbitrage, fetchAllMarkets, findSimilarMarkets, detectArbitrageOpportunities } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minSpread = parseFloat(searchParams.get('minSpread') || '0.5'); // Minimum spread in %
  const minLiquidity = parseFloat(searchParams.get('minLiquidity') || '0');
  const includeAllMatches = searchParams.get('includeAllMatches') === 'true';

  try {
    const result = await scanForArbitrage();
    
    // Filter by minimum spread
    const filteredCrossPlatform = result.crossPlatform.filter(
      opp => opp.profitPercent >= minSpread && opp.totalLiquidity >= minLiquidity
    );

    const filteredKalshi = result.kalshiOnly.filter(
      opp => opp.profitPercent >= minSpread && opp.market.liquidity >= minLiquidity
    );

    const filteredPolymarket = result.polymarketOnly.filter(
      opp => opp.profitPercent >= minSpread && opp.market.liquidity >= minLiquidity
    );

    // Calculate summary stats
    const totalOpportunities = filteredCrossPlatform.length + filteredKalshi.length + filteredPolymarket.length;
    const avgProfit = totalOpportunities > 0
      ? (
          filteredCrossPlatform.reduce((sum, o) => sum + o.profitPercent, 0) +
          filteredKalshi.reduce((sum, o) => sum + o.profitPercent, 0) +
          filteredPolymarket.reduce((sum, o) => sum + o.profitPercent, 0)
        ) / totalOpportunities
      : 0;

    const response = {
      summary: {
        totalOpportunities,
        crossPlatformCount: filteredCrossPlatform.length,
        singlePlatformCount: filteredKalshi.length + filteredPolymarket.length,
        avgProfitPercent: avgProfit.toFixed(2),
        scanTime: result.timestamp,
      },
      crossPlatform: filteredCrossPlatform,
      singlePlatform: {
        kalshi: filteredKalshi,
        polymarket: filteredPolymarket,
      },
      filters: {
        minSpread,
        minLiquidity,
      },
    };

    // Optionally include all market matches for debugging
    if (includeAllMatches) {
      const { kalshi, polymarket } = await fetchAllMarkets();
      const allMatches = findSimilarMarkets(kalshi, polymarket, 0.4);
      Object.assign(response, {
        debug: {
          allMatches: allMatches.slice(0, 20),
          kalshiMarketsCount: kalshi.length,
          polymarketMarketsCount: polymarket.length,
        },
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Arbitrage scan error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scan for arbitrage opportunities', 
        details: String(error),
        // Return empty results instead of failing completely
        summary: { totalOpportunities: 0, scanTime: new Date().toISOString() },
        crossPlatform: [],
        singlePlatform: { kalshi: [], polymarket: [] },
      },
      { status: 500 }
    );
  }
}

// POST endpoint for custom market comparison
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kalshiTicker, polymarketId } = body;

    if (!kalshiTicker && !polymarketId) {
      return NextResponse.json(
        { error: 'Provide kalshiTicker or polymarketId' },
        { status: 400 }
      );
    }

    // Fetch specific markets and compare
    const { kalshi, polymarket } = await fetchAllMarkets();
    
    const kalshiMarket = kalshiTicker 
      ? kalshi.find(m => m.id === kalshiTicker)
      : null;
    
    const polymarketMarket = polymarketId
      ? polymarket.find(m => m.id === polymarketId)
      : null;

    if (kalshiMarket && polymarketMarket) {
      // Direct comparison
      const combo1 = kalshiMarket.yesPrice + polymarketMarket.noPrice;
      const combo2 = kalshiMarket.noPrice + polymarketMarket.yesPrice;
      
      const hasArbitrage = combo1 < 0.99 || combo2 < 0.99;
      const spread = hasArbitrage ? Math.min(1 - combo1, 1 - combo2) : 0;

      return NextResponse.json({
        comparison: {
          kalshi: kalshiMarket,
          polymarket: polymarketMarket,
          combo1: { 
            strategy: 'Buy YES on Kalshi + Buy NO on Polymarket',
            cost: combo1,
            profit: 1 - combo1,
          },
          combo2: {
            strategy: 'Buy NO on Kalshi + Buy YES on Polymarket',
            cost: combo2,
            profit: 1 - combo2,
          },
          hasArbitrage,
          spread,
          profitPercent: spread * 100,
        },
      });
    }

    return NextResponse.json({
      kalshiMarket,
      polymarketMarket,
      error: 'Could not find both markets for comparison',
    });

  } catch (error) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to compare markets', details: String(error) },
      { status: 500 }
    );
  }
}

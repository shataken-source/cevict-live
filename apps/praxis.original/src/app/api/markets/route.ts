import { NextResponse } from 'next/server';
import { fetchAllMarkets, normalizeKalshiMarket, normalizePolymarketMarket } from '@/lib/api';
import { kalshiDemo } from '@/lib/api/kalshi';
import { polymarket } from '@/lib/api/polymarket';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform'); // 'kalshi' | 'polymarket' | 'all'
  const limit = parseInt(searchParams.get('limit') || '50');
  const status = searchParams.get('status') || 'open';

  try {
    if (platform === 'kalshi') {
      const result = await kalshiDemo.getMarkets({ 
        status: status as 'open' | 'closed' | 'settled',
        limit 
      });
      return NextResponse.json({
        platform: 'kalshi',
        markets: result.markets.map(normalizeKalshiMarket),
        count: result.markets.length,
        cursor: result.cursor,
      });
    }

    if (platform === 'polymarket') {
      const events = await polymarket.getEvents({ 
        active: status === 'open',
        closed: status === 'closed',
        limit 
      });
      
      const markets = events.flatMap(event => 
        (event.markets || []).map(m => normalizePolymarketMarket(m, event))
      );

      return NextResponse.json({
        platform: 'polymarket',
        markets,
        count: markets.length,
        eventsCount: events.length,
      });
    }

    // Fetch from both
    const { kalshi, polymarket: poly } = await fetchAllMarkets();
    
    return NextResponse.json({
      kalshi: {
        markets: kalshi,
        count: kalshi.length,
      },
      polymarket: {
        markets: poly,
        count: poly.length,
      },
      totalCount: kalshi.length + poly.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets', details: String(error) },
      { status: 500 }
    );
  }
}

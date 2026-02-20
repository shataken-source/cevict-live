import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePolymarketPicks, hasRecentPolymarketData } from '@/lib/polymarket-integration';

/**
 * GET /api/polymarket/picks
 * Returns live Polymarket picks from Supabase polymarket_predictions table
 * Query params:
 *   - category: Filter by category (optional)
 *   - limit: Max results (default 20)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // Check if we have recent live data
    const hasRecent = await hasRecentPolymarketData();
    
    if (!hasRecent) {
      console.log('⚠️ No recent Polymarket data available');
    }

    // Fetch picks with timeout
    const picksPromise = fetchLivePolymarketPicks(category);
    const timeoutPromise = new Promise<[]>((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), 5000)
    );

    const picks = await Promise.race([picksPromise, timeoutPromise]) as Awaited<ReturnType<typeof fetchLivePolymarketPicks>>;

    // Group by tier based on confidence
    const elite = picks.filter(p => p.confidence >= 80);
    const pro = picks.filter(p => p.confidence >= 65 && p.confidence < 80);
    const free = picks.filter(p => p.confidence < 65);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      elite,
      pro,
      free,
      total: picks.length,
      source: hasRecent ? 'live_supabase' : 'cached_or_empty',
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute cache
      }
    });

  } catch (error: any) {
    console.error('❌ Error in /api/polymarket/picks:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch Polymarket picks',
      elite: [],
      pro: [],
      free: [],
      total: 0
    }, { 
      status: 503,
      headers: {
        'Retry-After': '60'
      }
    });
  }
}

/**
 * POST /api/polymarket/picks
 * Webhook endpoint for Alpha-Hunter to push new predictions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the payload
    if (!body.predictions || !Array.isArray(body.predictions)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payload: predictions array required'
      }, { status: 400 });
    }

    // Return success - actual save happens in Alpha-Hunter -> Supabase
    return NextResponse.json({
      success: true,
      message: `Received ${body.predictions.length} Polymarket predictions`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/polymarket/picks:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Invalid request'
    }, { status: 400 });
  }
}

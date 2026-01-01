import { NextResponse } from 'next/server';
import { fetchLiveKalshiPicks, hasRecentLiveData } from '@/lib/kalshi-integration';

// Kalshi market categories
const CATEGORIES = ['politics', 'economics', 'weather', 'entertainment', 'crypto', 'world'] as const;

interface KalshiPick {
  id: string;
  market: string;
  category: typeof CATEGORIES[number];
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  historicalPattern?: string;
  marketId?: string; // For Kalshi referral links
}

// ============================================================================
// CRITICAL: ALL SAMPLE DATA REMOVED - REAL DATA ONLY
// ============================================================================
// This API endpoint ONLY returns live data from Alpha-Hunter bot.
// If no live data is available, it returns a 503 error.
// NO FALLBACKS. NO MOCK DATA. PRODUCTION ONLY.
// ============================================================================

// GET handler - fetch picks
export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`[${new Date().toISOString()}] Fetching picks for category: ${category}, limit: ${limit}`);

    // CRITICAL: ONLY USE LIVE DATA - NO FALLBACKS
    // Add timeout wrapper
    const fetchPromise = fetchLiveKalshiPicks(category === 'all' ? undefined : category);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('fetchLiveKalshiPicks timed out after 5 seconds')), 5000)
    );
    
    const livePicks = await Promise.race([fetchPromise, timeoutPromise]) as any[];
    
    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Fetched ${livePicks?.length || 0} picks in ${elapsed}ms`);
    
    if (!livePicks || livePicks.length === 0) {
      console.error('❌ NO LIVE DATA AVAILABLE - Alpha-Hunter may not be running');
      return NextResponse.json({
        success: false,
        error: 'NO_LIVE_DATA',
        message: 'No live predictions available. Alpha-Hunter bot may not be running or no high-confidence picks found.',
        timestamp: new Date().toISOString(),
        elapsed: `${elapsed}ms`,
      }, { status: 503 });
    }

    console.log(`✅ Using LIVE data from alpha-hunter: ${livePicks.length} picks`);

    // Sort by edge (highest first) and limit
    const sortedPicks = livePicks
      .sort((a, b) => b.edge - a.edge)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      category,
      count: sortedPicks.length,
      picks: sortedPicks,
      isLiveData: true, // ALWAYS true - we removed fallback logic
      stats: {
        avgEdge: sortedPicks.reduce((sum, p) => sum + p.edge, 0) / sortedPicks.length,
        avgConfidence: sortedPicks.reduce((sum, p) => sum + p.confidence, 0) / sortedPicks.length,
        yesPicks: sortedPicks.filter(p => p.pick === 'YES').length,
        noPicks: sortedPicks.filter(p => p.pick === 'NO').length,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching Kalshi picks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'FETCH_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST handler - webhook for new picks from our trading bot
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { picks, source } = body;

    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.PROGNO_INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In production, this would store picks in database
    console.log(`✅ Received ${picks?.length || 0} picks from ${source}`);

    return NextResponse.json({
      success: true,
      received: picks?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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

// This would normally connect to our Kalshi trading bot database
// For now, generate intelligent picks based on market analysis
function generatePicks(category?: string): KalshiPick[] {
  const allPicks: KalshiPick[] = [
    // Politics
    {
      id: 'KXPRES-DEM-2028',
      marketId: 'KXPRES-DEM-2028',
      market: 'Will Democrats win the 2028 Presidential Election?',
      category: 'politics',
      pick: 'YES',
      probability: 52,
      edge: 4.2,
      marketPrice: 45,
      expires: '2028-11-03',
      reasoning: 'Historical: Incumbent party loses after 2 terms 75% of time. Demographics favor Dems long-term.',
      confidence: 58,
      historicalPattern: 'Party in power for 2+ terms loses 6 of last 8 times',
    },
    {
      id: 'KXFED-JAN25-CUT',
      marketId: 'KXFED-JAN25-CUT',
      market: 'Will the Fed cut rates in January 2025?',
      category: 'economics',
      pick: 'NO',
      probability: 72,
      edge: 8.5,
      marketPrice: 28,
      expires: '2025-01-29',
      reasoning: 'Fed historically cautious in Q1. Inflation still above 2% target. No urgency to cut.',
      confidence: 68,
      historicalPattern: 'Fed rate cuts in January occur only 15% of time historically',
    },
    {
      id: 'KXGDP-Q1-25',
      market: 'Will US GDP growth exceed 3% in Q1 2025?',
      category: 'economics',
      pick: 'NO',
      probability: 65,
      edge: 5.8,
      marketPrice: 42,
      expires: '2025-04-30',
      reasoning: 'Q1 GDP typically weakest quarter. Consensus is 2.1%. Above 3% would be significant beat.',
      confidence: 62,
      historicalPattern: 'Q1 GDP exceeds 3% only 20% of years since 2010',
    },
    {
      id: 'KXTEMP-JAN25-RECORD',
      market: 'Will January 2025 be warmest January on record globally?',
      category: 'weather',
      pick: 'YES',
      probability: 68,
      edge: 7.2,
      marketPrice: 52,
      expires: '2025-02-15',
      reasoning: 'El Niño pattern continues. 2024 set numerous records. Global warming trend persistent.',
      confidence: 65,
      historicalPattern: 'Each of last 10 years has had warmest month records broken',
    },
    {
      id: 'KXHURR-2025-MAJOR',
      market: 'Will 2025 Atlantic hurricane season have 5+ major hurricanes?',
      category: 'weather',
      pick: 'YES',
      probability: 62,
      edge: 6.1,
      marketPrice: 48,
      expires: '2025-11-30',
      reasoning: 'La Niña expected to return. Warm ocean temps fuel hurricanes. 2024 was active.',
      confidence: 60,
      historicalPattern: 'La Niña years average 4.2 major hurricanes vs 2.8 in El Niño',
    },
    {
      id: 'KXOSCARS-CONCLAVE',
      market: 'Will "Conclave" win Best Picture at 2025 Oscars?',
      category: 'entertainment',
      pick: 'YES',
      probability: 35,
      edge: 8.5,
      marketPrice: 22,
      expires: '2025-03-02',
      reasoning: 'Vatican drama historically performs well. Strong director, ensemble cast. PGA/DGA buzz.',
      confidence: 55,
      historicalPattern: 'Religious/institutional dramas win 25% when nominated',
    },
    {
      id: 'KXOSCARS-ACTOR',
      market: 'Will Adrien Brody win Best Actor at 2025 Oscars?',
      category: 'entertainment',
      pick: 'YES',
      probability: 65,
      edge: 10.2,
      marketPrice: 48,
      expires: '2025-03-02',
      reasoning: 'Previous winner, comeback narrative. Strong reviews for The Brutalist. SAG favorite.',
      confidence: 62,
      historicalPattern: 'Previous winners returning with strong film win 40% of time',
    },
    {
      id: 'KXBTC-100K-Q1',
      market: 'Will Bitcoin exceed $100,000 by March 31, 2025?',
      category: 'crypto',
      pick: 'YES',
      probability: 58,
      edge: 6.8,
      marketPrice: 45,
      expires: '2025-03-31',
      reasoning: 'Halving cycle peak typically 12-18 months post-halving. ETF flows strong. Q4/Q1 historically bullish.',
      confidence: 55,
      historicalPattern: 'Post-halving cycles see 5-10x gains within 18 months',
    },
    {
      id: 'KXETH-5K-2025',
      market: 'Will Ethereum exceed $5,000 in 2025?',
      category: 'crypto',
      pick: 'YES',
      probability: 52,
      edge: 4.5,
      marketPrice: 42,
      expires: '2025-12-31',
      reasoning: 'ETH follows BTC with lag. ETF approval potential. Staking yields attractive.',
      confidence: 50,
      historicalPattern: 'ETH/BTC ratio bottoming signals alt season',
    },
    {
      id: 'KXSPACE-STARSHIP',
      market: 'Will SpaceX Starship complete orbital flight by June 2025?',
      category: 'world',
      pick: 'YES',
      probability: 72,
      edge: 9.5,
      marketPrice: 55,
      expires: '2025-06-30',
      reasoning: 'Rapid iteration. Recent tests successful. Elon motivated. FAA approvals progressing.',
      confidence: 68,
      historicalPattern: 'SpaceX historically delivers 6-12 months behind initial estimates',
    },
    {
      id: 'KXCHINA-TAIWAN',
      market: 'Will China take military action against Taiwan in 2025?',
      category: 'world',
      pick: 'NO',
      probability: 92,
      edge: 3.2,
      marketPrice: 5,
      expires: '2025-12-31',
      reasoning: 'Economic deterrence strong. Military readiness uncertain. Olympics focus in past.',
      confidence: 85,
      historicalPattern: 'Major geopolitical predictions rarely happen in predicted timeframe',
    },
  ];

  if (category && category !== 'all') {
    return allPicks.filter(p => p.category === category);
  }

  return allPicks;
}

// GET handler - fetch picks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    let picks: KalshiPick[] = [];
    let isLiveData = false;

    // Try to fetch live picks from our trading bot
    try {
      const livePicks = await fetchLiveKalshiPicks(category === 'all' ? undefined : category);
      if (livePicks.length > 0) {
        picks = livePicks;
        isLiveData = true;
        console.log(`✅ Using LIVE data from alpha-hunter: ${livePicks.length} picks`);
      }
    } catch (e) {
      console.warn('Failed to fetch live picks, falling back to sample data:', e);
    }

    // Fall back to sample picks if no live data
    if (!isLiveData) {
      picks = generatePicks(category === 'all' ? undefined : category);
      console.log(`⚠️ Using SAMPLE data: ${picks.length} picks`);
    }

    // Sort by edge (highest first) and limit
    const sortedPicks = picks
      .sort((a, b) => b.edge - a.edge)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      category,
      count: sortedPicks.length,
      picks: sortedPicks,
      isLiveData, // Indicate if this is real or sample data
      stats: {
        avgEdge: sortedPicks.reduce((sum, p) => sum + p.edge, 0) / sortedPicks.length,
        avgConfidence: sortedPicks.reduce((sum, p) => sum + p.confidence, 0) / sortedPicks.length,
        yesPicks: sortedPicks.filter(p => p.pick === 'YES').length,
        noPicks: sortedPicks.filter(p => p.pick === 'NO').length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Kalshi picks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
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
    console.log(`Received ${picks?.length || 0} picks from ${source}`);

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


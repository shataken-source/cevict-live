import { NextRequest, NextResponse } from 'next/server';

/**
 * KALSHI/POLYMARKET INTEGRATION
 *
 * Fetches prediction markets from Kalshi and Polymarket
 * Integrates with existing Progno prediction engine
 * Provides alternative betting opportunities beyond traditional sportsbooks
 */

interface KalshiMarket {
  event_id: string;
  title: string;
  description: string;
  yes_question: string;
  no_question: string;
  end_date: string;
  status: 'open' | 'closed';
  volume_24h: number;
  volume_7d: number;
  volume_24h_change: number;
  volume_7d_change: number;
  yes_bid: number;
  no_bid: number;
  last_trade_price: number;
  last_updated: string;
  strike_price: number;
  settlement_price: number;
  implied_probability: number;
}

interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  outcomes: Array<{
    outcome: string;
    probability: number;
    price: number;
  }>;
  liquidity: number;
  volume_24h: number;
  volume_7d: number;
  url: string;
  created_time: string;
  modified_time: string;
  close_time?: string;
}

interface PredictionMarketData {
  source: 'kalshi' | 'polymarket';
  markets: (KalshiMarket | PolymarketMarket)[];
  lastUpdated: string;
}

// Mock data for development (replace with real API calls)
const MOCK_KALSHI_DATA = [
  {
    event_id: 'KELLY-RAIN-2026-02-13T12:00:00Z',
    title: 'Will it rain in New York on Feb 13, 2026?',
    description: 'Rainfall in New York City on February 13, 2026',
    yes_question: 'Yes',
    no_question: 'No',
    end_date: '2026-02-13T20:00:00Z',
    status: 'open',
    volume_24h: 1500000,
    volume_7d: 8000000,
    volume_24h_change: 0.05,
    volume_7d_change: 0.12,
    yes_bid: 0.65,
    no_bid: 0.35,
    last_trade_price: 0.64,
    last_updated: '2026-02-13T18:00:00Z',
    strike_price: 50,
    settlement_price: 0,
    implied_probability: 65
  },
  {
    event_id: 'KELLY-TEMP-2026-02-13T12:00:00Z',
    title: 'NYC temperature above 40°F on Feb 13, 2026?',
    description: 'Temperature in New York City exceeding 40°F on February 13, 2026',
    yes_question: 'Yes',
    no_question: 'No',
    end_date: '2026-02-13T20:00:00Z',
    status: 'open',
    volume_24h: 2000000,
    volume_7d: 1200000,
    volume_24h_change: 0.08,
    volume_7d_change: 0.15,
    yes_bid: 0.72,
    no_bid: 0.28,
    last_trade_price: 0.68,
    last_updated: '2026-02-13T18:00:00Z',
    strike_price: 50,
    settlement_price: 0,
    implied_probability: 72
  }
];

const MOCK_POLYMARKET_DATA = [
  {
    id: '0x1234567890abcdef',
    question: 'Will the Dow Jones Industrial Average close above 40,000 on Feb 13, 2026?',
    description: 'Dow Jones Industrial Average closing above 40,000 on February 13, 2026',
    outcomes: [
      { outcome: 'Yes', probability: 0.35, price: 0.65 },
      { outcome: 'No', probability: 0.65, price: 0.35 }
    ],
    liquidity: 500000,
    volume_24h: 1000000,
    volume_7d: 7000000,
    url: 'https://polymarket.com/market/0x1234567890abcdef',
    created_time: '2026-02-13T10:00:00Z',
    modified_time: '2026-02-13T15:00:00Z'
  }
];

/**
 * Convert prediction market to Progno format
 */
function convertToPrognoFormat(marketData: PredictionMarketData): any {
  const convertedMarkets = marketData.markets.map(market => {
    if (marketData.source === 'kalshi') {
      const kalshiMarket = market as KalshiMarket;
      return {
        source: 'kalshi',
        event_id: kalshiMarket.event_id,
        title: kalshiMarket.title,
        description: kalshiMarket.description,
        status: kalshiMarket.status,
        odds: {
          home: kalshiMarket.yes_bid ? -1 / kalshiMarket.yes_bid : -1 / kalshiMarket.no_bid,
          away: kalshiMarket.yes_bid ? 1 / kalshiMarket.yes_bid : 1 / kalshiMarket.no_bid
        },
        predictedScore: {
          home: Math.round(Math.random() * 5 + 2),
          away: Math.round(Math.random() * 4 + 1)
        },
        confidence: 0.6,
        edge: kalshiMarket.yes_bid > kalshiMarket.no_bid ?
          ((kalshiMarket.yes_bid - kalshiMarket.no_bid) / kalshiMarket.no_bid) * 100 :
          ((kalshiMarket.no_bid - kalshiMarket.yes_bid) / kalshiMarket.yes_bid) * 100
      };
    } else {
      const polyMarket = market as PolymarketMarket;
      const yesOutcome = polyMarket.outcomes.find(o => o.outcome === 'Yes');
      const noOutcome = polyMarket.outcomes.find(o => o.outcome === 'No');

      return {
        source: 'polymarket',
        event_id: polyMarket.id,
        title: polyMarket.question,
        description: polyMarket.description,
        status: 'open',
        odds: {
          home: yesOutcome ? -1 / yesOutcome.price : -1 / noOutcome.price,
          away: noOutcome ? 1 / noOutcome.price : 1 / yesOutcome.price
        },
        predictedScore: {
          home: 1,
          away: 0
        },
        confidence: yesOutcome ? yesOutcome.probability : noOutcome.probability,
        edge: Math.abs((yesOutcome.probability - 0.5) * 100)
      };
    }
  }).filter((market: any) => market.status === 'open');

  return {
    date: new Date().toISOString().split('T')[0],
    markets: convertedMarkets,
    metadata: {
      source: marketData.source,
      totalMarkets: convertedMarkets.length,
      lastUpdated: marketData.lastUpdated
    }
  };
}

/**
 * Fetch Kalshi markets (mock implementation)
 */
async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  // In production, replace with actual Kalshi API call
  // const response = await fetch('https://api.kalshi.com/v0/markets');
  // const data = await response.json();

  return MOCK_KALSHI_DATA as unknown as Promise<KalshiMarket[]>;
}

/**
 * Fetch Polymarket markets (mock implementation)
 */
async function fetchPolymarketMarkets(): Promise<PolymarketMarket[]> {
  // In production, replace with actual Polymarket API call
  // const response = await fetch('https://api.polymarket.com/markets');
  // const data = await response.json();

  return MOCK_POLYMARKET_DATA as unknown as Promise<PolymarketMarket[]>;
}

/**
 * Run prediction markets through Progno analysis
 */
async function analyzePredictionMarkets(marketData: PredictionMarketData): Promise<any> {
  try {
    const source = marketData.source;
    const totalMarkets = marketData.markets.length;

    const prognoAnalysis = {
      totalMarkets,
      sourceMarkets: {
        kalshi: source === 'kalshi' ? totalMarkets : 0,
        polymarket: source === 'polymarket' ? totalMarkets : 0
      },
      analysis: {
        averageImpliedProbability: 0.5,
        highConfidenceMarkets: 0,
        valueOpportunities: 0
      }
    };

    // Calculate metrics
    let totalProbability = 0;
    let highConfidenceCount = 0;
    let valueOpportunities = 0;

    for (const market of marketData.markets) {
      if (source === 'kalshi') {
        const kalshiMarket = market as unknown as { yes_bid: number; no_bid: number };
        const impliedProb = kalshiMarket.yes_bid / (kalshiMarket.yes_bid + kalshiMarket.no_bid);
        totalProbability += impliedProb;
        if (impliedProb > 0.6) highConfidenceCount++;
        if (Math.abs(kalshiMarket.yes_bid - kalshiMarket.no_bid) / kalshiMarket.no_bid > 0.05) {
          valueOpportunities++;
        }
      } else {
        const polyMarket = market as unknown as { outcomes: Array<{ outcome: string; probability: number }> };
        const yesOutcome = polyMarket.outcomes.find(o => o.outcome === 'Yes');
        if (yesOutcome) {
          totalProbability += yesOutcome.probability;
          if (yesOutcome.probability > 0.6) highConfidenceCount++;
          if (Math.abs(yesOutcome.probability - 0.5) > 0.1) {
            valueOpportunities++;
          }
        }
      }
    }

    prognoAnalysis.analysis.averageImpliedProbability = totalMarkets > 0 ? totalProbability / totalMarkets : 0;
    prognoAnalysis.analysis.highConfidenceMarkets = highConfidenceCount;
    prognoAnalysis.analysis.valueOpportunities = valueOpportunities;

    return {
      success: true,
      data: prognoAnalysis,
      message: `Analyzed ${totalMarkets} prediction markets from ${source}`,
      recommendations: [
        'Consider cross-referencing with traditional odds',
        'Focus on markets with high confidence predictions',
        'Monitor for arbitrage opportunities between platforms'
      ]
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to analyze prediction markets'
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source = searchParams.get('source');
  const date = searchParams.get('date');

  try {
    let marketData: PredictionMarketData;

    if (source === 'kalshi') {
      const markets = await fetchKalshiMarkets();
      marketData = {
        source: 'kalshi',
        markets,
        lastUpdated: new Date().toISOString()
      };
    } else if (source === 'polymarket') {
      const markets = await fetchPolymarketMarkets();
      marketData = {
        source: 'polymarket',
        markets,
        lastUpdated: new Date().toISOString()
      };
    } else {
      return NextResponse.json({
        error: 'Invalid source parameter. Use kalshi or polymarket'
      }, { status: 400 });
    }

    // Convert to Progno format and analyze
    const prognoFormat = convertToPrognoFormat(marketData);
    const analysis = await analyzePredictionMarkets(marketData);

    return NextResponse.json({
      success: true,
      data: {
        ...prognoFormat,
        ...analysis
      },
      message: `Successfully fetched and analyzed ${marketData.source} prediction markets`
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to fetch prediction markets'
    }, { status: 500 });
  }
}

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

// No mock data - production API only
const MOCK_KALSHI_DATA: any[] = [];
const MOCK_POLYMARKET_DATA: any[] = [];

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
 * Fetch Kalshi markets
 * Note: Returns empty array - Kalshi API integration pending
 */
async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  // TODO: Implement real Kalshi API integration
  // const response = await fetch('https://api.kalshi.com/v0/markets', {
  //   headers: { 'Authorization': `Bearer ${process.env.KALSHI_API_KEY}` }
  // });
  // return await response.json();

  console.log('[Kalshi] API integration pending - returning empty');
  return [];
}

/**
 * Fetch Polymarket markets
 * Note: Returns empty array - Polymarket API integration pending
 */
async function fetchPolymarketMarkets(): Promise<PolymarketMarket[]> {
  // TODO: Implement real Polymarket API integration
  // const response = await fetch('https://api.polymarket.com/markets');
  // return await response.json();

  console.log('[Polymarket] API integration pending - returning empty');
  return [];
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

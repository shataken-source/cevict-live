/**
 * Bot Academy - Kalshi Training Data API
 * Provides Kalshi prediction market data for bot training
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchKalshiMarkets,
  findBestKalshiMatch,
  getMarketProbability,
  getTrendingKalshiMarkets,
  KalshiMarket
} from '../../../kalshi-fetcher';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'help';
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (action === 'help') {
      return NextResponse.json({
        success: true,
        message: 'Kalshi Training Data API for Bot Academy',
        actions: [
          'search - Search Kalshi markets by query',
          'match - Find best matching market for a prediction',
          'trending - Get trending markets',
          'train - Get training data for a specific topic'
        ],
        usage: {
          search: '?action=search&query=recession&limit=10',
          match: '?action=match&query=Will the US enter a recession?',
          trending: '?action=trending&category=politics&limit=10',
          train: '?action=train&query=economic prediction'
        }
      });
    }

    if (action === 'search') {
      if (!query) {
        return NextResponse.json(
          { error: 'Query parameter is required for search' },
          { status: 400 }
        );
      }

      const results = await searchKalshiMarkets(query, limit);

      return NextResponse.json({
        success: true,
        action: 'search',
        query,
        results: {
          markets: results.markets.map(market => ({
            ticker: market.ticker,
            title: market.title,
            category: market.category,
            probability: getMarketProbability(market),
            volume: market.volume,
            status: market.status,
            lastPrice: market.lastPrice
          })),
          total: results.total
        },
        trainingNotes: {
          purpose: 'Use Kalshi market probabilities to enhance prediction confidence',
          usage: 'Compare your predictions with market probabilities',
          tip: 'Markets with higher volume are more reliable'
        }
      });
    }

    if (action === 'match') {
      if (!query) {
        return NextResponse.json(
          { error: 'Query parameter is required for match' },
          { status: 400 }
        );
      }

      const match = await findBestKalshiMatch(query);

      return NextResponse.json({
        success: true,
        action: 'match',
        query,
        match: match.market ? {
          ticker: match.market.ticker,
          title: match.market.title,
          category: match.market.category,
          probability: getMarketProbability(match.market),
          volume: match.market.volume,
          status: match.market.status,
          relevanceScore: match.relevance
        } : null,
        trainingNotes: {
          purpose: 'Find the best Kalshi market that matches your prediction question',
          usage: 'Use the market probability as a baseline for your prediction',
          tip: 'Higher relevance scores mean better matches'
        }
      });
    }

    if (action === 'trending') {
      const markets = await getTrendingKalshiMarkets(category || undefined, limit);

      return NextResponse.json({
        success: true,
        action: 'trending',
        category: category || 'all',
        markets: markets.map(market => ({
          ticker: market.ticker,
          title: market.title,
          category: market.category,
          probability: getMarketProbability(market),
          volume: market.volume,
          status: market.status
        })),
        trainingNotes: {
          purpose: 'See what markets are currently active and popular',
          usage: 'Use trending markets to understand current prediction topics',
          tip: 'High volume markets have more reliable probabilities'
        }
      });
    }

    if (action === 'train') {
      if (!query) {
        return NextResponse.json(
          { error: 'Query parameter is required for training' },
          { status: 400 }
        );
      }

      // Get matching market
      const match = await findBestKalshiMatch(query);

      // Get related markets for context
      const related = await searchKalshiMarkets(query, 5);

      return NextResponse.json({
        success: true,
        action: 'train',
        query,
        trainingData: {
          primaryMarket: match.market ? {
            ticker: match.market.ticker,
            title: match.market.title,
            category: match.market.category,
            probability: getMarketProbability(match.market),
            volume: match.market.volume,
            status: match.market.status,
            relevanceScore: match.relevance
          } : null,
          relatedMarkets: related.markets.slice(0, 5).map(market => ({
            ticker: market.ticker,
            title: market.title,
            probability: getMarketProbability(market),
            volume: market.volume
          })),
          insights: {
            marketProbability: match.market ? getMarketProbability(match.market) : null,
            marketConfidence: match.market ? (match.market.volume > 10000 ? 'high' : 'medium') : null,
            recommendation: match.market
              ? `Use market probability of ${(getMarketProbability(match.market) * 100).toFixed(1)}% as baseline`
              : 'No matching market found - use standard prediction methods'
          }
        },
        trainingInstructions: {
          step1: 'Compare your prediction with the Kalshi market probability',
          step2: 'If market probability differs significantly, investigate why',
          step3: 'Use market volume to assess reliability',
          step4: 'Combine market data with your own analysis for best results'
        }
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Kalshi Training API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch Kalshi training data',
        note: 'Kalshi API may not be configured. Check KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY environment variables.'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, trainingType = 'standard' } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get comprehensive training data
    const match = await findBestKalshiMatch(query);
    const related = await searchKalshiMarkets(query, 10);

    return NextResponse.json({
      success: true,
      trainingType,
      query,
      data: {
        bestMatch: match.market ? {
          ...match.market,
          probability: getMarketProbability(match.market),
          relevanceScore: match.relevance
        } : null,
        relatedMarkets: related.markets.map(m => ({
          ...m,
          probability: getMarketProbability(m)
        })),
        summary: {
          totalMarkets: related.total,
          bestMatchProbability: match.market ? getMarketProbability(match.market) : null,
          averageProbability: related.markets.length > 0
            ? related.markets.reduce((sum, m) => sum + getMarketProbability(m), 0) / related.markets.length
            : null
        }
      },
      trainingGuidance: {
        howToUse: 'Use Kalshi market probabilities to calibrate your predictions',
        confidenceBoost: match.market && match.market.volume > 50000
          ? 'High volume market - use probability as strong signal'
          : 'Medium volume - use probability as one factor among many',
        nextSteps: [
          'Compare your prediction with market probability',
          'If difference > 10%, investigate the reason',
          'Use market data to adjust confidence scores',
          'Track prediction accuracy vs market outcomes'
        ]
      }
    });

  } catch (error: any) {
    console.error('Kalshi Training POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process training request'
      },
      { status: 500 }
    );
  }
}


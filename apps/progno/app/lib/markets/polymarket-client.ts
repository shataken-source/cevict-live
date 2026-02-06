/**
 * Polymarket API Client
 * Handles fetching sports markets from Polymarket
 * Focus: Sports probability markets only
 * Note: Polymarket uses GraphQL API
 */

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  slug: string;
  conditionId: string;
  outcomes: Array<{
    id: string;
    title: string;
    price: number; // 0-1 probability
    volume: number;
  }>;
  volume: number;
  liquidity: number;
  endDate: string;
  startDate: string;
  imageUrl?: string;
  tags: string[];
  active: boolean;
  archived: boolean;
  marketMakerAddress?: string;
}

export interface PolymarketOrderBook {
  conditionId: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}

export class PolymarketClient {
  private graphqlUrl: string;
  private apiKey?: string;

  constructor() {
    this.graphqlUrl = process.env.POLYMARKET_GRAPHQL_URL || 'https://api.thegraph.com/subgraphs/name/polymarket';
    this.apiKey = process.env.POLYMARKET_API_KEY;
  }

  /**
   * Check if Polymarket is configured
   */
  isConfigured(): boolean {
    // Polymarket GraphQL is public, but API key helps with rate limits
    return true; // Public API, always available
  }

  /**
   * Fetch sports markets from Polymarket
   * Uses GraphQL query
   */
  async getSportsMarkets(
    limit: number = 100,
    activeOnly: boolean = true
  ): Promise<PolymarketMarket[]> {
    try {
      const query = `
        query GetSportsMarkets($limit: Int!, $activeOnly: Boolean!) {
          markets(
            first: $limit
            where: {
              active: $activeOnly
              tags_contains: ["sports"]
            }
            orderBy: volume
            orderDirection: desc
          ) {
            id
            question
            description
            slug
            conditionId
            outcomes {
              id
              title
              price
              volume
            }
            volume
            liquidity
            endDate
            startDate
            imageUrl
            tags
            active
            archived
          }
        }
      `;

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          query,
          variables: { limit, activeOnly },
        }),
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Polymarket GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data?.markets || [];
    } catch (error: any) {
      console.error('Error fetching Polymarket sports markets:', error);
      return [];
    }
  }

  /**
   * Get market by condition ID
   */
  async getMarket(conditionId: string): Promise<PolymarketMarket | null> {
    try {
      const query = `
        query GetMarket($conditionId: String!) {
          markets(where: { conditionId: $conditionId }) {
            id
            question
            description
            slug
            conditionId
            outcomes {
              id
              title
              price
              volume
            }
            volume
            liquidity
            endDate
            startDate
            imageUrl
            tags
            active
            archived
          }
        }
      `;

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          query,
          variables: { conditionId },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data?.markets?.[0] || null;
    } catch (error) {
      console.error(`Error fetching Polymarket market ${conditionId}:`, error);
      return null;
    }
  }

  /**
   * Get order book for a market
   * Polymarket uses a different endpoint for order books
   */
  async getOrderBook(conditionId: string): Promise<PolymarketOrderBook | null> {
    try {
      // Polymarket order book API (may require different endpoint)
      const url = `https://clob.polymarket.com/book?condition_id=${conditionId}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching order book for ${conditionId}:`, error);
      return null;
    }
  }

  /**
   * Calculate implied probability from market prices
   * Polymarket uses 0-1 probability directly
   */
  calculateImpliedProbability(market: PolymarketMarket): {
    yesProb: number; // 0-1
    noProb: number; // 0-1
    spread: number; // Price spread
    liquidity: 'high' | 'medium' | 'low';
  } {
    // Polymarket markets typically have Yes/No outcomes
    const yesOutcome = market.outcomes.find(o => 
      o.title.toLowerCase().includes('yes') || 
      o.title.toLowerCase().includes('true') ||
      o.id === '0' // Common pattern
    );
    const noOutcome = market.outcomes.find(o => 
      o.title.toLowerCase().includes('no') || 
      o.title.toLowerCase().includes('false') ||
      o.id === '1' // Common pattern
    );

    const yesProb = yesOutcome?.price || 0.5;
    const noProb = noOutcome?.price || (1 - yesProb);
    
    // Calculate spread (difference between outcomes if available)
    const spread = yesOutcome && noOutcome 
      ? Math.abs(yesOutcome.price - (1 - noOutcome.price))
      : 0;
    
    // Assess liquidity
    let liquidity: 'high' | 'medium' | 'low' = 'low';
    if (market.liquidity > 10000 || market.volume > 50000) {
      liquidity = 'high';
    } else if (market.liquidity > 1000 || market.volume > 5000) {
      liquidity = 'medium';
    }
    
    return {
      yesProb,
      noProb,
      spread,
      liquidity,
    };
  }

  /**
   * Check if market has market maker activity
   * Polymarket's decentralized model means any user can provide liquidity
   */
  hasMarketMakerActivity(market: PolymarketMarket): boolean {
    // High liquidity and tight spreads indicate market maker activity
    return market.liquidity > 5000 && market.outcomes.length >= 2;
  }
}

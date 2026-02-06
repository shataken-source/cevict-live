/**
 * Kalshi API Client
 * Handles fetching sports markets from Kalshi exchange
 * Focus: Sports probability markets only
 */

export interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  subcategory: string;
  yes_bid: number; // Price in cents (0-100)
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  event_ticker: string;
  series_ticker?: string;
  expiry_time: string;
  status: 'open' | 'closed' | 'settled';
  market_type: 'binary' | 'categorical';
  min_tick_size: number;
  strike_price?: number;
  resolution_criteria?: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  subcategory: string;
  markets: KalshiMarket[];
  start_time: string;
  end_time: string;
}

export class KalshiClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.KALSHI_API_KEY_ID || '';
    this.apiSecret = process.env.KALSHI_PRIVATE_KEY || '';
    this.baseUrl = process.env.KALSHI_API_URL || 'https://api.cash.kalshi.com/trade-api/v2';
  }

  /**
   * Check if Kalshi credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Get authentication token
   */
  private async authenticate(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Kalshi API credentials not configured');
    }

    // Kalshi uses JWT authentication
    // In production, implement proper JWT signing
    // For now, return placeholder
    return 'auth_token_placeholder';
  }

  /**
   * Fetch sports markets from Kalshi
   * Focus: Sports category only
   */
  async getSportsMarkets(
    limit: number = 100,
    status: 'open' | 'closed' | 'all' = 'open'
  ): Promise<KalshiMarket[]> {
    if (!this.isConfigured()) {
      console.warn('Kalshi not configured - returning empty markets');
      return [];
    }

    try {
      const token = await this.authenticate();
      
      // Kalshi API endpoint for markets
      const url = `${this.baseUrl}/markets?category=sports&limit=${limit}&status=${status}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.markets || [];
    } catch (error: any) {
      console.error('Error fetching Kalshi sports markets:', error);
      return [];
    }
  }

  /**
   * Get market by ticker
   */
  async getMarket(ticker: string): Promise<KalshiMarket | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const token = await this.authenticate();
      const url = `${this.baseUrl}/markets/${ticker}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.market || null;
    } catch (error) {
      console.error(`Error fetching Kalshi market ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get order book for a market (for market maker analysis)
   */
  async getOrderBook(ticker: string): Promise<{
    yes_bids: Array<{ price: number; size: number }>;
    yes_asks: Array<{ price: number; size: number }>;
    no_bids: Array<{ price: number; size: number }>;
    no_asks: Array<{ price: number; size: number }>;
  } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const token = await this.authenticate();
      const url = `${this.baseUrl}/markets/${ticker}/orderbook`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching order book for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Calculate implied probability from market prices
   * Uses mid-price (average of bid/ask) for fair value
   */
  calculateImpliedProbability(market: KalshiMarket): {
    yesProb: number; // 0-1
    noProb: number; // 0-1
    spread: number; // Bid-ask spread in cents
    liquidity: 'high' | 'medium' | 'low';
  } {
    const yesMid = (market.yes_bid + market.yes_ask) / 2;
    const noMid = (market.no_bid + market.no_ask) / 2;
    
    // Normalize to probabilities (Kalshi prices are in cents, 0-100)
    const yesProb = yesMid / 100;
    const noProb = noMid / 100;
    
    // Calculate spread
    const spread = market.yes_ask - market.yes_bid;
    
    // Assess liquidity based on volume and open interest
    let liquidity: 'high' | 'medium' | 'low' = 'low';
    if (market.volume > 10000 || market.open_interest > 50000) {
      liquidity = 'high';
    } else if (market.volume > 1000 || market.open_interest > 5000) {
      liquidity = 'medium';
    }
    
    return {
      yesProb,
      noProb,
      spread,
      liquidity,
    };
  }
}

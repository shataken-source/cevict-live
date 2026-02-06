// Kalshi API Client
// Supports both production and demo environments
// Demo: https://demo-api.kalshi.co/trade-api/v2
// Prod: https://api.kalshi.co/trade-api/v2

export type KalshiEnvironment = 'demo' | 'production';

interface KalshiConfig {
  environment: KalshiEnvironment;
  apiKey?: string;
  privateKey?: string;
}

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  previous_yes_bid: number;
  previous_yes_ask: number;
  previous_price: number;
  volume: number;
  volume_24h: number;
  liquidity: number;
  open_interest: number;
  status: 'open' | 'closed' | 'settled';
  result: 'yes' | 'no' | null;
  close_time: string;
  expiration_time: string;
  category: string;
  yes_sub_title?: string;
  no_sub_title?: string;
}

interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  title: string;
  subtitle: string;
  category: string;
  markets: KalshiMarket[];
  mutually_exclusive: boolean;
  strike_date?: string;
}

interface KalshiPosition {
  ticker: string;
  event_ticker: string;
  market_title: string;
  yes_amount: number;
  no_amount: number;
  realized_pnl: number;
  resting_orders_count: number;
  total_traded: number;
}

interface KalshiFill {
  trade_id: string;
  ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  count: number;
  price: number;
  created_time: string;
  is_taker: boolean;
}

interface KalshiBalance {
  balance: number; // In cents
  portfolio_value: number;
}

interface KalshiOrderRequest {
  ticker: string;
  action: 'buy' | 'sell';
  side: 'yes' | 'no';
  type: 'market' | 'limit';
  count: number;
  yes_price?: number; // In cents (1-99)
  no_price?: number;
  expiration_ts?: number;
  client_order_id?: string;
}

interface KalshiOrder {
  order_id: string;
  ticker: string;
  client_order_id?: string;
  action: 'buy' | 'sell';
  side: 'yes' | 'no';
  type: 'market' | 'limit';
  status: 'resting' | 'canceled' | 'executed' | 'pending';
  yes_price: number;
  no_price: number;
  created_time: string;
  expiration_time?: string;
  remaining_count: number;
  queue_position?: number;
}

class KalshiClient {
  private baseUrl: string;
  private apiKey?: string;
  private privateKey?: string;
  private token?: string;
  private tokenExpiry?: Date;

  constructor(config: KalshiConfig) {
    this.baseUrl = config.environment === 'demo' 
      ? 'https://demo-api.kalshi.co/trade-api/v2'
      : 'https://api.kalshi.co/trade-api/v2';
    this.apiKey = config.apiKey;
    this.privateKey = config.privateKey;
  }

  // Generate signature for authenticated requests
  private async generateSignature(timestamp: number, method: string, path: string): Promise<string> {
    if (!this.privateKey) throw new Error('Private key required for authenticated requests');
    
    // RSA signature using the private key
    const message = `${timestamp}${method}${path}`;
    
    // In browser/Next.js, we'd use Web Crypto API
    // For now, return placeholder - actual implementation needs crypto library
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // This would need proper RSA signing - simplified for now
    return btoa(message);
  }

  private async getAuthHeaders(method: string, path: string): Promise<Record<string, string>> {
    if (!this.apiKey) return {};
    
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.generateSignature(timestamp, method, path);
    
    return {
      'KALSHI-ACCESS-KEY': this.apiKey,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp.toString(),
    };
  }

  private async request<T>(
    method: string, 
    path: string, 
    body?: object,
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requireAuth) {
      const authHeaders = await this.getAuthHeaders(method, path);
      Object.assign(headers, authHeaders);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kalshi API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============ PUBLIC ENDPOINTS (No Auth Required) ============

  async getExchangeStatus(): Promise<{ trading_active: boolean; exchange_active: boolean }> {
    return this.request('GET', '/exchange/status');
  }

  async getMarkets(params?: {
    limit?: number;
    cursor?: string;
    event_ticker?: string;
    series_ticker?: string;
    status?: 'open' | 'closed' | 'settled';
    tickers?: string;
  }): Promise<{ markets: KalshiMarket[]; cursor?: string }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.event_ticker) query.set('event_ticker', params.event_ticker);
    if (params?.series_ticker) query.set('series_ticker', params.series_ticker);
    if (params?.status) query.set('status', params.status);
    if (params?.tickers) query.set('tickers', params.tickers);
    
    const path = `/markets${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path);
  }

  async getMarket(ticker: string): Promise<{ market: KalshiMarket }> {
    return this.request('GET', `/markets/${ticker}`);
  }

  async getMarketOrderbook(ticker: string, depth?: number): Promise<{
    orderbook: {
      yes: Array<[number, number]>; // [price, quantity]
      no: Array<[number, number]>;
    };
  }> {
    const query = depth ? `?depth=${depth}` : '';
    return this.request('GET', `/markets/${ticker}/orderbook${query}`);
  }

  async getEvents(params?: {
    limit?: number;
    cursor?: string;
    status?: 'open' | 'closed' | 'settled';
    series_ticker?: string;
    with_nested_markets?: boolean;
  }): Promise<{ events: KalshiEvent[]; cursor?: string }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.status) query.set('status', params.status);
    if (params?.series_ticker) query.set('series_ticker', params.series_ticker);
    if (params?.with_nested_markets) query.set('with_nested_markets', 'true');
    
    const path = `/events${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path);
  }

  async getEvent(eventTicker: string, withNestedMarkets?: boolean): Promise<{ event: KalshiEvent }> {
    const query = withNestedMarkets ? '?with_nested_markets=true' : '';
    return this.request('GET', `/events/${eventTicker}${query}`);
  }

  async getTrades(params?: {
    ticker?: string;
    limit?: number;
    cursor?: string;
    min_ts?: number;
    max_ts?: number;
  }): Promise<{ trades: Array<{ trade_id: string; ticker: string; price: number; count: number; created_time: string }> }> {
    const query = new URLSearchParams();
    if (params?.ticker) query.set('ticker', params.ticker);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.min_ts) query.set('min_ts', params.min_ts.toString());
    if (params?.max_ts) query.set('max_ts', params.max_ts.toString());
    
    const path = `/trades${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path);
  }

  // ============ AUTHENTICATED ENDPOINTS ============

  async getBalance(): Promise<KalshiBalance> {
    return this.request('GET', '/portfolio/balance', undefined, true);
  }

  async getPositions(params?: {
    limit?: number;
    cursor?: string;
    settlement_status?: 'all' | 'unsettled' | 'settled';
    event_ticker?: string;
  }): Promise<{ event_positions: KalshiPosition[]; cursor?: string }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.settlement_status) query.set('settlement_status', params.settlement_status);
    if (params?.event_ticker) query.set('event_ticker', params.event_ticker);
    
    const path = `/portfolio/positions${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path, undefined, true);
  }

  async getFills(params?: {
    ticker?: string;
    limit?: number;
    cursor?: string;
    min_ts?: number;
    max_ts?: number;
  }): Promise<{ fills: KalshiFill[]; cursor?: string }> {
    const query = new URLSearchParams();
    if (params?.ticker) query.set('ticker', params.ticker);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.min_ts) query.set('min_ts', params.min_ts.toString());
    if (params?.max_ts) query.set('max_ts', params.max_ts.toString());
    
    const path = `/portfolio/fills${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path, undefined, true);
  }

  async createOrder(order: KalshiOrderRequest): Promise<{ order: KalshiOrder }> {
    return this.request('POST', '/portfolio/orders', order, true);
  }

  async cancelOrder(orderId: string): Promise<{ order: KalshiOrder }> {
    return this.request('DELETE', `/portfolio/orders/${orderId}`, undefined, true);
  }

  async getOrders(params?: {
    ticker?: string;
    status?: 'resting' | 'canceled' | 'executed' | 'pending';
    limit?: number;
    cursor?: string;
  }): Promise<{ orders: KalshiOrder[]; cursor?: string }> {
    const query = new URLSearchParams();
    if (params?.ticker) query.set('ticker', params.ticker);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    
    const path = `/portfolio/orders${query.toString() ? `?${query}` : ''}`;
    return this.request('GET', path, undefined, true);
  }

  // ============ UTILITY METHODS ============

  // Convert cents to dollars for display
  static centsToDollars(cents: number): number {
    return cents / 100;
  }

  // Convert probability (0-1) to price in cents (1-99)
  static probabilityToCents(probability: number): number {
    return Math.round(probability * 100);
  }

  // Calculate implied probability from yes/no prices
  static getImpliedProbability(yesPrice: number, noPrice: number): number {
    return yesPrice / (yesPrice + noPrice);
  }

  // Check for arbitrage opportunity (yes + no < 100)
  static hasArbitrageOpportunity(yesAsk: number, noAsk: number): boolean {
    return yesAsk + noAsk < 100;
  }

  // Calculate arbitrage profit
  static calculateArbitrageProfit(yesAsk: number, noAsk: number, investment: number): number {
    if (!this.hasArbitrageOpportunity(yesAsk, noAsk)) return 0;
    const totalCost = (yesAsk + noAsk) / 100;
    const profit = investment * (1 - totalCost);
    return profit;
  }
}

// Export singleton instances for easy use
export const kalshiDemo = new KalshiClient({ environment: 'demo' });
export const kalshiProd = new KalshiClient({ environment: 'production' });

// Factory function with credentials
export function createKalshiClient(config: KalshiConfig): KalshiClient {
  return new KalshiClient(config);
}

export type { 
  KalshiMarket, 
  KalshiEvent, 
  KalshiPosition, 
  KalshiFill, 
  KalshiBalance,
  KalshiOrder,
  KalshiOrderRequest,
  KalshiConfig 
};

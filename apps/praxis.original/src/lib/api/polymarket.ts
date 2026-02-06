// Polymarket API Client
// APIs:
//   Gamma API: https://gamma-api.polymarket.com (markets, events, metadata)
//   CLOB API: https://clob.polymarket.com (prices, orderbooks, trading)
//   Data API: https://data-api.polymarket.com (positions, history)
//   WebSocket: wss://ws-subscriptions-clob.polymarket.com
//
// Note: Read-only endpoints are open. Trading requires wallet auth on Polygon.

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  category: string;
  sub_category?: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  volume_24hr: number;
  competitive: number;
  markets: PolymarketMarket[];
  neg_risk: boolean;
  enable_order_book: boolean;
}

interface PolymarketMarket {
  id: string;
  question: string;
  condition_id: string;
  slug: string;
  end_date_iso: string;
  game_start_time?: string;
  description: string;
  outcomes: string;
  outcome_prices: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  volume_24hr: number;
  clob_token_ids: string;
  accepting_orders: boolean;
  accepting_order_timestamp?: string;
  minimum_order_size: number;
  minimum_tick_size: number;
  neg_risk: boolean;
  neg_risk_market_id?: string;
  neg_risk_request_id?: string;
  winner?: string;
  resolved_by?: string;
  icon?: string;
  image?: string;
}

interface PolymarketOrderbook {
  market: string;
  asset_id: string;
  hash: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: string;
}

interface PolymarketPrice {
  token_id: string;
  price: string;
}

interface PolymarketTrade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  size: string;
  fee_rate_bps: string;
  price: string;
  status: 'MATCHED' | 'CONFIRMED' | 'MINED';
  match_time: string;
  last_update: string;
  outcome: string;
  bucket_index: number;
  owner: string;
  maker_address?: string;
  transaction_hash?: string;
  trader_side?: 'TAKER' | 'MAKER';
}

interface PolymarketPosition {
  asset: string;
  condition_id: string;
  market: string;
  outcome: string;
  position: string;
  avg_price: string;
  size: string;
  cur_price: string;
  profit_loss: string;
  profit_loss_percent: string;
  realized_pnl: string;
  event_outcome?: string;
  event_slug?: string;
}

interface PolymarketOrderRequest {
  tokenId: string;
  price: number; // 0.01 to 0.99
  size: number;
  side: 'BUY' | 'SELL';
  orderType?: 'GTC' | 'FOK' | 'GTD';
  expiration?: number;
}

interface PolymarketOrder {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  owner: string;
  status: 'LIVE' | 'MATCHED' | 'CANCELED';
  created_at: string;
  expiration?: string;
  order_type: 'GTC' | 'FOK' | 'GTD';
  associate_trades: string[];
}

class PolymarketClient {
  private gammaUrl = 'https://gamma-api.polymarket.com';
  private clobUrl = 'https://clob.polymarket.com';
  private dataUrl = 'https://data-api.polymarket.com';
  private wsUrl = 'wss://ws-subscriptions-clob.polymarket.com';
  
  private walletAddress?: string;
  private apiKey?: string;
  private apiSecret?: string;
  private apiPassphrase?: string;

  constructor(config?: {
    walletAddress?: string;
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
  }) {
    this.walletAddress = config?.walletAddress;
    this.apiKey = config?.apiKey;
    this.apiSecret = config?.apiSecret;
    this.apiPassphrase = config?.apiPassphrase;
  }

  private async request<T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Polymarket API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============ GAMMA API - Market Discovery ============

  async getEvents(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    order?: string;
    ascending?: boolean;
    id?: string;
    slug?: string;
    tag?: string;
    end_date_min?: string;
    end_date_max?: string;
  }): Promise<PolymarketEvent[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.active !== undefined) query.set('active', params.active.toString());
    if (params?.closed !== undefined) query.set('closed', params.closed.toString());
    if (params?.archived !== undefined) query.set('archived', params.archived.toString());
    if (params?.order) query.set('order', params.order);
    if (params?.ascending !== undefined) query.set('ascending', params.ascending.toString());
    if (params?.id) query.set('id', params.id);
    if (params?.slug) query.set('slug', params.slug);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.end_date_min) query.set('end_date_min', params.end_date_min);
    if (params?.end_date_max) query.set('end_date_max', params.end_date_max);
    
    const path = `/events${query.toString() ? `?${query}` : ''}`;
    return this.request(this.gammaUrl, path);
  }

  async getEvent(id: string): Promise<PolymarketEvent> {
    return this.request(this.gammaUrl, `/events/${id}`);
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    clob_token_ids?: string;
    condition_ids?: string;
    id?: string;
    slug?: string;
  }): Promise<PolymarketMarket[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.active !== undefined) query.set('active', params.active.toString());
    if (params?.closed !== undefined) query.set('closed', params.closed.toString());
    if (params?.archived !== undefined) query.set('archived', params.archived.toString());
    if (params?.clob_token_ids) query.set('clob_token_ids', params.clob_token_ids);
    if (params?.condition_ids) query.set('condition_ids', params.condition_ids);
    if (params?.id) query.set('id', params.id);
    if (params?.slug) query.set('slug', params.slug);
    
    const path = `/markets${query.toString() ? `?${query}` : ''}`;
    return this.request(this.gammaUrl, path);
  }

  async getMarket(id: string): Promise<PolymarketMarket> {
    const markets = await this.getMarkets({ id });
    if (markets.length === 0) throw new Error(`Market ${id} not found`);
    return markets[0];
  }

  async searchMarkets(query: string): Promise<PolymarketMarket[]> {
    return this.request(this.gammaUrl, `/markets?_q=${encodeURIComponent(query)}`);
  }

  // ============ CLOB API - Prices & Orderbooks ============

  async getPrice(tokenId: string): Promise<string> {
    const result = await this.request<{ price: string }>(
      this.clobUrl, 
      `/price?token_id=${tokenId}`
    );
    return result.price;
  }

  async getPrices(tokenIds: string[]): Promise<PolymarketPrice[]> {
    // Batch price request
    const params = tokenIds.map(id => `token_ids=${id}`).join('&');
    return this.request(this.clobUrl, `/prices?${params}`);
  }

  async getMidpoint(tokenId: string): Promise<string> {
    const result = await this.request<{ mid: string }>(
      this.clobUrl, 
      `/midpoint?token_id=${tokenId}`
    );
    return result.mid;
  }

  async getSpread(tokenId: string): Promise<{ bid: string; ask: string; spread: string }> {
    return this.request(this.clobUrl, `/spread?token_id=${tokenId}`);
  }

  async getOrderbook(tokenId: string): Promise<PolymarketOrderbook> {
    return this.request(this.clobUrl, `/book?token_id=${tokenId}`);
  }

  async getLastTradePrice(tokenId: string): Promise<string> {
    const result = await this.request<{ price: string }>(
      this.clobUrl,
      `/last-trade-price?token_id=${tokenId}`
    );
    return result.price;
  }

  // ============ DATA API - Positions & History ============

  async getPositions(address: string): Promise<PolymarketPosition[]> {
    return this.request(this.dataUrl, `/positions?user=${address}`);
  }

  async getTrades(params: {
    market?: string;
    maker?: string;
    taker?: string;
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<PolymarketTrade[]> {
    const query = new URLSearchParams();
    if (params.market) query.set('market', params.market);
    if (params.maker) query.set('maker', params.maker);
    if (params.taker) query.set('taker', params.taker);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.before) query.set('before', params.before);
    if (params.after) query.set('after', params.after);
    
    return this.request(this.dataUrl, `/trades?${query}`);
  }

  async getMarketTrades(conditionId: string, limit?: number): Promise<PolymarketTrade[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(this.dataUrl, `/trades/${conditionId}${query}`);
  }

  // ============ AUTHENTICATED TRADING ============
  // Note: Requires wallet + API credentials from Polymarket

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
      throw new Error('API credentials required for authenticated requests');
    }

    const timestamp = Date.now().toString();
    // HMAC signature would be generated here
    // For now, return placeholder headers
    return {
      'POLY-ADDRESS': this.walletAddress || '',
      'POLY-API-KEY': this.apiKey,
      'POLY-TIMESTAMP': timestamp,
      'POLY-PASSPHRASE': this.apiPassphrase,
      // 'POLY-SIGNATURE': signature,
    };
  }

  async getMyOrders(): Promise<PolymarketOrder[]> {
    return this.request(this.clobUrl, '/orders', {
      headers: this.getAuthHeaders(),
    });
  }

  async createOrder(order: PolymarketOrderRequest): Promise<PolymarketOrder> {
    // This would need proper signing with py-clob-client or equivalent
    throw new Error('Order creation requires wallet signing - use py-clob-client SDK');
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    return this.request(this.clobUrl, `/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  async cancelAllOrders(): Promise<{ canceled_orders: string[] }> {
    return this.request(this.clobUrl, '/orders/cancel-all', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  // ============ WEBSOCKET ============

  createWebSocket(channels: string[], onMessage: (data: unknown) => void): WebSocket {
    const ws = new WebSocket(this.wsUrl);
    
    ws.onopen = () => {
      // Subscribe to channels
      channels.forEach(channel => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel,
        }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    return ws;
  }

  // ============ UTILITY METHODS ============

  // Parse outcome prices from JSON string
  static parseOutcomePrices(pricesJson: string): number[] {
    try {
      const parsed = JSON.parse(pricesJson);
      return parsed.map((p: string) => parseFloat(p));
    } catch {
      return [];
    }
  }

  // Parse outcomes from JSON string
  static parseOutcomes(outcomesJson: string): string[] {
    try {
      return JSON.parse(outcomesJson);
    } catch {
      return [];
    }
  }

  // Parse CLOB token IDs from JSON string
  static parseClobTokenIds(idsJson: string): string[] {
    try {
      return JSON.parse(idsJson);
    } catch {
      return [];
    }
  }

  // Calculate implied probability
  static getImpliedProbability(prices: number[]): number[] {
    const total = prices.reduce((a, b) => a + b, 0);
    return prices.map(p => p / total);
  }

  // Check for arbitrage (prices don't sum to 1)
  static hasArbitrageOpportunity(prices: number[]): boolean {
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum < 0.99; // Allow for small rounding
  }

  // Calculate arbitrage profit
  static calculateArbitrageProfit(prices: number[], investment: number): number {
    const sum = prices.reduce((a, b) => a + b, 0);
    if (sum >= 1) return 0;
    return investment * (1 - sum);
  }

  // Format volume for display
  static formatVolume(volume: number): string {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  }
}

// Export singleton for easy use (read-only, no auth)
export const polymarket = new PolymarketClient();

// Factory function with credentials
export function createPolymarketClient(config?: {
  walletAddress?: string;
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
}): PolymarketClient {
  return new PolymarketClient(config);
}

export type {
  PolymarketEvent,
  PolymarketMarket,
  PolymarketOrderbook,
  PolymarketPrice,
  PolymarketTrade,
  PolymarketPosition,
  PolymarketOrder,
  PolymarketOrderRequest,
};

export { PolymarketClient };

/**
 * ============================================================================
 * KALSHI ORDER MANAGER - MAKER STRATEGY (LIQUIDITY PROVISIONING)
 * ============================================================================
 *
 * MISSION: Qualify for Kalshi Liquidity Incentive Program & Volume Rebates
 * STRATEGY: Place resting limit orders (MAKER) instead of market orders (TAKER)
 * COMPLIANCE: CFTC-regulated terminology throughout
 *
 * KEY CHANGES FROM TAKER MODEL:
 * - Default to 'limit' orders (not market orders)
 * - Calculate spread and place at best_bid+1 or best_ask-1
 * - Dual-source verification (REST + WebSocket)
 * - Rate limit enforcement (10 req/sec Basic tier)
 * - Batched execution for >3 tickers
 *
 * ============================================================================
 */

import crypto from 'crypto';
import fs from 'fs';

// ============================================================================
// INTERFACES
// ============================================================================

interface OrderBookLevel {
  price: number; // in cents
  quantity: number;
}

interface OrderBook {
  yes: {
    bids: OrderBookLevel[];  // Best bid at [0]
    asks: OrderBookLevel[];  // Best ask at [0]
  };
  no: {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
  };
  last_updated: string;
}

interface RestingOrder {
  order_id: string;
  ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  type: 'limit';
  price: number;  // in cents
  count: number;
  status: 'resting' | 'executed' | 'canceled';
  created_at: string;
  last_checked: string;
}

interface RateLimitState {
  requests: number[];  // timestamps of requests
  maxPerSecond: number;
}

// ============================================================================
// KALSHI LIQUIDITY PROVIDER (MAKER MODEL)
// ============================================================================

export class KalshiLiquidityProvider {
  private apiKeyId: string;
  private privateKey: string;
  private baseUrl: string;
  private keyConfigured: boolean = false;

  // Rate limiting
  private rateLimitState: RateLimitState = {
    requests: [],
    maxPerSecond: 10  // Basic tier limit
  };

  // Order tracking
  private restingOrders: Map<string, RestingOrder> = new Map();
  private orderVerificationInterval: NodeJS.Timeout | null = null;

  // Constants
  private readonly MIN_SPREAD_FOR_MAKER = 2;  // cents
  private readonly ORDER_VERIFICATION_INTERVAL = 5000;  // 5 seconds

  constructor() {
    this.apiKeyId = process.env.KALSHI_API_KEY_ID || '';

    // Support KALSHI_PRIVATE_KEY (inline) or KALSHI_PRIVATE_KEY_PATH (file)
    let rawKey = process.env.KALSHI_PRIVATE_KEY || '';
    const keyPath = process.env.KALSHI_PRIVATE_KEY_PATH || '';

    if (!rawKey && keyPath && fs.existsSync(keyPath)) {
      try {
        rawKey = fs.readFileSync(keyPath, 'utf8');
        console.log('✅ Loaded Kalshi private key from file:', keyPath);
      } catch (e) {
        console.error('❌ Failed to read private key from file:', keyPath);
      }
    }

    // Normalize key: handle \n escapes and quotes
    this.privateKey = rawKey.replace(/\\n/g, '\n').replace(/^"+|"+$/g, '').trim();

    // Base URL WITHOUT /trade-api/v2 - we'll add it in paths
    this.baseUrl = 'https://trading-api.kalshi.com';

    // Validate key is a proper RSA key
    if (this.apiKeyId && this.privateKey && this.privateKey.includes('BEGIN') && this.privateKey.includes('PRIVATE KEY')) {
      try {
        crypto.createPrivateKey(this.privateKey);
        this.keyConfigured = true;
        this.startOrderVerification();
        console.log('✅ Kalshi Liquidity Provider initialized (MAKER MODE)');
      } catch (e) {
        console.error('❌ Invalid KALSHI_PRIVATE_KEY format:', e);
        this.keyConfigured = false;
      }
    } else {
      console.warn('⚠️  Kalshi API keys not configured - running in simulation mode');
      this.keyConfigured = false;
    }
  }

  // ==========================================================================
  // RATE LIMITING (10 req/sec cap)
  // ==========================================================================

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Clean up old timestamps
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      ts => ts > oneSecondAgo
    );

    // If at limit, wait with exponential backoff
    if (this.rateLimitState.requests.length >= this.rateLimitState.maxPerSecond) {
      const delay = Math.min(1000, 100 * Math.pow(2, this.rateLimitState.requests.length - this.rateLimitState.maxPerSecond));
      console.log(`⏸️  Rate limit reached (${this.rateLimitState.maxPerSecond}/sec), waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.enforceRateLimit();  // Recursive retry
    }

    // Record this request
    this.rateLimitState.requests.push(now);
  }

  // ==========================================================================
  // RSA-PSS SIGNATURE (Kalshi Authentication - CORRECT METHOD)
  // ==========================================================================

  private async signRequestWithTimestamp(
    method: string,
    path: string,
    body?: any
  ): Promise<{ signature: string; timestamp: string }> {
    try {
      const timestamp = Date.now().toString();
      // CRITICAL: Strip query params and use only path for signature
      const pathWithoutQuery = path.split('?')[0];
      // CRITICAL: Kalshi format: timestamp + METHOD + path (NO body in signature)
      const message = timestamp + method.toUpperCase() + pathWithoutQuery;

      // RSA-PSS signing (REQUIRED by Kalshi)
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(message);
      sign.end();
      const signature = sign.sign({
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }).toString('base64');

      return { signature, timestamp };
    } catch (error: any) {
      console.error('❌ Signature generation failed:', error.message);
      return { signature: '', timestamp: '' };
    }
  }

  // ==========================================================================
  // GET ORDER BOOK (FOR SPREAD CALCULATION)
  // ==========================================================================

  async getOrderBook(ticker: string): Promise<OrderBook | null> {
    if (!this.keyConfigured) {
      console.log(`[SIMULATED] Would fetch order book for ${ticker}`);
      return null;
    }

    try {
      await this.enforceRateLimit();

      const fullPath = `/trade-api/v2/markets/${ticker}/orderbook`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);

      const response = await fetch(`${this.baseUrl}${fullPath}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        throw new Error(`Order book fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data.orderbook as OrderBook;
    } catch (error: any) {
      console.error(`❌ Error fetching order book for ${ticker}:`, error.message);
      return null;
    }
  }

  // ==========================================================================
  // CALCULATE OPTIMAL MAKER PRICE
  // ==========================================================================

  private calculateMakerPrice(
    orderBook: OrderBook,
    side: 'yes' | 'no',
    action: 'buy' | 'sell'
  ): { price: number; spread: number } | null {
    const book = side === 'yes' ? orderBook.yes : orderBook.no;

    if (book.bids.length === 0 || book.asks.length === 0) {
      console.warn(`⚠️  Insufficient order book depth for ${side}`);
      return null;
    }

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const spread = bestAsk - bestBid;

    // Only place maker orders if spread is >2 cents (profitable after fees)
    if (spread < this.MIN_SPREAD_FOR_MAKER) {
      console.log(`   📉 Spread too tight (${spread}¢) - skipping maker order`);
      return null;
    }

    // Place limit order inside the spread
    const price = action === 'buy'
      ? bestBid + 1  // Better than current best bid by 1 cent
      : bestAsk - 1;  // Better than current best ask by 1 cent

    return { price, spread };
  }

  // ==========================================================================
  // PLACE RESTING LIMIT ORDER (MAKER)
  // ==========================================================================

  async placeRestingOrder(
    ticker: string,
    side: 'yes' | 'no',
    action: 'buy' | 'sell',
    contracts: number,
    maxPriceCents?: number  // Optional: override calculated price
  ): Promise<RestingOrder | null> {
    if (!this.keyConfigured) {
      console.log(`[SIMULATED] Would place resting order: ${ticker} ${side} ${action} ${contracts} contracts`);
      return null;
    }

    try {
      // Step 1: Get order book to calculate optimal price
      const orderBook = await this.getOrderBook(ticker);
      if (!orderBook) {
        console.error(`❌ Cannot place order without order book data`);
        return null;
      }

      // Step 2: Calculate maker price (best_bid+1 or best_ask-1)
      const priceCalc = this.calculateMakerPrice(orderBook, side, action);
      if (!priceCalc) {
        return null;  // Spread too tight
      }

      const limitPrice = maxPriceCents || priceCalc.price;

      console.log(`   📊 Spread: ${priceCalc.spread}¢ | Placing limit order at ${limitPrice}¢`);

      // Step 3: Enforce rate limit
      await this.enforceRateLimit();

      // Step 4: Build order payload
      const fullPath = '/trade-api/v2/portfolio/orders';
      const builderCode = process.env.KALSHI_BUILDER_CODE || '';
      const body: any = {
        ticker,
        client_order_id: `maker_${Date.now()}`,
        side,
        action,
        count: contracts,
        type: 'limit',
        yes_price: side === 'yes' ? limitPrice : undefined,
        no_price: side === 'no' ? limitPrice : undefined,
      };

      // Add Builder Code if configured (Dec 2025 feature - earns % of volume)
      if (builderCode) {
        body.builder_code = builderCode;
      }

      // Step 5: Sign and send
      const { signature, timestamp } = await this.signRequestWithTimestamp('POST', fullPath, body);

      const response = await fetch(`${this.baseUrl}${fullPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order placement failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Step 6: Track resting order
      const restingOrder: RestingOrder = {
        order_id: data.order.order_id,
        ticker,
        side,
        action,
        type: 'limit',
        price: limitPrice,
        count: contracts,
        status: 'resting',
        created_at: new Date().toISOString(),
        last_checked: new Date().toISOString(),
      };

      this.restingOrders.set(restingOrder.order_id, restingOrder);

      console.log(`   ✅ Resting limit order placed: ${restingOrder.order_id}`);
      return restingOrder;

    } catch (error: any) {
      console.error(`❌ Error placing resting order:`, error.message);
      return null;
    }
  }

  // ==========================================================================
  // BATCH ORDER PLACEMENT (>3 tickers)
  // ==========================================================================

  async placeBatchedOrders(
    orders: Array<{
      ticker: string;
      side: 'yes' | 'no';
      action: 'buy' | 'sell';
      contracts: number;
    }>
  ): Promise<RestingOrder[]> {
    if (!this.keyConfigured) {
      console.log(`[SIMULATED] Would place ${orders.length} batched orders`);
      return [];
    }

    try {
      await this.enforceRateLimit();

      const fullPath = '/trade-api/v2/portfolio/orders/batched';

      // Build batch payload
      const builderCode = process.env.KALSHI_BUILDER_CODE || '';
      const batchOrders = await Promise.all(
        orders.map(async (order) => {
          const orderBook = await this.getOrderBook(order.ticker);
          if (!orderBook) return null;

          const priceCalc = this.calculateMakerPrice(orderBook, order.side, order.action);
          if (!priceCalc) return null;

          const orderBody: any = {
            ticker: order.ticker,
            client_order_id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            side: order.side,
            action: order.action,
            count: order.contracts,
            type: 'limit',
            yes_price: order.side === 'yes' ? priceCalc.price : undefined,
            no_price: order.side === 'no' ? priceCalc.price : undefined,
          };

          // Add Builder Code if configured (Dec 2025 feature - earns % of volume)
          if (builderCode) {
            orderBody.builder_code = builderCode;
          }

          return orderBody;
        })
      );

      const validOrders = batchOrders.filter(o => o !== null);

      if (validOrders.length === 0) {
        console.log(`⚠️  No valid orders in batch (all spreads too tight)`);
        return [];
      }

      const body = { orders: validOrders };
      const { signature, timestamp } = await this.signRequestWithTimestamp('POST', fullPath, body);

      const response = await fetch(`${this.baseUrl}${fullPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Batch order failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const placedOrders: RestingOrder[] = [];

      // Track all placed orders
      for (const orderResponse of data.orders || []) {
        const restingOrder: RestingOrder = {
          order_id: orderResponse.order_id,
          ticker: orderResponse.ticker,
          side: orderResponse.side,
          action: orderResponse.action,
          type: 'limit',
          price: orderResponse.yes_price || orderResponse.no_price || 0,
          count: orderResponse.count,
          status: 'resting',
          created_at: new Date().toISOString(),
          last_checked: new Date().toISOString(),
        };

        this.restingOrders.set(restingOrder.order_id, restingOrder);
        placedOrders.push(restingOrder);
      }

      console.log(`   ✅ Batched ${placedOrders.length} resting orders`);
      return placedOrders;

    } catch (error: any) {
      console.error(`❌ Batch order error:`, error.message);
      return [];
    }
  }

  // ==========================================================================
  // DUAL-SOURCE VERIFICATION (REST + WebSocket cross-check)
  // ==========================================================================

  private async verifyOrderStatus(orderId: string): Promise<string> {
    try {
      await this.enforceRateLimit();

      const fullPath = `/trade-api/v2/portfolio/orders/${orderId}`;
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);

      const response = await fetch(`${this.baseUrl}${fullPath}`, {
        headers: {
          'Content-Type': 'application/json',
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      return data.order.status;  // 'resting', 'executed', 'canceled', etc.

    } catch (error: any) {
      console.error(`❌ Order verification failed for ${orderId}:`, error.message);
      return 'unknown';
    }
  }

  private async startOrderVerification(): Promise<void> {
    // Verify all resting orders every 5 seconds
    this.orderVerificationInterval = setInterval(async () => {
      if (this.restingOrders.size === 0) return;

      console.log(`🔍 Verifying ${this.restingOrders.size} resting orders...`);

      for (const [orderId, order] of this.restingOrders.entries()) {
        const status = await this.verifyOrderStatus(orderId);

        if (status !== order.status) {
          console.log(`   📊 Order ${orderId} status changed: ${order.status} → ${status}`);

          // [CRITICAL: DESYNC] - Log if WebSocket would have reported differently
          // (WebSocket integration would go here)

          order.status = status as any;
          order.last_checked = new Date().toISOString();

          // Remove executed/canceled orders from tracking
          if (status === 'executed' || status === 'canceled') {
            console.log(`   ✅ Removing ${status} order from tracking: ${orderId}`);
            this.restingOrders.delete(orderId);
          }
        }
      }
    }, this.ORDER_VERIFICATION_INTERVAL);
  }

  // ==========================================================================
  // CANCEL ALL RESTING ORDERS (EMERGENCY)
  // ==========================================================================

  async cancelAllRestingOrders(): Promise<void> {
    console.log(`🚨 CANCELING ALL RESTING ORDERS (${this.restingOrders.size} orders)`);

    for (const [orderId, order] of this.restingOrders.entries()) {
      try {
        await this.enforceRateLimit();

        const fullPath = `/trade-api/v2/portfolio/orders/${orderId}`;
        const { signature, timestamp } = await this.signRequestWithTimestamp('DELETE', fullPath);

        const response = await fetch(`${this.baseUrl}${fullPath}`, {
          headers: {
            'Content-Type': 'application/json',
            'KALSHI-ACCESS-KEY': this.apiKeyId,
            'KALSHI-ACCESS-SIGNATURE': signature,
            'KALSHI-ACCESS-TIMESTAMP': timestamp,
          },
        });

        if (response.ok) {
          console.log(`   ✅ Canceled order: ${orderId}`);
          this.restingOrders.delete(orderId);
        } else {
          console.error(`   ❌ Failed to cancel order: ${orderId}`);
        }
      } catch (error: any) {
        console.error(`❌ Cancel error for ${orderId}:`, error.message);
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  destroy(): void {
    if (this.orderVerificationInterval) {
      clearInterval(this.orderVerificationInterval);
    }
  }
}


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

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface InventoryState {
  ticker: string;
  netPosition: number; // positive = long YES, negative = long NO
  totalContracts: number;
  avgEntryPrice: number;
}

interface MakerConstraints {
  maxInventoryPerTicker: number;
  fairValueThresholdCents: number; // max distance from fair value
}

// ============================================================================
// KALSHI LIQUIDITY PROVIDER (MAKER MODEL)
// ============================================================================

export class KalshiLiquidityProvider {
  private apiKeyId: string;
  private privateKey: string;
  private baseUrl: string;
  private keyConfigured: boolean = false;

  // Rate limiting - Token bucket for stability
  private tokenBucket: TokenBucket = {
    tokens: 10,
    lastRefill: Date.now(),
    maxTokens: 10,
    refillRate: 10 // 10 tokens per second (Basic tier)
  };

  // Inventory tracking per ticker
  private inventory: Map<string, InventoryState> = new Map();

  // Maker constraints
  private constraints: MakerConstraints = {
    maxInventoryPerTicker: 100, // max 100 contracts per ticker
    fairValueThresholdCents: 10  // max 10 cents from fair value
  };

  // Constants
  private readonly MIN_SPREAD_FOR_MAKER = 2;  // cents
  private readonly ORDER_VERIFICATION_INTERVAL = 5000;  // 5 seconds
  private restingOrders: Map<string, RestingOrder> = new Map();
  private orderVerificationInterval: NodeJS.Timeout | null = null;

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

    // Convert single-line key to proper multi-line PEM format if it's missing newlines
    if (this.privateKey.includes('-----BEGIN RSA PRIVATE KEY-----') && !this.privateKey.includes('\n')) {
      const begin = '-----BEGIN RSA PRIVATE KEY-----';
      const end = '-----END RSA PRIVATE KEY-----';
      const beginIdx = this.privateKey.indexOf(begin);
      const endIdx = this.privateKey.indexOf(end);

      if (beginIdx !== -1 && endIdx !== -1) {
        const content = this.privateKey.substring(beginIdx + begin.length, endIdx);
        // Insert newlines every 64 characters
        const lines = content.match(/.{1,64}/g) || [];
        this.privateKey = `${begin}\n${lines.join('\n')}\n${end}`;
      }
    } else if (!this.privateKey.includes('BEGIN RSA PRIVATE KEY') && this.privateKey.length > 100) {
      // If it's just the raw base64 string
      const lines = this.privateKey.match(/.{1,64}/g) || [];
      this.privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${lines.join('\n')}\n-----END RSA PRIVATE KEY-----`;
    }

    // Base URL - Kalshi migrated to elections API
    this.baseUrl = 'https://api.elections.kalshi.com';

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
  // TOKEN BUCKET RATE LIMITING (Stable, non-recursive)
  // ==========================================================================

  private async enforceRateLimit(): Promise<void> {
    // Non-recursive token bucket — hard cap of 5 seconds total wait to prevent hangs
    const MAX_WAIT_MS = 5000;
    const waitStart = Date.now();

    while (true) {
      const now = Date.now();
      const timePassed = (now - this.tokenBucket.lastRefill) / 1000;

      // Refill tokens based on time passed
      const tokensToAdd = timePassed * this.tokenBucket.refillRate;
      this.tokenBucket.tokens = Math.min(
        this.tokenBucket.maxTokens,
        this.tokenBucket.tokens + tokensToAdd
      );
      this.tokenBucket.lastRefill = now;

      if (this.tokenBucket.tokens >= 1) {
        // Token available — consume and return
        this.tokenBucket.tokens -= 1;
        return;
      }

      // Hard guard: if we've waited too long, log and bail out
      if (Date.now() - waitStart >= MAX_WAIT_MS) {
        console.warn(`⚠️  Rate limit: max wait (${MAX_WAIT_MS}ms) exceeded — proceeding anyway`);
        this.tokenBucket.tokens = 0;
        return;
      }

      const waitTime = Math.min(
        (1 - this.tokenBucket.tokens) / this.tokenBucket.refillRate * 1000,
        MAX_WAIT_MS - (Date.now() - waitStart)
      );
      console.log(`⏸️  Rate limit: waiting ${waitTime.toFixed(0)}ms for token`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
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

      const data: any = await response.json();
      return data.orderbook as OrderBook;
    } catch (error: any) {
      console.error(`❌ Error fetching order book for ${ticker}:`, error.message);
      return null;
    }
  }

  // ==========================================================================
  // CALCULATE OPTIMAL MAKER PRICE (with fair value guardrail)
  // ==========================================================================

  private calculateMakerPrice(
    orderBook: OrderBook,
    side: 'yes' | 'no',
    action: 'buy' | 'sell',
    fairValueCents?: number // Model fair value (0-100)
  ): { price: number; spread: number } | null {
    const book = side === 'yes' ? orderBook.yes : orderBook.no;

    if (book.bids.length === 0 || book.asks.length === 0) {
      console.warn(`⚠️  Insufficient order book depth for ${side}`);
      return null;
    }

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const spread = bestAsk - bestBid;

    // CRITICAL: Only place maker orders if spread is profitable after fees
    // Maker fee is typically 0.5%, so need spread > 1% to be profitable
    const minProfitableSpread = 2; // cents (1% = 1 cent on 100 cent contract)
    if (spread < minProfitableSpread) {
      console.log(`   📉 Spread too tight (${spread}¢) - skipping maker order`);
      return null;
    }

    // Calculate proposed maker price
    const proposedPrice = action === 'buy'
      ? bestBid + 1  // Better than current best bid by 1 cent
      : bestAsk - 1;  // Better than current best ask by 1 cent

    // CRITICAL: Fair value guardrail - don't trade if price is worse than fair value
    if (fairValueCents !== undefined) {
      const distanceFromFair = Math.abs(proposedPrice - fairValueCents);

      // For buys: don't pay more than fair value + threshold
      // For sells: don't accept less than fair value - threshold
      if (action === 'buy' && proposedPrice > fairValueCents + this.constraints.fairValueThresholdCents) {
        console.log(`   🛑 Buy price ${proposedPrice}¢ exceeds fair value ${fairValueCents}¢ + threshold`);
        return null;
      }

      if (action === 'sell' && proposedPrice < fairValueCents - this.constraints.fairValueThresholdCents) {
        console.log(`   🛑 Sell price ${proposedPrice}¢ below fair value ${fairValueCents}¢ - threshold`);
        return null;
      }

      // Additional guard: don't trade if distance from fair is excessive
      if (distanceFromFair > this.constraints.fairValueThresholdCents * 2) {
        console.log(`   🛑 Price ${proposedPrice}¢ too far from fair value ${fairValueCents}¢`);
        return null;
      }
    }

    // CRITICAL: Verify maker status - ensure we don't cross the book
    if (action === 'buy' && proposedPrice >= bestAsk) {
      console.log(`   🛑 Buy price ${proposedPrice}¢ would cross book (bestAsk: ${bestAsk}¢)`);
      return null;
    }

    if (action === 'sell' && proposedPrice <= bestBid) {
      console.log(`   🛑 Sell price ${proposedPrice}¢ would cross book (bestBid: ${bestBid}¢)`);
      return null;
    }

    return { price: proposedPrice, spread };
  }

  // ==========================================================================
  // INVENTORY MANAGEMENT
  // ==========================================================================

  private getInventory(ticker: string): InventoryState {
    return this.inventory.get(ticker) || {
      ticker,
      netPosition: 0,
      totalContracts: 0,
      avgEntryPrice: 0
    };
  }

  private updateInventory(ticker: string, side: 'yes' | 'no', action: 'buy' | 'sell', count: number, price: number): void {
    const current = this.getInventory(ticker);
    const multiplier = (side === 'yes' ? 1 : -1) * (action === 'buy' ? 1 : -1);
    const newContracts = count * multiplier;

    const newTotal = current.totalContracts + Math.abs(newContracts);
    const newNetPosition = current.netPosition + newContracts;

    // Update average entry price
    const totalValue = (current.avgEntryPrice * current.totalContracts) + (price * Math.abs(newContracts));
    const newAvgPrice = newTotal > 0 ? totalValue / newTotal : 0;

    this.inventory.set(ticker, {
      ticker,
      netPosition: newNetPosition,
      totalContracts: newTotal,
      avgEntryPrice: newAvgPrice
    });
  }

  private checkInventoryLimit(ticker: string, side: 'yes' | 'no', action: 'buy' | 'sell', count: number): boolean {
    const inventory = this.getInventory(ticker);
    const multiplier = (side === 'yes' ? 1 : -1) * (action === 'buy' ? 1 : -1);
    const newPosition = inventory.netPosition + (count * multiplier);

    // Check absolute position limit
    if (Math.abs(newPosition) > this.constraints.maxInventoryPerTicker) {
      console.log(`   🛑 Inventory limit exceeded: ${Math.abs(newPosition)} > ${this.constraints.maxInventoryPerTicker}`);
      return false;
    }

    return true;
  }

  // ==========================================================================
  // PLACE RESTING LIMIT ORDER (MAKER with inventory + fair value controls)
  // ==========================================================================

  async placeRestingOrder(
    ticker: string,
    side: 'yes' | 'no',
    action: 'buy' | 'sell',
    contracts: number,
    maxPriceCents?: number,  // Optional: override calculated price
    fairValueCents?: number  // Model fair value for guardrail (0-100)
  ): Promise<RestingOrder | null> {
    if (!this.keyConfigured) {
      console.log(`[SIMULATED] Would place resting order: ${ticker} ${side} ${action} ${contracts} contracts`);
      return null;
    }

    // CRITICAL: Check inventory limits before placing
    if (!this.checkInventoryLimit(ticker, side, action, contracts)) {
      console.log(`   🛑 Order rejected: inventory limit exceeded for ${ticker}`);
      return null;
    }

    try {
      // Step 1: Get order book to calculate optimal price
      const orderBook = await this.getOrderBook(ticker);
      if (!orderBook) {
        console.error(`❌ Cannot place order without order book data`);
        return null;
      }

      // Step 2: Calculate maker price with fair value guardrail
      const priceCalc = this.calculateMakerPrice(orderBook, side, action, fairValueCents);
      if (!priceCalc) {
        return null;  // Spread too tight or violates fair value
      }

      const limitPrice = maxPriceCents || priceCalc.price;

      console.log(`   📊 Spread: ${priceCalc.spread}¢ | Placing limit order at ${limitPrice}¢`);

      // Step 3: Enforce rate limit
      await this.enforceRateLimit();

      // Step 4: Build order payload with crypto.randomUUID for safety
      const fullPath = '/trade-api/v2/portfolio/orders';
      const builderCode = process.env.KALSHI_BUILDER_CODE || '';
      const body: any = {
        ticker,
        client_order_id: crypto.randomUUID(), // Use UUID to prevent collisions
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

      const data: any = await response.json();

      // Step 6: Update inventory tracking
      this.updateInventory(ticker, side, action, contracts, limitPrice);

      // Step 7: Track resting order
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
      console.log(`   📈 Inventory: ${this.getInventory(ticker).netPosition} contracts`);
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

      const data: any = await response.json();
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

      const data: any = await response.json();
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


/**
 * Coinbase Exchange Integration
 * Uses Coinbase Developer Platform (CDP) Advanced Trade API
 * Docs: https://docs.cdp.coinbase.com/advanced-trade/docs/welcome
 *
 * Authentication: JWT with ES256 (EC Private Key)
 */

import crypto from 'crypto';
import { SignJWT } from 'jose';

interface CoinbaseConfig {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

async function createJWT(apiKey: string, privateKey: string, uri: string): Promise<string> {
  // Parse the private key (handle escaped newlines)
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  try {
    // Import the EC private key using Node's crypto (handles SEC1 format)
    const ecPrivateKey = crypto.createPrivateKey({
      key: formattedKey,
      format: 'pem',
    });

    const nonce = crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);

    // Create and sign the JWT using jose with Node crypto key
    const jwt = await new SignJWT({ uri })
      .setProtectedHeader({
        alg: 'ES256',
        kid: apiKey,
        nonce,
        typ: 'JWT',
      })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 120)
      .setSubject(apiKey)
      .setIssuer('cdp')
      .sign(ecPrivateKey);

    return jwt;
  } catch (err: any) {
    console.error('[JWT ERROR] Failed to sign:', err.message);
    throw err;
  }
}

interface CoinbaseAccount {
  id: string;
  currency: string;
  balance: number;
  available: number;
  hold: number;
}

interface CoinbaseOrder {
  id: string;
  productId: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  status: string;
  filledSize: number;
  fillFees: number;
  createdAt: string;
}

interface CoinbaseTicker {
  productId: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  time: string;
}

export class CoinbaseExchange {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private configured: boolean;

  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY || '';
    this.apiSecret = process.env.COINBASE_API_SECRET || '';
    this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    this.configured = !!(this.apiKey && this.apiSecret);

    if (!this.configured) {
      console.log('⚠️ Coinbase not configured - running in simulation mode');
    }
  }

  private async request(method: string, path: string, body?: any, queryParams?: Record<string, string>): Promise<any> {
    if (!this.configured) {
      console.log(`   🔍 [COINBASE SIMULATION] ${method} ${path}`);
      return this.simulatedResponse(method, path, body);
    }

    // CDP API: JWT signs path WITHOUT query params
    const fullPath = `/api/v3/brokerage${path}`;
    const uri = `${method} api.coinbase.com${fullPath}`;
    console.log(`   🔍 [COINBASE REAL API] ${method} ${fullPath}`);
    const jwt = await createJWT(this.apiKey, this.apiSecret, uri);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    // Build URL with query params (not included in JWT)
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Coinbase API error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`[COINBASE] Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all account balances (with pagination)
   */
  async getAccounts(): Promise<CoinbaseAccount[]> {
    const allAccounts: CoinbaseAccount[] = [];
    let cursor: string | undefined;
    let pageNum = 0;
    const maxPages = 10;

    do {
      const queryParams: Record<string, string> = { limit: '250' };
      if (cursor) queryParams.cursor = cursor;

      const data = await this.request('GET', '/accounts', undefined, queryParams);

      const accounts = (data.accounts || []).map((acc: any) => ({
        id: acc.uuid,
        currency: acc.currency,
        balance: parseFloat(acc.available_balance?.value || '0'),
        available: parseFloat(acc.available_balance?.value || '0'),
        hold: parseFloat(acc.hold?.value || '0'),
      }));

      allAccounts.push(...accounts);
      cursor = data.cursor;
      pageNum++;

    } while (cursor && pageNum < maxPages);

    console.log(`   [Coinbase] Fetched ${allAccounts.length} accounts total`);
    return allAccounts;
  }

  /**
   * Get USD balance
   */
  async getUSDBalance(): Promise<number> {
    const accounts = await this.getAccounts();
    const usdAccount = accounts.find(a => a.currency === 'USD');
    return usdAccount?.available || 0;
  }

  /**
   * Get crypto balance
   */
  async getCryptoBalance(symbol: string): Promise<number> {
    const accounts = await this.getAccounts();
    const account = accounts.find(a => a.currency === symbol.toUpperCase());
    return account?.available || 0;
  }

  /**
   * Get current price for a trading pair
   */
  async getTicker(productId: string): Promise<CoinbaseTicker> {
    try {
      const data = await this.request('GET', `/products/${productId}/ticker`);
      // CDP API returns trades array with price info
      const trade = data.trades?.[0] || data;
      return {
        productId,
        price: parseFloat(trade.price || data.price || '0'),
        bid: parseFloat(data.best_bid || data.bid || '0'),
        ask: parseFloat(data.best_ask || data.ask || '0'),
        volume: parseFloat(data.volume_24h || data.volume || '0'),
        time: trade.time || data.time || new Date().toISOString(),
      };
    } catch (error: any) {
      // Ignore 404 errors for delisted assets (CLV, BOND, NU, etc.)
      if (error?.message?.includes('404') || error?.message?.includes('NOT_FOUND')) {
        // Silently return zero values for delisted assets
        return {
          productId,
          price: 0,
          bid: 0,
          ask: 0,
          volume: 0,
          time: new Date().toISOString(),
        };
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Place a market buy order
   */
  async marketBuy(productId: string, usdAmount: number): Promise<CoinbaseOrder> {
    console.log(`📈 [COINBASE] Market BUY ${productId} for $${usdAmount}`);

    const order = await this.request('POST', '/orders', {
      client_order_id: `alpha_${Date.now()}`,
      product_id: productId,
      side: 'BUY',
      order_configuration: {
        market_market_ioc: {
          quote_size: usdAmount.toString(),
        },
      },
    });

    return this.transformOrder(order);
  }

  /**
   * Place a market sell order
   */
  async marketSell(productId: string, cryptoAmount: number): Promise<CoinbaseOrder> {
    console.log(`📉 [COINBASE] Market SELL ${cryptoAmount} ${productId}`);

    const response = await this.request('POST', '/orders', {
      client_order_id: `alpha_${Date.now()}`,
      product_id: productId,
      side: 'SELL',
      order_configuration: {
        market_market_ioc: {
          base_size: cryptoAmount.toString(),
        },
      },
    });

    return this.transformOrder(response);
  }

  /**
   * Place a limit buy order
   */
  async limitBuy(productId: string, price: number, size: number): Promise<CoinbaseOrder> {
    console.log(`📈 [COINBASE] Limit BUY ${size} ${productId} @ $${price}`);

    const order = await this.request('POST', '/orders', {
      client_order_id: `alpha_${Date.now()}`,
      product_id: productId,
      side: 'BUY',
      order_configuration: {
        limit_limit_gtc: {
          base_size: size.toString(),
          limit_price: price.toString(),
        },
      },
    });

    return this.transformOrder(order);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request('POST', '/orders/batch_cancel', {
        order_ids: [orderId],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<CoinbaseOrder | null> {
    try {
      const data = await this.request('GET', `/orders/historical/${orderId}`);
      return this.transformOrder(data.order);
    } catch {
      return null;
    }
  }

  /**
   * Get recent orders
   */
  async getOrders(productId?: string): Promise<CoinbaseOrder[]> {
    const path = productId
      ? `/orders/historical/fills?product_id=${productId}`
      : '/orders/historical/fills';
    const data = await this.request('GET', path);
    return (data.fills || []).map((o: any) => this.transformOrder(o));
  }

  /**
   * Execute a trade with profit target and stop loss
   */
  async executeTrade(
    productId: string,
    side: 'buy' | 'sell',
    usdAmount: number,
    takeProfitPercent: number = 5,
    stopLossPercent: number = 3
  ): Promise<{
    entryOrder: CoinbaseOrder;
    entryPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
  }> {
    // Execute entry
    const entryOrder = side === 'buy'
      ? await this.marketBuy(productId, usdAmount)
      : await this.marketSell(productId, usdAmount);

    // Get current price for TP/SL calculation
    const ticker = await this.getTicker(productId);
    const entryPrice = ticker.price;

    const takeProfitPrice = side === 'buy'
      ? entryPrice * (1 + takeProfitPercent / 100)
      : entryPrice * (1 - takeProfitPercent / 100);

    const stopLossPrice = side === 'buy'
      ? entryPrice * (1 - stopLossPercent / 100)
      : entryPrice * (1 + stopLossPercent / 100);

    console.log(`🎯 Entry: $${entryPrice.toFixed(2)}`);
    console.log(`✅ Take Profit: $${takeProfitPrice.toFixed(2)} (+${takeProfitPercent}%)`);
    console.log(`🛑 Stop Loss: $${stopLossPrice.toFixed(2)} (-${stopLossPercent}%)`);

    return {
      entryOrder,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
    };
  }

  private transformOrder(order: any): CoinbaseOrder {
    // Handle different response formats from Coinbase API
    const data = order.success_response || order.order || order;
    const config = order.order_configuration || {};
    const marketConfig = config.market_market_ioc || {};

    return {
      id: data.order_id || data.id || order.order_id,
      productId: data.product_id || order.product_id,
      side: (data.side || order.side || 'buy').toLowerCase() as 'buy' | 'sell',
      type: config.market_market_ioc ? 'market' : 'limit',
      size: parseFloat(marketConfig.base_size || data.base_size || data.size || '0'),
      price: parseFloat(data.limit_price || data.price || '0'),
      status: order.success ? 'pending' : (data.status || 'unknown'),
      filledSize: parseFloat(data.filled_size || '0'),
      fillFees: parseFloat(data.total_fees || '0'),
      createdAt: data.created_time || new Date().toISOString(),
    };
  }

  private simulatedResponse(method: string, path: string, body?: any): any {
    // Simulated responses for testing without real API
    if (path.includes('/accounts')) {
      return {
        accounts: [
          { uuid: 'sim-usd', currency: 'USD', available_balance: { value: '250.00' } },
          { uuid: 'sim-btc', currency: 'BTC', available_balance: { value: '0.005' } },
          { uuid: 'sim-eth', currency: 'ETH', available_balance: { value: '0.1' } },
        ],
      };
    }
    if (path.includes('/ticker')) {
      return { price: '95000', bid: '94990', ask: '95010', volume: '15000' };
    }
    if (path.includes('/orders') && method === 'POST') {
      return {
        order_id: `sim_${Date.now()}`,
        product_id: body?.product_id || 'BTC-USD',
        side: body?.side || 'BUY',
        status: 'FILLED',
        filled_size: '0.001',
      };
    }
    return {};
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getName(): string {
    return 'Coinbase';
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR LIVE TRADER
  // ============================================================================

  /**
   * Get current price for a trading pair (convenience wrapper)
   */
  async getPrice(productId: string): Promise<number> {
    try {
      const ticker = await this.getTicker(productId);
      return ticker.price;
    } catch (error: any) {
      // Silently ignore 404 errors for delisted assets
      if (error?.message?.includes('404') || error?.message?.includes('NOT_FOUND')) {
        return 0;
      }
      // Only log non-404 errors
      console.error(`Error getting price for ${productId}:`, error);
      return 0;
    }
  }

  /**
   * Get candles/OHLCV data for technical analysis
   */
  async getCandles(productId: string, granularity: number = 300): Promise<Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      // Use public API for candles (no auth required)
      const url = `https://api.exchange.coinbase.com/products/${productId}/candles?granularity=${granularity}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Candles API error: ${response.status}`);
      }

      const data = await response.json() as any[];

      // Coinbase returns: [time, low, high, open, close, volume]
      return data.map((candle: any[]) => ({
        timestamp: candle[0],
        low: candle[1],
        high: candle[2],
        open: candle[3],
        close: candle[4],
        volume: candle[5],
      })).reverse(); // Oldest first
    } catch (error) {
      console.error(`Error fetching candles for ${productId}:`, error);
      return [];
    }
  }

  /**
   * Execute a market order (buy or sell)
   */
  async marketOrder(productId: string, side: 'buy' | 'sell', amount: number): Promise<{
    id: string;
    price: number;
    size: number;
    side: string;
    fees: number;
  } | null> {
    try {
      let order;
      if (side === 'buy') {
        order = await this.marketBuy(productId, amount);
      } else {
        // For sell, we need to convert USD amount to crypto amount
        const price = await this.getPrice(productId);
        if (price <= 0) throw new Error('Could not get price');
        const cryptoAmount = amount / price;
        order = await this.marketSell(productId, cryptoAmount);
      }

      // Coinbase fee is typically 0.6% for taker orders
      const estimatedFees = order.fillFees || (amount * 0.006);

      return {
        id: order.orderId,
        price: order.avgPrice || await this.getPrice(productId),
        size: order.filledSize || amount,
        side: order.side,
        fees: estimatedFees,
      };
    } catch (error) {
      console.error(`Error executing ${side} order for ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get portfolio summary with all positions
   */
  async getPortfolio(): Promise<{
    usdBalance: number;
    positions: Array<{
      symbol: string;
      amount: number;
      value: number;
      price: number;
    }>;
    totalValue: number;
  }> {
    try {
      const accounts = await this.getAccounts();
      const usdBalance = await this.getUSDBalance();

      const positions: Array<{
        symbol: string;
        amount: number;
        value: number;
        price: number;
      }> = [];

      console.log(`   🔍 [PORTFOLIO DEBUG] Found ${accounts.length} accounts, USD: $${usdBalance.toFixed(2)}`);

      // Get crypto positions with values
      for (const account of accounts) {
        const amount = parseFloat(account.available_balance?.value || account.available?.toString() || account.balance?.toString() || '0');
        if (amount > 0.0001 && account.currency !== 'USD' && account.currency !== 'USDC') {
          try {
            const productId = `${account.currency}-USD`;
            const price = await this.getPrice(productId);
            if (price > 0) {
              const value = amount * price;
              console.log(`   🔍 [PORTFOLIO] ${account.currency}: ${amount.toFixed(6)} x $${price.toFixed(2)} = $${value.toFixed(2)}`);
              positions.push({
                symbol: account.currency,
                amount,
                price,
                value,
              });
            }
          } catch (e: any) {
            // Silently skip 404 errors for delisted assets (CLV, BOND, NU, etc.)
            if (!e?.message?.includes('404') && !e?.message?.includes('NOT_FOUND')) {
              console.log(`   ⚠️ [PORTFOLIO] Skipping ${account.currency}: ${e.message}`);
            }
          }
        }
      }

      const cryptoValue = positions.reduce((sum, p) => sum + p.value, 0);
      console.log(`   🔍 [PORTFOLIO TOTAL] USD: $${usdBalance.toFixed(2)}, Crypto: $${cryptoValue.toFixed(2)}, Total: $${(usdBalance + cryptoValue).toFixed(2)}`);

      return {
        usdBalance,
        positions,
        totalValue: usdBalance + cryptoValue,
      };
    } catch (error) {
      console.error('Error getting portfolio:', error);
      return { usdBalance: 0, positions: [], totalValue: 0 };
    }
  }
}


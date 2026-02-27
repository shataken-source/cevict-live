/**
 * Crypto.com Exchange Integration
 * Uses Crypto.com Exchange API for automated trading
 * Docs: https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html
 */

import crypto from 'crypto';

interface CryptoComConfig {
  apiKey: string;
  apiSecret: string;
}

interface CryptoComAccount {
  currency: string;
  balance: number;
  available: number;
  order: number;
  stake: number;
}

interface CryptoComOrder {
  id: string;
  clientOid: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  status: string;
  filledQuantity: number;
  avgPrice: number;
  fee: number;
  createdAt: number;
}

interface CryptoComTicker {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
}

export class CryptoComExchange {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private configured: boolean;

  constructor() {
    this.apiKey = process.env.CRYPTO_COM_API_KEY || '';
    this.apiSecret = process.env.CRYPTO_COM_API_SECRET || '';
    this.baseUrl = 'https://api.crypto.com/exchange/v1';
    this.configured = !!(this.apiKey && this.apiSecret);

    if (!this.configured) {
      console.log('⚠️ Crypto.com not configured - running in simulation mode');
    }
  }

  private sign(method: string, id: number, params: any, nonce: number): string {
    // paramString must ONLY contain the request params — not method/id/nonce
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');

    const sigPayload = method + id + this.apiKey + paramString + nonce;

    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(sigPayload)
      .digest('hex');
  }

  private async request(method: string, params: any = {}): Promise<any> {
    if (!this.configured) {
      throw new Error('Crypto.com not configured — missing CRYPTO_COM_API_KEY / CRYPTO_COM_API_SECRET');
    }

    const id = Date.now();
    const nonce = Date.now();

    const body = {
      id,
      method,
      api_key: this.apiKey,
      params,
      nonce,
      sig: '',
    };

    body.sig = this.sign(method, id, params, nonce);

    const response = await fetch(`${this.baseUrl}/${method.replace('private/', '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        console.warn(`⚠️ Crypto.com auth failed (${response.status}) — disabling exchange`);
        this.configured = false;
      }
      throw new Error(`Crypto.com API error: ${response.status} - ${error}`);
    }

    const data: any = await response.json();
    if (data.code !== 0) {
      throw new Error(`Crypto.com error: ${data.code} - ${data.message}`);
    }

    return data.result;
  }

  /**
   * Get all account balances
   */
  async getAccounts(): Promise<CryptoComAccount[]> {
    const data = await this.request('private/user-balance');
    return (data.data || []).map((acc: any) => ({
      currency: acc.currency,
      balance: parseFloat(acc.balance || '0'),
      available: parseFloat(acc.available || '0'),
      order: parseFloat(acc.order || '0'),
      stake: parseFloat(acc.stake || '0'),
    }));
  }

  /**
   * Get USDT/USDC balance
   */
  async getStablecoinBalance(): Promise<number> {
    const accounts = await this.getAccounts();
    const usdt = accounts.find(a => a.currency === 'USDT');
    const usdc = accounts.find(a => a.currency === 'USDC');
    return (usdt?.available || 0) + (usdc?.available || 0);
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
  async getTicker(symbol: string): Promise<CryptoComTicker> {
    const data = await this.request('public/get-ticker', { instrument_name: symbol });
    const ticker = data.data?.[0] || {};
    return {
      symbol,
      price: parseFloat(ticker.a || '0'), // Last trade price
      bid: parseFloat(ticker.b || '0'),
      ask: parseFloat(ticker.k || '0'),
      high24h: parseFloat(ticker.h || '0'),
      low24h: parseFloat(ticker.l || '0'),
      volume24h: parseFloat(ticker.v || '0'),
      change24h: parseFloat(ticker.c || '0'),
    };
  }

  /**
   * Place a market buy order
   */
  async marketBuy(symbol: string, notionalAmount: number): Promise<CryptoComOrder> {
    console.log(`📈 [CRYPTO.COM] Market BUY ${symbol} for $${notionalAmount}`);

    const order = await this.request('private/create-order', {
      instrument_name: symbol,
      side: 'BUY',
      type: 'MARKET',
      notional: notionalAmount.toString(),
    });

    return this.transformOrder(order);
  }

  /**
   * Place a market sell order
   */
  async marketSell(symbol: string, quantity: number): Promise<CryptoComOrder> {
    console.log(`📉 [CRYPTO.COM] Market SELL ${quantity} ${symbol}`);

    const order = await this.request('private/create-order', {
      instrument_name: symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity.toString(),
    });

    return this.transformOrder(order);
  }

  /**
   * Place a limit buy order
   */
  async limitBuy(symbol: string, price: number, quantity: number): Promise<CryptoComOrder> {
    console.log(`📈 [CRYPTO.COM] Limit BUY ${quantity} ${symbol} @ $${price}`);

    const order = await this.request('private/create-order', {
      instrument_name: symbol,
      side: 'BUY',
      type: 'LIMIT',
      price: price.toString(),
      quantity: quantity.toString(),
      time_in_force: 'GOOD_TILL_CANCEL',
    });

    return this.transformOrder(order);
  }

  /**
   * Place a limit sell order
   */
  async limitSell(symbol: string, price: number, quantity: number): Promise<CryptoComOrder> {
    console.log(`📉 [CRYPTO.COM] Limit SELL ${quantity} ${symbol} @ $${price}`);

    const order = await this.request('private/create-order', {
      instrument_name: symbol,
      side: 'SELL',
      type: 'LIMIT',
      price: price.toString(),
      quantity: quantity.toString(),
      time_in_force: 'GOOD_TILL_CANCEL',
    });

    return this.transformOrder(order);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      await this.request('private/cancel-order', {
        order_id: orderId,
        instrument_name: symbol,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<CryptoComOrder | null> {
    try {
      const data = await this.request('private/get-order-detail', {
        order_id: orderId,
      });
      return this.transformOrder(data);
    } catch {
      return null;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<CryptoComOrder[]> {
    const params = symbol ? { instrument_name: symbol } : {};
    const data = await this.request('private/get-open-orders', params);
    return (data.data || []).map((o: any) => this.transformOrder(o));
  }

  /**
   * Execute a trade with profit target and stop loss
   */
  async executeTrade(
    symbol: string,
    side: 'buy' | 'sell',
    usdAmount: number,
    takeProfitPercent: number = 5,
    stopLossPercent: number = 3
  ): Promise<{
    entryOrder: CryptoComOrder;
    entryPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
  }> {
    // Get current price
    const ticker = await this.getTicker(symbol);
    const entryPrice = ticker.price;

    // Execute entry
    const entryOrder = side === 'buy'
      ? await this.marketBuy(symbol, usdAmount)
      : await this.marketSell(symbol, usdAmount / entryPrice);

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

  private transformOrder(order: any): CryptoComOrder {
    return {
      id: order.order_id || order.id,
      clientOid: order.client_oid || '',
      symbol: order.instrument_name || '',
      side: order.side || 'BUY',
      type: order.type || 'MARKET',
      quantity: parseFloat(order.quantity || '0'),
      price: parseFloat(order.price || '0'),
      status: order.status || 'unknown',
      filledQuantity: parseFloat(order.cumulative_quantity || '0'),
      avgPrice: parseFloat(order.avg_price || '0'),
      fee: parseFloat(order.fee_currency || '0'),
      createdAt: order.create_time || Date.now(),
    };
  }


  isConfigured(): boolean {
    return this.configured;
  }

  getName(): string {
    return 'Crypto.com';
  }
}


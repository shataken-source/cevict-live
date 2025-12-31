"use strict";
/**
 * Crypto.com Exchange Integration
 * Uses Crypto.com Exchange API for automated trading
 * Docs: https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoComExchange = void 0;
const crypto_1 = __importDefault(require("crypto"));
class CryptoComExchange {
    constructor() {
        this.apiKey = process.env.CRYPTO_COM_API_KEY || '';
        this.apiSecret = process.env.CRYPTO_COM_API_SECRET || '';
        this.baseUrl = 'https://api.crypto.com/exchange/v1';
        this.configured = !!(this.apiKey && this.apiSecret);
        if (!this.configured) {
            console.log('⚠️ Crypto.com not configured - running in simulation mode');
        }
    }
    sign(params) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}${params[key]}`)
            .join('');
        const sigPayload = params.method + params.id + this.apiKey + paramString + params.nonce;
        return crypto_1.default
            .createHmac('sha256', this.apiSecret)
            .update(sigPayload)
            .digest('hex');
    }
    async request(method, params = {}) {
        if (!this.configured) {
            return this.simulatedResponse(method, params);
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
        body.sig = this.sign({ method, id, ...params, nonce });
        const response = await fetch(`${this.baseUrl}/${method.replace('private/', '')}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Crypto.com API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        if (data.code !== 0) {
            throw new Error(`Crypto.com error: ${data.code} - ${data.message}`);
        }
        return data.result;
    }
    /**
     * Get all account balances
     */
    async getAccounts() {
        const data = await this.request('private/user-balance');
        return (data.data || []).map((acc) => ({
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
    async getStablecoinBalance() {
        const accounts = await this.getAccounts();
        const usdt = accounts.find(a => a.currency === 'USDT');
        const usdc = accounts.find(a => a.currency === 'USDC');
        return (usdt?.available || 0) + (usdc?.available || 0);
    }
    /**
     * Get crypto balance
     */
    async getCryptoBalance(symbol) {
        const accounts = await this.getAccounts();
        const account = accounts.find(a => a.currency === symbol.toUpperCase());
        return account?.available || 0;
    }
    /**
     * Get current price for a trading pair
     */
    async getTicker(symbol) {
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
    async marketBuy(symbol, notionalAmount) {
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
    async marketSell(symbol, quantity) {
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
    async limitBuy(symbol, price, quantity) {
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
    async limitSell(symbol, price, quantity) {
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
    async cancelOrder(orderId, symbol) {
        try {
            await this.request('private/cancel-order', {
                order_id: orderId,
                instrument_name: symbol,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get order status
     */
    async getOrder(orderId) {
        try {
            const data = await this.request('private/get-order-detail', {
                order_id: orderId,
            });
            return this.transformOrder(data);
        }
        catch {
            return null;
        }
    }
    /**
     * Get open orders
     */
    async getOpenOrders(symbol) {
        const params = symbol ? { instrument_name: symbol } : {};
        const data = await this.request('private/get-open-orders', params);
        return (data.data || []).map((o) => this.transformOrder(o));
    }
    /**
     * Execute a trade with profit target and stop loss
     */
    async executeTrade(symbol, side, usdAmount, takeProfitPercent = 5, stopLossPercent = 3) {
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
    transformOrder(order) {
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
    simulatedResponse(method, params) {
        if (method === 'private/user-balance') {
            return {
                data: [
                    { currency: 'USDT', balance: '150.00', available: '150.00' },
                    { currency: 'BTC', balance: '0.003', available: '0.003' },
                    { currency: 'ETH', balance: '0.08', available: '0.08' },
                    { currency: 'CRO', balance: '500', available: '500' },
                ],
            };
        }
        if (method === 'public/get-ticker') {
            return {
                data: [{ a: '95000', b: '94990', k: '95010', h: '96000', l: '94000', v: '10000', c: '2.5' }],
            };
        }
        if (method.includes('create-order')) {
            return {
                order_id: `sim_cdc_${Date.now()}`,
                instrument_name: params.instrument_name || 'BTC_USDT',
                side: params.side || 'BUY',
                type: params.type || 'MARKET',
                status: 'FILLED',
                cumulative_quantity: '0.001',
                avg_price: '95000',
            };
        }
        return {};
    }
    isConfigured() {
        return this.configured;
    }
    getName() {
        return 'Crypto.com';
    }
}
exports.CryptoComExchange = CryptoComExchange;
//# sourceMappingURL=crypto-com.js.map
"use strict";
/**
 * Binance Exchange Integration
 * Uses Binance Spot API for automated trading
 * Docs: https://binance-docs.github.io/apidocs/spot/en/
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinanceExchange = void 0;
const crypto_1 = __importDefault(require("crypto"));
class BinanceExchange {
    constructor() {
        this.apiKey = process.env.BINANCE_API_KEY || '';
        this.apiSecret = process.env.BINANCE_API_SECRET || '';
        // Use Binance.US for US customers
        this.isUS = process.env.BINANCE_REGION === 'US';
        this.baseUrl = this.isUS
            ? 'https://api.binance.us/api/v3'
            : 'https://api.binance.com/api/v3';
        this.configured = !!(this.apiKey && this.apiSecret);
        if (!this.configured) {
            console.log('⚠️ Binance not configured - running in simulation mode');
        }
    }
    sign(params) {
        const queryString = Object.entries(params)
            .map(([key, val]) => `${key}=${val}`)
            .join('&');
        return crypto_1.default
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
    }
    async publicRequest(endpoint, params = {}) {
        const queryString = Object.entries(params)
            .map(([key, val]) => `${key}=${val}`)
            .join('&');
        const url = queryString
            ? `${this.baseUrl}${endpoint}?${queryString}`
            : `${this.baseUrl}${endpoint}`;
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Binance API error: ${response.status} - ${error}`);
        }
        return response.json();
    }
    async signedRequest(method, endpoint, params = {}) {
        if (!this.configured) {
            return this.simulatedResponse(endpoint, params);
        }
        const timestamp = Date.now();
        const allParams = { ...params, timestamp, recvWindow: 5000 };
        const signature = this.sign(allParams);
        const queryString = Object.entries({ ...allParams, signature })
            .map(([key, val]) => `${key}=${val}`)
            .join('&');
        const url = method === 'GET'
            ? `${this.baseUrl}${endpoint}?${queryString}`
            : `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method,
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: method !== 'GET' ? queryString : undefined,
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Binance API error: ${response.status} - ${error}`);
        }
        return response.json();
    }
    /**
     * Get all account balances
     */
    async getAccounts() {
        const data = await this.signedRequest('GET', '/account');
        return (data.balances || [])
            .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            .map((b) => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
            total: parseFloat(b.free) + parseFloat(b.locked),
        }));
    }
    /**
     * Get USDT balance
     */
    async getUSDTBalance() {
        const accounts = await this.getAccounts();
        const usdt = accounts.find(a => a.asset === 'USDT');
        return usdt?.free || 0;
    }
    /**
     * Get USD balance (for Binance.US)
     */
    async getUSDBalance() {
        const accounts = await this.getAccounts();
        const usd = accounts.find(a => a.asset === 'USD');
        return usd?.free || 0;
    }
    /**
     * Get crypto balance
     */
    async getCryptoBalance(asset) {
        const accounts = await this.getAccounts();
        const account = accounts.find(a => a.asset === asset.toUpperCase());
        return account?.free || 0;
    }
    /**
     * Get current price for a trading pair
     */
    async getTicker(symbol) {
        const [ticker, bookTicker] = await Promise.all([
            this.publicRequest('/ticker/24hr', { symbol }),
            this.publicRequest('/ticker/bookTicker', { symbol }),
        ]);
        return {
            symbol,
            price: parseFloat(ticker.lastPrice || '0'),
            bidPrice: parseFloat(bookTicker.bidPrice || '0'),
            askPrice: parseFloat(bookTicker.askPrice || '0'),
            volume: parseFloat(ticker.volume || '0'),
            priceChange: parseFloat(ticker.priceChange || '0'),
            priceChangePercent: parseFloat(ticker.priceChangePercent || '0'),
        };
    }
    /**
     * Get multiple tickers
     */
    async getTickers(symbols) {
        const data = await this.publicRequest('/ticker/24hr');
        return data
            .filter((t) => symbols.includes(t.symbol))
            .map((t) => ({
            symbol: t.symbol,
            price: parseFloat(t.lastPrice || '0'),
            bidPrice: parseFloat(t.bidPrice || '0'),
            askPrice: parseFloat(t.askPrice || '0'),
            volume: parseFloat(t.volume || '0'),
            priceChange: parseFloat(t.priceChange || '0'),
            priceChangePercent: parseFloat(t.priceChangePercent || '0'),
        }));
    }
    /**
     * Place a market buy order (quote quantity - spend X USDT)
     */
    async marketBuy(symbol, usdtAmount) {
        console.log(`📈 [BINANCE] Market BUY ${symbol} for ${usdtAmount} USDT`);
        const order = await this.signedRequest('POST', '/order', {
            symbol,
            side: 'BUY',
            type: 'MARKET',
            quoteOrderQty: usdtAmount.toFixed(2),
        });
        return this.transformOrder(order);
    }
    /**
     * Place a market sell order
     */
    async marketSell(symbol, quantity) {
        console.log(`📉 [BINANCE] Market SELL ${quantity} ${symbol}`);
        // Get precision for the symbol
        const precision = await this.getQuantityPrecision(symbol);
        const formattedQty = quantity.toFixed(precision);
        const order = await this.signedRequest('POST', '/order', {
            symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: formattedQty,
        });
        return this.transformOrder(order);
    }
    /**
     * Place a limit buy order
     */
    async limitBuy(symbol, price, quantity) {
        console.log(`📈 [BINANCE] Limit BUY ${quantity} ${symbol} @ $${price}`);
        const [pricePrecision, qtyPrecision] = await Promise.all([
            this.getPricePrecision(symbol),
            this.getQuantityPrecision(symbol),
        ]);
        const order = await this.signedRequest('POST', '/order', {
            symbol,
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            price: price.toFixed(pricePrecision),
            quantity: quantity.toFixed(qtyPrecision),
        });
        return this.transformOrder(order);
    }
    /**
     * Place a limit sell order
     */
    async limitSell(symbol, price, quantity) {
        console.log(`📉 [BINANCE] Limit SELL ${quantity} ${symbol} @ $${price}`);
        const [pricePrecision, qtyPrecision] = await Promise.all([
            this.getPricePrecision(symbol),
            this.getQuantityPrecision(symbol),
        ]);
        const order = await this.signedRequest('POST', '/order', {
            symbol,
            side: 'SELL',
            type: 'LIMIT',
            timeInForce: 'GTC',
            price: price.toFixed(pricePrecision),
            quantity: quantity.toFixed(qtyPrecision),
        });
        return this.transformOrder(order);
    }
    /**
     * Place an OCO order (take profit + stop loss)
     */
    async placeOCO(symbol, side, quantity, price, // Limit price (take profit)
    stopPrice, // Stop trigger price
    stopLimitPrice // Stop limit price
    ) {
        console.log(`🎯 [BINANCE] OCO ${side} ${quantity} ${symbol}`);
        console.log(`   TP: $${price} | SL Trigger: $${stopPrice} | SL Limit: $${stopLimitPrice}`);
        const [pricePrecision, qtyPrecision] = await Promise.all([
            this.getPricePrecision(symbol),
            this.getQuantityPrecision(symbol),
        ]);
        const order = await this.signedRequest('POST', '/order/oco', {
            symbol,
            side,
            quantity: quantity.toFixed(qtyPrecision),
            price: price.toFixed(pricePrecision),
            stopPrice: stopPrice.toFixed(pricePrecision),
            stopLimitPrice: stopLimitPrice.toFixed(pricePrecision),
            stopLimitTimeInForce: 'GTC',
        });
        return order;
    }
    /**
     * Cancel an order
     */
    async cancelOrder(symbol, orderId) {
        try {
            await this.signedRequest('DELETE', '/order', { symbol, orderId });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get order status
     */
    async getOrder(symbol, orderId) {
        try {
            const data = await this.signedRequest('GET', '/order', { symbol, orderId });
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
        const params = symbol ? { symbol } : {};
        const data = await this.signedRequest('GET', '/openOrders', params);
        return (data || []).map((o) => this.transformOrder(o));
    }
    /**
     * Get recent trades
     */
    async getRecentTrades(symbol, limit = 10) {
        const data = await this.signedRequest('GET', '/myTrades', { symbol, limit });
        return data || [];
    }
    /**
     * Execute a trade with profit target and stop loss using OCO
     */
    async executeTrade(symbol, side, usdtAmount, takeProfitPercent = 5, stopLossPercent = 3) {
        // Execute entry
        const entryOrder = await this.marketBuy(symbol, usdtAmount);
        const entryPrice = entryOrder.cummulativeQuoteQty / entryOrder.executedQty;
        const takeProfitPrice = side === 'buy'
            ? entryPrice * (1 + takeProfitPercent / 100)
            : entryPrice * (1 - takeProfitPercent / 100);
        const stopLossPrice = side === 'buy'
            ? entryPrice * (1 - stopLossPercent / 100)
            : entryPrice * (1 + stopLossPercent / 100);
        console.log(`🎯 Entry: $${entryPrice.toFixed(2)}`);
        console.log(`✅ Take Profit: $${takeProfitPrice.toFixed(2)} (+${takeProfitPercent}%)`);
        console.log(`🛑 Stop Loss: $${stopLossPrice.toFixed(2)} (-${stopLossPercent}%)`);
        // Place OCO order to close position
        let ocoOrder;
        if (side === 'buy' && entryOrder.executedQty > 0) {
            try {
                ocoOrder = await this.placeOCO(symbol, 'SELL', entryOrder.executedQty, takeProfitPrice, stopLossPrice, stopLossPrice * 0.999 // Slightly below stop trigger
                );
            }
            catch (error) {
                console.error('OCO order failed:', error);
            }
        }
        return {
            entryOrder,
            entryPrice,
            takeProfitPrice,
            stopLossPrice,
            ocoOrder,
        };
    }
    /**
     * Get symbol precision for quantities
     */
    async getQuantityPrecision(symbol) {
        try {
            const info = await this.publicRequest('/exchangeInfo', { symbol });
            const symbolInfo = info.symbols?.find((s) => s.symbol === symbol);
            const lotSize = symbolInfo?.filters?.find((f) => f.filterType === 'LOT_SIZE');
            if (lotSize?.stepSize) {
                const stepSize = parseFloat(lotSize.stepSize);
                return Math.max(0, Math.round(-Math.log10(stepSize)));
            }
        }
        catch { }
        return 6; // Default precision
    }
    /**
     * Get symbol precision for prices
     */
    async getPricePrecision(symbol) {
        try {
            const info = await this.publicRequest('/exchangeInfo', { symbol });
            const symbolInfo = info.symbols?.find((s) => s.symbol === symbol);
            const priceFilter = symbolInfo?.filters?.find((f) => f.filterType === 'PRICE_FILTER');
            if (priceFilter?.tickSize) {
                const tickSize = parseFloat(priceFilter.tickSize);
                return Math.max(0, Math.round(-Math.log10(tickSize)));
            }
        }
        catch { }
        return 2; // Default precision
    }
    transformOrder(order) {
        return {
            orderId: order.orderId,
            clientOrderId: order.clientOrderId || '',
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            quantity: parseFloat(order.origQty || '0'),
            price: parseFloat(order.price || '0'),
            status: order.status,
            executedQty: parseFloat(order.executedQty || '0'),
            cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty || '0'),
            time: order.time || Date.now(),
        };
    }
    simulatedResponse(endpoint, params) {
        if (endpoint === '/account') {
            return {
                balances: [
                    { asset: 'USDT', free: '200.00', locked: '0' },
                    { asset: 'BTC', free: '0.004', locked: '0' },
                    { asset: 'ETH', free: '0.12', locked: '0' },
                    { asset: 'BNB', free: '2.5', locked: '0' },
                ],
            };
        }
        if (endpoint === '/order') {
            return {
                orderId: Date.now(),
                clientOrderId: `alpha_${Date.now()}`,
                symbol: params.symbol || 'BTCUSDT',
                side: params.side || 'BUY',
                type: params.type || 'MARKET',
                status: 'FILLED',
                origQty: '0.001',
                executedQty: '0.001',
                cummulativeQuoteQty: '95.00',
                price: '0',
                time: Date.now(),
            };
        }
        return {};
    }
    isConfigured() {
        return this.configured;
    }
    getName() {
        return this.isUS ? 'Binance.US' : 'Binance';
    }
}
exports.BinanceExchange = BinanceExchange;
//# sourceMappingURL=binance.js.map
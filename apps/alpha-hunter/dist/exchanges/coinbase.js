"use strict";
/**
 * Coinbase Exchange Integration
 * Uses Coinbase Developer Platform (CDP) Advanced Trade API
 * Docs: https://docs.cdp.coinbase.com/advanced-trade/docs/welcome
 *
 * Authentication: JWT with ES256 (EC Private Key)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinbaseExchange = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jose_1 = require("jose");
async function createJWT(apiKey, privateKey, uri) {
    // Parse the private key (handle escaped newlines)
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    try {
        // Import the EC private key using Node's crypto (handles SEC1 format)
        const ecPrivateKey = crypto_1.default.createPrivateKey({
            key: formattedKey,
            format: 'pem',
        });
        const nonce = crypto_1.default.randomBytes(16).toString('hex');
        const now = Math.floor(Date.now() / 1000);
        // Create and sign the JWT using jose with Node crypto key
        const jwt = await new jose_1.SignJWT({ uri })
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
    }
    catch (err) {
        console.error('[JWT ERROR] Failed to sign:', err.message);
        throw err;
    }
}
class CoinbaseExchange {
    constructor() {
        this.apiKey = process.env.COINBASE_API_KEY || '';
        this.apiSecret = process.env.COINBASE_API_SECRET || '';
        this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
        this.configured = !!(this.apiKey && this.apiSecret);
        if (!this.configured) {
            console.log('⚠️ Coinbase not configured - running in simulation mode');
        }
    }
    async request(method, path, body, queryParams) {
        if (!this.configured) {
            return this.simulatedResponse(method, path, body);
        }
        // CDP API: JWT signs path WITHOUT query params
        const fullPath = `/api/v3/brokerage${path}`;
        const uri = `${method} api.coinbase.com${fullPath}`;
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
        }
        catch (error) {
            console.error(`[COINBASE] Request failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Get all account balances (with pagination)
     */
    async getAccounts() {
        const allAccounts = [];
        let cursor;
        let pageNum = 0;
        const maxPages = 10;
        do {
            const queryParams = { limit: '250' };
            if (cursor)
                queryParams.cursor = cursor;
            const data = await this.request('GET', '/accounts', undefined, queryParams);
            const accounts = (data.accounts || []).map((acc) => ({
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
    async getUSDBalance() {
        const accounts = await this.getAccounts();
        const usdAccount = accounts.find(a => a.currency === 'USD');
        return usdAccount?.available || 0;
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
    async getTicker(productId) {
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
    }
    /**
     * Place a market buy order
     */
    async marketBuy(productId, usdAmount) {
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
    async marketSell(productId, cryptoAmount) {
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
    async limitBuy(productId, price, size) {
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
    async cancelOrder(orderId) {
        try {
            await this.request('POST', '/orders/batch_cancel', {
                order_ids: [orderId],
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
            const data = await this.request('GET', `/orders/historical/${orderId}`);
            return this.transformOrder(data.order);
        }
        catch {
            return null;
        }
    }
    /**
     * Get recent orders
     */
    async getOrders(productId) {
        const path = productId
            ? `/orders/historical/fills?product_id=${productId}`
            : '/orders/historical/fills';
        const data = await this.request('GET', path);
        return (data.fills || []).map((o) => this.transformOrder(o));
    }
    /**
     * Execute a trade with profit target and stop loss
     */
    async executeTrade(productId, side, usdAmount, takeProfitPercent = 5, stopLossPercent = 3) {
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
    transformOrder(order) {
        // Handle different response formats from Coinbase API
        const data = order.success_response || order.order || order;
        const config = order.order_configuration || {};
        const marketConfig = config.market_market_ioc || {};
        return {
            id: data.order_id || data.id || order.order_id,
            productId: data.product_id || order.product_id,
            side: (data.side || order.side || 'buy').toLowerCase(),
            type: config.market_market_ioc ? 'market' : 'limit',
            size: parseFloat(marketConfig.base_size || data.base_size || data.size || '0'),
            price: parseFloat(data.limit_price || data.price || '0'),
            status: order.success ? 'pending' : (data.status || 'unknown'),
            filledSize: parseFloat(data.filled_size || '0'),
            fillFees: parseFloat(data.total_fees || '0'),
            createdAt: data.created_time || new Date().toISOString(),
        };
    }
    simulatedResponse(method, path, body) {
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
    isConfigured() {
        return this.configured;
    }
    getName() {
        return 'Coinbase';
    }
}
exports.CoinbaseExchange = CoinbaseExchange;
//# sourceMappingURL=coinbase.js.map
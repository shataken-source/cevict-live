/**
 * Crypto.com Exchange Integration
 * Uses Crypto.com Exchange API for automated trading
 * Docs: https://exchange-docs.crypto.com/exchange/v1/rest-ws/index.html
 */
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
export declare class CryptoComExchange {
    private apiKey;
    private apiSecret;
    private baseUrl;
    private configured;
    constructor();
    private sign;
    private request;
    /**
     * Get all account balances
     */
    getAccounts(): Promise<CryptoComAccount[]>;
    /**
     * Get USDT/USDC balance
     */
    getStablecoinBalance(): Promise<number>;
    /**
     * Get crypto balance
     */
    getCryptoBalance(symbol: string): Promise<number>;
    /**
     * Get current price for a trading pair
     */
    getTicker(symbol: string): Promise<CryptoComTicker>;
    /**
     * Place a market buy order
     */
    marketBuy(symbol: string, notionalAmount: number): Promise<CryptoComOrder>;
    /**
     * Place a market sell order
     */
    marketSell(symbol: string, quantity: number): Promise<CryptoComOrder>;
    /**
     * Place a limit buy order
     */
    limitBuy(symbol: string, price: number, quantity: number): Promise<CryptoComOrder>;
    /**
     * Place a limit sell order
     */
    limitSell(symbol: string, price: number, quantity: number): Promise<CryptoComOrder>;
    /**
     * Cancel an order
     */
    cancelOrder(orderId: string, symbol: string): Promise<boolean>;
    /**
     * Get order status
     */
    getOrder(orderId: string): Promise<CryptoComOrder | null>;
    /**
     * Get open orders
     */
    getOpenOrders(symbol?: string): Promise<CryptoComOrder[]>;
    /**
     * Execute a trade with profit target and stop loss
     */
    executeTrade(symbol: string, side: 'buy' | 'sell', usdAmount: number, takeProfitPercent?: number, stopLossPercent?: number): Promise<{
        entryOrder: CryptoComOrder;
        entryPrice: number;
        takeProfitPrice: number;
        stopLossPrice: number;
    }>;
    private transformOrder;
    private simulatedResponse;
    isConfigured(): boolean;
    getName(): string;
}
export {};
//# sourceMappingURL=crypto-com.d.ts.map
/**
 * Coinbase Exchange Integration
 * Uses Coinbase Developer Platform (CDP) Advanced Trade API
 * Docs: https://docs.cdp.coinbase.com/advanced-trade/docs/welcome
 *
 * Authentication: JWT with ES256 (EC Private Key)
 */
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
export declare class CoinbaseExchange {
    private apiKey;
    private apiSecret;
    private baseUrl;
    private configured;
    constructor();
    private request;
    /**
     * Get all account balances (with pagination)
     */
    getAccounts(): Promise<CoinbaseAccount[]>;
    /**
     * Get USD balance
     */
    getUSDBalance(): Promise<number>;
    /**
     * Get crypto balance
     */
    getCryptoBalance(symbol: string): Promise<number>;
    /**
     * Get current price for a trading pair
     */
    getTicker(productId: string): Promise<CoinbaseTicker>;
    /**
     * Place a market buy order
     */
    marketBuy(productId: string, usdAmount: number): Promise<CoinbaseOrder>;
    /**
     * Place a market sell order
     */
    marketSell(productId: string, cryptoAmount: number): Promise<CoinbaseOrder>;
    /**
     * Place a limit buy order
     */
    limitBuy(productId: string, price: number, size: number): Promise<CoinbaseOrder>;
    /**
     * Cancel an order
     */
    cancelOrder(orderId: string): Promise<boolean>;
    /**
     * Get order status
     */
    getOrder(orderId: string): Promise<CoinbaseOrder | null>;
    /**
     * Get recent orders
     */
    getOrders(productId?: string): Promise<CoinbaseOrder[]>;
    /**
     * Execute a trade with profit target and stop loss
     */
    executeTrade(productId: string, side: 'buy' | 'sell', usdAmount: number, takeProfitPercent?: number, stopLossPercent?: number): Promise<{
        entryOrder: CoinbaseOrder;
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
//# sourceMappingURL=coinbase.d.ts.map
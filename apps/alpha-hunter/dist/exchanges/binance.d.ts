/**
 * Binance Exchange Integration
 * Uses Binance Spot API for automated trading
 * Docs: https://binance-docs.github.io/apidocs/spot/en/
 */
interface BinanceAccount {
    asset: string;
    free: number;
    locked: number;
    total: number;
}
interface BinanceOrder {
    orderId: number;
    clientOrderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
    quantity: number;
    price: number;
    status: string;
    executedQty: number;
    cummulativeQuoteQty: number;
    time: number;
}
interface BinanceTicker {
    symbol: string;
    price: number;
    bidPrice: number;
    askPrice: number;
    volume: number;
    priceChange: number;
    priceChangePercent: number;
}
export declare class BinanceExchange {
    private apiKey;
    private apiSecret;
    private baseUrl;
    private configured;
    private isUS;
    constructor();
    private sign;
    private publicRequest;
    private signedRequest;
    /**
     * Get all account balances
     */
    getAccounts(): Promise<BinanceAccount[]>;
    /**
     * Get USDT balance
     */
    getUSDTBalance(): Promise<number>;
    /**
     * Get USD balance (for Binance.US)
     */
    getUSDBalance(): Promise<number>;
    /**
     * Get crypto balance
     */
    getCryptoBalance(asset: string): Promise<number>;
    /**
     * Get current price for a trading pair
     */
    getTicker(symbol: string): Promise<BinanceTicker>;
    /**
     * Get multiple tickers
     */
    getTickers(symbols: string[]): Promise<BinanceTicker[]>;
    /**
     * Place a market buy order (quote quantity - spend X USDT)
     */
    marketBuy(symbol: string, usdtAmount: number): Promise<BinanceOrder>;
    /**
     * Place a market sell order
     */
    marketSell(symbol: string, quantity: number): Promise<BinanceOrder>;
    /**
     * Place a limit buy order
     */
    limitBuy(symbol: string, price: number, quantity: number): Promise<BinanceOrder>;
    /**
     * Place a limit sell order
     */
    limitSell(symbol: string, price: number, quantity: number): Promise<BinanceOrder>;
    /**
     * Place an OCO order (take profit + stop loss)
     */
    placeOCO(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, // Limit price (take profit)
    stopPrice: number, // Stop trigger price
    stopLimitPrice: number): Promise<any>;
    /**
     * Cancel an order
     */
    cancelOrder(symbol: string, orderId: number): Promise<boolean>;
    /**
     * Get order status
     */
    getOrder(symbol: string, orderId: number): Promise<BinanceOrder | null>;
    /**
     * Get open orders
     */
    getOpenOrders(symbol?: string): Promise<BinanceOrder[]>;
    /**
     * Get recent trades
     */
    getRecentTrades(symbol: string, limit?: number): Promise<any[]>;
    /**
     * Execute a trade with profit target and stop loss using OCO
     */
    executeTrade(symbol: string, side: 'buy' | 'sell', usdtAmount: number, takeProfitPercent?: number, stopLossPercent?: number): Promise<{
        entryOrder: BinanceOrder;
        entryPrice: number;
        takeProfitPrice: number;
        stopLossPrice: number;
        ocoOrder?: any;
    }>;
    /**
     * Get symbol precision for quantities
     */
    private getQuantityPrecision;
    /**
     * Get symbol precision for prices
     */
    private getPricePrecision;
    private transformOrder;
    private simulatedResponse;
    isConfigured(): boolean;
    getName(): string;
}
export {};
//# sourceMappingURL=binance.d.ts.map
/**
 * Exchange Manager
 * Coordinates trading across Coinbase, Crypto.com, and Binance
 * Smart routing to get best prices and manage funds
 */
import { CoinbaseExchange } from './coinbase';
import { CryptoComExchange } from './crypto-com';
import { BinanceExchange } from './binance';
interface ExchangeBalance {
    exchange: string;
    usd: number;
    btc: number;
    eth: number;
    other: {
        [key: string]: number;
    };
}
interface PriceComparison {
    symbol: string;
    coinbase?: number;
    cryptoCom?: number;
    binance?: number;
    best: string;
    bestPrice: number;
    spread: number;
}
interface TradeResult {
    exchange: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    fee: number;
    orderId: string;
    success: boolean;
    error?: string;
}
export declare class ExchangeManager {
    private coinbase;
    private cryptoCom;
    private binance;
    private preferredExchange;
    constructor();
    /**
     * Get total balance across all exchanges
     */
    getTotalBalance(): Promise<{
        totalUSD: number;
        totalBTC: number;
        totalETH: number;
        byExchange: ExchangeBalance[];
    }>;
    /**
     * Compare prices across exchanges
     */
    comparePrices(crypto: 'BTC' | 'ETH' | 'SOL'): Promise<PriceComparison>;
    /**
     * Execute trade on best exchange
     */
    smartTrade(crypto: 'BTC' | 'ETH' | 'SOL', side: 'buy' | 'sell', usdAmount: number): Promise<TradeResult>;
    /**
     * Execute trade on specific exchange
     */
    executeOnExchange(exchange: string, crypto: 'BTC' | 'ETH' | 'SOL', side: 'buy' | 'sell', usdAmount: number): Promise<TradeResult>;
    /**
     * Rebalance funds across exchanges
     */
    getRebalanceRecommendations(): Promise<string[]>;
    /**
     * Get exchange status summary
     */
    getStatus(): Promise<string>;
    /**
     * Get the exchange instance
     */
    getCoinbase(): CoinbaseExchange;
    getCryptoCom(): CryptoComExchange;
    getBinance(): BinanceExchange;
    /**
     * Check if any exchange is configured
     */
    hasConfiguredExchange(): boolean;
}
export {};
//# sourceMappingURL=exchange-manager.d.ts.map
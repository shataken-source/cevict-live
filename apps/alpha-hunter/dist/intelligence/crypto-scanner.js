"use strict";
/**
 * Crypto Scanner
 * Scans crypto markets for trading opportunities
 * Focuses on Kalshi crypto prediction markets + spot opportunities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoScanner = void 0;
class CryptoScanner {
    constructor() {
        this.coingeckoApiKey = process.env.COINGECKO_API_KEY || '';
    }
    async scanMarkets() {
        const opportunities = [];
        // Get current crypto prices
        const prices = await this.getPrices();
        // Analyze each major crypto
        for (const crypto of prices) {
            const opps = await this.analyzeCrypto(crypto);
            opportunities.push(...opps);
        }
        // Check for fear/greed extremes
        const fearGreedOpp = await this.analyzeFearGreed();
        if (fearGreedOpp)
            opportunities.push(fearGreedOpp);
        // Check Kalshi crypto markets
        const kalshiOpps = await this.analyzeKalshiCrypto();
        opportunities.push(...kalshiOpps);
        return opportunities.filter(o => o.confidence >= 60);
    }
    async getPrices() {
        try {
            // CoinGecko API
            const url = 'https://api.coingecko.com/api/v3/coins/markets' +
                '?vs_currency=usd' +
                '&ids=bitcoin,ethereum,solana,cardano' +
                '&order=market_cap_desc' +
                '&sparkline=false';
            const response = await fetch(url, {
                headers: this.coingeckoApiKey ? { 'x-cg-demo-api-key': this.coingeckoApiKey } : {},
            });
            if (!response.ok)
                return this.getSamplePrices();
            const data = await response.json();
            return data.map((coin) => ({
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price,
                change24h: coin.price_change_percentage_24h,
                volume24h: coin.total_volume,
                marketCap: coin.market_cap,
            }));
        }
        catch (error) {
            console.error('Crypto price fetch error:', error);
            return this.getSamplePrices();
        }
    }
    async analyzeCrypto(crypto) {
        const opportunities = [];
        // Strategy 1: Mean reversion on large moves
        if (Math.abs(crypto.change24h) > 5) {
            const direction = crypto.change24h > 0 ? 'short' : 'long';
            const confidence = Math.min(50 + Math.abs(crypto.change24h) * 2, 75);
            opportunities.push({
                id: `crypto_reversion_${crypto.symbol}_${Date.now()}`,
                type: 'crypto',
                source: 'Crypto Scanner',
                title: `${crypto.symbol} Mean Reversion ${direction.toUpperCase()}`,
                description: `${crypto.symbol} moved ${crypto.change24h.toFixed(1)}% in 24h - potential reversion`,
                confidence,
                expectedValue: Math.abs(crypto.change24h) * 0.3, // Expect 30% retracement
                riskLevel: 'high',
                timeframe: '24-48 hours',
                requiredCapital: 25,
                potentialReturn: 25 * (1 + Math.abs(crypto.change24h) * 0.003),
                reasoning: [
                    `${crypto.symbol} ${crypto.change24h > 0 ? 'up' : 'down'} ${Math.abs(crypto.change24h).toFixed(1)}% in 24h`,
                    'Mean reversion strategy suggests counter-trade',
                    `Volume: $${(crypto.volume24h / 1e9).toFixed(2)}B (${crypto.volume24h > 1e9 ? 'high' : 'normal'})`,
                ],
                dataPoints: [
                    {
                        source: 'CoinGecko',
                        metric: '24h Change',
                        value: `${crypto.change24h.toFixed(2)}%`,
                        relevance: 90,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        source: 'CoinGecko',
                        metric: 'Volume',
                        value: crypto.volume24h,
                        relevance: 70,
                        timestamp: new Date().toISOString(),
                    },
                ],
                action: {
                    platform: 'kalshi',
                    actionType: direction === 'long' ? 'buy' : 'sell',
                    amount: 25,
                    target: `${crypto.symbol} ${direction}`,
                    instructions: [
                        `Look for Kalshi market on ${crypto.symbol} price direction`,
                        `Or use prediction market for ${crypto.symbol} at specific price level`,
                    ],
                    autoExecute: false,
                },
                expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
                createdAt: new Date().toISOString(),
            });
        }
        // Strategy 2: Momentum on strong moves with high volume
        if (crypto.change24h > 3 && crypto.volume24h > crypto.marketCap * 0.05) {
            opportunities.push({
                id: `crypto_momentum_${crypto.symbol}_${Date.now()}`,
                type: 'crypto',
                source: 'Crypto Scanner',
                title: `${crypto.symbol} Momentum LONG`,
                description: `${crypto.symbol} showing strong momentum with volume confirmation`,
                confidence: 60,
                expectedValue: 5,
                riskLevel: 'high',
                timeframe: '24 hours',
                requiredCapital: 20,
                potentialReturn: 22,
                reasoning: [
                    `${crypto.symbol} up ${crypto.change24h.toFixed(1)}% with high volume`,
                    'Volume > 5% of market cap indicates strong interest',
                    'Momentum could continue short-term',
                ],
                dataPoints: [{
                        source: 'CoinGecko',
                        metric: 'Volume/MCap Ratio',
                        value: ((crypto.volume24h / crypto.marketCap) * 100).toFixed(2) + '%',
                        relevance: 85,
                        timestamp: new Date().toISOString(),
                    }],
                action: {
                    platform: 'kalshi',
                    actionType: 'buy',
                    amount: 20,
                    target: `${crypto.symbol} higher`,
                    instructions: [`Trade ${crypto.symbol} prediction market - price higher within 24h`],
                    autoExecute: false,
                },
                expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
                createdAt: new Date().toISOString(),
            });
        }
        return opportunities;
    }
    async analyzeFearGreed() {
        try {
            // Fear & Greed Index
            const response = await fetch('https://api.alternative.me/fng/?limit=1');
            const data = await response.json();
            const fng = data.data[0];
            const value = parseInt(fng.value);
            // Extreme fear (< 20) = buy opportunity
            // Extreme greed (> 80) = sell/avoid opportunity
            if (value < 20) {
                return {
                    id: `crypto_fear_${Date.now()}`,
                    type: 'crypto',
                    source: 'Fear & Greed Index',
                    title: 'Extreme Fear - BTC Buy Signal',
                    description: `Fear & Greed Index at ${value} (Extreme Fear) - historically good buy zone`,
                    confidence: 70,
                    expectedValue: 10,
                    riskLevel: 'medium',
                    timeframe: '1-4 weeks',
                    requiredCapital: 50,
                    potentialReturn: 60,
                    reasoning: [
                        `Fear & Greed Index: ${value} (${fng.value_classification})`,
                        'Extreme fear historically correlates with market bottoms',
                        '"Be greedy when others are fearful" - Warren Buffett',
                    ],
                    dataPoints: [{
                            source: 'Alternative.me',
                            metric: 'Fear & Greed',
                            value,
                            relevance: 95,
                            timestamp: new Date().toISOString(),
                        }],
                    action: {
                        platform: 'kalshi',
                        actionType: 'buy',
                        amount: 50,
                        target: 'BTC higher in 30 days',
                        instructions: [
                            'Look for Kalshi BTC price prediction market',
                            'Consider DCA strategy over next week',
                        ],
                        autoExecute: false,
                    },
                    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                    createdAt: new Date().toISOString(),
                };
            }
            if (value > 80) {
                return {
                    id: `crypto_greed_${Date.now()}`,
                    type: 'crypto',
                    source: 'Fear & Greed Index',
                    title: 'Extreme Greed - Caution/Short Signal',
                    description: `Fear & Greed Index at ${value} (Extreme Greed) - market may be overheated`,
                    confidence: 65,
                    expectedValue: 8,
                    riskLevel: 'medium',
                    timeframe: '1-2 weeks',
                    requiredCapital: 25,
                    potentialReturn: 30,
                    reasoning: [
                        `Fear & Greed Index: ${value} (${fng.value_classification})`,
                        'Extreme greed often precedes corrections',
                        'Consider hedging or taking profits',
                    ],
                    dataPoints: [{
                            source: 'Alternative.me',
                            metric: 'Fear & Greed',
                            value,
                            relevance: 95,
                            timestamp: new Date().toISOString(),
                        }],
                    action: {
                        platform: 'kalshi',
                        actionType: 'sell',
                        amount: 25,
                        target: 'BTC lower in 14 days',
                        instructions: [
                            'Look for Kalshi BTC price drop prediction',
                            'Consider NO position on BTC above current price',
                        ],
                        autoExecute: false,
                    },
                    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                    createdAt: new Date().toISOString(),
                };
            }
            return null;
        }
        catch (error) {
            console.error('Fear & Greed fetch error:', error);
            return null;
        }
    }
    async analyzeKalshiCrypto() {
        // This would fetch actual Kalshi crypto markets
        // For now, return sample opportunities based on typical Kalshi offerings
        return [
            {
                id: `kalshi_btc_100k_${Date.now()}`,
                type: 'prediction_market',
                source: 'Kalshi Crypto',
                title: 'BTC above $100K by end of Q1 2025?',
                description: 'Kalshi prediction market on Bitcoin price target',
                confidence: 55,
                expectedValue: 5,
                riskLevel: 'medium',
                timeframe: 'Q1 2025',
                requiredCapital: 25,
                potentialReturn: 45,
                reasoning: [
                    'Bitcoin momentum strong post-halving',
                    'Institutional adoption continues',
                    'ETF inflows significant',
                ],
                dataPoints: [],
                action: {
                    platform: 'kalshi',
                    actionType: 'buy',
                    amount: 25,
                    target: 'BTC-100K-Q1-2025 YES',
                    instructions: ['Buy YES contracts on BTC $100K market'],
                    autoExecute: false,
                },
                expiresAt: new Date('2025-03-31').toISOString(),
                createdAt: new Date().toISOString(),
            },
        ];
    }
    getSamplePrices() {
        return [
            { symbol: 'BTC', price: 95000, change24h: 2.5, volume24h: 35000000000, marketCap: 1900000000000 },
            { symbol: 'ETH', price: 3400, change24h: 1.8, volume24h: 15000000000, marketCap: 410000000000 },
            { symbol: 'SOL', price: 180, change24h: 4.2, volume24h: 3000000000, marketCap: 85000000000 },
        ];
    }
    async getMarketSummary() {
        const prices = await this.getPrices();
        let summary = '📊 CRYPTO MARKET SUMMARY\n\n';
        for (const crypto of prices) {
            const emoji = crypto.change24h > 0 ? '📈' : '📉';
            summary += `${emoji} ${crypto.symbol}: $${crypto.price.toLocaleString()} `;
            summary += `(${crypto.change24h > 0 ? '+' : ''}${crypto.change24h.toFixed(1)}%)\n`;
        }
        return summary;
    }
}
exports.CryptoScanner = CryptoScanner;
//# sourceMappingURL=crypto-scanner.js.map
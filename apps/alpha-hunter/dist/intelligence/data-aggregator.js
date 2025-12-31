"use strict";
/**
 * DATA AGGREGATOR
 * Pulls all available data from PROGNO Massager, APIs, and external sources
 * Feeds consolidated intelligence to trading bots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataAggregator = exports.DataAggregator = void 0;
const massager_client_1 = require("./massager-client");
class DataAggregator {
    constructor() {
        this.cache = new Map();
        this.lastFullUpdate = null;
        this.massager = new massager_client_1.MassagerClient();
    }
    /**
     * Cache helper - stores data with TTL
     */
    async cached(key, fetcher, ttlMs = 60000) {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && cached.expires > now)
            return cached.data;
        try {
            const data = await fetcher();
            this.cache.set(key, { data, expires: now + ttlMs });
            return data;
        }
        catch (err) {
            console.log(`   ⚠️ Failed to fetch ${key}`);
            return cached?.data || null;
        }
    }
    /**
     * Fetch Fear & Greed Index
     */
    async getFearGreed() {
        const data = await this.cached('feargreed', async () => {
            const res = await fetch('https://api.alternative.me/fng/?limit=1', {
                signal: AbortSignal.timeout(5000)
            });
            return res.ok ? res.json() : null;
        }, 300000); // 5 min cache
        if (data?.data?.[0]) {
            return {
                value: parseInt(data.data[0].value),
                classification: data.data[0].value_classification
            };
        }
        return { value: 50, classification: 'Neutral' };
    }
    /**
     * Fetch BTC Dominance & Market Cap
     */
    async getGlobalData() {
        const data = await this.cached('global', async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/global', {
                signal: AbortSignal.timeout(5000)
            });
            return res.ok ? res.json() : null;
        }, 300000);
        if (data?.data) {
            return {
                btcDominance: data.data.market_cap_percentage?.btc || 0,
                totalMarketCap: data.data.total_market_cap?.usd || 0,
                volume24h: data.data.total_volume?.usd || 0
            };
        }
        return { btcDominance: 0, totalMarketCap: 0, volume24h: 0 };
    }
    /**
     * Fetch Trending Coins
     */
    async getTrending() {
        const data = await this.cached('trending', async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
                signal: AbortSignal.timeout(5000)
            });
            return res.ok ? res.json() : null;
        }, 600000); // 10 min cache
        if (data?.coins) {
            return data.coins.slice(0, 5).map((c) => c.item.symbol.toUpperCase());
        }
        return [];
    }
    /**
     * Fetch top gainers/losers from CoinGecko
     */
    async getMovers() {
        const data = await this.cached('movers', async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&price_change_percentage=24h', { signal: AbortSignal.timeout(8000) });
            return res.ok ? res.json() : null;
        }, 300000);
        if (data && Array.isArray(data)) {
            const sorted = [...data].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            return {
                gainers: sorted.slice(0, 5).map((c) => ({
                    symbol: c.symbol.toUpperCase(),
                    change: c.price_change_percentage_24h || 0
                })),
                losers: sorted.slice(-5).reverse().map((c) => ({
                    symbol: c.symbol.toUpperCase(),
                    change: c.price_change_percentage_24h || 0
                }))
            };
        }
        return { gainers: [], losers: [] };
    }
    /**
     * Get crypto news headlines
     */
    async getNews() {
        // Try CryptoCompare news API
        const data = await this.cached('news', async () => {
            const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,SOL', {
                signal: AbortSignal.timeout(5000)
            });
            return res.ok ? res.json() : null;
        }, 600000);
        const headlines = [];
        const majorEvents = [];
        let bullishCount = 0;
        let bearishCount = 0;
        if (data?.Data) {
            for (const article of data.Data.slice(0, 10)) {
                const title = article.title || '';
                headlines.push(title);
                // Simple sentiment analysis
                const titleLower = title.toLowerCase();
                if (titleLower.match(/surge|rally|bull|gain|up|high|record|pump/))
                    bullishCount++;
                if (titleLower.match(/crash|drop|bear|fall|down|low|dump|fear/))
                    bearishCount++;
                if (titleLower.match(/sec|regulation|ban|hack|lawsuit|investigation/))
                    majorEvents.push(title);
            }
        }
        return {
            headlines: headlines.slice(0, 5),
            sentiment: bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral',
            majorEvents: majorEvents.slice(0, 3)
        };
    }
    /**
     * Calculate technical indicators for BTC
     */
    async getTechnicals() {
        const data = await this.cached('btc_ohlc', async () => {
            const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30', { signal: AbortSignal.timeout(5000) });
            return res.ok ? res.json() : null;
        }, 300000);
        if (data && Array.isArray(data) && data.length > 20) {
            const closes = data.map((d) => d[4]); // Close prices
            const recent = closes.slice(-5);
            const older = closes.slice(-10, -5);
            // Simple momentum
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            const change = ((recentAvg - olderAvg) / olderAvg) * 100;
            // RSI calculation (simplified)
            const gains = [];
            const losses = [];
            for (let i = 1; i < closes.length; i++) {
                const diff = closes[i] - closes[i - 1];
                if (diff > 0)
                    gains.push(diff);
                else
                    losses.push(Math.abs(diff));
            }
            const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
            const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
            const rs = avgGain / (avgLoss || 1);
            const rsi = 100 - (100 / (1 + rs));
            // SMAs
            const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
            const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(closes.length, 50);
            // Volatility (std dev of returns)
            const returns = [];
            for (let i = 1; i < closes.length; i++) {
                returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
            }
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance) * 100;
            return {
                btcMomentum: change > 1 ? 'up' : change < -1 ? 'down' : 'sideways',
                btcRSI: Math.round(rsi),
                btcSMA20: sma20,
                btcSMA50: sma50,
                btcVolatility: volatility
            };
        }
        return {
            btcMomentum: 'sideways',
            btcRSI: 50,
            btcSMA20: 0,
            btcSMA50: 0,
            btcVolatility: 0
        };
    }
    /**
     * Get all aggregated data
     */
    async getFullBriefing() {
        console.log('📡 Fetching market intelligence from all sources...');
        // Fetch all data in parallel
        const [fearGreed, global, trending, movers, news, technicals] = await Promise.all([
            this.getFearGreed(),
            this.getGlobalData(),
            this.getTrending(),
            this.getMovers(),
            this.getNews(),
            this.getTechnicals()
        ]);
        // Calculate overall trading bias
        let bullishSignals = 0;
        let bearishSignals = 0;
        // Fear/Greed analysis
        if (fearGreed.value < 25)
            bullishSignals += 2; // Extreme fear = buying opportunity
        else if (fearGreed.value > 75)
            bearishSignals += 2; // Extreme greed = sell signal
        // Technical analysis
        if (technicals.btcMomentum === 'up')
            bullishSignals++;
        if (technicals.btcMomentum === 'down')
            bearishSignals++;
        if (technicals.btcRSI < 30)
            bullishSignals++; // Oversold
        if (technicals.btcRSI > 70)
            bearishSignals++; // Overbought
        // News sentiment
        if (news.sentiment === 'bullish')
            bullishSignals++;
        if (news.sentiment === 'bearish')
            bearishSignals++;
        const tradingBias = bullishSignals > bearishSignals ? 'bullish' :
            bearishSignals > bullishSignals ? 'bearish' : 'neutral';
        const confidence = Math.min(90, 50 + Math.abs(bullishSignals - bearishSignals) * 10);
        this.lastFullUpdate = new Date();
        const aggregated = {
            timestamp: new Date(),
            market: {
                fearGreedIndex: fearGreed,
                btcDominance: global.btcDominance,
                totalMarketCap: global.totalMarketCap,
                volume24h: global.volume24h,
                trending,
                topGainers: movers.gainers,
                topLosers: movers.losers
            },
            news,
            technicals,
            predictions: {
                kalshiHot: [], // Would come from Kalshi scanner
                sportsOpportunities: [], // Would come from PROGNO
                arbitrageOpps: []
            },
            summary: this.generateSummary(fearGreed, technicals, news, tradingBias),
            tradingBias,
            confidence
        };
        return aggregated;
    }
    /**
     * Generate human-readable summary
     */
    generateSummary(fearGreed, technicals, news, bias) {
        const lines = [
            `Fear & Greed: ${fearGreed.value} (${fearGreed.classification})`,
            `BTC Momentum: ${technicals.btcMomentum.toUpperCase()} | RSI: ${technicals.btcRSI}`,
            `News Sentiment: ${news.sentiment.toUpperCase()}`,
            `Overall Bias: ${bias.toUpperCase()}`
        ];
        if (news.majorEvents.length > 0) {
            lines.push(`⚠️ Major Event: ${news.majorEvents[0].substring(0, 60)}...`);
        }
        return lines.join('\n');
    }
    /**
     * Get formatted briefing for AI/display
     */
    async getFormattedBriefing() {
        const data = await this.getFullBriefing();
        return `
╔══════════════════════════════════════════════════════════════╗
║           📊 MARKET INTELLIGENCE BRIEFING 📊                 ║
╠══════════════════════════════════════════════════════════════╣
║ ${new Date().toLocaleString().padEnd(58)} ║
╠══════════════════════════════════════════════════════════════╣
║ SENTIMENT                                                    ║
║   Fear & Greed: ${String(data.market.fearGreedIndex.value).padEnd(3)} (${data.market.fearGreedIndex.classification.padEnd(15)})          ║
║   News Tone:    ${data.news.sentiment.toUpperCase().padEnd(20)}                   ║
║   Trading Bias: ${data.tradingBias.toUpperCase().padEnd(10)} (${data.confidence}% confidence)            ║
╠══════════════════════════════════════════════════════════════╣
║ MARKET DATA                                                  ║
║   BTC Dominance: ${data.market.btcDominance.toFixed(1)}%                                      ║
║   24h Volume:    $${(data.market.volume24h / 1e9).toFixed(1)}B                                    ║
║   Trending:      ${data.market.trending.slice(0, 3).join(', ').padEnd(30)}     ║
╠══════════════════════════════════════════════════════════════╣
║ TECHNICALS (BTC)                                             ║
║   Momentum: ${data.technicals.btcMomentum.toUpperCase().padEnd(10)} | RSI: ${String(data.technicals.btcRSI).padEnd(3)} | Vol: ${data.technicals.btcVolatility.toFixed(1)}%     ║
╠══════════════════════════════════════════════════════════════╣
║ TOP MOVERS                                                   ║
║   📈 ${data.market.topGainers.slice(0, 3).map(g => `${g.symbol}(+${g.change.toFixed(1)}%)`).join(' ').padEnd(48)} ║
║   📉 ${data.market.topLosers.slice(0, 3).map(l => `${l.symbol}(${l.change.toFixed(1)}%)`).join(' ').padEnd(48)} ║
╠══════════════════════════════════════════════════════════════╣
║ NEWS HEADLINES                                               ║
${data.news.headlines.slice(0, 3).map(h => `║   • ${h.substring(0, 55).padEnd(55)}║`).join('\n')}
╚══════════════════════════════════════════════════════════════╝
`;
    }
    /**
     * Get Kelly Criterion recommendation
     */
    async getKellyRecommendation(winProbability, odds, bankroll) {
        return this.massager.calculateKelly(winProbability, odds, bankroll);
    }
    /**
     * Check for arbitrage opportunities
     */
    async checkArbitrage(odds1, odds2, stake = 100) {
        return this.massager.calculateArbitrage(odds1, odds2, stake);
    }
}
exports.DataAggregator = DataAggregator;
// Singleton instance
exports.dataAggregator = new DataAggregator();
//# sourceMappingURL=data-aggregator.js.map
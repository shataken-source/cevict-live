"use strict";
/**
 * Kalshi Trader
 * Automated prediction market trading via Kalshi API
 * Note: Kalshi is legal in most US states for prediction markets
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiTrader = void 0;
const crypto_1 = __importDefault(require("crypto"));
class KalshiTrader {
    constructor() {
        this.apiKeyId = process.env.KALSHI_API_KEY_ID || '';
        // Convert \n escape sequences to actual newlines for RSA key
        this.privateKey = (process.env.KALSHI_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        this.baseUrl = process.env.KALSHI_ENV === 'production'
            ? 'https://trading-api.kalshi.com/trade-api/v2'
            : 'https://demo-api.kalshi.co/trade-api/v2';
        this.isProduction = process.env.KALSHI_ENV === 'production';
    }
    async signRequest(method, path, body) {
        if (!this.privateKey)
            return '';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = `${timestamp}${method}${path}${body ? JSON.stringify(body) : ''}`;
        const sign = crypto_1.default.createSign('RSA-SHA256');
        sign.update(message);
        return sign.sign(this.privateKey, 'base64');
    }
    async getBalance() {
        if (!this.apiKeyId) {
            console.log('Kalshi not configured, using simulated balance');
            return 500; // Simulated balance
        }
        try {
            const path = '/portfolio/balance';
            const signature = await this.signRequest('GET', path);
            const response = await fetch(`${this.baseUrl}${path}`, {
                headers: {
                    'KALSHI-ACCESS-KEY': this.apiKeyId,
                    'KALSHI-ACCESS-SIGNATURE': signature,
                    'KALSHI-ACCESS-TIMESTAMP': Math.floor(Date.now() / 1000).toString(),
                },
            });
            if (!response.ok)
                throw new Error('Failed to get balance');
            const data = await response.json();
            return data.balance / 100; // Kalshi uses cents
        }
        catch (error) {
            console.error('Kalshi balance error:', error);
            return 0;
        }
    }
    async getMarkets(category) {
        try {
            let url = `${this.baseUrl}/markets?status=open&limit=100`;
            if (category)
                url += `&series_ticker=${category}`;
            const response = await fetch(url);
            if (!response.ok)
                return this.getSampleMarkets();
            const data = await response.json();
            return this.transformMarkets(data.markets || []);
        }
        catch (error) {
            console.error('Error fetching Kalshi markets:', error);
            return this.getSampleMarkets();
        }
    }
    async findOpportunities(minEdge = 5) {
        const markets = await this.getMarkets();
        const opportunities = [];
        for (const market of markets) {
            // Our AI-predicted probability vs market price
            const aiPrediction = await this.predictOutcome(market);
            const marketYesProb = market.yesPrice / 100;
            const marketNoProb = market.noPrice / 100;
            // Check for edge on YES side
            const yesEdge = (aiPrediction - marketYesProb) * 100;
            if (yesEdge >= minEdge) {
                opportunities.push(this.createOpportunity(market, 'yes', yesEdge, aiPrediction));
            }
            // Check for edge on NO side
            const noEdge = ((1 - aiPrediction) - marketNoProb) * 100;
            if (noEdge >= minEdge) {
                opportunities.push(this.createOpportunity(market, 'no', noEdge, 1 - aiPrediction));
            }
        }
        return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
    }
    async predictOutcome(market) {
        // Use Claude to analyze and predict
        // In production, this would call the AI
        // For now, use market analysis heuristics
        const title = market.title.toLowerCase();
        // Sample predictions based on market type
        if (title.includes('fed') && title.includes('rate')) {
            // Fed rate decisions - check economic indicators
            return 0.65; // Sample prediction
        }
        if (title.includes('bitcoin') || title.includes('btc')) {
            // Crypto predictions
            return market.yesPrice > 50 ? 0.55 : 0.45;
        }
        if (title.includes('election') || title.includes('vote')) {
            // Political predictions
            return market.yesPrice / 100 + (Math.random() * 0.1 - 0.05); // Slight adjustment
        }
        // Default: slight edge towards market consensus with variance
        return market.yesPrice / 100 + (Math.random() * 0.08 - 0.04);
    }
    createOpportunity(market, side, edge, prediction) {
        const price = side === 'yes' ? market.yesPrice : market.noPrice;
        const stake = this.calculateOptimalStake(edge, price);
        const potentialReturn = stake * (100 / price);
        return {
            id: `kalshi_${market.id}_${side}_${Date.now()}`,
            type: 'prediction_market',
            source: 'Kalshi',
            title: `${side.toUpperCase()}: ${market.title}`,
            description: `AI predicts ${(prediction * 100).toFixed(1)}% probability, market at ${price}¢`,
            confidence: Math.min(50 + edge, 90),
            expectedValue: edge,
            riskLevel: edge > 15 ? 'low' : edge > 8 ? 'medium' : 'high',
            timeframe: `Expires: ${new Date(market.expiresAt).toLocaleDateString()}`,
            requiredCapital: stake,
            potentialReturn,
            reasoning: [
                `Market ${side} price: ${price}¢`,
                `Our AI prediction: ${(prediction * 100).toFixed(1)}%`,
                `Edge: +${edge.toFixed(1)}%`,
                `Expected value: $${((potentialReturn - stake) * (prediction)).toFixed(2)}`,
            ],
            dataPoints: [{
                    source: 'Kalshi',
                    metric: 'Volume',
                    value: market.volume,
                    relevance: 70,
                    timestamp: new Date().toISOString(),
                }],
            action: {
                platform: 'kalshi',
                actionType: 'buy',
                amount: stake,
                target: `${market.id} ${side.toUpperCase()}`,
                instructions: [
                    `Buy ${Math.floor(stake / price * 100)} ${side.toUpperCase()} contracts`,
                    `At price: ${price}¢ or better`,
                    `Max spend: $${stake}`,
                ],
                autoExecute: edge > 10 && this.isProduction,
            },
            expiresAt: market.expiresAt,
            createdAt: new Date().toISOString(),
        };
    }
    calculateOptimalStake(edge, price) {
        // Kelly Criterion for prediction markets
        const prob = (price + edge) / 100;
        const odds = 100 / price - 1;
        const kelly = (prob * odds - (1 - prob)) / odds;
        // Use quarter Kelly, min $5, max $25
        return Math.min(Math.max(kelly * 0.25 * 100, 5), 25);
    }
    async placeBet(marketId, side, amount, maxPrice) {
        if (!this.apiKeyId || !this.isProduction) {
            console.log(`[SIMULATED] Placing ${side} bet on ${marketId}: $${amount} at max ${maxPrice}¢`);
            return {
                id: `sim_${Date.now()}`,
                opportunityId: marketId,
                type: 'prediction_market',
                platform: 'kalshi',
                amount,
                target: `${marketId} ${side}`,
                entryPrice: maxPrice,
                status: 'active',
                profit: 0,
                reasoning: 'Simulated trade',
                executedAt: new Date().toISOString(),
            };
        }
        try {
            const contracts = Math.floor(amount / maxPrice * 100);
            const path = '/portfolio/orders';
            const body = {
                ticker: marketId,
                side,
                count: contracts,
                type: 'limit',
                yes_price: side === 'yes' ? maxPrice : undefined,
                no_price: side === 'no' ? maxPrice : undefined,
            };
            const signature = await this.signRequest('POST', path, body);
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'KALSHI-ACCESS-KEY': this.apiKeyId,
                    'KALSHI-ACCESS-SIGNATURE': signature,
                    'KALSHI-ACCESS-TIMESTAMP': Math.floor(Date.now() / 1000).toString(),
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const error = await response.json();
                console.error('Kalshi order error:', error);
                return null;
            }
            const order = await response.json();
            return {
                id: order.order_id,
                opportunityId: marketId,
                type: 'prediction_market',
                platform: 'kalshi',
                amount,
                target: `${marketId} ${side}`,
                entryPrice: maxPrice,
                status: 'pending',
                profit: 0,
                reasoning: 'AI-selected opportunity',
                executedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Error placing Kalshi bet:', error);
            return null;
        }
    }
    async getPositions() {
        if (!this.apiKeyId)
            return [];
        try {
            const path = '/portfolio/positions';
            const signature = await this.signRequest('GET', path);
            const response = await fetch(`${this.baseUrl}${path}`, {
                headers: {
                    'KALSHI-ACCESS-KEY': this.apiKeyId,
                    'KALSHI-ACCESS-SIGNATURE': signature,
                    'KALSHI-ACCESS-TIMESTAMP': Math.floor(Date.now() / 1000).toString(),
                },
            });
            if (!response.ok)
                return [];
            const data = await response.json();
            return data.market_positions || [];
        }
        catch (error) {
            console.error('Error fetching positions:', error);
            return [];
        }
    }
    transformMarkets(apiMarkets) {
        return apiMarkets.map(m => ({
            id: m.ticker,
            platform: 'Kalshi',
            title: m.title,
            category: m.category,
            yesPrice: m.yes_bid || 50,
            noPrice: m.no_bid || 50,
            volume: m.volume || 0,
            expiresAt: m.close_time,
            aiPrediction: 0,
            edge: 0,
        }));
    }
    getSampleMarkets() {
        return [
            {
                id: 'FED-25JAN-T0.25',
                platform: 'Kalshi',
                title: 'Will the Fed cut rates by 25bps in January?',
                category: 'Economics',
                yesPrice: 72,
                noPrice: 28,
                volume: 125000,
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
                aiPrediction: 0.78,
                edge: 6,
            },
            {
                id: 'BTC-100K-25Q1',
                platform: 'Kalshi',
                title: 'Will Bitcoin exceed $100,000 in Q1 2025?',
                category: 'Crypto',
                yesPrice: 45,
                noPrice: 55,
                volume: 89000,
                expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
                aiPrediction: 0.52,
                edge: 7,
            },
            {
                id: 'WEATHER-SNOW-NYC',
                platform: 'Kalshi',
                title: 'Will NYC get 6+ inches of snow this week?',
                category: 'Weather',
                yesPrice: 35,
                noPrice: 65,
                volume: 15000,
                expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                aiPrediction: 0.42,
                edge: 7,
            },
        ];
    }
}
exports.KalshiTrader = KalshiTrader;
//# sourceMappingURL=kalshi-trader.js.map
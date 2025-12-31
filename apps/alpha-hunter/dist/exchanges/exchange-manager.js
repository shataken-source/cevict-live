"use strict";
/**
 * Exchange Manager
 * Coordinates trading across Coinbase, Crypto.com, and Binance
 * Smart routing to get best prices and manage funds
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeManager = void 0;
const coinbase_1 = require("./coinbase");
const crypto_com_1 = require("./crypto-com");
const binance_1 = require("./binance");
class ExchangeManager {
    constructor() {
        this.coinbase = new coinbase_1.CoinbaseExchange();
        this.cryptoCom = new crypto_com_1.CryptoComExchange();
        this.binance = new binance_1.BinanceExchange();
        // Set preferred exchange (fallback order)
        this.preferredExchange = process.env.PREFERRED_CRYPTO_EXCHANGE || 'coinbase';
        console.log('\n💱 Exchange Manager initialized');
        console.log(`   ├─ Coinbase: ${this.coinbase.isConfigured() ? '✅ Ready' : '⚠️ Simulated'}`);
        console.log(`   ├─ Crypto.com: ${this.cryptoCom.isConfigured() ? '✅ Ready' : '⚠️ Simulated'}`);
        console.log(`   ├─ Binance: ${this.binance.isConfigured() ? '✅ Ready' : '⚠️ Simulated'}`);
        console.log(`   └─ Preferred: ${this.preferredExchange}\n`);
    }
    /**
     * Get total balance across all exchanges
     */
    async getTotalBalance() {
        const balances = [];
        // Coinbase
        if (this.coinbase.isConfigured()) {
            try {
                const accounts = await this.coinbase.getAccounts();
                balances.push({
                    exchange: 'Coinbase',
                    usd: accounts.find(a => a.currency === 'USD')?.available || 0,
                    btc: accounts.find(a => a.currency === 'BTC')?.available || 0,
                    eth: accounts.find(a => a.currency === 'ETH')?.available || 0,
                    other: accounts
                        .filter(a => !['USD', 'BTC', 'ETH'].includes(a.currency))
                        .reduce((acc, a) => ({ ...acc, [a.currency]: a.available }), {}),
                });
            }
            catch (error) {
                console.error('Coinbase balance error:', error);
            }
        }
        // Crypto.com
        if (this.cryptoCom.isConfigured()) {
            try {
                const accounts = await this.cryptoCom.getAccounts();
                const usdt = accounts.find(a => a.currency === 'USDT')?.available || 0;
                const usdc = accounts.find(a => a.currency === 'USDC')?.available || 0;
                balances.push({
                    exchange: 'Crypto.com',
                    usd: usdt + usdc, // Combine stablecoins
                    btc: accounts.find(a => a.currency === 'BTC')?.available || 0,
                    eth: accounts.find(a => a.currency === 'ETH')?.available || 0,
                    other: accounts
                        .filter(a => !['USDT', 'USDC', 'BTC', 'ETH'].includes(a.currency))
                        .reduce((acc, a) => ({ ...acc, [a.currency]: a.available }), {}),
                });
            }
            catch (error) {
                console.error('Crypto.com balance error:', error);
            }
        }
        // Binance
        if (this.binance.isConfigured()) {
            try {
                const accounts = await this.binance.getAccounts();
                const usdt = accounts.find(a => a.asset === 'USDT')?.free || 0;
                const usd = accounts.find(a => a.asset === 'USD')?.free || 0;
                balances.push({
                    exchange: 'Binance',
                    usd: usdt + usd,
                    btc: accounts.find(a => a.asset === 'BTC')?.free || 0,
                    eth: accounts.find(a => a.asset === 'ETH')?.free || 0,
                    other: accounts
                        .filter(a => !['USDT', 'USD', 'BTC', 'ETH'].includes(a.asset))
                        .reduce((acc, a) => ({ ...acc, [a.asset]: a.free }), {}),
                });
            }
            catch (error) {
                console.error('Binance balance error:', error);
            }
        }
        // Calculate totals
        const totalUSD = balances.reduce((sum, b) => sum + b.usd, 0);
        const totalBTC = balances.reduce((sum, b) => sum + b.btc, 0);
        const totalETH = balances.reduce((sum, b) => sum + b.eth, 0);
        return { totalUSD, totalBTC, totalETH, byExchange: balances };
    }
    /**
     * Compare prices across exchanges
     */
    async comparePrices(crypto) {
        const comparison = {
            symbol: crypto,
            best: '',
            bestPrice: 0,
            spread: 0,
        };
        const prices = [];
        // Coinbase
        try {
            const ticker = await this.coinbase.getTicker(`${crypto}-USD`);
            comparison.coinbase = ticker.price;
            prices.push({ exchange: 'Coinbase', price: ticker.price });
        }
        catch { }
        // Crypto.com
        try {
            const ticker = await this.cryptoCom.getTicker(`${crypto}_USDT`);
            comparison.cryptoCom = ticker.price;
            prices.push({ exchange: 'Crypto.com', price: ticker.price });
        }
        catch { }
        // Binance
        try {
            const ticker = await this.binance.getTicker(`${crypto}USDT`);
            comparison.binance = ticker.price;
            prices.push({ exchange: 'Binance', price: ticker.price });
        }
        catch { }
        // Find best price (lowest for buying)
        if (prices.length > 0) {
            const sorted = prices.sort((a, b) => a.price - b.price);
            comparison.best = sorted[0].exchange;
            comparison.bestPrice = sorted[0].price;
            if (prices.length > 1) {
                const highest = sorted[sorted.length - 1].price;
                comparison.spread = ((highest - comparison.bestPrice) / comparison.bestPrice) * 100;
            }
        }
        return comparison;
    }
    /**
     * Execute trade on best exchange
     */
    async smartTrade(crypto, side, usdAmount) {
        // Compare prices
        const prices = await this.comparePrices(crypto);
        console.log(`\n💱 Price Comparison for ${crypto}:`);
        if (prices.coinbase)
            console.log(`   Coinbase: $${prices.coinbase.toFixed(2)}`);
        if (prices.cryptoCom)
            console.log(`   Crypto.com: $${prices.cryptoCom.toFixed(2)}`);
        if (prices.binance)
            console.log(`   Binance: $${prices.binance.toFixed(2)}`);
        console.log(`   Best: ${prices.best} @ $${prices.bestPrice.toFixed(2)}`);
        if (prices.spread > 0)
            console.log(`   Spread: ${prices.spread.toFixed(3)}%`);
        // Check balances on best exchange
        const balances = await this.getTotalBalance();
        const bestExchange = balances.byExchange.find(b => b.exchange.toLowerCase().includes(prices.best.toLowerCase()));
        // If best exchange doesn't have enough funds, find one that does
        let targetExchange = prices.best;
        if (side === 'buy' && (!bestExchange || bestExchange.usd < usdAmount)) {
            const exchangeWithFunds = balances.byExchange.find(b => b.usd >= usdAmount);
            if (exchangeWithFunds) {
                targetExchange = exchangeWithFunds.exchange;
                console.log(`   ⚠️ Routing to ${targetExchange} (has funds)`);
            }
        }
        // Execute on target exchange
        return this.executeOnExchange(targetExchange, crypto, side, usdAmount);
    }
    /**
     * Execute trade on specific exchange
     */
    async executeOnExchange(exchange, crypto, side, usdAmount) {
        const result = {
            exchange,
            symbol: crypto,
            side,
            amount: usdAmount,
            price: 0,
            fee: 0,
            orderId: '',
            success: false,
        };
        try {
            switch (exchange.toLowerCase()) {
                case 'coinbase':
                    const cbSymbol = `${crypto}-USD`;
                    const cbOrder = side === 'buy'
                        ? await this.coinbase.marketBuy(cbSymbol, usdAmount)
                        : await this.coinbase.marketSell(cbSymbol, usdAmount);
                    result.orderId = cbOrder.id;
                    result.price = cbOrder.price || 0;
                    result.fee = cbOrder.fillFees;
                    result.success = cbOrder.status === 'FILLED' || cbOrder.status === 'done';
                    break;
                case 'crypto.com':
                    const cdcSymbol = `${crypto}_USDT`;
                    const cdcOrder = side === 'buy'
                        ? await this.cryptoCom.marketBuy(cdcSymbol, usdAmount)
                        : await this.cryptoCom.marketSell(cdcSymbol, usdAmount);
                    result.orderId = cdcOrder.id;
                    result.price = cdcOrder.avgPrice;
                    result.fee = cdcOrder.fee;
                    result.success = cdcOrder.status === 'FILLED';
                    break;
                case 'binance':
                case 'binance.us':
                    const bnbSymbol = `${crypto}USDT`;
                    const bnbOrder = side === 'buy'
                        ? await this.binance.marketBuy(bnbSymbol, usdAmount)
                        : await this.binance.marketSell(bnbSymbol, usdAmount);
                    result.orderId = bnbOrder.orderId.toString();
                    result.price = bnbOrder.cummulativeQuoteQty / bnbOrder.executedQty;
                    result.success = bnbOrder.status === 'FILLED';
                    break;
                default:
                    result.error = `Unknown exchange: ${exchange}`;
            }
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
        }
        console.log(`\n${result.success ? '✅' : '❌'} Trade ${result.success ? 'executed' : 'failed'}`);
        console.log(`   Exchange: ${result.exchange}`);
        console.log(`   ${side.toUpperCase()} $${usdAmount} of ${crypto}`);
        if (result.price)
            console.log(`   Price: $${result.price.toFixed(2)}`);
        if (result.error)
            console.log(`   Error: ${result.error}`);
        return result;
    }
    /**
     * Rebalance funds across exchanges
     */
    async getRebalanceRecommendations() {
        const balances = await this.getTotalBalance();
        const recommendations = [];
        // Check if any exchange has too much concentration
        for (const balance of balances.byExchange) {
            const totalUSD = balances.totalUSD;
            const percentage = (balance.usd / totalUSD) * 100;
            if (percentage > 70) {
                recommendations.push(`⚠️ ${balance.exchange} has ${percentage.toFixed(1)}% of USD - consider spreading risk`);
            }
        }
        // Check for arbitrage opportunities
        const btcPrices = await this.comparePrices('BTC');
        if (btcPrices.spread > 0.5) {
            recommendations.push(`💰 BTC arbitrage opportunity: ${btcPrices.spread.toFixed(2)}% spread between exchanges`);
        }
        const ethPrices = await this.comparePrices('ETH');
        if (ethPrices.spread > 0.5) {
            recommendations.push(`💰 ETH arbitrage opportunity: ${ethPrices.spread.toFixed(2)}% spread between exchanges`);
        }
        return recommendations;
    }
    /**
     * Get exchange status summary
     */
    async getStatus() {
        const balances = await this.getTotalBalance();
        let status = '\n╔═══════════════════════════════════════════════╗\n';
        status += '║          💱 EXCHANGE MANAGER STATUS           ║\n';
        status += '╠═══════════════════════════════════════════════╣\n';
        for (const balance of balances.byExchange) {
            status += `║  ${balance.exchange.padEnd(12)} USD: $${balance.usd.toFixed(2).padStart(10)}  ║\n`;
            status += `║  ${''.padEnd(12)} BTC: ${balance.btc.toFixed(6).padStart(10)}  ║\n`;
            status += `║  ${''.padEnd(12)} ETH: ${balance.eth.toFixed(4).padStart(10)}  ║\n`;
        }
        status += '╠═══════════════════════════════════════════════╣\n';
        status += `║  TOTAL       USD: $${balances.totalUSD.toFixed(2).padStart(10)}  ║\n`;
        status += `║              BTC: ${balances.totalBTC.toFixed(6).padStart(10)}  ║\n`;
        status += `║              ETH: ${balances.totalETH.toFixed(4).padStart(10)}  ║\n`;
        status += '╚═══════════════════════════════════════════════╝\n';
        return status;
    }
    /**
     * Get the exchange instance
     */
    getCoinbase() {
        return this.coinbase;
    }
    getCryptoCom() {
        return this.cryptoCom;
    }
    getBinance() {
        return this.binance;
    }
    /**
     * Check if any exchange is configured
     */
    hasConfiguredExchange() {
        return this.coinbase.isConfigured() ||
            this.cryptoCom.isConfigured() ||
            this.binance.isConfigured();
    }
}
exports.ExchangeManager = ExchangeManager;
//# sourceMappingURL=exchange-manager.js.map
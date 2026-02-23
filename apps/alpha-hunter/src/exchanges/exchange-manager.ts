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
  other: { [key: string]: number };
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

export class ExchangeManager {
  private coinbase: CoinbaseExchange;
  private cryptoCom: CryptoComExchange;
  private binance: BinanceExchange;
  private preferredExchange: string;

  constructor() {
    this.coinbase = new CoinbaseExchange();
    this.cryptoCom = new CryptoComExchange();
    this.binance = new BinanceExchange();

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
  async getTotalBalance(): Promise<{
    totalUSD: number;
    totalBTC: number;
    totalETH: number;
    byExchange: ExchangeBalance[];
  }> {
    const balances: ExchangeBalance[] = [];

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
      } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
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
  async comparePrices(crypto: 'BTC' | 'ETH' | 'SOL'): Promise<PriceComparison> {
    const comparison: PriceComparison = {
      symbol: crypto,
      best: '',
      bestPrice: 0,
      spread: 0,
    };

    const prices: { exchange: string; price: number }[] = [];

    // Coinbase
    try {
      const ticker = await this.coinbase.getTicker(`${crypto}-USD`);
      comparison.coinbase = ticker.price;
      prices.push({ exchange: 'Coinbase', price: ticker.price });
    } catch { }

    // Crypto.com
    try {
      const ticker = await this.cryptoCom.getTicker(`${crypto}_USDT`);
      comparison.cryptoCom = ticker.price;
      prices.push({ exchange: 'Crypto.com', price: ticker.price });
    } catch { }

    // Binance
    try {
      const ticker = await this.binance.getTicker(`${crypto}USDT`);
      comparison.binance = ticker.price;
      prices.push({ exchange: 'Binance', price: ticker.price });
    } catch { }

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
  async smartTrade(
    crypto: 'BTC' | 'ETH' | 'SOL',
    side: 'buy' | 'sell',
    usdAmount: number
  ): Promise<TradeResult> {
    // Compare prices
    const prices = await this.comparePrices(crypto);
    console.log(`\n💱 Price Comparison for ${crypto}:`);
    if (prices.coinbase) console.log(`   Coinbase: $${prices.coinbase.toFixed(2)}`);
    if (prices.cryptoCom) console.log(`   Crypto.com: $${prices.cryptoCom.toFixed(2)}`);
    if (prices.binance) console.log(`   Binance: $${prices.binance.toFixed(2)}`);
    console.log(`   Best: ${prices.best} @ $${prices.bestPrice.toFixed(2)}`);
    if (prices.spread > 0) console.log(`   Spread: ${prices.spread.toFixed(3)}%`);

    // Check balances on best exchange
    const balances = await this.getTotalBalance();
    const bestExchange = balances.byExchange.find(b =>
      b.exchange.toLowerCase().includes(prices.best.toLowerCase())
    );

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
  async executeOnExchange(
    exchange: string,
    crypto: 'BTC' | 'ETH' | 'SOL',
    side: 'buy' | 'sell',
    usdAmount: number
  ): Promise<TradeResult> {
    const result: TradeResult = {
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
          if (side === 'buy') {
            const cbOrder = await this.coinbase.marketBuy(cbSymbol, usdAmount);
            result.orderId = cbOrder.id;
            result.price = cbOrder.price || 0;
            result.fee = cbOrder.fillFees;
            result.success = cbOrder.status === 'FILLED' || cbOrder.status === 'done' || cbOrder.status === 'pending';
          } else {
            // marketSell expects crypto amount, not USD — convert first
            const cbPrice = await this.coinbase.getPrice(cbSymbol);
            if (cbPrice <= 0) throw new Error(`Could not get price for ${cbSymbol}`);
            const cryptoAmount = usdAmount / cbPrice;
            const cbOrder = await this.coinbase.marketSell(cbSymbol, cryptoAmount);
            result.orderId = cbOrder.id;
            result.price = cbPrice;
            result.fee = cbOrder.fillFees;
            result.success = cbOrder.status === 'FILLED' || cbOrder.status === 'done' || cbOrder.status === 'pending';
          }
          break;

        case 'crypto.com':
          const cdcSymbol = `${crypto}_USDT`;
          if (side === 'buy') {
            const cdcOrder = await this.cryptoCom.marketBuy(cdcSymbol, usdAmount);
            result.orderId = cdcOrder.id;
            result.price = cdcOrder.avgPrice;
            result.fee = cdcOrder.fee;
            result.success = cdcOrder.status === 'FILLED';
          } else {
            // marketSell expects crypto amount — convert first
            const cdcTicker = await this.cryptoCom.getTicker(cdcSymbol);
            if (cdcTicker.price <= 0) throw new Error(`Could not get price for ${cdcSymbol}`);
            const cryptoAmount = usdAmount / cdcTicker.price;
            const cdcOrder = await this.cryptoCom.marketSell(cdcSymbol, cryptoAmount);
            result.orderId = cdcOrder.id;
            result.price = cdcTicker.price;
            result.fee = cdcOrder.fee;
            result.success = cdcOrder.status === 'FILLED';
          }
          break;

        case 'binance':
        case 'binance.us':
          const bnbSymbol = `${crypto}USDT`;
          if (side === 'buy') {
            const bnbOrder = await this.binance.marketBuy(bnbSymbol, usdAmount);
            result.orderId = bnbOrder.orderId.toString();
            result.price = bnbOrder.cummulativeQuoteQty / bnbOrder.executedQty;
            result.success = bnbOrder.status === 'FILLED';
          } else {
            // marketSell expects crypto amount — convert first
            const bnbTicker = await this.binance.getTicker(bnbSymbol);
            if (bnbTicker.price <= 0) throw new Error(`Could not get price for ${bnbSymbol}`);
            const cryptoAmount = usdAmount / bnbTicker.price;
            const bnbOrder = await this.binance.marketSell(bnbSymbol, cryptoAmount);
            result.orderId = bnbOrder.orderId.toString();
            result.price = bnbTicker.price;
            result.success = bnbOrder.status === 'FILLED';
          }
          break;

        default:
          result.error = `Unknown exchange: ${exchange}`;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    console.log(`\n${result.success ? '✅' : '❌'} Trade ${result.success ? 'executed' : 'failed'}`);
    console.log(`   Exchange: ${result.exchange}`);
    console.log(`   ${side.toUpperCase()} $${usdAmount} of ${crypto}`);
    if (result.price) console.log(`   Price: $${result.price.toFixed(2)}`);
    if (result.error) console.log(`   Error: ${result.error}`);

    return result;
  }

  /**
   * Rebalance funds across exchanges
   */
  async getRebalanceRecommendations(): Promise<string[]> {
    const balances = await this.getTotalBalance();
    const recommendations: string[] = [];

    // Check if any exchange has too much concentration
    for (const balance of balances.byExchange) {
      const totalUSD = balances.totalUSD;
      const percentage = (balance.usd / totalUSD) * 100;

      if (percentage > 70) {
        recommendations.push(
          `⚠️ ${balance.exchange} has ${percentage.toFixed(1)}% of USD - consider spreading risk`
        );
      }
    }

    // Check for arbitrage opportunities
    const btcPrices = await this.comparePrices('BTC');
    if (btcPrices.spread > 0.5) {
      recommendations.push(
        `💰 BTC arbitrage opportunity: ${btcPrices.spread.toFixed(2)}% spread between exchanges`
      );
    }

    const ethPrices = await this.comparePrices('ETH');
    if (ethPrices.spread > 0.5) {
      recommendations.push(
        `💰 ETH arbitrage opportunity: ${ethPrices.spread.toFixed(2)}% spread between exchanges`
      );
    }

    return recommendations;
  }

  /**
   * Get exchange status summary
   */
  async getStatus(): Promise<string> {
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
  getCoinbase(): CoinbaseExchange {
    return this.coinbase;
  }

  getCryptoCom(): CryptoComExchange {
    return this.cryptoCom;
  }

  getBinance(): BinanceExchange {
    return this.binance;
  }

  /**
   * Check if any exchange is configured
   */
  hasConfiguredExchange(): boolean {
    return this.coinbase.isConfigured() ||
      this.cryptoCom.isConfigured() ||
      this.binance.isConfigured();
  }
}


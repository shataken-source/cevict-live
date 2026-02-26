import { KalshiAPI } from './kalshi'
import { CoinbaseAPI } from './coinbase'

interface Market {
  id: string
  venue: 'kalshi' | 'crypto'
  price: number
  liquidity?: number
}

interface Position {
  id: string
  stake: number
  venue: string
}

class TradingBot {

  private kalshi = new KalshiAPI()
  private coinbase = new CoinbaseAPI()

  private bankroll = 100_000
  private peakBankroll = 100_000

  private openPositions: Map<string, Position> = new Map()

  private running = false
  private executionLock = false

  private readonly INTERVAL = 60_000
  private readonly MIN_EDGE = 0.02
  private readonly MAX_EXPOSURE = 0.3
  private readonly KELLY_FRACTION = 0.33

  async start() {
    if (this.running) return
    this.running = true

    console.log('Trading bot started.')

    process.on('SIGINT', async () => {
      console.log('Graceful shutdown...')
      this.running = false
      process.exit(0)
    })

    while (this.running) {
      if (!this.executionLock) {
        this.executionLock = true
        try {
          await this.cycle()
        } catch (err) {
          console.error('Cycle error:', err)
        }
        this.executionLock = false
      }

      await this.sleep(this.INTERVAL)
    }
  }

  private async cycle() {
    this.resetDailyIfNeeded()

    const markets = await this.fetchMarkets()

    const signals = this.generateSignals(markets)

    const evSignals = this.filterByEV(signals)

    const allocations = this.allocate(evSignals)

    await this.execute(allocations)
  }

  private async fetchMarkets(): Promise<Market[]> {
    const [kalshiMarkets, cryptoMarkets] = await Promise.all([
      this.kalshi.getActiveMarkets(),
      this.coinbase.getActiveMarkets()
    ])

    const formatted: Market[] = []

    for (const m of kalshiMarkets) {
      formatted.push({
        id: m.ticker,
        venue: 'kalshi',
        price: m.yes_price / 100,
        liquidity: m.volume
      })
    }

    for (const m of cryptoMarkets) {
      formatted.push({
        id: m.product_id,
        venue: 'crypto',
        price: parseFloat(m.price)
      })
    }

    return formatted
  }

  private generateSignals(markets: Market[]) {
    return markets.map(m => {
      const modelProb = this.simpleModel(m.price)

      return {
        ...m,
        modelProbability: modelProb,
        marketProbability: m.price,
        decimalOdds: 1 / m.price
      }
    })
  }

  private simpleModel(marketProb: number) {
    // No random noise — without a real model, just return market price (no edge, no trades)
    return Math.min(0.99, Math.max(0.01, marketProb))
  }

  private filterByEV(signals: any[]) {
    return signals
      .map(s => {
        const b = s.decimalOdds - 1
        const p = s.modelProbability
        const q = 1 - p

        const ev = (p * b) - q
        const edge = p - s.marketProbability

        return { ...s, ev, edge }
      })
      .filter(s => s.edge > this.MIN_EDGE && s.ev > 0)
      .sort((a, b) => b.ev - a.ev)
  }

  private allocate(signals: any[]) {
    const allocations: Position[] = []

    const drawdown = this.getDrawdown()
    const throttle = drawdown > 0.1 ? 0.2 : this.KELLY_FRACTION

    for (const s of signals) {

      if (this.openPositions.has(s.id)) continue

      const fullKelly = this.fullKelly(s.modelProbability, s.decimalOdds)

      const fractionalKelly = fullKelly * throttle

      let stake = fractionalKelly * this.bankroll

      const maxAllowed = this.bankroll * this.MAX_EXPOSURE

      stake = Math.min(stake, maxAllowed)

      if (stake <= 0) continue

      allocations.push({
        id: s.id,
        stake,
        venue: s.venue
      })
    }

    return allocations
  }

  private async execute(allocations: Position[]) {
    for (const a of allocations) {
      console.log(`Placing ${a.venue} trade ${a.id} for $${a.stake.toFixed(2)}`)

      try {
        if (a.venue === 'kalshi') {
          await this.kalshi.placeOrder(a.id, a.stake)
        } else {
          await this.coinbase.placeOrder(a.id, a.stake)
        }

        this.bankroll -= a.stake

        this.openPositions.set(a.id, a)

      } catch (err) {
        console.error(`Execution failed for ${a.id}`, err)
      }
    }
  }

  private fullKelly(p: number, odds: number) {
    const b = odds - 1
    const q = 1 - p
    return (b * p - q) / b
  }

  private getDrawdown() {
    return (this.peakBankroll - this.bankroll) / this.peakBankroll
  }

  private resetDailyIfNeeded() {
    const now = new Date()
    if (now.getUTCHours() === 0 && now.getUTCMinutes() < 2) {
      this.peakBankroll = this.bankroll
      console.log('Daily reset complete.')
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

const bot = new TradingBot()
bot.start()


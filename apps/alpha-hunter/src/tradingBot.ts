import * as fs from 'fs'
import * as path from 'path'

interface Prediction {
  sport: string
  home_team: string
  away_team: string
  pick: string
  confidence: number
  odds: number
  value_bet_edge: number
  expected_value: number
  analysis: string
  game_time: string
}

interface Position {
  id: string
  stake: number
  sport: string
  pick: string
  confidence: number
  edge: number
  expectedValue: number
}

class TradingBot {
  private bankroll = 100_000
  private peakBankroll = 100_000
  private predictionsFile: string

  private openPositions: Map<string, Position> = new Map()

  private readonly MIN_EDGE = 0.02
  private readonly MAX_EXPOSURE = 0.3
  private readonly KELLY_FRACTION = 0.33
  private readonly MIN_CONFIDENCE = 58  // Lowered to match prediction confidence levels

  constructor(predictionsFilePath: string) {
    this.predictionsFile = predictionsFilePath
  }

  async runSimulation() {
    console.log('\n🔥 TRADING BOT SIMULATION - 2/19 PREDICTIONS\n')
    console.log('='.repeat(60))

    // Load predictions from file
    const predictions = this.loadPredictions()
    if (predictions.length === 0) {
      console.log('❌ No predictions found in file')
      return
    }

    console.log(`📊 Loaded ${predictions.length} predictions from file`)
    console.log(`💰 Initial Bankroll: $${this.bankroll.toLocaleString()}`)
    console.log('='.repeat(60))

    // Convert predictions to signals with proper edge/EV math
    const signals = this.generateSignals(predictions)
    console.log(`\n📈 Generated ${signals.length} signals`)

    // Filter by EV
    const evSignals = this.filterByEV(signals)
    console.log(`✅ ${evSignals.length} signals pass EV filter (edge > ${(this.MIN_EDGE * 100).toFixed(0)}%)`)

    if (evSignals.length === 0) {
      console.log('\n⚠️ No trades pass the EV threshold')
      return
    }

    // Allocate capital
    const allocations = this.allocate(evSignals)
    console.log(`\n🎯 ${allocations.length} positions allocated`)

    // Execute (simulated)
    await this.execute(allocations)

    // Summary
    this.printSummary(allocations)

    // Save output for Prognostication
    this.saveKalshiPicks(allocations)
  }

  private loadPredictions(): Prediction[] {
    try {
      const content = fs.readFileSync(this.predictionsFile, 'utf-8')
      const data = JSON.parse(content)
      return data.predictions || data.picks || data
    } catch (error: any) {
      console.error(`❌ Failed to load predictions: ${error.message}`)
      return []
    }
  }

  private generateSignals(predictions: Prediction[]) {
    return predictions.map(p => {
      // Convert American odds to decimal
      const decimalOdds = this.americanToDecimal(p.odds)

      // Use pre-calculated edge from predictions file (convert from % to decimal)
      const edge = p.value_bet_edge / 100

      // Use pre-calculated expected value (convert from % to decimal)
      const expectedValue = p.expected_value / 100

      // Market probability = 1 / decimalOdds
      const marketProb = 1 / decimalOdds

      // Model probability = market probability + edge
      const modelProb = marketProb + edge

      return {
        id: `${p.sport}:${p.home_team}_vs_${p.away_team}:${p.pick}`,
        sport: p.sport,
        homeTeam: p.home_team,
        awayTeam: p.away_team,
        pick: p.pick,
        americanOdds: p.odds,
        decimalOdds,
        modelProbability: Math.min(0.99, modelProb),
        marketProbability: marketProb,
        confidence: p.confidence,
        edge,
        expectedValue,
        analysis: p.analysis,
        gameTime: p.game_time
      }
    })
  }

  private americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1
    } else {
      return (100 / Math.abs(americanOdds)) + 1
    }
  }

  private filterByEV(signals: any[]) {
    return signals
      .map(s => {
        const b = s.decimalOdds - 1  // net odds (profit per unit staked)
        const p = s.modelProbability
        const q = 1 - p

        // Correct EV math: EV = (p × b) − q
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
    // Throttle Kelly on drawdown > 10%
    const throttle = drawdown > 0.1 ? 0.2 : this.KELLY_FRACTION

    for (const s of signals) {
      // Skip if already in position
      if (this.openPositions.has(s.id)) continue

      // Skip low confidence
      if (s.confidence < this.MIN_CONFIDENCE) continue

      // Full Kelly: f* = (bp - q) / b
      const fullKelly = this.fullKelly(s.modelProbability, s.decimalOdds)

      // Fractional Kelly with drawdown throttle
      const fractionalKelly = fullKelly * throttle

      // Calculate stake
      let stake = fractionalKelly * this.bankroll

      // Cap at max exposure per trade
      const maxAllowed = this.bankroll * this.MAX_EXPOSURE
      stake = Math.min(stake, maxAllowed)

      // Minimum stake threshold
      if (stake <= 100) continue

      allocations.push({
        id: s.id,
        stake,
        sport: s.sport,
        pick: s.pick,
        confidence: s.confidence,
        edge: s.edge,
        expectedValue: s.ev
      })

      // Track position
      this.openPositions.set(s.id, {
        id: s.id,
        stake,
        sport: s.sport,
        pick: s.pick,
        confidence: s.confidence,
        edge: s.edge,
        expectedValue: s.ev
      })

      // Reduce bankroll
      this.bankroll -= stake
    }

    return allocations
  }

  private async execute(allocations: Position[]) {
    console.log('\n📋 EXECUTION LOG')
    console.log('-'.repeat(60))

    for (const a of allocations) {
      console.log(`\n🎯 ${a.id}`)
      console.log(`   Sport: ${a.sport}`)
      console.log(`   Pick: ${a.pick}`)
      console.log(`   Confidence: ${a.confidence}%`)
      console.log(`   Edge: ${(a.edge * 100).toFixed(2)}%`)
      console.log(`   EV: ${(a.expectedValue * 100).toFixed(2)}%`)
      console.log(`   💵 Stake: $${a.stake.toFixed(2)}`)

      // Simulate execution delay
      await this.sleep(50)
    }
  }

  private printSummary(allocations: Position[]) {
    console.log('\n\n📊 SIMULATION SUMMARY')
    console.log('='.repeat(60))

    const totalStaked = allocations.reduce((sum, a) => sum + a.stake, 0)
    const avgEdge = allocations.reduce((sum, a) => sum + a.edge, 0) / allocations.length
    const avgEV = allocations.reduce((sum, a) => sum + a.expectedValue, 0) / allocations.length
    const avgConfidence = allocations.reduce((sum, a) => sum + a.confidence, 0) / allocations.length

    console.log(`\n💰 Total Staked: $${totalStaked.toFixed(2)}`)
    console.log(`💵 Remaining Bankroll: $${this.bankroll.toFixed(2)}`)
    console.log(`📈 Positions Opened: ${allocations.length}`)
    console.log(`📊 Average Edge: ${(avgEdge * 100).toFixed(2)}%`)
    console.log(`📊 Average EV: ${(avgEV * 100).toFixed(2)}%`)
    console.log(`📊 Average Confidence: ${avgConfidence.toFixed(1)}%`)

    // By sport breakdown
    const bySport = new Map<string, { count: number; staked: number }>()
    for (const a of allocations) {
      const current = bySport.get(a.sport) || { count: 0, staked: 0 }
      bySport.set(a.sport, {
        count: current.count + 1,
        staked: current.staked + a.stake
      })
    }

    console.log('\n🏆 BY SPORT:')
    for (const [sport, stats] of bySport) {
      console.log(`   ${sport}: ${stats.count} trades, $${stats.staked.toFixed(2)} staked`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ SIMULATION COMPLETE\n')
  }

  private fullKelly(p: number, odds: number) {
    const b = odds - 1
    const q = 1 - p
    return (b * p - q) / b
  }

  private getDrawdown() {
    return (this.peakBankroll - this.bankroll) / this.peakBankroll
  }

  private saveKalshiPicks(allocations: Position[]) {
    const outputDir = path.join(__dirname, '..', '..', 'progno')
    const outputFile = path.join(outputDir, 'kalshi-picks.json')

    const kalshiPicks = {
      generatedAt: new Date().toISOString(),
      source: 'alpha-hunter',
      count: allocations.length,
      picks: allocations.map(a => ({
        id: a.id,
        sport: a.sport,
        pick: a.pick,
        confidence: a.confidence,
        edge: a.edge,
        expectedValue: a.expectedValue,
        stake: a.stake,
        status: 'recommended'
      }))
    }

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      fs.writeFileSync(outputFile, JSON.stringify(kalshiPicks, null, 2))
      console.log(`\n💾 Saved ${allocations.length} Kalshi picks to: ${outputFile}`)
    } catch (error: any) {
      console.error(`❌ Failed to save picks: ${error.message}`)
    }
  }
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Run with 2/19 predictions file
const predictionsFile = path.join(__dirname, '..', '..', 'progno', 'predictions-2026-02-19.json')
const bot = new TradingBot(predictionsFile)
bot.runSimulation()

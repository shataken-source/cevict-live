import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import * as dotenv from 'dotenv'
import { getPrognoProbabilitiesFromFile, matchKalshiMarketToProgno, PrognoEventProbability } from './intelligence/probability-bridge'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Kalshi API Configuration - Production elections API
const KALSHI_BASE_URL = 'https://api.elections.kalshi.com'

interface Prediction {
  sport: string
  league: string
  home_team: string
  away_team: string
  pick: string
  pick_type: string
  odds: number
  confidence: number
  value_bet_edge: number
  expected_value: number
  mc_win_probability?: number
  analysis: string
  game_time: string
}

interface KalshiMarket {
  ticker: string
  title: string
  subtitle?: string
  yes_ask: number
  yes_bid: number
  no_ask: number
  no_bid: number
  volume: number
  open_interest: number
  event_ticker?: string
  category?: string
  status?: string
}

interface MatchedTrade {
  id: string
  sport: string
  homeTeam: string
  awayTeam: string
  pick: string
  modelProbability: number
  kalshiPrice: number
  edge: number
  expectedValue: number
  confidence: number
  stake: number
  kalshiMarketId: string
  side: 'YES' | 'NO'
}

class KalshiTestTrader {
  private apiKeyId: string
  private privateKey: string
  private keyConfigured: boolean = false

  constructor() {
    this.apiKeyId = process.env.KALSHI_API_KEY_ID || ''

    let rawKey = process.env.KALSHI_PRIVATE_KEY || ''
    const keyPath = process.env.KALSHI_PRIVATE_KEY_PATH || ''

    if (!rawKey && keyPath && fs.existsSync(keyPath)) {
      try {
        rawKey = fs.readFileSync(keyPath, 'utf8')
        console.log('✅ Loaded Kalshi private key from file')
      } catch (e) {
        console.error('❌ Failed to read private key from file')
      }
    }

    this.privateKey = rawKey
      .replace(/\\n/g, '\n')  // Handle escaped newlines
      .replace(/^"+|"+$/g, '') // Remove surrounding quotes
      .trim()

    // Convert single-line key to proper multi-line PEM format
    if (this.privateKey.includes('-----BEGIN RSA PRIVATE KEY-----') && !this.privateKey.includes('\n')) {
      // Extract the base64 content between headers
      const begin = '-----BEGIN RSA PRIVATE KEY-----'
      const end = '-----END RSA PRIVATE KEY-----'
      const beginIdx = this.privateKey.indexOf(begin)
      const endIdx = this.privateKey.indexOf(end)

      if (beginIdx !== -1 && endIdx !== -1) {
        let content = this.privateKey.substring(beginIdx + begin.length, endIdx)
        // Insert newlines every 64 characters (standard PEM format)
        const lines = content.match(/.{1,64}/g) || []
        this.privateKey = `${begin}\n${lines.join('\n')}\n${end}`
      }
    }

    if (this.apiKeyId && this.privateKey && this.privateKey.includes('BEGIN') && this.privateKey.includes('PRIVATE KEY')) {
      try {
        crypto.createPrivateKey(this.privateKey)
        this.keyConfigured = true
        console.log('✅ Kalshi API configured')
      } catch (e) {
        console.error('❌ Invalid KALSHI_PRIVATE_KEY format')
      }
    } else {
      console.warn('⚠️ Kalshi API keys not configured - using mock markets for test')
    }
  }

  private async signRequest(method: string, path: string): Promise<{ signature: string; timestamp: string }> {
    try {
      const timestamp = Date.now().toString()
      const pathWithoutQuery = path.split('?')[0]
      const message = timestamp + method.toUpperCase() + pathWithoutQuery

      const sign = crypto.createSign('RSA-SHA256')
      sign.update(message)
      sign.end()
      const signature = sign.sign({
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }).toString('base64')

      return { signature, timestamp }
    } catch (error: any) {
      console.error('❌ Signature generation failed:', error.message)
      return { signature: '', timestamp: '' }
    }
  }

  async runTestWithProbabilityBridge(predictionsFile: string) {
    console.log('🔥 KALSHI TRADER TEST - Using Probability Bridge\n')

    // Load predictions using probability bridge
    console.log('📊 Loading Progno predictions via Probability Bridge...')
    const prognoProbabilities = getPrognoProbabilitiesFromFile(predictionsFile)
    if (prognoProbabilities.length === 0) {
      console.log('❌ No Progno predictions loaded')
      return
    }
    console.log(`📊 Loaded ${prognoProbabilities.length} Progno events`)

    // Fetch Kalshi markets
    console.log('\n📡 Fetching Kalshi markets...')
    const kalshiMarkets = await this.fetchKalshiMarkets()
    if (kalshiMarkets.length === 0) {
      console.log('❌ No Kalshi markets fetched')
      return
    }
    console.log(`📈 Fetched ${kalshiMarkets.length} Kalshi markets`)

    // Match using probability bridge
    console.log('\n🎯 Matching using Probability Bridge...')
    const matches: MatchedTrade[] = []

    for (const prognoProb of prognoProbabilities) {
      const matchedMarket = matchKalshiMarketToProgno(prognoProb, kalshiMarkets)

      if (matchedMarket) {
        // modelProbability is 0-100 scale from bridge, convert to 0-1 for calculations
        const modelProbability = prognoProb.modelProbability / 100
        const kalshiPrice = matchedMarket.yes_ask / 100
        const edge = modelProbability - kalshiPrice

        // Calculate stake with Kelly criterion
        const decimalOdds = 1 / kalshiPrice
        const b = decimalOdds - 1
        const p = modelProbability
        const q = 1 - p
        const kelly = (b * p - q) / b

        // Only trade if Kelly is positive
        if (kelly <= 0) {
          console.log(`   ⚠️ Negative Kelly for ${prognoProb.pick}, skipping`)
          continue
        }

        const fractionalKelly = kelly * 0.25 // Quarter Kelly for safety
        const rawStake = 100000 * fractionalKelly
        const maxStake = 10000 // Max per trade
        const stake = Math.min(Math.max(rawStake, 0), maxStake)

        matches.push({
          id: `${prognoProb.league}:${prognoProb.homeTeam}_vs_${prognoProb.awayTeam}:${prognoProb.pick}`,
          sport: prognoProb.league,
          homeTeam: prognoProb.homeTeam,
          awayTeam: prognoProb.awayTeam,
          pick: prognoProb.pick,
          modelProbability,
          kalshiPrice,
          edge,
          expectedValue: edge > 0 ? edge * (1 - kalshiPrice) : 0,
          confidence: prognoProb.modelProbability, // Use modelProbability as confidence (0-100)
          stake,
          kalshiMarketId: matchedMarket.ticker,
          side: 'YES'
        })

        console.log(`   ✅ MATCH: ${prognoProb.pick} → ${matchedMarket.ticker}`)
      }
    }

    console.log(`\n✅ Found ${matches.length} matches via Probability Bridge`)

    // Save matches to Supabase
    if (matches.length > 0) {
      console.log('\n💾 Saving matches to Supabase...')
      await this.saveMatchesToSupabase(matches)
    }

    // Show results
    if (matches.length > 0) {
      console.log('\n💰 MATCHED TRADES:')
      matches.sort((a, b) => b.edge - a.edge).forEach((m, i) => {
        console.log(`\n${i + 1}. ${m.sport}: ${m.pick}`)
        console.log(`   Market ID: ${m.kalshiMarketId}`)
        console.log(`   Model Prob: ${(m.modelProbability * 100).toFixed(1)}%`)
        console.log(`   Kalshi Price: ${(m.kalshiPrice * 100).toFixed(1)}¢`)
        console.log(`   Edge: ${(m.edge * 100).toFixed(2)}%`)
        console.log(`   Stake: $${m.stake.toFixed(2)}`)
      })

      const totalStake = matches.reduce((s, m) => s + m.stake, 0)
      const avgEdge = matches.reduce((s, m) => s + m.edge, 0) / matches.length
      console.log(`\n📊 SUMMARY:`)
      console.log(`   Total Matches: ${matches.length}`)
      console.log(`   Total Stake: $${totalStake.toFixed(2)}`)
      console.log(`   Average Edge: ${(avgEdge * 100).toFixed(2)}%`)
    }
  }

  private loadPredictions(filePath: string): Prediction[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      return data.picks || []
    } catch (error: any) {
      console.error(`❌ Failed to load predictions: ${error.message}`)
      return []
    }
  }

  private async fetchKalshiMarkets(): Promise<KalshiMarket[]> {
    if (!this.keyConfigured) {
      console.log('[SIMULATION] Using mock markets for testing')
      return this.getMockMarkets()
    }

    // Confirmed game-winner (moneyline) series tickers on api.elections.kalshi.com
    // Each series returns both-team markets for every game (e.g. "Utah at Memphis Winner?")
    const GAME_SERIES = [
      'KXNBAGAME',    // NBA moneylines
      'KXNCAABGAME',  // NCAAB moneylines
      'KXNFLGAME',    // NFL moneylines
      'KXNHLGAME',    // NHL moneylines
      'KXMLBGAME',    // MLB moneylines
      'KXNCAAFGAME',  // NCAAF moneylines
    ]

    // Loop control — per-series: max 5 pages of 200, 10s wall-clock
    const MAX_PAGES_PER_SERIES = 5
    const PAGE_SIZE = 200
    const SERIES_TIMEOUT_MS = 10_000
    const GLOBAL_TIMEOUT_MS = 30_000
    const globalStart = Date.now()

    const allMarkets: any[] = []
    console.log(`   🔑 API Key ID: ${this.apiKeyId.substring(0, 8)}...`)

    try {
      for (const seriesTicker of GAME_SERIES) {
        // Global wall-clock guard
        if (Date.now() - globalStart > GLOBAL_TIMEOUT_MS) {
          console.warn(`   ⏱️ Global timeout hit — stopping series fetch`)
          break
        }

        const seriesStart = Date.now()
        let cursor: string | undefined = undefined
        let page = 0
        let seriesCount = 0

        while (page < MAX_PAGES_PER_SERIES) {
          // Per-series timeout
          if (Date.now() - seriesStart > SERIES_TIMEOUT_MS) {
            console.warn(`   ⏱️ Series timeout for ${seriesTicker} after ${page} pages`)
            break
          }

          const params = new URLSearchParams({
            series_ticker: seriesTicker,
            status: 'open',
            limit: String(PAGE_SIZE)
          })
          if (cursor) params.set('cursor', cursor)
          const marketsPath = `/trade-api/v2/markets?${params.toString()}`

          const { signature: msig, timestamp: mts } = await this.signRequest('GET', marketsPath)
          const marketsResponse = await fetch(`${KALSHI_BASE_URL}${marketsPath}`, {
            headers: {
              'Accept': 'application/json',
              'KALSHI-ACCESS-KEY': this.apiKeyId,
              'KALSHI-ACCESS-SIGNATURE': msig,
              'KALSHI-ACCESS-TIMESTAMP': mts,
            }
          })

          if (!marketsResponse.ok) {
            const errorText = await marketsResponse.text()
            // 429 = rate limit, skip this series gracefully
            if (marketsResponse.status === 429) {
              console.warn(`   ⚠️ Rate limited on ${seriesTicker} — skipping`)
              break
            }
            console.warn(`   ⚠️ ${seriesTicker} page ${page + 1}: ${marketsResponse.status} ${errorText.substring(0, 100)}`)
            break
          }

          const marketsData = await marketsResponse.json()
          const pageMarkets: any[] = marketsData.markets || []
          allMarkets.push(...pageMarkets)
          seriesCount += pageMarkets.length

          cursor = marketsData.cursor || undefined
          if (pageMarkets.length < PAGE_SIZE || !cursor) break
          page++
        }

        if (seriesCount > 0) {
          console.log(`   ✅ ${seriesTicker}: ${seriesCount} markets`)
        }
      }

      console.log(`   📊 Total game-winner markets: ${allMarkets.length} in ${Date.now() - globalStart}ms`)

      if (allMarkets.length > 0) {
        console.log(`   📝 Sample: ${allMarkets.slice(0, 4).map((m: any) => `"${m.title}" [${m.ticker}]`).join(' | ')}`)
      } else {
        console.warn(`   ⚠️ 0 game-winner markets found`)
      }

      return allMarkets
    } catch (error: any) {
      console.error(`❌ Kalshi fetch failed: ${error.message}`)
      throw error
    }
  }

  private getMockMarkets(): KalshiMarket[] {
    return [
      { ticker: 'KXMVNCAAB-TEST1', title: 'yes Tennessee St', yes_ask: 65, yes_bid: 63, no_ask: 37, no_bid: 35, volume: 10000, open_interest: 5000, category: 'NCAAB' },
      { ticker: 'KXMVNBA-TEST1', title: 'yes Memphis Grizzlies', yes_ask: 62, yes_bid: 60, no_ask: 40, no_bid: 38, volume: 25000, open_interest: 12000, category: 'NBA' },
      { ticker: 'KXMVNCAAB-TEST2', title: 'yes Merrimack Warriors', yes_ask: 64, yes_bid: 62, no_ask: 38, no_bid: 36, volume: 8000, open_interest: 4000, category: 'NCAAB' },
      { ticker: 'KXMVNCAAB-TEST3', title: 'yes Appalachian St', yes_ask: 63, yes_bid: 61, no_ask: 39, no_bid: 37, volume: 9000, open_interest: 4500, category: 'NCAAB' },
      { ticker: 'KXMVNCAAB-TEST4', title: 'yes Central Connecticut St', yes_ask: 64, yes_bid: 62, no_ask: 38, no_bid: 36, volume: 7000, open_interest: 3500, category: 'NCAAB' },
      { ticker: 'KXMVNCAAB-TEST5', title: 'yes Portland St', yes_ask: 63, yes_bid: 61, no_ask: 39, no_bid: 37, volume: 8500, open_interest: 4250, category: 'NCAAB' },
      { ticker: 'KXMVNBA-TEST2', title: 'yes New York Knicks', yes_ask: 64, yes_bid: 62, no_ask: 38, no_bid: 36, volume: 30000, open_interest: 15000, category: 'NBA' },
    ]
  }

  private matchMarkets(predictions: Prediction[], markets: KalshiMarket[]): MatchedTrade[] {
    const matches: MatchedTrade[] = []

    console.log(`\n🔍 Matching ${predictions.length} predictions to ${markets.length} markets...`)
    console.log(`📋 First 5 Kalshi markets: ${markets.slice(0, 5).map(m => m.title).join(', ')}`)

    for (const pred of predictions) {
      // Extract team name keywords from the pick
      const pickWords = pred.pick.toLowerCase().split(/\s+/)
      const pickTeam = pickWords[pickWords.length - 1] // Last word (e.g., "Tigers" from "Tennessee St Tigers")
      const pickCity = pickWords[0] // First word (e.g., "Memphis" from "Memphis Grizzlies")

      console.log(`\n🎯 Checking: ${pred.pick}`)
      console.log(`   Keywords: city="${pickCity}", team="${pickTeam}"`)

      // Find matching market - check for partial matches
      const market = markets.find(m => {
        const title = m.title.toLowerCase()
        const subtitle = (m.subtitle || '').toLowerCase()
        const fullText = title + ' ' + subtitle

        // Skip multi-leg markets (contain commas)
        if (title.includes(',')) return false

        // Check for city match (e.g., "Memphis" matches "yes Memphis")
        // or team name match (e.g., "Tigers" matches "yes Tennessee State")
        const cityMatch = fullText.includes(pickCity)
        const teamMatch = fullText.includes(pickTeam)
        const partialMatch = pred.pick.toLowerCase().split(/\s+/).some(word =>
          word.length > 3 && fullText.includes(word)
        )

        if (cityMatch || teamMatch || partialMatch) {
          console.log(`   ✓ MATCH: "${m.title}" (city:${cityMatch}, team:${teamMatch}, partial:${partialMatch})`)
          return true
        }
        return false
      })

      if (market) {
        console.log(`   ✅ FOUND: ${market.ticker} - ${market.title}`)
        const modelProbability = pred.mc_win_probability || this.oddsToProbability(pred.odds)

        // Validate probability range
        if (modelProbability <= 0 || modelProbability >= 1) {
          console.log(`   ⚠️ Invalid model probability: ${modelProbability}`)
          continue
        }

        // Calculate prices for both sides
        const yesPrice = market.yes_ask / 100
        const noPrice = market.no_ask / 100

        // Skip if prices are invalid
        if (yesPrice <= 0 || yesPrice >= 1 || noPrice <= 0 || noPrice >= 1) {
          console.log(`   ⚠️ Invalid market prices: YES=${yesPrice}, NO=${noPrice}`)
          continue
        }

        // Check bid/ask spread
        const yesSpread = (market.yes_ask - market.yes_bid) / 100
        const noSpread = (market.no_ask - market.no_bid) / 100
        const maxSpread = 0.10 // 10% max spread

        if (yesSpread > maxSpread && noSpread > maxSpread) {
          console.log(`   ⚠️ Spread too wide: YES=${yesSpread.toFixed(2)}, NO=${noSpread.toFixed(2)}`)
          continue
        }

        // Determine which side to trade
        let side: 'YES' | 'NO'
        let marketPrice: number
        let edge: number
        let trueEV: number

        const yesEdge = modelProbability - yesPrice
        const noEdge = (1 - modelProbability) - noPrice

        if (yesEdge > 0 && yesEdge >= noEdge) {
          side = 'YES'
          marketPrice = yesPrice
          edge = yesEdge
          // True EV calculation: EV = p*(1-price) - (1-p)*price
          trueEV = modelProbability * (1 - marketPrice) - (1 - modelProbability) * marketPrice
        } else if (noEdge > 0) {
          side = 'NO'
          marketPrice = noPrice
          edge = noEdge
          // For NO: EV = (1-p)*(1-noPrice) - p*noPrice
          trueEV = (1 - modelProbability) * (1 - marketPrice) - modelProbability * marketPrice
        } else {
          console.log(`   ⚠️ No positive edge: YES edge=${yesEdge.toFixed(4)}, NO edge=${noEdge.toFixed(4)}`)
          continue
        }

        // Calculate Kelly criterion stake
        const decimalOdds = 1 / marketPrice
        const b = decimalOdds - 1
        const p = side === 'YES' ? modelProbability : (1 - modelProbability)
        const q = 1 - p
        const kelly = (b * p - q) / b

        // Only trade if Kelly is positive
        if (kelly <= 0) {
          console.log(`   ⚠️ Negative Kelly fraction: ${kelly.toFixed(4)}`)
          continue
        }

        const bankroll = 100000
        const fractionalKelly = kelly * 0.25 // Quarter Kelly for safety
        const rawStake = bankroll * fractionalKelly
        const maxStake = 10000 // Max per trade
        const stake = Math.min(rawStake, maxStake)

        console.log(`   💰 ${side} stake: $${stake.toFixed(2)} (edge: ${(edge * 100).toFixed(2)}%, EV: ${(trueEV * 100).toFixed(2)}%)`)

        matches.push({
          id: `${pred.sport}:${pred.home_team}_vs_${pred.away_team}:${pred.pick}`,
          sport: pred.sport,
          homeTeam: pred.home_team,
          awayTeam: pred.away_team,
          pick: pred.pick,
          modelProbability,
          kalshiPrice: marketPrice,
          edge,
          expectedValue: trueEV,
          confidence: pred.confidence,
          stake,
          kalshiMarketId: market.ticker,
          side
        })
      } else {
        console.log(`   ❌ No match found`)
      }
    }

    return matches.sort((a, b) => b.edge - a.edge)
  }

  private oddsToProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100)
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
    }
  }

  private async saveMatchesToSupabase(matches: MatchedTrade[]): Promise<void> {
    try {
      // Dynamic import to avoid issues if supabase isn't configured
      const { supabaseMemory } = await import('./lib/supabase-memory.js')
      const client = supabaseMemory.getSupabaseClient()

      if (!client) {
        console.log('⚠️ Supabase not configured - skipping database save')
        return
      }

      const predictions = matches.map(m => ({
        bot_category: 'kalshi_sports',
        platform: 'kalshi',
        market_id: m.kalshiMarketId,
        market_title: `${m.sport}: ${m.homeTeam} vs ${m.awayTeam} - ${m.pick}`,
        prediction: m.side.toLowerCase() as 'yes' | 'no',
        probability: Math.round(m.modelProbability * 100) / 100,
        confidence: m.confidence,
        edge: m.edge,
        market_price: m.kalshiPrice,
        reasoning: [`${m.pick} model prob ${(m.modelProbability * 100).toFixed(1)}% vs Kalshi ${(m.kalshiPrice * 100).toFixed(1)}¢`],
        factors: [m.sport, `edge ${(m.edge * 100).toFixed(1)}%`],
        learned_from: [],
        predicted_at: new Date().toISOString(),
      }))

      const { error } = await client
        .from('bot_predictions')
        .insert(predictions)

      if (error) {
        // 23505 = unique_violation — records already exist from a previous run, that's fine
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.log(`✅ Predictions already in Supabase (duplicate — skipped)`)
        } else {
          console.error('❌ Failed to save to Supabase:', error.message)
        }
      } else {
        console.log(`✅ Saved ${predictions.length} predictions to Supabase`)
        console.log('📡 Prognostication website will display these picks')
      }
    } catch (error: any) {
      console.error('❌ Supabase save error:', error.message)
    }
  }
}

// Run test
// Fix path resolution: __dirname is dist/ (or src/ when using tsx)
// For robustness, find project root first
let rootDir = __dirname
while (rootDir !== '/' && !fs.existsSync(path.join(rootDir, 'package.json'))) {
  rootDir = path.dirname(rootDir)
}
// From alpha-hunter root, go up to apps/progno
const defaultFile = path.join(rootDir, '..', 'progno', 'predictions-2026-02-19.json')
const predictionsFile = process.argv[2] || defaultFile

console.log('========================================')
console.log('KALSHI TRADER TEST')
console.log('========================================')
console.log(`Using predictions file: ${predictionsFile}`)
console.log(`File exists: ${fs.existsSync(predictionsFile)}`)
console.log('')

const trader = new KalshiTestTrader()
trader.runTestWithProbabilityBridge(predictionsFile).catch(console.error)

# FILE reset-alpha-hunter-full.ps1
# PURPOSE Completely restore Alpha Hunter to a working state with minimal placeholder APIs.
# WARNING This overwrites all files in alpha-huntersrc and package.jsontsconfig.json.

$root = Ccevict-liveappsalpha-hunter
Write-Host ⚠️ Resetting Alpha Hunter at $root -ForegroundColor Yellow
Start-Sleep -Seconds 2

# -------------------------------
# 1️⃣ package.json
# -------------------------------
@'
{
  name alpha-hunter,
  version 1.0.0,
  private true,
  type module,
  scripts {
    dev tsx watch srcindex.ts,
    start tsx srcindex.ts,
    live tsx srclive-trader-24-7.ts
  },
  dependencies {
    dotenv ^16.3.1
  },
  devDependencies {
    @typesnode ^20.10.0,
    tsx ^4.21.0,
    typescript ^5.3.0
  }
}
'@  Set-Content -Encoding UTF8 $rootpackage.json

# -------------------------------
# 2️⃣ tsconfig.json
# -------------------------------
@'
{
  compilerOptions {
    target ES2022,
    module ESNext,
    moduleResolution Node,
    lib [ES2022],
    strict true,
    esModuleInterop true,
    resolveJsonModule true,
    skipLibCheck true,
    noEmit true,
    types [node]
  },
  include [src.ts]
}
'@  Set-Content -Encoding UTF8 $roottsconfig.json

# -------------------------------
# 3️⃣ Ensure src folder
# -------------------------------
New-Item -ItemType Directory -Force -Path $rootsrc  Out-Null

# -------------------------------
# 4️⃣ srcindex.ts
# -------------------------------
@'

  FILE srcindex.ts
  PURPOSE Core TradingBot logic (imported by live trader)
 

export interface Market {
  id string
  venue kalshi  crypto
  price number
}

export interface Position {
  id string
  venue kalshi  crypto
  stake number
  entryPrice number
  openedAt number
}

import { KalshiAPI } from .kalshi
import { CoinbaseAPI } from .coinbase

export class TradingBot {
  private kalshi = new KalshiAPI()
  private coinbase = new CoinbaseAPI()

  private running = false
  private readonly INTERVAL = 60_000
  private openPositions = new Mapstring, Position()

  async start() {
    if (this.running) return
    this.running = true
    console.log(🚀 TradingBot started)
    while (this.running) {
      try {
        await this.cycle()
      } catch (err) {
        console.error(Cycle error, err)
      }
      await this.sleep(this.INTERVAL)
    }
  }

  stop() {
    this.running = false
  }

  private async cycle() {
    console.log(⏱️  Cycle tick, new Date().toISOString())
    const markets = await this.kalshi.getActiveMarkets()
    for (const m of markets) {
      if (this.openPositions.has(m.ticker)) continue
      const stake = 100  placeholder stake
      await this.kalshi.placeOrder(m.ticker, stake)
      this.openPositions.set(m.ticker, {
        id m.ticker,
        venue kalshi,
        stake,
        entryPrice m.yes_price  100,
        openedAt Date.now()
      })
    }
  }

  private sleep(ms number) {
    return new Promise(res = setTimeout(res, ms))
  }
}

if (import.meta.url === `file${process.argv[1]}`) {
  new TradingBot().start()
}
'@  Set-Content -Encoding UTF8 $rootsrcindex.ts

# -------------------------------
# 5️⃣ srclive-trader-24-7.ts
# -------------------------------
@'

  FILE srclive-trader-24-7.ts
  PURPOSE 247 supervisor that restarts TradingBot on crash
 
import { TradingBot } from .index

const RESTART_DELAY = 10_000
let running = true

function log(msg string) {
  console.log(`[LIVE] ${new Date().toISOString()} ${msg}`)
}

async function run() {
  while (running) {
    const bot = new TradingBot()
    try {
      log(Starting TradingBot)
      await bot.start()
      log(Bot exited cleanly)
    } catch (err) {
      log(`Bot crashed ${(err as Error).message}`)
    }

    if (!running) break
    log(`Restarting in ${RESTART_DELAY1000}s`)
    await sleep(RESTART_DELAY)
  }
}

process.on(SIGINT, () = {
  log(SIGINT received, shutting down)
  running = false
})

process.on(SIGTERM, () = {
  log(SIGTERM received, shutting down)
  running = false
})

function sleep(ms number) {
  return new Promise(res = setTimeout(res, ms))
}

run()
'@  Set-Content -Encoding UTF8 $rootsrclive-trader-24-7.ts

# -------------------------------
# 6️⃣ srckalshi.ts (placeholder API)
# -------------------------------
@'

  FILE srckalshi.ts
  PURPOSE Placeholder Kalshi API
 
export class KalshiAPI {
  async getActiveMarkets() {
    return [
      { ticker TEST-MKT-1, yes_price 50, volume 1000 },
      { ticker TEST-MKT-2, yes_price 70, volume 500 }
    ]
  }

  async placeOrder(ticker string, stake number) {
    console.log(`Placing Kalshi order ${ticker} for $${stake}`)
  }
}
'@  Set-Content -Encoding UTF8 $rootsrckalshi.ts

# -------------------------------
# 7️⃣ srccoinbase.ts (placeholder API)
# -------------------------------
@'

  FILE srccoinbase.ts
  PURPOSE Placeholder Coinbase API
 
export class CoinbaseAPI {
  async getActiveMarkets() {
    return [
      { product_id BTC-USD, price 30000 },
      { product_id ETH-USD, price 2000 }
    ]
  }

  async placeOrder(product_id string, stake number) {
    console.log(`Placing Coinbase order ${product_id} for $${stake}`)
  }
}
'@  Set-Content -Encoding UTF8 $rootsrccoinbase.ts

Write-Host ✅ Alpha Hunter full reset complete. -ForegroundColor Green
Write-Host Next steps -ForegroundColor Cyan
Write-Host   cd Ccevict-liveappsalpha-hunter
Write-Host   npm install
Write-Host   npm run dev
Write-Host   npm run live
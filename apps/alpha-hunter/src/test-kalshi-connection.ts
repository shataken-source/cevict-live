import { KalshiLiquidityProvider } from './services/kalshi/order-manager'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function testKalshiConnection() {
  console.log('========================================')
  console.log('KALSHI CONNECTION TEST')
  console.log('========================================\n')

  const provider = new KalshiLiquidityProvider()

  // Try to get order book for a known market
  const testTicker = 'KXMVNBA-TEST1'
  console.log(`Testing order book fetch for: ${testTicker}`)

  try {
    const orderBook = await provider.getOrderBook(testTicker)
    if (orderBook) {
      console.log('✅ Successfully connected to Kalshi API!')
      console.log('Order book:', JSON.stringify(orderBook, null, 2))
    } else {
      console.log('⚠️ No order book returned (simulation mode or no data)')
    }
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
  }

  provider.destroy()
}

testKalshiConnection().catch(console.error)

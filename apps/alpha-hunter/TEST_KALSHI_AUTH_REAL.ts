#!/usr/bin/env tsx
/**
 * TEST_KALSHI_AUTH_REAL.ts
 * Test using the actual KalshiTrader class to verify authentication
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { KalshiTrader } from './src/intelligence/kalshi-trader';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log(`\n🔍 KALSHI API AUTHENTICATION TEST (Using KalshiTrader Class)`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

async function testKalshiAuth() {
  console.log(`🔍 Initializing KalshiTrader...\n`);
  
  const trader = new KalshiTrader();
  
  // Wait a moment for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`🔍 Testing getBalance()...\n`);
  
  try {
    const balance = await trader.getBalance();
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`✅ AUTHENTICATION SUCCESSFUL!\n`);
    console.log(`📊 Balance Response:\n`);
    console.log(JSON.stringify(balance, null, 2));
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return true;
  } catch (err: any) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`❌ AUTHENTICATION FAILED!\n`);
    console.log(`Error: ${err.message}\n`);
    if (err.stack) {
      console.log(`Stack: ${err.stack}\n`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return false;
  }
}

// Run test
testKalshiAuth().then((success) => {
  process.exit(success ? 0 : 1);
});


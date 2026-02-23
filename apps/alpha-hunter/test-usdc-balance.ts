import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { CoinbaseExchange } from './src/exchanges/coinbase';

async function testUSDCBalance() {
  console.log('🧪 Testing Coinbase USDC Balance...\n');
  
  const coinbase = new CoinbaseExchange();
  
  if (!coinbase.isConfigured()) {
    console.log('❌ Coinbase not configured');
    return;
  }
  
  try {
    console.log('📡 Fetching accounts...');
    const accounts = await coinbase.getAccounts();
    
    console.log(`✅ Found ${accounts.length} accounts\n`);
    
    // Show USDC balance
    const usdc = accounts.find(a => a.currency === 'USDC');
    if (usdc) {
      console.log(`💵 USDC Balance: $${usdc.available.toFixed(2)}`);
      if (usdc.hold > 0) {
        console.log(`⏳ USDC Held: $${usdc.hold.toFixed(2)}`);
      }
    } else {
      console.log('⚠️ No USDC account found');
    }
    
    // Show USD balance for comparison
    const usd = accounts.find(a => a.currency === 'USD');
    if (usd) {
      console.log(`💵 USD Balance: $${usd.available.toFixed(2)}`);
    }
    
    // Show all accounts with balance
    console.log('\n📊 All Accounts:');
    for (const acc of accounts) {
      if (acc.available > 0.000001 || acc.hold > 0.000001) {
        console.log(`   ${acc.currency}: ${acc.available.toFixed(8)} available`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testUSDCBalance();

/**
 * UNIFIED TRADER
 * Runs both Crypto and Kalshi traders with shared fund management
 * Links both accounts through the UnifiedFundManager
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fundManager } from './fund-manager';

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          🤖 UNIFIED TRADING SYSTEM - ALPHA HUNTER 🤖             ║
║                                                                  ║
║     Linked Accounts: Coinbase (Crypto) + Kalshi (Predictions)    ║
║     Shared Fund Pool • Intelligent Allocation • Auto-Rebalance   ║
╚══════════════════════════════════════════════════════════════════╝
`);

console.log('📋 CONFIGURATION:');
console.log('   Kalshi API:', process.env.KALSHI_API_KEY_ID ? '✅ Configured' : '⚠️ Not set');
console.log('   Coinbase API:', process.env.COINBASE_API_KEY ? '✅ Configured' : '⚠️ Not set');
console.log('   Claude AI:', process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '⚠️ Not set');
console.log('');

// Set initial allocation (can be customized)
const kalshiAlloc = parseInt(process.env.KALSHI_ALLOCATION || '40');
const cryptoAlloc = parseInt(process.env.CRYPTO_ALLOCATION || '50');
const reserveAlloc = parseInt(process.env.RESERVE_ALLOCATION || '10');

fundManager.setAllocation(kalshiAlloc, cryptoAlloc, reserveAlloc);
console.log('💰 FUND ALLOCATION:');
console.log(`   Kalshi: ${kalshiAlloc}%`);
console.log(`   Crypto: ${cryptoAlloc}%`);
console.log(`   Reserve: ${reserveAlloc}%`);
console.log('');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('🚀 TO RUN BOTH TRADERS:');
console.log('');
console.log('   Terminal 1 (Crypto):');
console.log('   > cd apps/alpha-hunter && pnpm train');
console.log('');
console.log('   Terminal 2 (Kalshi):');
console.log('   > cd apps/alpha-hunter && pnpm kalshi');
console.log('');
console.log('Both traders share the same fund manager.');
console.log('If one platform is over-allocated, trades will be reduced/skipped.');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('📊 CURRENT FUND STATUS:');
console.log(fundManager.getStatus());
console.log('');

// Note: In a production system, you might run both traders in the same process
// using worker threads or async loops. For simplicity, they run separately
// but coordinate through the shared fund manager state.

console.log('💡 TIP: To change allocation, set env vars:');
console.log('   KALSHI_ALLOCATION=40');
console.log('   CRYPTO_ALLOCATION=50');
console.log('   RESERVE_ALLOCATION=10');
console.log('');



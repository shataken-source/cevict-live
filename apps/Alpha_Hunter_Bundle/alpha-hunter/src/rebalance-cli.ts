/**
 * REBALANCE CLI
 * Track and manage fund transfers between Coinbase and Kalshi
 *
 * Commands:
 *   npm run rebalance status   - Show current rebalance status
 *   npm run rebalance check    - Check if rebalance needed and create request
 *   npm run rebalance init <id> - Mark a rebalance as initiated
 *   npm run rebalance done <id> - Mark a rebalance as completed
 *   npm run rebalance cancel <id> - Cancel a rebalance request
 *   npm run rebalance history  - Show rebalance history
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
const rootDir = path.resolve(process.cwd(), '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

import { fundManager } from './fund-manager';
import { CoinbaseExchange } from './exchanges/coinbase';
import { KalshiTrader } from './intelligence/kalshi-trader';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const param = args[1];

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          💱 REBALANCE COMMAND CENTER 💱                      ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Fetch current balances from both platforms
  console.log('📡 Fetching current balances...\n');

  try {
    // Get Coinbase balance
    const coinbase = new CoinbaseExchange();
    const portfolio = await coinbase.getPortfolio();
    const cryptoValue = portfolio.positions.reduce((sum, p) => sum + p.value, 0);
    const usdBalance = portfolio.usdBalance;
    fundManager.updateCryptoBalance(usdBalance + cryptoValue * 0.95, cryptoValue * 0.05); // Assume 95% liquid
    console.log(`   💰 Coinbase: $${(usdBalance + cryptoValue).toFixed(2)} (USD: $${usdBalance.toFixed(2)}, Crypto: $${cryptoValue.toFixed(2)})`);
  } catch (e) {
    console.log('   ⚠️ Could not fetch Coinbase balance');
  }

  try {
    // Get Kalshi balance
    const kalshi = new KalshiTrader();
    const kalshiBalance = await kalshi.getBalance();
    fundManager.updateKalshiBalance(kalshiBalance, 0);
    console.log(`   🎯 Kalshi: $${kalshiBalance.toFixed(2)}`);
  } catch (e) {
    console.log('   ⚠️ Could not fetch Kalshi balance');
  }

  console.log('');

  switch (command.toLowerCase()) {
    case 'status':
      console.log(fundManager.getStatus());
      console.log(fundManager.showRebalanceStatus());
      break;

    case 'check':
      console.log('🔍 Checking if rebalance is needed...\n');
      const request = fundManager.checkAndCreateRebalance();
      if (request) {
        console.log(`\n✅ Rebalance request created: ${request.id}`);
        console.log(`\n📋 NEXT STEPS:`);
        console.log(`   1. Go to ${request.from === 'crypto' ? 'Coinbase' : 'Kalshi'}`);
        console.log(`   2. Withdraw $${request.amount.toFixed(2)} to your bank`);
        console.log(`   3. Run: npm run rebalance init ${request.id}`);
        console.log(`   4. After funds arrive in bank, deposit to ${request.to === 'crypto' ? 'Coinbase' : 'Kalshi'}`);
        console.log(`   5. Run: npm run rebalance done ${request.id}`);
      } else {
        console.log('✅ No rebalance needed - allocations are balanced!');
      }
      break;

    case 'init':
    case 'initiate':
      if (!param) {
        console.log('❌ Please provide rebalance ID: npm run rebalance init <id>');
        const pending = fundManager.getPendingRebalances();
        if (pending.length > 0) {
          console.log('\n📋 Pending rebalances:');
          pending.forEach(r => console.log(`   - ${r.id}`));
        }
        break;
      }
      fundManager.initiateRebalance(param);
      console.log(`\n📋 REMINDER: After bank transfer completes (~3-5 days):`);
      console.log(`   npm run rebalance done ${param}`);
      break;

    case 'done':
    case 'complete':
      if (!param) {
        console.log('❌ Please provide rebalance ID: npm run rebalance done <id>');
        const initiated = fundManager.getPendingRebalances().filter(r => r.status === 'initiated');
        if (initiated.length > 0) {
          console.log('\n📋 Initiated rebalances:');
          initiated.forEach(r => console.log(`   - ${r.id}`));
        }
        break;
      }
      fundManager.completeRebalance(param);
      console.log('\n🎉 Rebalance completed! Your allocations should now be balanced.');
      break;

    case 'cancel':
      if (!param) {
        console.log('❌ Please provide rebalance ID: npm run rebalance cancel <id>');
        break;
      }
      const reason = args.slice(2).join(' ') || undefined;
      fundManager.cancelRebalance(param, reason);
      break;

    case 'history':
      const history = fundManager.getRebalanceHistory();
      if (history.length === 0) {
        console.log('📋 No rebalance history yet.');
      } else {
        console.log('📋 REBALANCE HISTORY:');
        console.log('─'.repeat(60));
        for (const req of history) {
          const fromName = req.from === 'kalshi' ? 'Kalshi' : 'Coinbase';
          const toName = req.to === 'kalshi' ? 'Kalshi' : 'Coinbase';
          const statusEmojiMap: Record<string, string> = {
            pending: '⏳',
            initiated: '🔄',
            completed: '✅',
            cancelled: '❌'
          };
          const statusEmoji = statusEmojiMap[req.status] || '❓';
          console.log(`${statusEmoji} ${req.id}`);
          console.log(`   $${req.amount.toFixed(2)} from ${fromName} → ${toName}`);
          console.log(`   Status: ${req.status.toUpperCase()} | Created: ${req.createdAt.toLocaleString()}`);
          if (req.completedAt) console.log(`   Completed: ${req.completedAt.toLocaleString()}`);
          if (req.notes) console.log(`   Notes: ${req.notes}`);
          console.log('');
        }
      }
      break;

    case 'help':
    default:
      console.log(`
📖 REBALANCE COMMANDS:

  npm run rebalance status    Show current balances and pending rebalances
  npm run rebalance check     Check if rebalance needed, create request
  npm run rebalance init <id> Mark transfer as started (you withdrew funds)
  npm run rebalance done <id> Mark transfer as completed (funds arrived)
  npm run rebalance cancel <id> [reason]  Cancel a pending rebalance
  npm run rebalance history   Show all rebalance history

📋 TYPICAL WORKFLOW:

  1. npm run rebalance check
     → Creates rebalance request if needed

  2. Manually withdraw from source platform

  3. npm run rebalance init rebal_xxxxx
     → Marks as "in transit"

  4. Wait for bank transfer (3-5 days)

  5. Deposit to destination platform

  6. npm run rebalance done rebal_xxxxx
     → Marks as completed
      `);
      break;
  }
}

main().catch(console.error);


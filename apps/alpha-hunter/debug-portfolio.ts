import 'dotenv/config';
import './src/lib/load-env';
import { CoinbaseExchange } from './src/exchanges/coinbase';

const cb = new CoinbaseExchange();

async function main() {
  // Use the raw request method to see full account data
  const accounts = await cb.getAccounts();
  const withBal = accounts.filter(a => a.available > 0.000001 || a.hold > 0.000001);

  let totalAvail = 0;
  let totalHold = 0;
  const stablecoins = ['USDC', 'DAI', 'USDT', 'GUSD', 'PAX', 'BUSD', 'USD'];

  for (const a of withBal) {
    if (stablecoins.includes(a.currency)) {
      totalAvail += a.available;
      totalHold += a.hold;
      console.log(`${a.currency}: avail=$${a.available.toFixed(2)} hold=$${a.hold.toFixed(2)}`);
    } else {
      try {
        const t = await cb.getTicker(`${a.currency}-USD`);
        const av = a.available * t.price;
        const hv = a.hold * t.price;
        totalAvail += av;
        totalHold += hv;
        if (av > 0.01 || hv > 0.01) {
          console.log(`${a.currency}: ${a.available.toFixed(6)} @ $${t.price} = avail=$${av.toFixed(2)} hold=$${hv.toFixed(2)}`);
        }
      } catch {
        // Try USDC pair
        try {
          const t2 = await cb.getTicker(`${a.currency}-USDC`);
          const av2 = a.available * t2.price;
          totalAvail += av2;
          if (av2 > 0.01) {
            console.log(`${a.currency}: ${a.available.toFixed(6)} @ $${t2.price} = avail=$${av2.toFixed(2)} (via USDC)`);
          }
        } catch {
          console.log(`${a.currency}: DELISTED (${a.available} tokens, no price)`);
        }
      }
    }
  }

  console.log('\n========================================');
  console.log(`Total Available: $${totalAvail.toFixed(2)}`);
  console.log(`Total Held:      $${totalHold.toFixed(2)}`);
  console.log(`GRAND TOTAL:     $${(totalAvail + totalHold).toFixed(2)}`);
  console.log('========================================');
  
  // Now also check via getPortfolio method
  console.log('\nPortfolio method result:');
  const p = await cb.getPortfolio();
  console.log(`  usdBalance: $${p.usdBalance.toFixed(2)}`);
  console.log(`  positions: ${p.positions.length}`);
  console.log(`  totalValue: $${p.totalValue.toFixed(2)}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

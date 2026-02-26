import 'dotenv/config';
import './src/lib/load-env';
import { CoinbaseExchange } from './src/exchanges/coinbase';

const cb = new CoinbaseExchange() as any;

(async () => {
  // Get portfolio ID from accounts
  const acctData = await cb.request('GET', '/accounts', undefined, { limit: '5' });
  const portfolioId = acctData.accounts?.[0]?.retail_portfolio_id;
  console.log('Portfolio ID:', portfolioId);

  if (portfolioId) {
    const data = await cb.request('GET', `/portfolios/${portfolioId}`);
    const positions = data.breakdown?.spot_positions || [];
    let total = 0;
    console.log('\n=== FULL PORTFOLIO BREAKDOWN ===');
    for (const p of positions) {
      const fiat = parseFloat(p.total_balance_fiat || '0');
      if (fiat > 0.01) {
        total += fiat;
        const type = p.account_type || '';
        const tag = type.includes('STAKED') ? ' [STAKED]' : (p.is_cash ? ' [CASH]' : '');
        console.log(`  ${p.asset.padEnd(8)} $${fiat.toFixed(2).padStart(10)}  ${tag}`);
      }
    }
    console.log('─'.repeat(35));
    console.log(`  TOTAL:   $${total.toFixed(2)}`);
  }
})().then(() => process.exit(0));

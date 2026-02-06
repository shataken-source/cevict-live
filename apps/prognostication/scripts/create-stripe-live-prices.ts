/**
 * Create Prognostication subscription products and prices in Stripe LIVE mode.
 * Run once with your LIVE secret key to mirror test setup in production.
 *
 * Usage (from apps/prognostication):
 *   npx tsx scripts/create-stripe-live-prices.ts
 *
 * Loads STRIPE_SECRET_KEY from .env.local (or set it in the shell).
 * Uses LIVE mode only – ensure your key is sk_live_... not sk_test_...
 *
 * Output: the 4 price IDs and set-secret commands to add to KeyVault, then run sync-env.
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local into process.env
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const value = match[2].replace(/^["']|["']$/g, '').trim();
      process.env[match[1]] = value;
    }
  }
}

loadEnvLocal();

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Set it in .env.local or the environment.');
  process.exit(1);
}
if (secretKey.startsWith('sk_test_')) {
  console.error('This script is for LIVE mode. Your key is sk_test_... Switch to sk_live_... in Stripe Dashboard → Developers → API keys.');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2025-12-15.clover' });

const PRICES = [
  { productName: 'Prognostication Pro', nickname: 'Pro Weekly', unitAmount: 900, interval: 'week' as const, envKey: 'NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID' },
  { productName: 'Prognostication Pro', nickname: 'Pro Monthly', unitAmount: 1900, interval: 'month' as const, envKey: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID' },
  { productName: 'Prognostication Elite', nickname: 'Elite Weekly', unitAmount: 2900, interval: 'week' as const, envKey: 'NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID' },
  { productName: 'Prognostication Elite', nickname: 'Elite Monthly', unitAmount: 4900, interval: 'month' as const, envKey: 'NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID' },
];

async function main() {
  const productIds: Record<string, string> = {};
  const created: { envKey: string; priceId: string }[] = [];

  for (const row of PRICES) {
    if (!productIds[row.productName]) {
      const product = await stripe.products.create({
        name: row.productName,
        description: row.nickname,
      });
      productIds[row.productName] = product.id;
      console.log(`Created product: ${row.productName} (${product.id})`);
    }

    const price = await stripe.prices.create({
      product: productIds[row.productName],
      unit_amount: row.unitAmount,
      currency: 'usd',
      recurring: { interval: row.interval },
      nickname: row.nickname,
    });

    created.push({ envKey: row.envKey, priceId: price.id });
    console.log(`Created price: ${row.nickname} -> ${price.id}`);
  }

  console.log('\n--- Env vars (add to KeyVault store or run these): ---\n');
  for (const { envKey, priceId } of created) {
    console.log(`${envKey}=${priceId}`);
  }
  console.log('\n--- PowerShell set-secret commands (from C:\\cevict-live\\scripts\\keyvault): ---\n');
  for (const { envKey, priceId } of created) {
    console.log(`.\\set-secret.ps1 -Name "${envKey}" -Value "${priceId}"`);
  }
  console.log('\nThen: .\\sync-env.ps1 -AppPath "C:\\cevict-live\\apps\\prognostication"');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import 'dotenv/config';
import './src/lib/load-env';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log('Creating alpha_hunter_trades table...');
  const { error: e1 } = await sb.from('alpha_hunter_trades').select('id').limit(1);
  if (e1 && e1.message.includes('does not exist')) {
    // Table doesn't exist — need to create via SQL editor in Supabase dashboard
    console.log('⚠️  Table does not exist yet.');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log(`CREATE TABLE alpha_hunter_trades (
  id TEXT PRIMARY KEY,
  pair TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  size NUMERIC NOT NULL,
  usd_value NUMERIC NOT NULL,
  profit NUMERIC,
  profit_percent NUMERIC,
  reason TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed BOOLEAN NOT NULL DEFAULT false,
  take_profit_price NUMERIC,
  stop_loss_price NUMERIC,
  platform TEXT NOT NULL DEFAULT 'coinbase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alpha_trades_open ON alpha_hunter_trades (closed, platform) WHERE closed = false;

CREATE TABLE alpha_hunter_accounts (
  id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`);
  } else if (e1) {
    console.log('Error checking table:', e1.message);
  } else {
    console.log('✅ alpha_hunter_trades table already exists');
  }

  console.log('\nChecking alpha_hunter_accounts...');
  const { error: e2 } = await sb.from('alpha_hunter_accounts').select('id').limit(1);
  if (e2 && e2.message.includes('does not exist')) {
    console.log('⚠️  alpha_hunter_accounts does not exist — see SQL above');
  } else if (e2) {
    console.log('Error:', e2.message);
  } else {
    console.log('✅ alpha_hunter_accounts table already exists');
  }
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

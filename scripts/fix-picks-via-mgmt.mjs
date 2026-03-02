// Try to fix picks table via Supabase Management API (requires service_role or project ref)
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;

// Extract project ref from URL (e.g. https://abcdefgh.supabase.co -> abcdefgh)
const projectRef = SB_URL.replace('https://', '').split('.')[0];
console.log(`Project ref: ${projectRef}`);

// Check if we have a Supabase access token (management API)
const sbAccessToken = secrets.SUPABASE_ACCESS_TOKEN || secrets.SUPABASE_TOKEN || secrets.SB_ACCESS_TOKEN;

if (sbAccessToken) {
  console.log('Found Supabase access token, using Management API...');
  try {
    const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sbAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: "ALTER TABLE picks ALTER COLUMN pick_value DROP NOT NULL;" }),
    });
    const body = await r.text();
    console.log(`Management API: HTTP ${r.status} ${body.substring(0, 300)}`);
  } catch (e) { console.error('ERROR:', e.message); }
} else {
  console.log('No Supabase access token found. Trying alternative approach...');
  
  // Try using the pg_net extension or rpc if available
  // Alternative: use PostgREST rpc call if there's an exec_sql function
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  
  // Check if there's a run_sql rpc
  for (const fn of ['exec_sql', 'run_sql', 'execute_sql', 'sql']) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({ query: "SELECT 1" }),
      });
      if (r.ok || r.status !== 404) {
        console.log(`  RPC ${fn}: HTTP ${r.status}`);
      }
    } catch { }
  }
  
  console.log('\n  No RPC available. You need to run this SQL in the Supabase Dashboard SQL Editor:');
  console.log('');
  console.log('  ALTER TABLE picks ALTER COLUMN pick_value DROP NOT NULL;');
  console.log('');
  console.log(`  Dashboard: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
}

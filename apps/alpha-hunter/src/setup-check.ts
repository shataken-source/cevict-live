/**
 * Alpha Hunter Setup Check
 * Run this first to ensure environment is ready
 */

import { existsSync } from 'fs';
import { join } from 'path';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PROGNO_BASE_URL',
];

export function checkSetup(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check node_modules
  if (!existsSync(join(process.cwd(), 'node_modules'))) {
    issues.push('❌ node_modules missing - run: npm install');
  }

  // Check .env.local
  if (!existsSync(join(process.cwd(), '.env.local'))) {
    issues.push('❌ .env.local missing - copy from .env.example and configure');
  }

  // Check required env vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      issues.push(`❌ Missing env var: ${envVar}`);
    }
  }

  // Check migrations folder exists
  if (!existsSync(join(process.cwd(), 'migrations'))) {
    issues.push('⚠️ migrations folder missing - SQL fixes consolidated there');
  }

  return { ok: issues.length === 0, issues };
}

export function printSetupStatus(): void {
  const { ok, issues } = checkSetup();
  
  if (ok) {
    console.log('✅ Alpha Hunter setup complete and ready');
  } else {
    console.log('\n🔧 Setup Issues Found:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n💡 Run these commands to fix:\n');
    console.log('  npm install');
    console.log('  cp .env.example .env.local  # Then edit with your keys');
    console.log('  npm run health              # Verify Supabase connection\n');
    process.exit(1);
  }
}

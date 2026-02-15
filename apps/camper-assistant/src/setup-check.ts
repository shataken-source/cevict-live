/**
 * Camper Assistant Setup Check
 * Validates environment and dependencies before starting
 */

import { existsSync } from 'fs';
import { join } from 'path';

const REQUIRED_ENV_VARS: string[] = [
  // Add any API keys here when needed
  // 'OPENWEATHER_API_KEY',
  // 'GOOGLE_MAPS_API_KEY',
];

export function checkSetup(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check node_modules
  if (!existsSync(join(process.cwd(), 'node_modules'))) {
    issues.push('❌ node_modules missing - run: npm install');
  }

  // Check .env.local (optional for now)
  // if (!existsSync(join(process.cwd(), '.env.local'))) {
  //   issues.push('⚠️ .env.local not found - copy from .env.example');
  // }

  // Check required env vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      issues.push(`⚠️ Missing env var: ${envVar} (some features may not work)`);
    }
  }

  return { ok: issues.length === 0, issues };
}

export function printSetupStatus(): void {
  const { ok, issues } = checkSetup();

  if (ok) {
    console.log('✅ Camper Assistant setup complete');
  } else {
    console.log('\n🔧 Setup Notes:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
  }
}

// Auto-run check
printSetupStatus();

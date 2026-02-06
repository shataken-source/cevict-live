#!/usr/bin/env tsx
/**
 * Daily Law Update Script
 * 
 * This script updates the last_updated_at field for all laws in the database.
 * Run this daily via cron job or scheduled task.
 * 
 * Usage:
 *   tsx scripts/daily-law-update.ts
 * 
 * Or set up a cron job:
 *   0 2 * * * cd /path/to/apps/smokersrights && tsx scripts/daily-law-update.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local first (if exists), then .env
// This matches Next.js behavior and ensures env vars are loaded before imports
const envLocal = path.join(process.cwd(), '.env.local');
const envFile = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
  console.log('📄 Loaded .env.local');
} else if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
  console.log('📄 Loaded .env');
} else {
  console.warn('⚠️  No .env.local or .env file found - using process.env only');
}

// Also load dotenv/config as fallback (loads from current directory)
dotenv.config();

import { LawUpdateService } from '../lib/bot/lawUpdateService';

async function main() {
  console.log('🔄 Starting daily law update...');
  console.log(`📅 Date: ${new Date().toLocaleString()}`);

  // Debug: Check if service role key is set (don't log the actual key)
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log(`🔑 Service role key: ${hasServiceKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`🔑 Anon key: ${hasAnonKey ? '✅ Set' : '⚠️  Not set (not needed for updates)'}`);

  if (!hasServiceKey) {
    console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is required for updating laws.');
    console.error('   The anon key cannot update data - it only has read permissions.');
    console.error('   Get your service role key from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }

  try {
    const lawUpdateService = new LawUpdateService();
    const result = await lawUpdateService.updateLawDates();

    if (result.errors.length > 0) {
      console.error('❌ Errors occurred:');
      result.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    console.log(`✅ Successfully updated ${result.updated} laws`);
    console.log(`📊 Total checked: ${result.totalChecked}`);
    console.log(`⏰ Completed at: ${result.timestamp.toLocaleString()}`);

    // Check for stale laws
    const staleLaws = await lawUpdateService.checkStaleLaws();
    if (staleLaws.length > 0) {
      console.warn(`⚠️  Warning: ${staleLaws.length} laws haven't been updated in 7+ days:`);
      staleLaws.slice(0, 5).forEach(law => console.warn(`   - ${law}`));
      if (staleLaws.length > 5) {
        console.warn(`   ... and ${staleLaws.length - 5} more`);
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

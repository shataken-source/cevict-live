#!/usr/bin/env tsx
/**
 * Verify Setup Script
 * 
 * This script verifies that the SmokersRights setup is complete and working.
 * 
 * Usage:
 *   tsx scripts/verify-setup.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local first (if exists), then .env
const envLocal = path.join(process.cwd(), '.env.local');
const envFile = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
} else if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
}

// Also load dotenv/config as fallback
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface VerificationResult {
  check: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

async function main() {
  console.log('🔍 Verifying SmokersRights Setup...\n');

  const results: VerificationResult[] = [];

  // Check environment variables
  if (!supabaseUrl) {
    results.push({
      check: 'Environment Variables',
      status: '❌',
      message: 'NEXT_PUBLIC_SUPABASE_URL not set',
    });
  } else if (!supabaseKey) {
    results.push({
      check: 'Environment Variables',
      status: '❌',
      message: 'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY not set',
    });
  } else {
    results.push({
      check: 'Environment Variables',
      status: '✅',
      message: 'All required env vars are set',
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Cannot continue - missing environment variables\n');
    printResults(results);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check database connection
  try {
    const { error } = await supabase.from('laws').select('id').limit(1);
    if (error) {
      results.push({
        check: 'Database Connection',
        status: '❌',
        message: `Cannot connect: ${error.message}`,
      });
    } else {
      results.push({
        check: 'Database Connection',
        status: '✅',
        message: 'Successfully connected to Supabase',
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Database Connection',
      status: '❌',
      message: `Error: ${error.message}`,
    });
  }

  // Check laws table
  try {
    const { data, error } = await supabase
      .from('laws')
      .select('id, last_updated_at')
      .limit(5);

    if (error) {
      results.push({
        check: 'Laws Table',
        status: '❌',
        message: `Error: ${error.message}`,
      });
    } else {
      const count = data?.length || 0;
      const recentUpdates = data?.filter(law => {
        if (!law.last_updated_at) return false;
        const updated = new Date(law.last_updated_at);
        const daysAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo < 7;
      }).length || 0;

      if (count === 0) {
        results.push({
          check: 'Laws Table',
          status: '⚠️',
          message: 'No laws found in database',
        });
      } else {
        results.push({
          check: 'Laws Table',
          status: '✅',
          message: `Found ${count}+ laws, ${recentUpdates} updated in last 7 days`,
        });
      }
    }
  } catch (error: any) {
    results.push({
      check: 'Laws Table',
      status: '❌',
      message: `Error: ${error.message}`,
    });
  }

  // Check products table
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, active')
      .eq('active', true)
      .limit(10);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        results.push({
          check: 'Products Table',
          status: '⚠️',
          message: 'Products table does not exist - run migrations first',
        });
      } else {
        results.push({
          check: 'Products Table',
          status: '❌',
          message: `Error: ${error.message}`,
        });
      }
    } else {
      const count = data?.length || 0;
      if (count === 0) {
        results.push({
          check: 'Products Table',
          status: '⚠️',
          message: 'No active products found - run: npm run populate-products',
        });
      } else {
        const categories = Array.from(new Set(data?.map(p => (p as any).category) || []));
        results.push({
          check: 'Products Table',
          status: '✅',
          message: `Found ${count} active products in ${categories.length} categories`,
        });
      }
    }
  } catch (error: any) {
    results.push({
      check: 'Products Table',
      status: '❌',
      message: `Error: ${error.message}`,
    });
  }

  // Check scripts
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const scripts = [
      'scripts/daily-law-update.ts',
      'scripts/populate-products.ts',
    ];

    const missingScripts = scripts.filter(script => {
      const fullPath = path.join(process.cwd(), script);
      return !fs.existsSync(fullPath);
    });

    if (missingScripts.length > 0) {
      results.push({
        check: 'Scripts',
        status: '❌',
        message: `Missing: ${missingScripts.join(', ')}`,
      });
    } else {
      results.push({
        check: 'Scripts',
        status: '✅',
        message: 'All scripts present',
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Scripts',
      status: '⚠️',
      message: `Could not verify: ${error.message}`,
    });
  }

  // Print results
  printResults(results);

  // Summary
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warnings = results.filter(r => r.status === '⚠️').length;

  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Setup incomplete - please fix the issues above');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  Setup mostly complete - review warnings above');
    process.exit(0);
  } else {
    console.log('\n✅ Setup complete! Everything looks good.');
    process.exit(0);
  }
}

function printResults(results: VerificationResult[]) {
  results.forEach(result => {
    console.log(`${result.status} ${result.check}: ${result.message}`);
  });
}

main();

#!/usr/bin/env tsx
/**
 * Check Environment Variables
 * 
 * Quick script to verify Supabase configuration without exposing secrets
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocal = path.join(process.cwd(), '.env.local');
const envFile = path.join(process.cwd(), '.env');

// Load env files
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
} else if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: false });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Current Supabase Configuration:\n');

console.log('URL:');
if (supabaseUrl) {
  const isCorrect = supabaseUrl.includes('rdbuwyefbgnbuhmjrizo');
  console.log(`   ${isCorrect ? '✅' : '❌'} ${supabaseUrl}`);
  if (!isCorrect) {
    console.log('   ⚠️  Should be: https://rdbuwyefbgnbuhmjrizo.supabase.co');
    console.log('   (This matches your Supabase dashboard Project ID)');
  }
} else {
  console.log('   ❌ Not set');
}

console.log('\nService Role Key:');
if (serviceKey) {
  const length = serviceKey.length;
  const format = serviceKey.startsWith('sb_secret_') ? 'New format (sb_secret_)' : 
                 serviceKey.startsWith('eyJ') ? 'Legacy JWT format' : 
                 'Unknown format';
  console.log(`   ✅ Set (${length} characters, ${format})`);
  if (serviceKey.startsWith('sb_secret_')) {
    // New format keys are typically shorter
    if (length < 50) {
      console.log('   ⚠️  Warning: Seems too short');
    }
  } else if (serviceKey.startsWith('eyJ')) {
    // Old JWT format should be 200+ chars
    if (length < 100) {
      console.log('   ⚠️  Warning: Seems too short (should be 200+ chars for JWT format)');
    }
  }
} else {
  console.log('   ❌ Not set (required for law updates)');
}

console.log('\nAnon Key:');
if (anonKey) {
  console.log(`   ✅ Set (${anonKey.length} characters)`);
} else {
  console.log('   ⚠️  Not set (optional, used for frontend)');
}

// CRITICAL: Check if keys are identical (security vulnerability)
if (serviceKey && anonKey) {
  console.log('\n🔒 Security Check:');
  if (serviceKey === anonKey) {
    console.log('   🚨 CRITICAL: Service role key and anon key are IDENTICAL!');
    console.log('   ⚠️  This is a security vulnerability. Regenerate service_role key in Supabase.');
    console.log('   📖 See: CRITICAL_KEY_MISMATCH.md for instructions');
  } else {
    const servicePrefix = serviceKey.substring(0, 30);
    const anonPrefix = anonKey.substring(0, 30);
    
    // Check for new Supabase format (sb_publishable_ vs sb_secret_)
    const isNewFormat = serviceKey.startsWith('sb_secret_') && anonKey.startsWith('sb_publishable_');
    const isOldFormat = serviceKey.startsWith('eyJ') && anonKey.startsWith('eyJ');
    
    console.log(`   ✅ Keys are different (good)`);
    if (isNewFormat) {
      console.log(`   Format: New Supabase format (sb_*)`);
    } else if (isOldFormat) {
      console.log(`   Format: Legacy JWT format (eyJ*)`);
    }
    console.log(`   Service prefix: ${servicePrefix}...`);
    console.log(`   Anon prefix:    ${anonPrefix}...`);
  }
}

console.log('\n📝 To update:');
console.log('   1. Edit apps/smokersrights/.env.local');
console.log('   2. Set NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co');
console.log('   3. Get service_role key from: Dashboard > Settings > API');
console.log('   4. Ensure SUPABASE_SERVICE_ROLE_KEY is set (200+ chars)');
console.log('   5. ⚠️  If keys match, see CRITICAL_KEY_MISMATCH.md');

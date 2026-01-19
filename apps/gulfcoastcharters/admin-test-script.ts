/**
 * ADMIN TEST SCRIPT
 * 
 * This script tests all admin functionality including user management,
 * analytics, and system administration features.
 * 
 * Usage:
 * 1. Set your admin credentials below
 * 2. Run: npx ts-node tests/admin-test-script.ts
 * 3. Review console output for pass/fail results
 */

import { createClient } from '@supabase/supabase-js';

// ===== TEST CONFIGURATION =====
// Replace these with your test admin credentials
const TEST_CONFIG = {
  ADMIN_EMAIL: 'admin@test.com',
  ADMIN_PASSWORD: 'TestAdmin123!',
  SUPABASE_URL: 'https://xzdzmeaxbjvntuqeommq.databasepad.com',
  SUPABASE_KEY: 'your_anon_key_here'
};

// Initialize client
const supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_KEY);

// Test results tracker
let passed = 0;
let failed = 0;

const log = (test: string, success: boolean, details?: string) => {
  const status = success ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test}`);
  if (details) console.log(`  → ${details}`);
  if (success) {
    passed++;
  } else {
    failed++;
  }
};


// ===== TEST SUITE =====

async function runAdminTests() {
  console.log('\n🧪 ADMIN TEST SUITE\n');
  
  try {
    // Test 1: Admin Login
    console.log('Test 1: Admin Authentication');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.ADMIN_EMAIL,
      password: TEST_CONFIG.ADMIN_PASSWORD,
    });
    log('Admin login', !authError && !!authData.user, authError?.message);
    
    if (authError) {
      console.log('\n❌ Cannot proceed without admin authentication');
      return;
    }

    // Test 2: Check Admin Role
    console.log('\nTest 2: Role Verification');
    const role = authData.user?.user_metadata?.role;
    log('Admin role assigned', role === 'admin', `Role: ${role}`);

    // Test 3: User Management Access
    console.log('\nTest 3: User Management');
    const { data: users, error: usersError } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'list_users' }
    });
    log('Fetch all users', !usersError, usersError?.message);

    // Test 4: Analytics Access
    console.log('\nTest 4: Analytics Dashboard');
    const { data: profiles } = await supabase.from('profiles').select('*');
    log('Access analytics data', !!profiles, `Found ${profiles?.length || 0} profiles`);

    // Test 5: Password Reset Function
    console.log('\nTest 5: Password Reset');
    const { error: resetError } = await supabase.functions.invoke('admin-user-management', {
      body: { 
        action: 'reset_password',
        data: { email: 'test@example.com' }
      }
    });
    log('Password reset capability', !resetError, resetError?.message);

    // Test 6: Account Management
    console.log('\nTest 6: Account Control');
    const { error: disableError } = await supabase.functions.invoke('admin-user-management', {
      body: { 
        action: 'toggle_account',
        data: { email: 'test@example.com', enabled: false }
      }
    });
    log('Account disable/enable', !disableError, disableError?.message);

  } catch (error: unknown) {
    log('Test execution', false, error instanceof Error ? error.message : 'Unknown error');

  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
}

runAdminTests();

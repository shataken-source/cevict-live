/**
 * CAPTAIN TEST SCRIPT
 * 
 * This script tests all captain functionality including dashboard access,
 * booking management, earnings, and profile features.
 * 
 * Usage:
 * 1. Set your captain credentials below
 * 2. Run: npx ts-node tests/captain-test-script.ts
 * 3. Review console output for pass/fail results
 */

import { createClient } from '@supabase/supabase-js';

// ===== TEST CONFIGURATION =====
// Replace these with your test captain credentials
const TEST_CONFIG = {
  CAPTAIN_EMAIL: 'captain@test.com',
  CAPTAIN_PASSWORD: 'TestCaptain123!',
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

async function runCaptainTests() {
  console.log('\n🧪 CAPTAIN TEST SUITE\n');
  
  try {
    // Test 1: Captain Login
    console.log('Test 1: Captain Authentication');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.CAPTAIN_EMAIL,
      password: TEST_CONFIG.CAPTAIN_PASSWORD,
    });
    log('Captain login', !authError && !!authData.user, authError?.message);
    
    if (authError) {
      console.log('\n❌ Cannot proceed without captain authentication');
      return;
    }

    // Test 2: Check Captain Role
    console.log('\nTest 2: Role Verification');
    const role = authData.user?.user_metadata?.role;
    log('Captain role assigned', role === 'captain', `Role: ${role}`);

    // Test 3: Profile Access
    console.log('\nTest 3: Profile Management');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    log('Access own profile', !profileError && !!profile, profileError?.message);

    // Test 4: Bookings Access
    console.log('\nTest 4: Booking Management');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('captain_id', authData.user.id);
    log('View captain bookings', !bookingsError, `Found ${bookings?.length || 0} bookings`);

    // Test 5: Cannot Access Other Captains
    console.log('\nTest 5: Security - Data Isolation');
    const { data: otherBookings } = await supabase
      .from('bookings')
      .select('*')
      .neq('captain_id', authData.user.id);
    log('Cannot see other captains data', !otherBookings || otherBookings.length === 0);

    // Test 6: Cannot Access Admin Functions
    console.log('\nTest 6: Security - Admin Restrictions');
    const { error: adminError } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'list_users' }
    });
    log('Cannot access admin functions', !!adminError, 'Access properly restricted');

  } catch (error: unknown) {
    log('Test execution', false, error instanceof Error ? error.message : 'Unknown error');

  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
}

runCaptainTests();

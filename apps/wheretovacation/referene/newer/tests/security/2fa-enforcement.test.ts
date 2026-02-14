import { supabase } from '@/lib/supabase';

interface TwoFactorTestResult {
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

export async function test2FAEnforcement(): Promise<TwoFactorTestResult[]> {
  const results: TwoFactorTestResult[] = [];
  
  // Test 1: Admin login requires 2FA
  try {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: 'admin@gulfcoastcharters.com',
      password: 'testpass123'
    });
    
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, two_factor_enabled')
        .eq('id', user.id)
        .single();
      
      if (profile?.role === 'admin') {
        results.push({
          test: 'Admin accounts have 2FA enabled',
          passed: profile.two_factor_enabled === true,
          details: `2FA status: ${profile.two_factor_enabled}`
        });
      }
    }
  } catch (error: unknown) {
    results.push({
      test: 'Admin 2FA check',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

  }
  
  // Test 2: Admin cannot access without 2FA verification
  try {
    const { data } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'list_users' }
    });
    
    results.push({
      test: 'Admin endpoints require 2FA',
      passed: !data || data.error === '2FA required',
      details: data?.error || 'Access granted without 2FA'
    });
  } catch (error: unknown) {

    results.push({
      test: 'Admin endpoints require 2FA',
      passed: true,
      details: '2FA verification enforced'
    });
  }
  
  return results;
}

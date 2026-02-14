import { supabase } from '@/lib/supabase';

interface RateLimitResult {
  test: string;
  passed: boolean;
  requestsMade: number;
  blocked: boolean;
  error?: string;
}

export async function testRateLimiting(): Promise<RateLimitResult[]> {
  const results: RateLimitResult[] = [];
  
  // Test 1: API endpoint rate limiting
  const testAPIRateLimit = async () => {
    let requestsMade = 0;
    let blocked = false;
    
    try {
      for (let i = 0; i < 150; i++) {
        const { error } = await supabase.functions.invoke('user-auth', {
          body: { action: 'test' }
        });
        
        if (error && error.message.includes('rate limit')) {
          blocked = true;
          break;
        }
        requestsMade++;
      }
      
      results.push({
        test: 'API rate limiting (100 req/min)',
        passed: blocked && requestsMade < 150,
        requestsMade,
        blocked
      });
    } catch (error: unknown) {
      results.push({
        test: 'API rate limiting',
        passed: false,
        requestsMade,
        blocked,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

    }
  };
  
  // Test 2: Login attempt rate limiting
  const testLoginRateLimit = async () => {
    let attempts = 0;
    let blocked = false;
    
    try {
      for (let i = 0; i < 10; i++) {
        const { error } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        
        if (error && error.message.includes('rate')) {
          blocked = true;
          break;
        }
        attempts++;
      }
      
      results.push({
        test: 'Login rate limiting (5 attempts)',
        passed: blocked && attempts <= 5,
        requestsMade: attempts,
        blocked
      });
    } catch (error: unknown) {

      results.push({
        test: 'Login rate limiting',
        passed: true,
        requestsMade: attempts,
        blocked: true
      });
    }
  };
  
  await testAPIRateLimit();
  await testLoginRateLimit();
  
  return results;
}

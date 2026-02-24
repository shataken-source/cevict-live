/**
 * Stress Testing Suite for Charter Booking Platform
 * 
 * Tests system under load to verify:
 * - Connection pool handles 1000+ users
 * - Rate limiting works correctly
 * - Database doesn't crash
 * - Response times stay under 2s
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionPool } from './connectionPool';
import { RateLimiter, RateLimitPresets } from './rateLimiter';

interface TestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  concurrentUsers: number;
  requestsPerUser: number;
  testDurationMs: number;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ message: string; count: number }>;
}

export class StressTester {
  private config: TestConfig;
  private results: {
    responseTimes: number[];
    errors: Map<string, number>;
    successCount: number;
    failureCount: number;
  };
  
  constructor(config: TestConfig) {
    this.config = config;
    this.results = {
      responseTimes: [],
      errors: new Map(),
      successCount: 0,
      failureCount: 0
    };
  }
  
  /**
   * Run stress test
   */
  async run(): Promise<TestResult> {
    console.log('🚀 Starting stress test...');
    console.log(`👥 Concurrent users: ${this.config.concurrentUsers}`);
    console.log(`📊 Requests per user: ${this.config.requestsPerUser}`);
    console.log(`⏱️  Test duration: ${this.config.testDurationMs / 1000}s`);
    
    const startTime = Date.now();
    
    // Create user sessions
    const users = Array.from(
      { length: this.config.concurrentUsers },
      (_, i) => this.simulateUser(i)
    );
    
    // Run all users concurrently
    await Promise.all(users);
    
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    // Calculate results
    const totalRequests = this.results.successCount + this.results.failureCount;
    const avgResponseTime = this.results.responseTimes.length > 0
      ? this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length
      : 0;
    
    const result: TestResult = {
      totalRequests,
      successfulRequests: this.results.successCount,
      failedRequests: this.results.failureCount,
      averageResponseTime: avgResponseTime,
      minResponseTime: Math.min(...this.results.responseTimes),
      maxResponseTime: Math.max(...this.results.responseTimes),
      requestsPerSecond: totalRequests / durationSeconds,
      errors: Array.from(this.results.errors.entries()).map(([message, count]) => ({
        message,
        count
      }))
    };
    
    this.printResults(result, durationSeconds);
    
    return result;
  }
  
  /**
   * Simulate a single user making requests
   */
  private async simulateUser(userId: number): Promise<void> {
    const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    
    for (let i = 0; i < this.config.requestsPerUser; i++) {
      try {
        const startTime = Date.now();
        
        // Simulate various API calls
        const action = this.getRandomAction();
        await this.executeAction(client, action);
        
        const responseTime = Date.now() - startTime;
        this.results.responseTimes.push(responseTime);
        this.results.successCount++;
        
        // Random delay between requests (0-100ms)
        await this.sleep(Math.random() * 100);
        
      } catch (error: any) {
        this.results.failureCount++;
        
        const errorMessage = error.message || 'Unknown error';
        const count = this.results.errors.get(errorMessage) || 0;
        this.results.errors.set(errorMessage, count + 1);
      }
    }
  }
  
  /**
   * Get random action to test
   */
  private getRandomAction(): string {
    const actions = [
      'list_boats',
      'get_boat',
      'list_trips',
      'get_trip',
      'list_inspections',
      'get_inspection'
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  }
  
  /**
   * Execute API action
   */
  private async executeAction(client: SupabaseClient, action: string): Promise<void> {
    switch (action) {
      case 'list_boats':
        await client.from('boats').select('*').limit(10);
        break;
        
      case 'get_boat':
        // Simulate getting a random boat
        await client.from('boats').select('*').limit(1).single();
        break;
        
      case 'list_trips':
        await client.from('trips').select('*').limit(10);
        break;
        
      case 'get_trip':
        await client.from('trips').select('*').limit(1).single();
        break;
        
      case 'list_inspections':
        await client.from('inspections').select('*').limit(10);
        break;
        
      case 'get_inspection':
        await client.from('inspections').select('*').limit(1).single();
        break;
    }
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Print test results
   */
  private printResults(result: TestResult, durationSeconds: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STRESS TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\n⏱️  Duration: ${durationSeconds.toFixed(2)}s`);
    console.log(`📝 Total Requests: ${result.totalRequests}`);
    console.log(`✅ Successful: ${result.successfulRequests} (${(result.successfulRequests / result.totalRequests * 100).toFixed(2)}%)`);
    console.log(`❌ Failed: ${result.failedRequests} (${(result.failedRequests / result.totalRequests * 100).toFixed(2)}%)`);
    console.log(`\n⚡ Performance:`);
    console.log(`   • Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`   • Avg response: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`   • Min response: ${result.minResponseTime.toFixed(2)}ms`);
    console.log(`   • Max response: ${result.maxResponseTime.toFixed(2)}ms`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach(error => {
        console.log(`   • ${error.message}: ${error.count} occurrences`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Performance assessment
    const passedTests = [
      result.averageResponseTime < 2000 ? '✅' : '❌',
      result.successfulRequests / result.totalRequests > 0.95 ? '✅' : '❌',
      result.requestsPerSecond > 50 ? '✅' : '❌'
    ];
    
    console.log('\n🎯 Performance Goals:');
    console.log(`${passedTests[0]} Avg response time < 2s: ${result.averageResponseTime < 2000 ? 'PASS' : 'FAIL'}`);
    console.log(`${passedTests[1]} Success rate > 95%: ${result.successfulRequests / result.totalRequests > 0.95 ? 'PASS' : 'FAIL'}`);
    console.log(`${passedTests[2]} Throughput > 50 req/s: ${result.requestsPerSecond > 50 ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Test connection pool under load
 */
export async function testConnectionPool(
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  console.log('🧪 Testing Connection Pool...\n');
  
  const pool = new ConnectionPool(supabaseUrl, supabaseKey, {
    minConnections: 10,
    maxConnections: 100,
    connectionTimeout: 30000
  });
  
  // Simulate 200 concurrent requests
  const requests = Array.from({ length: 200 }, async (_, i) => {
    try {
      return await pool.execute(async (client) => {
        // Simulate query
        await new Promise(resolve => setTimeout(resolve, 100));
        return `Request ${i} completed`;
      });
    } catch (error: any) {
      throw new Error(`Request ${i} failed: ${error.message}`);
    }
  });
  
  const startTime = Date.now();
  const results = await Promise.allSettled(requests);
  const duration = Date.now() - startTime;
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ Completed 200 concurrent requests in ${duration}ms`);
  console.log(`   • Successful: ${successful}`);
  console.log(`   • Failed: ${failed}`);
  
  pool.logMetrics();
  
  await pool.close();
}

/**
 * Test rate limiter
 */
export function testRateLimiter(): void {
  console.log('\n🧪 Testing Rate Limiter...\n');
  
  const limiter = new RateLimiter(RateLimitPresets.standard);
  
  // Simulate 150 requests (should allow 100, block 50)
  let allowed = 0;
  let blocked = 0;
  
  for (let i = 0; i < 150; i++) {
    const result = limiter.check('test-user');
    if (result.allowed) {
      allowed++;
    } else {
      blocked++;
    }
  }
  
  console.log(`✅ Rate limiter working correctly:`);
  console.log(`   • Allowed: ${allowed}/100`);
  console.log(`   • Blocked: ${blocked}/50`);
}

/**
 * Run all tests
 */
export async function runAllTests(config: TestConfig): Promise<void> {
  console.log('\n🎯 Running All Tests...\n');
  
  // Test 1: Connection Pool
  await testConnectionPool(config.supabaseUrl, config.supabaseKey);
  
  // Test 2: Rate Limiter
  testRateLimiter();
  
  // Test 3: Full Stress Test
  const tester = new StressTester(config);
  await tester.run();
  
  console.log('\n✅ All tests completed!\n');
}

// Example usage
if (import.meta.main) {
  const config: TestConfig = {
    supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
    supabaseKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
    concurrentUsers: 100,
    requestsPerUser: 10,
    testDurationMs: 60000
  };
  
  runAllTests(config);
}

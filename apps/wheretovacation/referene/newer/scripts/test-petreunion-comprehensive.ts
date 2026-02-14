/**
 * Comprehensive Test Suite for PetReunion Application
 * Tests all major API endpoints and functionality
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  responseTime: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalTime: number;
}

class PetReunionTester {
  private results: TestResult[] = [];
  private baseUrl: string;
  private supabase: any;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
    
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const responseTime = Date.now() - startTime;
      
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        endpoint,
        method,
        status: response.ok ? 'pass' : 'fail',
        responseTime,
        details: {
          statusCode: response.status,
          data: responseData
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error: any) {
      return {
        endpoint,
        method,
        status: 'fail',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async testHealthEndpoint(): Promise<void> {
    console.log('Testing Health Endpoint...');
    const result = await this.makeRequest('/api/health');
    this.results.push(result);
    
    if (result.status === 'pass' && result.details?.data) {
      const health = result.details.data;
      console.log(`  ✓ Health Status: ${health.status}`);
      console.log(`  ✓ Database: ${health.checks.database.status}`);
      console.log(`  ✓ Memory: ${health.checks.memory.status}`);
    }
  }

  private async testPetReunionEndpoints(): Promise<void> {
    console.log('Testing PetReunion Endpoints...');
    
    const endpoints = [
      { path: '/api/petreunion/alerts', method: 'GET' },
      { path: '/api/petreunion/crawler-status', method: 'GET' },
      { path: '/api/petreunion/discover-shelters', method: 'GET' },
      { path: '/api/petreunion/backup', method: 'GET' },
      { path: '/api/petreunion/export-data', method: 'GET' },
      { path: '/api/petreunion/find-my-pet', method: 'POST', body: { query: 'test' } },
      { path: '/api/petreunion/match-pets', method: 'POST', body: { lost_pet_id: 'test' } },
      { path: '/api/petreunion/populate-database', method: 'POST' },
      { path: '/api/petreunion/resize-all-images', method: 'POST' },
      { path: '/api/petreunion/scrape-accessible-shelters', method: 'POST' },
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint.path, endpoint.method, endpoint.body);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`  ✓ ${endpoint.method} ${endpoint.path} - ${result.responseTime}ms`);
      } else {
        console.log(`  ✗ ${endpoint.method} ${endpoint.path} - ${result.error}`);
      }
    }
  }

  private async testCalmcastEndpoints(): Promise<void> {
    console.log('Testing Calmcast Endpoints...');
    
    const endpoints = [
      { path: '/api/calmcast/presets', method: 'GET' },
      { path: '/api/calmcast/generate', method: 'POST', body: { preset: 'THUNDER_CALM' } },
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint.path, endpoint.method, endpoint.body);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`  ✓ ${endpoint.method} ${endpoint.path} - ${result.responseTime}ms`);
      } else {
        console.log(`  ✗ ${endpoint.method} ${endpoint.path} - ${result.error}`);
      }
    }
  }

  private async testCharterEndpoints(): Promise<void> {
    console.log('Testing Charter Endpoints...');
    
    const endpoints = [
      { path: '/api/charters/count-boats', method: 'GET' },
      { path: '/api/charters/scrape-gulfcoastcharters-bulletproof', method: 'POST' },
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint.path, endpoint.method);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`  ✓ ${endpoint.method} ${endpoint.path} - ${result.responseTime}ms`);
      } else {
        console.log(`  ✗ ${endpoint.method} ${endpoint.path} - ${result.error}`);
      }
    }
  }

  private async testAdminEndpoints(): Promise<void> {
    console.log('Testing Admin Endpoints...');
    
    const endpoints = [
      { path: '/api/admin/campaigns', method: 'GET' },
      { path: '/api/admin/users', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint.path, endpoint.method);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`  ✓ ${endpoint.method} ${endpoint.path} - ${result.responseTime}ms`);
      } else {
        console.log(`  ✗ ${endpoint.method} ${endpoint.path} - ${result.error}`);
      }
    }
  }

  private async testPetReportingEndpoints(): Promise<void> {
    console.log('Testing Pet Reporting Endpoints...');
    
    // Test lost pet reporting
    const lostPetData = {
      pet_type: 'dog',
      breed: 'Labrador',
      color: 'Black',
      date_lost: '2024-01-15',
      location_city: 'Test City',
      location_state: 'TS',
      owner_name: 'Test Owner',
      owner_email: 'test@example.com',
      owner_phone: '555-0123',
      description: 'Test pet for comprehensive testing'
    };

    const lostResult = await this.makeRequest('/api/petreunion/report-lost', 'POST', lostPetData);
    this.results.push(lostResult);
    
    if (lostResult.status === 'pass') {
      console.log(`  ✓ POST /api/petreunion/report-lost - ${lostResult.responseTime}ms`);
    } else {
      console.log(`  ✗ POST /api/petreunion/report-lost - ${lostResult.error}`);
    }

    // Test found pet reporting
    const foundPetData = {
      pet_type: 'cat',
      breed: 'Siamese',
      color: 'White',
      date_found: '2024-01-15',
      location_city: 'Test City',
      location_state: 'TS',
      finder_name: 'Test Finder',
      finder_email: 'finder@example.com',
      finder_phone: '555-0124',
      description: 'Found pet test'
    };

    const foundResult = await this.makeRequest('/api/petreunion/report-found-pet', 'POST', foundPetData);
    this.results.push(foundResult);
    
    if (foundResult.status === 'pass') {
      console.log(`  ✓ POST /api/petreunion/report-found-pet - ${foundResult.responseTime}ms`);
    } else {
      console.log(`  ✗ POST /api/petreunion/report-found-pet - ${foundResult.error}`);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log('Testing Database Connection...');
    
    if (!this.supabase) {
      console.log('  ⚠ Supabase client not configured - skipping database tests');
      return;
    }

    try {
      const startTime = Date.now();
      const { data, error } = await this.supabase.from('profiles').select('count').limit(1);
      const responseTime = Date.now() - startTime;
      
      if (error) {
        this.results.push({
          endpoint: 'database',
          method: 'SELECT',
          status: 'fail',
          responseTime,
          error: error.message
        });
        console.log(`  ✗ Database connection failed - ${error.message}`);
      } else {
        this.results.push({
          endpoint: 'database',
          method: 'SELECT',
          status: 'pass',
          responseTime,
          details: { data }
        });
        console.log(`  ✓ Database connection successful - ${responseTime}ms`);
      }
    } catch (error: any) {
      this.results.push({
        endpoint: 'database',
        method: 'SELECT',
        status: 'fail',
        responseTime: 0,
        error: error.message
      });
      console.log(`  ✗ Database connection failed - ${error.message}`);
    }
  }

  private async testPageLoads(): Promise<void> {
    console.log('Testing Page Loads...');
    
    const pages = [
      '/',
      '/petreunion',
      '/captains',
      '/calmcast',
    ];

    for (const page of pages) {
      const result = await this.makeRequest(page, 'GET');
      this.results.push({
        ...result,
        endpoint: `page${page}`
      });
      
      if (result.status === 'pass') {
        console.log(`  ✓ GET ${page} - ${result.responseTime}ms`);
      } else {
        console.log(`  ✗ GET ${page} - ${result.error}`);
      }
    }
  }

  public async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Starting Comprehensive PetReunion Test Suite');
    console.log(`📍 Base URL: ${this.baseUrl}`);
    console.log('=' .repeat(60));
    
    const startTime = Date.now();

    await this.testHealthEndpoint();
    await this.testDatabaseConnection();
    await this.testPageLoads();
    await this.testPetReunionEndpoints();
    await this.testPetReportingEndpoints();
    await this.testCalmcastEndpoints();
    await this.testCharterEndpoints();
    await this.testAdminEndpoints();

    const totalTime = Date.now() - startTime;
    const passedTests = this.results.filter(r => r.status === 'pass').length;
    const failedTests = this.results.filter(r => r.status === 'fail').length;
    const skippedTests = this.results.filter(r => r.status === 'skip').length;

    const suite: TestSuite = {
      name: 'PetReunion Comprehensive Test Suite',
      tests: this.results,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      skippedTests,
      totalTime
    };

    this.printSummary(suite);
    return suite;
  }

  private printSummary(suite: TestSuite): void {
    console.log('=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${suite.totalTests}`);
    console.log(`✅ Passed: ${suite.passedTests}`);
    console.log(`❌ Failed: ${suite.failedTests}`);
    console.log(`⏭️  Skipped: ${suite.skippedTests}`);
    console.log(`⏱️  Total Time: ${suite.totalTime}ms`);
    console.log(`📈 Success Rate: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%`);
    
    if (suite.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      suite.tests
        .filter(test => test.status === 'fail')
        .forEach(test => {
          console.log(`  • ${test.method} ${test.endpoint}: ${test.error}`);
        });
    }

    console.log('\n🎯 PERFORMANCE SUMMARY:');
    const avgResponseTime = suite.tests.reduce((sum, test) => sum + test.responseTime, 0) / suite.tests.length;
    console.log(`  • Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    const slowestTests = suite.tests
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5);
    
    console.log('  • Slowest 5 Tests:');
    slowestTests.forEach((test, index) => {
      console.log(`    ${index + 1}. ${test.method} ${test.endpoint}: ${test.responseTime}ms`);
    });
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new PetReunionTester();
  tester.runAllTests()
    .then((results) => {
      console.log('\n✅ Test suite completed');
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export default PetReunionTester;
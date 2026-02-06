#!/usr/bin/env node
/**
 * Test script for PetReunion API endpoints
 * Tests report-lost and report-found endpoints
 */

const API_URL = process.env.API_URL || 'http://localhost:3006';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: any
): Promise<TestResult> {
  try {
    const url = `${API_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        name,
        passed: false,
        error: `HTTP ${response.status}: ${data.error || data.message || JSON.stringify(data)}`,
        response: data,
      };
    }

    return {
      name,
      passed: true,
      response: data,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing PetReunion API Endpoints\n');
  console.log(`API URL: ${API_URL}\n`);

  const results: TestResult[] = [];

  // Test 1: Report Lost Pet - Valid Request
  console.log('Test 1: Report Lost Pet (Valid)...');
  const test1 = await testEndpoint(
    'Report Lost Pet - Valid',
    'POST',
    '/api/report-lost',
    {
      petName: 'Test Dog',
      petType: 'dog',
      breed: 'Golden Retriever',
      color: 'Golden',
      size: 'large',
      age: '5 years',
      gender: 'male',
      description: 'Friendly golden retriever with collar',
      location: 'Columbus, Indiana',
      date_lost: '2026-01-10',
      owner_name: 'Test Owner',
      owner_email: 'test@example.com',
      owner_phone: '5551234567',
    }
  );
  results.push(test1);
  console.log(test1.passed ? '✅ PASSED' : `❌ FAILED: ${test1.error}\n`);

  // Test 2: Report Lost Pet - Missing Required Fields
  console.log('Test 2: Report Lost Pet (Missing Required Fields)...');
  const test2 = await testEndpoint(
    'Report Lost Pet - Missing Required',
    'POST',
    '/api/report-lost',
    {
      petName: 'Test Dog',
      // Missing: petType, color, location, date_lost
    }
  );
  results.push(test2);
  console.log(
    test2.passed === false && test2.error?.includes('Validation failed')
      ? '✅ PASSED (correctly rejected)'
      : `❌ FAILED: Should reject missing fields\n`
  );

  // Test 3: Report Found Pet - Valid Request
  console.log('Test 3: Report Found Pet (Valid)...');
  const test3 = await testEndpoint(
    'Report Found Pet - Valid',
    'POST',
    '/api/report-found',
    {
      petName: 'Found Cat',
      petType: 'cat',
      breed: 'Tabby',
      color: 'Orange',
      size: 'medium',
      location: 'Birmingham, Alabama',
      date_found: '2026-01-12',
      finder_name: 'Good Samaritan',
      finder_email: 'finder@example.com',
    }
  );
  results.push(test3);
  console.log(test3.passed ? '✅ PASSED' : `❌ FAILED: ${test3.error}\n`);

  // Test 4: Report Found Pet - Missing Required Fields
  console.log('Test 4: Report Found Pet (Missing Required Fields)...');
  const test4 = await testEndpoint(
    'Report Found Pet - Missing Required',
    'POST',
    '/api/report-found',
    {
      petName: 'Found Cat',
      // Missing: petType, color, location, date_found
    }
  );
  results.push(test4);
  console.log(
    test4.passed === false && test4.error?.includes('Missing required fields')
      ? '✅ PASSED (correctly rejected)'
      : `❌ FAILED: Should reject missing fields\n`
  );

  // Test 5: Report Lost Pet - Invalid Pet Type
  console.log('Test 5: Report Lost Pet (Invalid Pet Type)...');
  const test5 = await testEndpoint(
    'Report Lost Pet - Invalid Pet Type',
    'POST',
    '/api/report-lost',
    {
      petType: 'hamster', // Invalid
      color: 'Brown',
      location: 'Columbus, Indiana',
      date_lost: '2026-01-10',
    }
  );
  results.push(test5);
  console.log(
    test5.passed === false && test5.error?.includes('Invalid pet type')
      ? '✅ PASSED (correctly rejected)'
      : `❌ FAILED: Should reject invalid pet type\n`
  );

  // Test 6: Report Lost Pet - Invalid Location Format
  console.log('Test 6: Report Lost Pet (Invalid Location)...');
  const test6 = await testEndpoint(
    'Report Lost Pet - Invalid Location',
    'POST',
    '/api/report-lost',
    {
      petType: 'dog',
      color: 'Brown',
      location: '', // Empty location
      date_lost: '2026-01-10',
    }
  );
  results.push(test6);
  console.log(
    test6.passed === false && test6.error?.includes('Location')
      ? '✅ PASSED (correctly rejected)'
      : `❌ FAILED: Should reject invalid location\n`
  );

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }
  
  console.log('\n' + '='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

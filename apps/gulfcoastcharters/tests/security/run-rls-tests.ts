import { testRLSPolicies } from './rls-policies.test.js';

async function runTests() {
  console.log('🔒 Running RLS Policy Tests...\n');
  
  try {
    const results = await testRLSPolicies();
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(result => {
      if (result.passed) {
        console.log(`✅ ${result.test}`);
        passed++;
      } else {
        console.log(`❌ ${result.test}`);
        if (result.error) console.log(`   Error: ${result.error}`);
        failed++;
      }
    });
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

runTests();

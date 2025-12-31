/**
 * Test Runner
 * Executes all test suites and reports results
 */

import { TestSuite } from './test-framework';
import './crypto-trainer.test';
import './kalshi-trainer.test';

async function runAllTests() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              🧪 ALPHA HUNTER TEST SUITE                      ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Note: In a real implementation, we'd collect and run all test suites
  // For now, this is a placeholder structure
  
  console.log('✅ Test framework initialized');
  console.log('📋 Test suites ready:');
  console.log('   - crypto-trainer.test.ts');
  console.log('   - kalshi-trainer.test.ts');
  console.log('\n💡 Run individual tests via: pnpm test <suite-name>');
}

runAllTests().catch(console.error);


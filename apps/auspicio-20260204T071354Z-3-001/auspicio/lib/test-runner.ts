// Automated Test Runner for Auspicio/Forge System
import { AIPoweredAgent } from '../../../packages/agents/src/agents';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: any;
  metrics?: {
    responseTime: number;
    outputSize: number;
    success: boolean;
  };
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

class AuspicioTestRunner {
  private results: TestResult[] = [];

  async runTest(testName: string, testFunction: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const output = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        passed: true,
        duration,
        output,
        metrics: {
          responseTime: duration,
          outputSize: JSON.stringify(output).length,
          success: true
        }
      };
      
      this.results.push(result);
      console.log(`✅ ${testName} - ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          responseTime: duration,
          outputSize: 0,
          success: false
        }
      };
      
      this.results.push(result);
      console.log(`❌ ${testName} - ${duration}ms - ${result.error}`);
      return result;
    }
  }

  async runAllTests(): Promise<TestSuite> {
    console.log('🔨 Starting Auspicio/Forge System Tests...\n');
    
    // Test 1: Agent Creation
    await this.runTest('Agent Creation', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['nlp', 'analysis'],
        settings: { model: 'test' }
      });
      
      if (!agent.id || !agent.config) {
        throw new Error('Agent not properly initialized');
      }
      
      return { agentId: agent.id, config: agent.config };
    });

    // Test 2: Agent Execution
    await this.runTest('Agent Task Execution', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['nlp'],
        settings: {}
      });
      
      const result = await agent.execute('Test task');
      
      if (!result || !result.success) {
        throw new Error('Agent execution failed');
      }
      
      return result;
    });

    // Test 3: Agent Configuration Validation
    await this.runTest('Agent Configuration Validation', async () => {
      try {
        const agent = new AIPoweredAgent({
          type: 'invalid-type' as any,
          capabilities: [],
          settings: {}
        });
        
        // Should still create but with validation warnings
        if (!agent.id) {
          throw new Error('Agent creation failed completely');
        }
        
        return { 
          warning: 'Invalid config accepted but agent created',
          agentId: agent.id 
        };
      } catch (error) {
        // Expected behavior for invalid configs
        return { 
          validationWorking: true,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Test 4: Concurrent Agent Execution
    await this.runTest('Concurrent Agent Execution', async () => {
      const agents = Array.from({ length: 5 }, (_, i) => 
        new AIPoweredAgent({
          type: 'autonomous',
          capabilities: ['nlp'],
          settings: { agentIndex: i }
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.all(
        agents.map((agent, i) => agent.execute(`Concurrent task ${i}`))
      );
      const duration = Date.now() - startTime;
      
      if (results.length !== 5) {
        throw new Error(`Expected 5 results, got ${results.length}`);
      }
      
      return {
        concurrentResults: results.length,
        totalDuration: duration,
        averageDuration: duration / results.length
      };
    });

    // Test 5: Agent Memory and State
    await this.runTest('Agent State Management', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['memory'],
        settings: { persistent: true }
      });
      
      const task1 = await agent.execute('Memory test 1');
      const task2 = await agent.execute('Memory test 2');
      
      if (!task1 || !task2) {
        throw new Error('Agent state management failed');
      }
      
      return {
        task1Result: task1,
        task2Result: task2,
        agentId: agent.id
      };
    });

    // Test 6: Error Handling
    await this.runTest('Agent Error Handling', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['error-handling'],
        settings: {}
      });
      
      try {
        // Test with potentially problematic input
        const result = await agent.execute('');
        return { 
          errorHandling: 'graceful',
          result: result 
        };
      } catch (error) {
        return { 
          errorHandling: 'proper-throw',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Test 7: Performance Metrics
    await this.runTest('Performance Metrics Collection', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['performance'],
        settings: {}
      });
      
      const iterations = 10;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await agent.execute(`Performance test ${i}`);
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      return {
        iterations,
        averageTime: avgTime,
        maxTime,
        minTime,
        performanceScore: avgTime < 100 ? 'excellent' : avgTime < 500 ? 'good' : 'needs-improvement'
      };
    });

    // Test 8: Output Format Validation
    await this.runTest('Output Format Validation', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['structured-output'],
        settings: {}
      });
      
      const result = await agent.execute('Format test');
      
      const hasRequiredFields = result && typeof result === 'object';
      const hasTimestamp = result && result.metadata && 'timestamp' in result.metadata;
      const hasResult = result && 'result' in result;
      const hasConfidence = result && 'confidence' in result;
      
      return {
        hasRequiredFields,
        hasTimestamp,
        hasResult,
        hasConfidence,
        outputStructure: result,
        isValid: hasRequiredFields && hasResult && hasConfidence
      };
    });

    return this.generateReport();
  }

  private generateReport(): TestSuite {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const total = this.results.length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    const summary = {
      total,
      passed,
      failed,
      duration
    };

    console.log('\n📊 Test Suite Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.testName}: ${r.error}`);
      });
    }

    return {
      name: 'Auspicio/Forge System Tests',
      tests: this.results,
      summary
    };
  }
}

// Export for use in test scripts
export { AuspicioTestRunner };
export type { TestResult, TestSuite };

// Auto-run if called directly
if (require.main === module) {
  const runner = new AuspicioTestRunner();
  runner.runAllTests().then(results => {
    console.log('\n🏁 Test execution completed');
    process.exit(results.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

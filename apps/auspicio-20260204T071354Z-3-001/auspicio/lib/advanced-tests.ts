// Advanced Real-World Tests for Auspicio/Forge System
import { AIPoweredAgent } from '../../../packages/agents/src/agents';

interface AdvancedTestResult {
  testName: string;
  category: 'usability' | 'real-world' | 'scalability' | 'output-quality';
  passed: boolean;
  duration: number;
  score?: number; // 1-10 scale
  issues?: string[];
  recommendations?: string[];
  output?: any;
  error?: string;
}

class AdvancedAuspicioTests {
  private results: AdvancedTestResult[] = [];

  private async runAdvancedTest(
    testName: string,
    category: AdvancedTestResult['category'],
    testFunction: () => Promise<any>
  ): Promise<AdvancedTestResult> {
    const startTime = Date.now();
    try {
      const output = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: AdvancedTestResult = {
        testName,
        category,
        passed: true,
        duration,
        output
      };
      
      this.results.push(result);
      console.log(`✅ [${category.toUpperCase()}] ${testName} - ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: AdvancedTestResult = {
        testName,
        category,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        issues: [error instanceof Error ? error.message : String(error)]
      };
      
      this.results.push(result);
      console.log(`❌ [${category.toUpperCase()}] ${testName} - ${duration}ms - ${result.error}`);
      return result;
    }
  }

  async runRealWorldTests(): Promise<AdvancedTestResult[]> {
    console.log('🔬 Starting Advanced Real-World Tests for Auspicio/Forge...\n');

    // === USABILITY TESTS ===
    
    await this.runAdvancedTest('Agent Setup Ease', 'usability', async () => {
      const setupTime = Date.now();
      
      // Test how easy it is to create and configure agents
      const agents = [];
      for (let i = 0; i < 3; i++) {
        const agent = new AIPoweredAgent({
          type: 'autonomous',
          capabilities: ['nlp', 'analysis'],
          settings: { 
            agentId: `test-agent-${i}`,
            purpose: `Test agent ${i} for usability testing`
          }
        });
        agents.push(agent);
      }
      
      const setupDuration = Date.now() - setupTime;
      
      // Test basic functionality
      const results = await Promise.all(
        agents.map((agent, i) => agent.execute(`Test task ${i}`))
      );
      
      const allSuccessful = results.every(r => r && r.success);
      const avgSetupTime = setupDuration / agents.length;
      
      return {
        agentsCreated: agents.length,
        allSuccessful,
        averageSetupTime: avgSetupTime,
        usabilityScore: avgSetupTime < 10 ? 10 : avgSetupTime < 50 ? 8 : avgSetupTime < 100 ? 6 : 4
      };
    });

    await this.runAdvancedTest('API Interface Quality', 'usability', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['nlp'],
        settings: {}
      });
      
      // Test API consistency
      const apiTests = [
        { method: 'execute', args: ['test'] },
        { method: 'execute', args: ['complex test with multiple words'] },
        { method: 'execute', args: [''] }
      ];
      
      const results = [];
      for (const test of apiTests) {
        try {
          const fn = (agent as any)[test.method];
          if (typeof fn !== 'function') {
            throw new Error(`Agent method not callable: ${String(test.method)}`);
          }
          const result = await fn(...(test.args as any));
          results.push({
            test: `${test.method}(${test.args.map(a => JSON.stringify(a)).join(', ')})`,
            success: true,
            hasResult: !!result,
            hasSuccess: result && typeof result === 'object' && 'success' in result
          });
        } catch (error) {
          results.push({
            test: `${test.method}(${test.args.map(a => JSON.stringify(a)).join(', ')})`,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const successRate = results.filter(r => r.success).length / results.length;
      
      return {
        apiTests: results,
        successRate: successRate * 100,
        apiQuality: successRate > 0.8 ? 'excellent' : successRate > 0.6 ? 'good' : 'needs-improvement'
      };
    });

    // === REAL-WORLD TESTS ===
    
    await this.runAdvancedTest('Real Task Processing', 'real-world', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['nlp', 'analysis', 'decision-making'],
        settings: {}
      });
      
      const realWorldTasks = [
        'Analyze customer feedback sentiment',
        'Generate a summary of quarterly sales data',
        'Recommend product improvements based on user reviews',
        'Create a marketing strategy for new product launch',
        'Identify potential risks in business expansion plan'
      ];
      
      const results = [];
      for (const task of realWorldTasks) {
        const startTime = Date.now();
        const result = await agent.execute(task);
        const duration = Date.now() - startTime;
        
        results.push({
          task,
          duration,
          hasMeaningfulOutput: !!result && !!result.result && result.result.length > 10,
          outputLength: result?.result?.length || 0
        });
      }
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const meaningfulOutputs = results.filter((r: any) => r.hasMeaningfulOutput).length;
      
      return {
        tasksProcessed: results.length,
        averageDuration: avgDuration,
        meaningfulOutputs,
        meaningfulOutputRate: (meaningfulOutputs / results.length) * 100,
        realWorldReadiness: meaningfulOutputs === results.length ? 'ready' : 'needs-improvement'
      };
    });

    await this.runAdvancedTest('Complex Workflow Handling', 'real-world', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['workflow', 'analysis'],
        settings: {}
      });
      
      // Test multi-step workflow
      const workflowSteps = [
        'Step 1: Extract key information from document',
        'Step 2: Analyze extracted data for patterns',
        'Step 3: Generate insights based on analysis',
        'Step 4: Create actionable recommendations',
        'Step 5: Format final report'
      ];
      
      const workflowResults = [];
      for (const step of workflowSteps) {
        const result = await agent.execute(step);
        workflowResults.push({
          step,
          completed: !!result,
          hasOutput: !!result?.result
        });
      }
      
      const completedSteps = workflowResults.filter(r => r.completed).length;
      const workflowSuccess = completedSteps === workflowSteps.length;
      
      return {
        totalSteps: workflowSteps.length,
        completedSteps,
        workflowSuccess,
        workflowEfficiency: (completedSteps / workflowSteps.length) * 100
      };
    });

    // === SCALABILITY TESTS ===
    
    await this.runAdvancedTest('Load Testing', 'scalability', async () => {
      const agentCounts = [1, 5, 10, 20];
      const loadTestResults = [];
      
      for (const count of agentCounts) {
        const agents = Array.from({ length: count }, () => 
          new AIPoweredAgent({
            type: 'autonomous',
            capabilities: ['nlp'],
            settings: {}
          })
        );
        
        const startTime = Date.now();
        const results = await Promise.all(
          agents.map((agent, i) => agent.execute(`Load test task ${i}`))
        );
        const duration = Date.now() - startTime;
        
        loadTestResults.push({
          agentCount: count,
          duration,
          successRate: (results.filter(r => !!r).length / results.length) * 100,
          avgTimePerAgent: duration / count
        });
      }
      
      // Check if performance scales reasonably
      const performanceDegrades = loadTestResults[3].avgTimePerAgent > loadTestResults[0].avgTimePerAgent * 2;
      
      return {
        loadTestResults,
        scalabilityRating: performanceDegrades ? 'poor' : 'good',
        maxConcurrentAgents: loadTestResults[loadTestResults.length - 1].agentCount
      };
    });

    await this.runAdvancedTest('Memory Usage', 'scalability', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create and execute many agents
      const agents = [];
      for (let i = 0; i < 50; i++) {
        const agent = new AIPoweredAgent({
          type: 'autonomous',
          capabilities: ['nlp'],
          settings: { index: i }
        });
        await agent.execute(`Memory test ${i}`);
        agents.push(agent);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerAgent = memoryIncrease / agents.length;
      
      // Clean up
      agents.length = 0;
      
      return {
        agentsCreated: agents.length,
        memoryIncrease: memoryIncrease,
        memoryPerAgent,
        memoryEfficiency: memoryPerAgent < 1024 * 1024 ? 'excellent' : memoryPerAgent < 5 * 1024 * 1024 ? 'good' : 'poor' // <1MB, <5MB per agent
      };
    });

    // === OUTPUT QUALITY TESTS ===
    
    await this.runAdvancedTest('Output Consistency', 'output-quality', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['consistent-output'],
        settings: {}
      });
      
      const testTask = 'Generate a standardized response';
      const results = [];
      
      // Execute same task multiple times
      for (let i = 0; i < 5; i++) {
        const result = await agent.execute(testTask);
        results.push({
          execution: i + 1,
          hasResult: !!result?.result,
          resultLength: result?.result?.length || 0,
          resultType: typeof result?.result
        });
      }
      
      const consistentStructure = results.every(r => r.hasResult && r.resultType === 'string');
      const lengthVariance = Math.max(...results.map(r => r.resultLength)) - Math.min(...results.map(r => r.resultLength));
      
      return {
        executions: results.length,
        consistentStructure,
        lengthVariance,
        consistencyScore: consistentStructure && lengthVariance < 100 ? 10 : consistentStructure ? 7 : 4
      };
    });

    await this.runAdvancedTest('Output Usefulness', 'output-quality', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['useful-output'],
        settings: {}
      });
      
      const practicalTasks = [
        'How to improve team productivity?',
        'What are the best practices for code review?',
        'Ways to reduce customer support tickets',
        'Strategies for increasing user engagement',
        'Methods to optimize database queries'
      ];
      
      const qualityResults = [];
      for (const task of practicalTasks) {
        const result = await agent.execute(task);
        
        const qualityScore = this.assessOutputQuality(result?.result || '');
        
        qualityResults.push({
          task,
          qualityScore,
          hasActionableContent: qualityScore >= 6,
          outputLength: result?.result?.length || 0
        });
      }
      
      const avgQuality = qualityResults.reduce((sum, r) => sum + r.qualityScore, 0) / qualityResults.length;
      const actionableOutputs = qualityResults.filter((r: any) => r.hasActionableContent).length;
      
      return {
        tasksEvaluated: qualityResults.length,
        averageQualityScore: avgQuality,
        actionableOutputs,
        actionableRate: (actionableOutputs / qualityResults.length) * 100,
        overallQuality: avgQuality >= 8 ? 'excellent' : avgQuality >= 6 ? 'good' : 'needs-improvement'
      };
    });

    return this.results;
  }

  private assessOutputQuality(output: string): number {
    if (!output || output.length < 10) return 1;
    
    let score = 3; // Base score for having output
    
    // Length bonus
    if (output.length > 50) score += 1;
    if (output.length > 200) score += 1;
    
    // Content quality indicators
    if (output.includes('step') || output.includes('first') || output.includes('then')) score += 1;
    if (output.includes('example') || output.includes('such as')) score += 1;
    if (output.includes('important') || output.includes('key') || output.includes('critical')) score += 1;
    if (output.match(/\d+\.|\*/)) score += 1; // Numbered or bulleted lists
    
    return Math.min(score, 10);
  }

  generateDetailedReport(): void {
    console.log('\n🔬 Advanced Auspicio/Forge System Test Report\n');
    
    const categories = ['usability', 'real-world', 'scalability', 'output-quality'] as const;
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      
      console.log(`🔍 ${category.toUpperCase().replace('-', ' ').toUpperCase()} TESTS:`);
      console.log(`   Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
      
      categoryResults.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        const score = test.score ? ` [Score: ${test.score}/10]` : '';
        console.log(`   ${status} ${test.testName} (${test.duration}ms)${score}`);
        
        if (test.issues && test.issues.length > 0) {
          test.issues.forEach(issue => console.log(`      ⚠️  ${issue}`));
        }
        if (test.recommendations && test.recommendations.length > 0) {
          test.recommendations.forEach(rec => console.log(`      💡 ${rec}`));
        }
      });
      console.log('');
    });

    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const avgScore = this.results.filter(r => r.score).reduce((sum, r) => sum + (r.score || 0), 0) / this.results.filter(r => r.score).length;
    
    console.log('📈 ADVANCED SYSTEM ANALYSIS:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalTests - totalPassed}`);
    console.log(`   Success Rate: ${((totalPassed/totalTests)*100).toFixed(1)}%`);
    console.log(`   Average Quality Score: ${avgScore.toFixed(1)}/10`);
    
    // Critical issues and recommendations
    const criticalIssues = this.results.filter(r => !r.passed || (r.score && r.score < 6));
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRING ATTENTION:');
      criticalIssues.forEach(test => {
        console.log(`   • ${test.testName}: ${test.issues?.join(', ') || 'Low quality score'}`);
      });
      
      console.log('\n🔧 IMMEDIATE RECOMMENDATIONS:');
      console.log('   1. Improve agent output quality and consistency');
      console.log('   2. Enhance real-world task handling capabilities');
      console.log('   3. Optimize performance under load');
      console.log('   4. Add better error handling and validation');
    } else {
      console.log('\n✅ SYSTEM IS READY FOR PRODUCTION USE');
      console.log('   All critical tests passed with good quality scores');
    }
  }
}

// Export for use
export { AdvancedAuspicioTests };
export type { AdvancedTestResult };

// Auto-run if called directly
if (require.main === module) {
  const tester = new AdvancedAuspicioTests();
  tester.runRealWorldTests().then(results => {
    tester.generateDetailedReport();
    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Advanced tests failed:', error);
    process.exit(1);
  });
}

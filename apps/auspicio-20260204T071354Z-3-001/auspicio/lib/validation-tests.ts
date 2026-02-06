// Validation Tests for Enhanced Agent System
import { AIPoweredAgent } from '../../../packages/agents/src/agents';

interface ValidationResult {
  testName: string;
  category: 'functionality' | 'intelligence' | 'performance' | 'usability';
  passed: boolean;
  score: number; // 1-10 scale
  duration: number;
  issues: string[];
  recommendations: string[];
  output?: any;
}

class AgentValidationTests {
  private results: ValidationResult[] = [];

  private async runValidationTest(
    testName: string,
    category: ValidationResult['category'],
    testFunction: () => Promise<any>
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const output = await testFunction();
      const duration = Date.now() - startTime;
      
      // Score the test based on output quality
      const score = this.scoreTestOutput(testName, output, issues, recommendations);
      const passed = score >= 6; // Minimum acceptable score
      
      const result: ValidationResult = {
        testName,
        category,
        passed,
        score,
        duration,
        issues,
        recommendations,
        output
      };
      
      this.results.push(result);
      const status = passed ? '✅' : '❌';
      console.log(`${status} [${category.toUpperCase()}] ${testName} - ${duration}ms [Score: ${score}/10]`);
      
      if (issues.length > 0) {
        issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
      }
      if (recommendations.length > 0) {
        recommendations.forEach(rec => console.log(`    💡 ${rec}`));
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ValidationResult = {
        testName,
        category,
        passed: false,
        score: 1,
        duration,
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['Fix critical errors before proceeding']
      };
      
      this.results.push(result);
      console.log(`❌ [${category.toUpperCase()}] ${testName} - ${duration}ms [Score: 1/10]`);
      console.log(`    🚨 ${result.issues[0]}`);
      
      return result;
    }
  }

  private scoreTestOutput(testName: string, output: any, issues: string[], recommendations: string[]): number {
    let score = 3; // Base score for having output
    
    if (!output) {
      issues.push('No output generated');
      return 1;
    }

    // Check for meaningful content
    if (output.content && output.content.length > 100) {
      score += 2;
    } else if (output.content && output.content.length > 50) {
      score += 1;
    } else {
      issues.push('Output content is too short');
    }

    // Check for confidence score
    if (output.confidence && typeof output.confidence === 'number') {
      if (output.confidence > 0.8) {
        score += 2;
      } else if (output.confidence > 0.6) {
        score += 1;
      } else {
        issues.push('Low confidence score');
        recommendations.push('Improve AI model accuracy');
      }
    } else {
      issues.push('Missing confidence score');
      recommendations.push('Add confidence metrics to outputs');
    }

    // Check for metadata
    if (output.metadata && typeof output.metadata === 'object') {
      score += 1;
    } else {
      issues.push('Missing metadata');
      recommendations.push('Add metadata to provide context');
    }

    // Check processing time realism
    if (output.processingTime && output.processingTime > 50) {
      score += 1;
    } else {
      issues.push('Processing time too fast (likely no real processing)');
      recommendations.push('Implement realistic processing delays');
    }

    // Check for intelligent content
    if (output.content && this.isIntelligentContent(output.content, testName)) {
      score += 1;
    } else {
      issues.push('Content lacks intelligence or domain expertise');
      recommendations.push('Enhance AI knowledge base');
    }

    return Math.min(score, 10);
  }

  private isIntelligentContent(content: string, testName: string): boolean {
    const intelligentIndicators = [
      'analysis', 'strategy', 'recommend', 'framework', 'methodology',
      'confidence', 'accuracy', 'metrics', 'optimization', 'enhancement'
    ];
    
    const hasIntelligentWords = intelligentIndicators.some(word => 
      content.toLowerCase().includes(word)
    );
    
    const hasStructuredThinking = content.includes('.') && content.length > 200;
    
    return hasIntelligentWords && hasStructuredThinking;
  }

  async runValidationSuite(): Promise<ValidationResult[]> {
    console.log('🔍 Starting Agent System Validation Tests...\n');

    // === FUNCTIONALITY TESTS ===
    
    await this.runValidationTest('Intelligent Agent Creation', 'functionality', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['nlp', 'analysis', 'decision-making'],
        settings: { model: 'ai-powered-v1' }
      });
      
      if (!agent.id || !agent.config) {
        throw new Error('Agent initialization failed');
      }
      
      return {
        agentId: agent.id,
        configType: agent.config.type,
        capabilities: agent.config.capabilities,
        properlyInitialized: true
      };
    });

    await this.runValidationTest('Sentiment Analysis Capability', 'functionality', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['sentiment-analysis'],
        settings: {}
      });
      
      const result = await agent.execute('Analyze the sentiment of customer feedback');
      
      return {
        task: 'sentiment analysis',
        result: result,
        hasConfidence: !!result.confidence,
        hasMetadata: !!result.metadata,
        processingTime: result.processingTime
      };
    });

    await this.runValidationTest('Business Intelligence Processing', 'functionality', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['business-intelligence'],
        settings: {}
      });
      
      const result = await agent.execute('Provide business analysis for revenue growth');
      
      return {
        task: 'business intelligence',
        result: result,
        hasStrategicInsights: result.result?.includes('strategy') || result.result?.includes('growth'),
        hasMetrics: result.result?.includes('metrics') || result.result?.includes('revenue')
      };
    });

    // === INTELLIGENCE TESTS ===
    
    await this.runValidationTest('Domain Knowledge Application', 'intelligence', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['domain-knowledge'],
        settings: {}
      });
      
      const tasks = [
        'Suggest product improvements',
        'Create marketing strategy',
        'Analyze business risks'
      ];
      
      const results = [];
      for (const task of tasks) {
        const result = await agent.execute(task);
        results.push({
          task,
          hasDomainExpertise: result.result?.length > 150,
          confidence: result.confidence,
          hasStructuredResponse: result.result?.includes('.') && result.result?.split('.').length > 3
        });
      }
      
      return {
        domainTests: results,
        avgConfidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
        allHaveExpertise: results.every(r => r.hasDomainExpertise)
      };
    });

    await this.runValidationTest('Contextual Understanding', 'intelligence', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['contextual-understanding'],
        settings: {}
      });
      
      const contextualTasks = [
        'How can we improve team productivity in a remote work environment?',
        'What are the best practices for code review in a development team?',
        'Strategies for reducing customer support tickets by 50%'
      ];
      
      const results = [];
      for (const task of contextualTasks) {
        const result = await agent.execute(task);
        results.push({
          task,
          addressesContext: result.result?.toLowerCase().includes('remote') || 
                           result.result?.toLowerCase().includes('team') ||
                           result.result?.toLowerCase().includes('support'),
          providesActionableAdvice: result.result?.includes('recommend') || 
                                  result.result?.includes('strategy') ||
                                  result.result?.includes('implement')
        });
      }
      
      return {
        contextualTests: results,
        contextAwareness: results.filter(r => r.addressesContext).length / results.length,
        actionableAdvice: results.filter(r => r.providesActionableAdvice).length / results.length
      };
    });

    // === PERFORMANCE TESTS ===
    
    await this.runValidationTest('Realistic Processing Times', 'performance', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['performance-testing'],
        settings: {}
      });
      
      const tasks = [
        'Simple analysis task',
        'Complex business strategy development',
        'Multi-step workflow processing'
      ];
      
      const timings = [];
      for (const task of tasks) {
        const start = Date.now();
        const result = await agent.execute(task);
        const actualTime = Date.now() - start;
        
        timings.push({
          task,
          actualTime,
          reportedTime: result.processingTime,
          realistic: actualTime > 50 && actualTime < 2000 // 50ms to 2s is realistic
        });
      }
      
      const realisticTimings = timings.filter(t => t.realistic).length;
      
      return {
        timingAnalysis: timings,
        realisticProcessingRate: (realisticTimings / timings.length) * 100,
        averageProcessingTime: timings.reduce((sum, t) => sum + t.actualTime, 0) / timings.length
      };
    });

    await this.runValidationTest('Concurrent Processing Performance', 'performance', async () => {
      const agentCount = 5;
      const agents = Array.from({ length: agentCount }, () => 
        new AIPoweredAgent({
          type: 'autonomous',
          capabilities: ['concurrent-processing'],
          settings: {}
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.all(
        agents.map((agent, i) => agent.execute(`Concurrent analysis task ${i}`))
      );
      const totalTime = Date.now() - startTime;
      
      const allSuccessful = results.every((r: any) => r.success);
      const avgConfidence = results.reduce((sum: number, r: any) => sum + (r.confidence || 0), 0) / results.length;
      
      return {
        agentCount,
        totalTime,
        averageTimePerAgent: totalTime / agentCount,
        allSuccessful,
        averageConfidence: avgConfidence,
        scalabilityScore: totalTime < 5000 ? 'excellent' : totalTime < 10000 ? 'good' : 'needs-improvement'
      };
    });

    // === USABILITY TESTS ===
    
    await this.runValidationTest('Output Readability and Structure', 'usability', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['structured-output'],
        settings: {}
      });
      
      const result = await agent.execute('Generate a comprehensive business analysis report');
      
      const content = result.result || '';
      const readability = {
        hasParagraphs: content.includes('. ') && content.split('. ').length > 3,
        hasStructure: content.includes(',') && content.includes(' and '),
        readableLength: content.length > 200 && content.length < 2000,
        hasProfessionalLanguage: content.includes('analysis') || content.includes('strategy') || content.includes('recommend')
      };
      
      const readabilityScore = Object.values(readability).filter(Boolean).length;
      
      return {
        contentLength: content.length,
        readability: readability,
        readabilityScore: (readabilityScore / Object.keys(readability).length) * 10,
        professionalQuality: readabilityScore >= 3
      };
    });

    await this.runValidationTest('API Consistency and Reliability', 'usability', async () => {
      const agent = new AIPoweredAgent({
        type: 'autonomous',
        capabilities: ['api-consistency'],
        settings: {}
      });
      
      const testCases = [
        { input: 'Test case 1', expectedFields: ['success', 'result', 'confidence', 'processingTime'] },
        { input: 'Test case 2', expectedFields: ['success', 'result', 'confidence', 'processingTime'] },
        { input: '', expectedFields: ['success', 'result', 'confidence', 'processingTime'] }
      ];
      
      const consistencyResults = [];
      for (const testCase of testCases) {
        const result = await agent.execute(testCase.input);
        const hasAllFields = testCase.expectedFields.every(field => field in result);
        
        consistencyResults.push({
          input: testCase.input,
          hasAllFields,
          success: result.success,
          hasConfidence: typeof result.confidence === 'number'
        });
      }
      
      const consistencyRate = consistencyResults.filter(r => r.hasAllFields).length / consistencyResults.length;
      
      return {
        consistencyTests: consistencyResults,
        consistencyRate: consistencyRate * 100,
        apiReliability: consistencyRate >= 0.9 ? 'excellent' : consistencyRate >= 0.7 ? 'good' : 'needs-improvement'
      };
    });

    return this.results;
  }

  generateValidationReport(): void {
    console.log('\n📊 Agent System Validation Report\n');
    
    const categories = ['functionality', 'intelligence', 'performance', 'usability'] as const;
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      const avgScore = categoryResults.reduce((sum: number, r: ValidationResult) => sum + r.score, 0) / total;
      
      console.log(`🔍 ${category.toUpperCase()} VALIDATION:`);
      console.log(`   Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
      console.log(`   Average Score: ${avgScore.toFixed(1)}/10`);
      
      categoryResults.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`   ${status} ${test.testName} (${test.duration}ms) [${test.score}/10]`);
      });
      console.log('');
    });

    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallScore = this.results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    
    console.log('📈 OVERALL VALIDATION SUMMARY:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalTests - totalPassed}`);
    console.log(`   Success Rate: ${((totalPassed/totalTests)*100).toFixed(1)}%`);
    console.log(`   Overall Score: ${overallScore.toFixed(1)}/10`);
    
    // Critical assessment
    const criticalIssues = this.results.filter(r => !r.passed || r.score < 6);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
      criticalIssues.forEach(test => {
        console.log(`   • ${test.testName}: Score ${test.score}/10`);
        test.issues.forEach(issue => console.log(`     - ${issue}`));
      });
      
      console.log('\n🔧 IMMEDIATE FIXES REQUIRED:');
      console.log('   1. Implement real AI processing capabilities');
      console.log('   2. Add realistic processing delays');
      console.log('   3. Enhance domain knowledge and expertise');
      console.log('   4. Improve output quality and structure');
      console.log('   5. Add comprehensive metadata and confidence scores');
    } else if (overallScore >= 8) {
      console.log('\n✅ AGENT SYSTEM IS PRODUCTION-READY');
      console.log('   All validation tests passed with high scores');
      console.log('   System demonstrates real intelligence and usability');
    } else {
      console.log('\n⚠️  AGENT SYSTEM NEEDS IMPROVEMENTS');
      console.log('   Basic functionality works but quality needs enhancement');
      console.log('   Focus on improving AI capabilities and output quality');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (overallScore < 7) {
      console.log('   • Major redesign needed - current system is too basic');
      console.log('   • Implement real AI/ML models');
      console.log('   • Add comprehensive domain knowledge');
    } else if (overallScore < 9) {
      console.log('   • Enhance existing AI capabilities');
      console.log('   • Improve output quality and consistency');
      console.log('   • Add more sophisticated analysis features');
    } else {
      console.log('   • System is excellent - consider adding advanced features');
      console.log('   • Expand domain knowledge coverage');
      console.log('   • Optimize for specific use cases');
    }
  }
}

// Export for use
export { AgentValidationTests };
export type { ValidationResult };

// Auto-run if called directly
if (require.main === module) {
  const validator = new AgentValidationTests();
  validator.runValidationSuite().then(results => {
    validator.generateValidationReport();
    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Validation tests failed:', error);
    process.exit(1);
  });
}

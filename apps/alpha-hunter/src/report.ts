/**
 * Performance Report Generator
 * Command-line tool to generate and display performance reports
 */

import 'dotenv/config';
import { performanceTracker } from './performance-metrics';
import { fundManager } from './fund-manager';

async function generateReport() {
  console.log('\n📊 Generating performance report...\n');
  
  try {
    const report = await performanceTracker.generateReport();
    console.log(report);
    
    // Also show fund manager status
    console.log('\n' + fundManager.getStatus());
    
    // Get detailed metrics
    const metrics = await performanceTracker.getMetrics();
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              📈 DETAILED METRICS                               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Sharpe Ratio:        ${metrics.sharpeRatio.toFixed(2).padStart(10)}                          ║`);
    console.log(`║  Profit Factor:       ${metrics.profitFactor.toFixed(2).padStart(10)}                          ║`);
    console.log(`║  Expectancy:          ${(metrics.expectancy >= 0 ? '+' : '')}$${metrics.expectancy.toFixed(2).padStart(9)}                          ║`);
    console.log(`║  Max Drawdown:        ${(metrics.maxDrawdown >= 0 ? '+' : '')}$${metrics.maxDrawdown.toFixed(2).padStart(9)}                          ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error: any) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

// Always run when executed as script
generateReport();

export { generateReport };


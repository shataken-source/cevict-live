import { generateSecurityAudit } from './security-audit.js';
import * as fs from 'fs';

async function runAudit() {
  console.log('🔍 Generating Security Audit Report...\n');
  
  try {
    const report = await generateSecurityAudit();
    
    const filename = `security-audit-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved: ${filename}`);
    console.log(`🎯 Overall Security Score: ${report.overallScore}/100`);
    
    if (report.recommendations.length > 0) {
      console.log('\n⚠️  Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    if (report.overallScore < 80) {
      console.log('\n❌ Security score below threshold (80)');
      process.exit(1);
    } else {
      console.log('\n✅ Security audit passed!');
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

runAudit();

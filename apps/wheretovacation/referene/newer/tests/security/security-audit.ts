import { testRLSPolicies } from './rls-policies.test';
import { testRateLimiting } from './rate-limiting.test';
import { test2FAEnforcement } from './2fa-enforcement.test';
import { runPenetrationTests } from './penetration-tests';
import * as fs from 'fs';

interface AuditReport {
  timestamp: string;
  overallScore: number;
  rlsTests: any[];
  rateLimitTests: any[];
  twoFactorTests: any[];
  penetrationTests: any[];
  recommendations: string[];
}

export async function generateSecurityAudit(): Promise<AuditReport> {
  console.log('🔒 Running Security Audit...\n');
  
  const rlsResults = await testRLSPolicies();
  console.log('✓ RLS Policy Tests Complete');
  
  const rateLimitResults = await testRateLimiting();
  console.log('✓ Rate Limiting Tests Complete');
  
  const twoFactorResults = await test2FAEnforcement();
  console.log('✓ 2FA Enforcement Tests Complete');
  
  const penTestResults = await runPenetrationTests();
  console.log('✓ Penetration Tests Complete\n');
  
  const totalTests = rlsResults.length + rateLimitResults.length + 
                     twoFactorResults.length + penTestResults.length;
  const passedTests = [
    ...rlsResults.filter(r => r.passed),
    ...rateLimitResults.filter(r => r.passed),
    ...twoFactorResults.filter(r => r.passed),
    ...penTestResults.filter(r => r.prevented)
  ].length;
  
  const score = Math.round((passedTests / totalTests) * 100);
  
  const recommendations: string[] = [];
  if (score < 100) recommendations.push('Review failed security tests');
  if (score < 80) recommendations.push('URGENT: Critical security issues detected');
  
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    overallScore: score,
    rlsTests: rlsResults,
    rateLimitTests: rateLimitResults,
    twoFactorTests: twoFactorResults,
    penetrationTests: penTestResults,
    recommendations
  };
  
  return report;
}

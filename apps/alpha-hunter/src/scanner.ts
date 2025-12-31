/**
 * Quick Scanner
 * Fast scan for immediate opportunities
 */

import 'dotenv/config';
import { AIBrain } from './ai-brain';
import { UnifiedFundManager } from './fund-manager';

async function scan() {
  console.log('🔍 Quick Scan Starting...\n');

  const brain = new AIBrain();
  const funds = new UnifiedFundManager();

  const account = await funds.getAccount();
  console.log(`💰 Balance: $${account.balance.toFixed(2)}\n`);

  const analysis = await brain.analyzeAllSources();

  console.log('\n═══════════════════════════════════════════');
  console.log('              SCAN RESULTS                 ');
  console.log('═══════════════════════════════════════════\n');

  console.log(`📊 Market: ${analysis.marketAnalysis}`);
  console.log(`⚠️ Risk: ${analysis.riskAssessment}\n`);

  if (!analysis.topOpportunity) {
    console.log('⏳ No opportunities meeting criteria.\n');
    return;
  }

  console.log('🎯 TOP OPPORTUNITIES:\n');

  analysis.allOpportunities.slice(0, 5).forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.title}`);
    console.log(`   Type: ${opp.type} | Platform: ${opp.action.platform}`);
    console.log(`   Confidence: ${opp.confidence}% | EV: +${opp.expectedValue.toFixed(1)}%`);
    console.log(`   Risk: ${opp.riskLevel} | Stake: $${opp.requiredCapital}`);
    console.log(`   → ${opp.action.instructions[0] || 'See details'}`);
    console.log('');
  });

  const suggestion = await brain.generateDailySuggestion(account.balance);
  console.log('\n═══════════════════════════════════════════');
  console.log('            DAILY SUGGESTION               ');
  console.log('═══════════════════════════════════════════\n');
  console.log(suggestion);
}

scan().catch(console.error);



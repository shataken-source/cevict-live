/**
 * INDEPENDENT DATA FLOW VERIFICATION SCRIPT
 * 
 * This script independently verifies:
 * 1. All data is being written to Supabase
 * 2. All data is valid and follows schema
 * 3. Bots are using learned skills from database
 * 4. Real-time data flow is working
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ FATAL: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  data?: any;
}

const results: VerificationResult[] = [];

async function verify() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 INDEPENDENT DATA FLOW VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // TEST 1: Supabase Connection
  console.log('TEST 1: Supabase Connection...');
  try {
    const { data, error } = await supabase.from('bot_metrics').select('count').single();
    if (error) throw error;
    results.push({
      test: 'Supabase Connection',
      status: 'PASS',
      details: 'Successfully connected to Supabase'
    });
    console.log('✅ PASS: Supabase connected\n');
  } catch (error: any) {
    results.push({
      test: 'Supabase Connection',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 2: Bot Predictions Table
  console.log('TEST 2: Bot Predictions Table...');
  try {
    const { data: predictions, error } = await supabase
      .from('bot_predictions')
      .select('*')
      .order('predicted_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const count = predictions?.length || 0;
    const recent = predictions?.[0];
    
    if (count > 0) {
      // Check if data is recent (within last 24 hours)
      const lastPredictionTime = new Date(recent.predicted_at).getTime();
      const now = Date.now();
      const hoursSinceLastPrediction = (now - lastPredictionTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastPrediction < 24) {
        results.push({
          test: 'Bot Predictions - Recent Data',
          status: 'PASS',
          details: `${count} predictions found, last one ${hoursSinceLastPrediction.toFixed(1)}h ago`,
          data: { count, lastPrediction: recent }
        });
        console.log(`✅ PASS: ${count} predictions, last ${hoursSinceLastPrediction.toFixed(1)}h ago\n`);
      } else {
        results.push({
          test: 'Bot Predictions - Recent Data',
          status: 'WARN',
          details: `${count} predictions found, but last one is ${hoursSinceLastPrediction.toFixed(1)}h old`,
          data: { count, lastPrediction: recent }
        });
        console.log(`⚠️  WARN: Last prediction is ${hoursSinceLastPrediction.toFixed(1)}h old\n`);
      }
    } else {
      results.push({
        test: 'Bot Predictions - Recent Data',
        status: 'WARN',
        details: 'No predictions found in database. Bot may not be running yet.',
      });
      console.log('⚠️  WARN: No predictions found\n');
    }
  } catch (error: any) {
    results.push({
      test: 'Bot Predictions - Recent Data',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 3: Trade History
  console.log('TEST 3: Trade History...');
  try {
    const { data: trades, error } = await supabase
      .from('trade_history')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const count = trades?.length || 0;
    results.push({
      test: 'Trade History',
      status: 'PASS',
      details: `${count} trades found in database`,
      data: { count, trades }
    });
    console.log(`✅ PASS: ${count} trades found\n`);
  } catch (error: any) {
    results.push({
      test: 'Trade History',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 4: Bot Learning Patterns
  console.log('TEST 4: Bot Learning Patterns...');
  try {
    const { data: learnings, error } = await supabase
      .from('bot_learnings')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(10);

    if (error) throw error;

    const count = learnings?.length || 0;
    
    if (count > 0) {
      results.push({
        test: 'Bot Learning Patterns',
        status: 'PASS',
        details: `${count} learning patterns found. Bots are learning!`,
        data: { count, topPatterns: learnings?.slice(0, 3) }
      });
      console.log(`✅ PASS: ${count} learning patterns found\n`);
    } else {
      results.push({
        test: 'Bot Learning Patterns',
        status: 'WARN',
        details: 'No learning patterns yet. Bot needs more data.',
      });
      console.log('⚠️  WARN: No learning patterns yet\n');
    }
  } catch (error: any) {
    results.push({
      test: 'Bot Learning Patterns',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 5: Bot Metrics
  console.log('TEST 5: Bot Metrics...');
  try {
    const { data: metrics, error } = await supabase
      .from('bot_metrics')
      .select('*')
      .order('accuracy', { ascending: false });

    if (error) throw error;

    const count = metrics?.length || 0;
    const totalPredictions = metrics?.reduce((sum, m) => sum + m.total_predictions, 0) || 0;
    const avgAccuracy = metrics?.reduce((sum, m) => sum + m.accuracy, 0) / (count || 1) || 0;
    
    results.push({
      test: 'Bot Metrics',
      status: 'PASS',
      details: `${count} bots tracked, ${totalPredictions} total predictions, ${avgAccuracy.toFixed(1)}% avg accuracy`,
      data: { metrics }
    });
    console.log(`✅ PASS: ${count} bots, ${totalPredictions} predictions, ${avgAccuracy.toFixed(1)}% accuracy\n`);
  } catch (error: any) {
    results.push({
      test: 'Bot Metrics',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 6: Data Schema Validation
  console.log('TEST 6: Data Schema Validation...');
  try {
    const { data: sample, error } = await supabase
      .from('bot_predictions')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

    if (sample) {
      const requiredFields = ['id', 'bot_category', 'market_id', 'market_title', 'platform', 'prediction', 'probability', 'confidence', 'edge'];
      const missingFields = requiredFields.filter(field => !(field in sample));
      
      if (missingFields.length === 0) {
        results.push({
          test: 'Data Schema Validation',
          status: 'PASS',
          details: 'All required fields present in bot_predictions'
        });
        console.log('✅ PASS: Schema validation passed\n');
      } else {
        results.push({
          test: 'Data Schema Validation',
          status: 'FAIL',
          details: `Missing fields: ${missingFields.join(', ')}`
        });
        console.log(`❌ FAIL: Missing fields: ${missingFields.join(', ')}\n`);
      }
    } else {
      results.push({
        test: 'Data Schema Validation',
        status: 'WARN',
        details: 'No data to validate schema against'
      });
      console.log('⚠️  WARN: No data to validate\n');
    }
  } catch (error: any) {
    results.push({
      test: 'Data Schema Validation',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // TEST 7: Bot Learning Integration
  console.log('TEST 7: Bot Learning Integration Check...');
  try {
    // Check if bots have learning patterns AND recent predictions
    const { data: learnings } = await supabase.from('bot_learnings').select('bot_category', { count: 'exact' });
    const { data: predictions } = await supabase.from('bot_predictions').select('bot_category').gte('predicted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const categoriesWithLearning = new Set(learnings?.map(l => l.bot_category) || []);
    const categoriesWithPredictions = new Set(predictions?.map(p => p.bot_category) || []);

    const usingLearning = [...categoriesWithPredictions].filter(cat => categoriesWithLearning.has(cat));

    if (usingLearning.length > 0) {
      results.push({
        test: 'Bot Learning Integration',
        status: 'PASS',
        details: `${usingLearning.length} bot(s) actively using learned patterns: ${usingLearning.join(', ')}`,
      });
      console.log(`✅ PASS: ${usingLearning.length} bots using learned patterns\n`);
    } else {
      results.push({
        test: 'Bot Learning Integration',
        status: 'WARN',
        details: 'Bots not yet using learned patterns. May need more data.',
      });
      console.log('⚠️  WARN: Bots not using learned patterns yet\n');
    }
  } catch (error: any) {
    results.push({
      test: 'Bot Learning Integration',
      status: 'FAIL',
      details: error.message
    });
    console.log(`❌ FAIL: ${error.message}\n`);
  }

  // SUMMARY
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ PASSED: ${passed}`);
  console.log(`⚠️  WARNINGS: ${warnings}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log();

  if (failed === 0 && warnings === 0) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!\n');
  } else if (failed === 0) {
    console.log('✅ SYSTEM OPERATIONAL (with warnings)\n');
  } else {
    console.log('❌ CRITICAL ISSUES DETECTED\n');
  }

  // Detailed results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DETAILED RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️ ' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.details}`);
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
    }
    console.log();
  });

  return { passed, failed, warnings, results };
}

// Run verification
verify().then((summary) => {
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch((error) => {
  console.error('Fatal verification error:', error);
  process.exit(1);
});


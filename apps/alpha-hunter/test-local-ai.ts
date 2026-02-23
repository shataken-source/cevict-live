/**
 * Test Local AI Integration
 * Verifies Ollama is running and can analyze crypto data
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { localAI } from './src/lib/local-ai';

async function testLocalAI() {
  console.log('🧪 Testing Local AI Integration\n');
  
  console.log('Configuration:');
  console.log(`  Enabled: ${process.env.USE_LOCAL_AI}`);
  console.log(`  URL: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`  Model: ${process.env.OLLAMA_MODEL || 'llama3.2:3b'}\n`);

  if (!localAI.isEnabled()) {
    console.log('❌ Local AI is disabled');
    console.log('   Set USE_LOCAL_AI=true in .env.local to enable\n');
    console.log('📖 See LOCAL_AI_SETUP.md for installation instructions');
    return;
  }

  console.log('📡 Checking if Ollama is running...');
  const available = await localAI.isAvailable();
  
  if (!available) {
    console.log('❌ Ollama is not running or not accessible\n');
    console.log('To start Ollama:');
    console.log('  1. Install from https://ollama.ai');
    console.log('  2. Run: ollama run llama3.2:3b');
    console.log('  3. Keep terminal open and run this test again\n');
    return;
  }

  console.log('✅ Ollama is running!\n');

  // Test crypto analysis
  console.log('🔍 Testing crypto analysis...\n');
  
  const testData = {
    symbol: 'BTC-USDC',
    price: 65000,
    momentum: { trend: 'UP', strength: 2.5 },
    fearGreed: 25,
    btcDominance: 56.3,
    volume24h: 83.1e9
  };

  console.log('Test Data:');
  console.log(`  Symbol: ${testData.symbol}`);
  console.log(`  Price: $${testData.price.toLocaleString()}`);
  console.log(`  Momentum: ${testData.momentum.trend} (${testData.momentum.strength}%)`);
  console.log(`  Fear & Greed: ${testData.fearGreed} (Extreme Fear)`);
  console.log(`  BTC Dominance: ${testData.btcDominance}%`);
  console.log(`  24h Volume: $${(testData.volume24h / 1e9).toFixed(1)}B\n`);

  console.log('⏳ Analyzing (this may take 10-30 seconds)...\n');

  try {
    const result = await localAI.analyzeCrypto(testData);
    
    console.log('✅ Analysis Complete!\n');
    console.log('Results:');
    console.log(`  Signal: ${result.signal}`);
    console.log(`  Confidence: ${result.confidence}%`);
    console.log(`  Reason: ${result.reason}\n`);

    if (result.confidence >= 70) {
      console.log('🎯 High confidence signal - would execute trade');
    } else if (result.confidence >= 50) {
      console.log('⚠️ Medium confidence - might skip trade');
    } else {
      console.log('❌ Low confidence - would skip trade');
    }

    console.log('\n✅ Local AI is working correctly!');
    console.log('🚀 You can now use free local AI for crypto analysis');
    
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Ollama is running: ollama run llama3.2:3b');
    console.error('  2. Check model is downloaded: ollama list');
    console.error('  3. Verify port 11434 is accessible');
  }
}

testLocalAI();

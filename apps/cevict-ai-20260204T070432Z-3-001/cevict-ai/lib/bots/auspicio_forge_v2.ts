/**
 * PRODUCTION CRYPTO TRADING BOT - v2.1 (Auspicio Forge Edition)
 * Integrated: Sinch SMS, Supabase DB, Coinbase CDP, System Heartbeat
 */

import 'dotenv/config';
import * as crypto from 'crypto';
import { SignJWT } from 'jose';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// AI AGENT INFRASTRUCTURE (The "Forge" Connections)
// ============================================================================

// 1. SUPABASE CLIENT (The Memory) 
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 2. SINCH NOTIFIER (The Messenger) 
async function sendSinchAlert(message: string) {
  const url = `https://us.sms.api.sinch.com/xms/v1/${process.env.SINCH_SERVICE_PLAN_ID}/batches`;
  try {
    await axios.post(url, {
      from: process.env.SINCH_FROM || '+12085812971',
      to: [process.env.MY_PHONE_NUMBER],
      body: `FORGE: ${message}`
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.SINCH_API_TOKEN}`, 
        'Content-Type': 'application/json' 
      }
    });
    console.log("✅ Sinch update sent to phone.");
  } catch (err: any) {
    console.error("❌ Sinch alert failed:", err.response?.data || err.message);
  }
}

// 3. COINBASE CDP AUTH
async function createJWT(uri: string): Promise<string> {
  const apiKey = process.env.COINBASE_API_KEY!;
  const privateKey = process.env.COINBASE_PRIVATE_KEY!;
  
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const ecPrivateKey = crypto.createPrivateKey({ key: formattedKey, format: 'pem' });
  
  return await new SignJWT({ uri })
    .setProtectedHeader({ 
        alg: 'ES256', 
        kid: apiKey, 
        nonce: crypto.randomBytes(16).toString('hex'), 
        typ: 'JWT' 
    })
    .setIssuedAt()
    .setExpirationTime('2m')
    .setIssuer('cdp')
    .sign(ecPrivateKey);
}

// ============================================================================
// TRADING LOGIC
// ============================================================================

interface BotConfig {
    initialCapital: number;
    tradingPairs: string[];
}

class TradingBot {
  private config: BotConfig;
  private isRunning: boolean = false;
  private cash: number;
  private positions: Map<string, any> = new Map();
  private lastHeartbeatDay: number = -1; // Prevents spamming texts within the same minute

  constructor(config: BotConfig) {
    this.config = config;
    this.cash = config.initialCapital;
  }

  // === SYSTEM HEARTBEAT ===
  private async sendHeartbeat() {
    const totalValue = this.cash + Array.from(this.positions.values()).reduce((sum, p) => sum + (p.size || 0), 0);
    await sendSinchAlert(`Heartbeat: System 24/7 active. Total Value: $${totalValue.toFixed(2)}. Go back to sleep.`);
  }

  // === THE PAYOUT EXECUTION ===
  private async executeTrade(symbol: string, side: 'buy' | 'sell', size: number) {
    console.log(`🚀 Executing ${side} for ${symbol}...`);

    // 1. Persist to Supabase (Memory)
    const { error } = await supabase.from('trade_history').insert([{
      symbol,
      side,
      size,
      timestamp: new Date().toISOString(),
      mode: process.env.BOT_MODE || 'paper'
    }]);

    if (error) {
        console.error("❌ Supabase Log Failed:", error.message);
    }

    // 2. Alert Owner via Sinch
    await sendSinchAlert(`💰 TRADE: ${side.toUpperCase()} ${symbol} size $${size.toFixed(2)}. Tracking in Supabase.`);
  }

  async start() {
    // Validate Env on Start
    if (!process.env.SINCH_API_TOKEN || !process.env.MY_PHONE_NUMBER) {
        throw new Error("Missing critical environment variables. Check your .env file.");
    }

    this.isRunning = true;
    console.log("🚀 Auspicio Forge Engine Ignited.");
    await sendSinchAlert("Engine Ignited. Trading Bot v2.1 is now Live.");

    while (this.isRunning) {
      try {
        const now = new Date();
        
        // Daily status report at 8:00 AM (only once)
        if (now.getHours() === 8 && now.getMinutes() === 0 && this.lastHeartbeatDay !== now.getDate()) {
          await this.sendHeartbeat();
          this.lastHeartbeatDay = now.getDate();
        }

        await this.tradingCycle();
        
        // 1-minute loop delay
        await new Promise(r => setTimeout(r, 60000)); 
      } catch (error: any) {
        console.error('Cycle Error:', error.message);
        await new Promise(r => setTimeout(r, 10000)); // Wait 10s before retry on crash
      }
    }
  }

  private async tradingCycle() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Monitoring data feeds for ${this.config.tradingPairs.join(', ')}...`);
    
    // TODO: Insert your TechnicalAnalysis logic here
    // Example flow:
    // 1. const jwt = await createJWT('GET coinbase.com/api/v3/brokerage/accounts');
    // 2. const prices = await axios.get(...)
    // 3. if (rsi < 30) await this.executeTrade('BTC-USD', 'buy', 100);
  }
}

// === MAIN EXECUTION ===
async function main() {
  const bot = new TradingBot({
    initialCapital: Number(process.env.INITIAL_CAPITAL) || 1000,
    tradingPairs: ['BTC-USD', 'ETH-USD']
  });
  
  await bot.start();
}

main().catch(async (err) => {
    console.error("CRITICAL SYSTEM FAILURE:", err);
    await sendSinchAlert(`CRITICAL FAILURE: ${err.message}`);
});
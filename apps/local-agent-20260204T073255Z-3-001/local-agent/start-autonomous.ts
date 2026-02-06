/**
 * Start Autonomous Mode
 * AI takes full control - makes $250 by midnight
 */

import 'dotenv/config';
import { autonomousOrchestrator } from './src/autonomous-orchestrator.js';

async function start() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🤖 AUTONOMOUS MODE STARTING 🤖                        ║
║                                                              ║
║  ⏰ Current Time: ${new Date().toLocaleTimeString()}                    ║
║  🎯 Goal: $250 by midnight                                  ║
║  ⏱️  Time Remaining: ~8.5 hours                            ║
║                                                              ║
║  🚨 Break-In Available: Create .break-in file              ║
║                                                              ║
║  YOU CAN WALK AWAY - AI HAS CONTROL                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  try {
    await autonomousOrchestrator.start();
  } catch (error: any) {
    console.error('❌ Failed to start autonomous mode:', error.message);
    process.exit(1);
  }
}

start();


/**
 * ALPHA-HUNTER ENTRY POINT
 * AI-Powered Prediction Market & Crypto Trading Bot
 * 
 * This is the ONLY place the engine is created and started.
 */

import { EventContractExecutionEngine } from './live-trader-24-7';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🧠 ALPHA-HUNTER - AI-POWERED TRADING 🧠                  ║
║                                                              ║
║     Kalshi Prediction Markets + Coinbase Crypto              ║
║     Powered by Claude AI Analysis                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Create single engine instance
const engine = new EventContractExecutionEngine();

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`\\n⚠️  Received ${signal}, shutting down gracefully...`);
  engine.stop();
  setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start the engine
engine.start().catch(err => {
  console.error('❌ Fatal error starting engine:', err);
  process.exit(1);
});

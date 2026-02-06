#!/usr/bin/env node
/**
 * TRAIN BOT ACADEMY - Train All Expert Bots
 * 
 * This script:
 * 1. Loads historical predictions from database
 * 2. Trains all expert bots using Bot Academy
 * 3. Displays training results
 * 
 * Usage:
 *   npm run train-bots
 *   npx tsx src/train-bot-academy.ts
 */

import 'dotenv/config';
import { botAcademy } from './intelligence/bot-academy.js';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  white: '\x1b[37m',
};

async function main() {
  console.log(`
${c.brightCyan}╔════════════════════════════════════════════════════════════════════╗${c.reset}
${c.brightCyan}║${c.reset}                 🎓 ${c.brightYellow}BOT ACADEMY TRAINING${c.reset} 🎓                         ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}                                                                    ${c.brightCyan}║${c.reset}
${c.brightCyan}║${c.reset}  ${c.white}Training expert bots from historical prediction data${c.reset}         ${c.brightCyan}║${c.reset}
${c.brightCyan}╚════════════════════════════════════════════════════════════════════╝${c.reset}
  `);

  try {
    // Train all expert bots
    await botAcademy.trainAllExperts();

    console.log(`${c.brightGreen}✅ All bots successfully trained!${c.reset}`);
    console.log(`${c.white}Bots are now ready to make predictions with learned patterns.${c.reset}\n`);

  } catch (error) {
    console.error(`${c.brightCyan}❌ Training failed:${c.reset}`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;


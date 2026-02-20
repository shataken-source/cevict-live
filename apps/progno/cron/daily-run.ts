#!/usr/bin/env node
/**
 * Progno Daily Cron Job
 * 
 * Runs daily at 6:00 AM, 12:00 PM, and 6:00 PM
 * Generates predictions for all sports leagues
 * 
 * Schedule: 0 6,12,18 * * *
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = 'C:\\cevict-archive\\progno\\logs';
const ARCHIVE_DIR = 'C:\\cevict-archive\\Probabilityanalyzer\\predictions';

class CronLogger {
  private logs: string[] = [];
  
  info(msg: string) {
    const line = `[${new Date().toISOString()}] [PROGNO-CRON] ${msg}`;
    console.log(line);
    this.logs.push(line);
  }
  
  error(msg: string) {
    const line = `[${new Date().toISOString()}] [PROGNO-CRON] ERROR: ${msg}`;
    console.error(line);
    this.logs.push(line);
  }
  
  async save() {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `cron-${today}.log`);
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(logFile, this.logs.join('\n') + '\n');
  }
}

const logger = new CronLogger();

async function runSimulation(): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info('Starting progno simulation...');
    
    const proc = spawn('npm', ['run', 'simulate'], {
      cwd: 'C:\\cevict-live\\apps\\progno',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      logger.info(`SIM: ${data.toString().trim()}`);
    });
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      logger.error(`SIM ERR: ${data.toString().trim()}`);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('Simulation completed successfully');
        resolve(true);
      } else {
        logger.error(`Simulation failed with code ${code}`);
        resolve(false);
      }
    });
    
    // Timeout after 10 minutes
    setTimeout(() => {
      logger.error('Simulation timed out after 10 minutes');
      proc.kill();
      resolve(false);
    }, 600000);
  });
}

async function archivePredictions(): Promise<void> {
  try {
    logger.info('Archiving predictions...');
    
    const prognoDir = 'C:\\cevict-live\\apps\\progno';
    const files = await fs.readdir(prognoDir);
    
    const predictionFiles = files.filter(f => 
      f.startsWith('predictions-') && f.endsWith('.json')
    );
    
    for (const file of predictionFiles) {
      const sourcePath = path.join(prognoDir, file);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const destPath = path.join(ARCHIVE_DIR, `${timestamp}_${file}`);
      
      await fs.copyFile(sourcePath, destPath);
      logger.info(`Archived: ${file} -> ${destPath}`);
    }
  } catch (error: any) {
    logger.error(`Archive failed: ${error.message}`);
  }
}

async function notifySuccess(): Promise<void> {
  // TODO: Add Discord webhook notification
  logger.info('Predictions ready for downstream processing');
}

async function main() {
  logger.info('========================================');
  logger.info('PROGNO DAILY CRON - Starting run');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('========================================');
  
  try {
    // Run simulation
    const success = await runSimulation();
    
    if (success) {
      // Archive the predictions
      await archivePredictions();
      
      // Notify downstream systems
      await notifySuccess();
      
      logger.info('✅ Cron job completed successfully');
    } else {
      logger.error('❌ Cron job failed - simulation error');
      process.exit(1);
    }
  } catch (error: any) {
    logger.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  } finally {
    await logger.save();
  }
}

main();

#!/usr/bin/env node
/**
 * Alpha-Hunter Daily Cron Job
 * 
 * Runs daily at 7:00 AM
 * Fetches Kalshi markets, generates predictions, saves to Supabase
 * Syncs picks to Prognostication API
 * 
 * Schedule: 0 7 * * *
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const LOG_DIR = 'C:\\cevict-archive\\alpha-hunter\\logs';
const OUTPUT_DIR = 'C:\\cevict-archive\\alpha-hunter\\output';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

class CronLogger {
  private logs: string[] = [];
  
  info(msg: string) {
    const line = `[${new Date().toISOString()}] [ALPHA-HUNTER-CRON] ${msg}`;
    console.log(line);
    this.logs.push(line);
  }
  
  error(msg: string) {
    const line = `[${new Date().toISOString()}] [ALPHA-HUNTER-CRON] ERROR: ${msg}`;
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

async function runKalshiTrainer(): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info('Starting Kalshi trainer...');
    
    const proc = spawn('npm', ['run', 'kalshi'], {
      cwd: 'C:\\cevict-live\\apps\\alpha-hunter',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      const lines = data.toString().trim().split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) logger.info(`KALSHI: ${line.trim()}`);
      });
    });
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      const lines = data.toString().trim().split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) logger.error(`KALSHI ERR: ${line.trim()}`);
      });
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('Kalshi trainer completed successfully');
        resolve(true);
      } else {
        logger.error(`Kalshi trainer failed with code ${code}`);
        resolve(false);
      }
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      logger.error('Kalshi trainer timed out after 5 minutes');
      proc.kill();
      resolve(false);
    }, 300000);
  });
}

async function runLiveTraderShort(): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info('Starting live trader (5 min run)...');
    
    const proc = spawn('npm', ['run', 'live'], {
      cwd: 'C:\\cevict-live\\apps\\alpha-hunter',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      const lines = data.toString().trim().split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) logger.info(`LIVE: ${line.trim()}`);
      });
    });
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      const lines = data.toString().trim().split('\n');
      lines.forEach((line: string) => {
        if (line.trim()) logger.error(`LIVE ERR: ${line.trim()}`);
      });
    });
    
    // Kill after 5 minutes regardless
    setTimeout(() => {
      logger.info('Stopping live trader after 5 minutes...');
      proc.kill('SIGTERM');
    }, 300000);
    
    proc.on('close', (code) => {
      logger.info(`Live trader stopped (code: ${code})`);
      resolve(true); // Consider this success even if interrupted
    });
  });
}

async function syncToPrognostication(): Promise<boolean> {
  try {
    logger.info('Syncing picks to Prognostication API...');
    
    const picksFile = path.join('C:\\cevict-live\\apps\\alpha-hunter', '.kalshi-picks.json');
    
    if (!await fs.access(picksFile).then(() => true).catch(() => false)) {
      logger.error('No picks file found to sync');
      return false;
    }
    
    const picks = JSON.parse(await fs.readFile(picksFile, 'utf8'));
    
    const response = await fetch('http://localhost:3005/api/kalshi/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictions: picks })
    });
    
    if (response.ok) {
      logger.info('Successfully synced picks to Prognostication');
      return true;
    } else {
      logger.error(`Sync failed: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logger.error(`Sync error: ${error.message}`);
    return false;
  }
}

async function checkDatabaseHealth(): Promise<void> {
  if (!supabase) {
    logger.error('Supabase not configured - cannot check health');
    return;
  }
  
  try {
    const { count, error } = await supabase
      .from('bot_predictions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      logger.error(`Database health check failed: ${error.message}`);
    } else {
      logger.info(`Database health check: ${count} predictions in bot_predictions`);
    }
  } catch (error: any) {
    logger.error(`Health check error: ${error.message}`);
  }
}

async function archiveOutput(): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(OUTPUT_DIR, timestamp);
    
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Copy .kalshi-picks.json if it exists
    const picksFile = path.join('C:\\cevict-live\\apps\\alpha-hunter', '.kalshi-picks.json');
    if (await fs.access(picksFile).then(() => true).catch(() => false)) {
      await fs.copyFile(picksFile, path.join(archiveDir, 'kalshi-picks.json'));
    }
    
    logger.info(`Output archived to: ${archiveDir}`);
  } catch (error: any) {
    logger.error(`Archive failed: ${error.message}`);
  }
}

async function main() {
  logger.info('========================================');
  logger.info('ALPHA-HUNTER DAILY CRON - Starting run');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('========================================');
  
  try {
    // Step 1: Run Kalshi trainer
    const kalshiSuccess = await runKalshiTrainer();
    
    // Step 2: Run live trader for 5 minutes
    await runLiveTraderShort();
    
    // Step 3: Check database health
    await checkDatabaseHealth();
    
    // Step 4: Archive output
    await archiveOutput();
    
    // Step 5: Try to sync to prognostication
    await syncToPrognostication();
    
    if (kalshiSuccess) {
      logger.info('✅ Cron job completed successfully');
    } else {
      logger.error('⚠️ Cron job completed with warnings (Kalshi may have issues)');
    }
  } catch (error: any) {
    logger.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  } finally {
    await logger.save();
  }
}

main();

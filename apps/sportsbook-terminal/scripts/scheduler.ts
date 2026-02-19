#!/usr/bin/env node
/**
 * Probability Analyzer Scheduler
 *
 * This script:
 * 1. Runs prediction generation for the current date
 * 2. Processes graded results
 * 3. Saves predictions and results to Supabase
 * 4. Archives processed files to C:\cevict-archive\Probabilityanalyzer
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const CONFIG = {
  predictionsDir: path.join(__dirname, '../public'),
  resultsDir: path.join(__dirname, '../data/results'),
  archiveDir: 'C:\\cevict-archive\\Probabilityanalyzer',
  logDir: path.join(__dirname, '../logs'),
  resultsGenerationTime: '03:00', // 3:00 AM for next-day results
};

// Verify we're using production database
const PRODUCTION_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate production database
if (supabaseUrl && !supabaseUrl.includes('rdbuwyefbgnbuhmjrizo')) {
  console.error('⚠️  WARNING: Not using production database!');
  console.error('   Expected:', PRODUCTION_URL);
  console.error('   Found:', supabaseUrl);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ FATAL: Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Logger
class Logger {
  private logs: string[] = [];

  info(msg: string) {
    const line = `[${new Date().toISOString()}] INFO: ${msg}`;
    console.log(line);
    this.logs.push(line);
  }

  error(msg: string) {
    const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
    console.error(line);
    this.logs.push(line);
  }

  success(msg: string) {
    const line = `[${new Date().toISOString()}] ✅ ${msg}`;
    console.log(line);
    this.logs.push(line);
  }

  async save() {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(CONFIG.logDir, `scheduler-${today}.log`);
    await fs.mkdir(CONFIG.logDir, { recursive: true });
    await fs.appendFile(logFile, this.logs.join('\n') + '\n');
  }
}

const logger = new Logger();

// Types
interface Prediction {
  id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  pick: string;
  pick_type: 'SPREAD' | 'MONEYLINE' | 'TOTAL' | string;
  recommended_line?: number;
  odds: number;
  confidence: number;
  game_time: string;
  game_id: string;
  expected_value: number;
  mc_win_probability: number;
  timestamp: string;
}

interface PredictionFile {
  date: string;
  generatedAt: string;
  count: number;
  picks: Prediction[];
  summary: {
    total_picks: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
    plus_ev: number;
    avg_confidence: number;
    avg_edge: number;
  };
}

interface GradedResult {
  game_id: string;
  home_team: string;
  away_team: string;
  sport: string;
  confidence: number;
  status: 'win' | 'loss' | 'pending';
  actual_score?: { home: number; away: number };
  pick_result?: string;
}

interface ResultsFile {
  date: string;
  results: GradedResult[];
  summary?: {
    total: number;
    winRate: number;
    pending: number;
    graded: number;
  };
}

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(CONFIG.archiveDir, { recursive: true });
  await fs.mkdir(CONFIG.logDir, { recursive: true });
  await fs.mkdir(CONFIG.resultsDir, { recursive: true });
  logger.info('Directories verified');
}

// Find prediction files
async function findPredictionFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CONFIG.predictionsDir);
    return files
      .filter(f => f.match(/predictions.*\.json$/i))
      .map(f => path.join(CONFIG.predictionsDir, f));
  } catch (err) {
    logger.error(`Failed to read predictions dir: ${err}`);
    return [];
  }
}

// Find results files
async function findResultsFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CONFIG.resultsDir);
    return files
      .filter(f => f.match(/results.*\.json$/i))
      .map(f => path.join(CONFIG.resultsDir, f));
  } catch (err) {
    // Directory might not exist yet
    return [];
  }
}

// Save predictions to Supabase
async function savePredictionsToSupabase(data: PredictionFile, sourceFile: string): Promise<boolean> {
  try {
    logger.info(`Saving ${data.picks.length} predictions to Supabase...`);

    const records = data.picks.map(pick => ({
      game_id: pick.game_id,
      sport: pick.sport,
      league: pick.league,
      home_team: pick.home_team,
      away_team: pick.away_team,
      pick: pick.pick,
      pick_type: pick.pick_type,
      recommended_line: pick.recommended_line,
      odds: pick.odds,
      confidence: pick.confidence,
      expected_value: pick.expected_value,
      win_probability: pick.mc_win_probability,
      game_time: pick.game_time,
      prediction_date: data.date,
      generated_at: data.generatedAt,
      source_file: path.basename(sourceFile),
      metadata: {
        summary: data.summary,
        raw: pick
      }
    }));

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('daily_predictions')
        .upsert(batch, {
          onConflict: 'game_id,prediction_date',
          ignoreDuplicates: false
        });

      if (error) {
        logger.error(`Supabase insert error: ${error.message}`);
        return false;
      }
    }

    logger.success(`Saved ${records.length} predictions to Supabase`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to save predictions: ${err.message}`);
    return false;
  }
}

// Save results to Supabase
async function saveResultsToSupabase(data: ResultsFile, sourceFile: string): Promise<boolean> {
  try {
    logger.info(`Saving ${data.results.length} results to Supabase...`);

    const records = data.results.map(result => ({
      game_id: result.game_id,
      sport: result.sport,
      home_team: result.home_team,
      away_team: result.away_team,
      confidence: result.confidence,
      status: result.status,
      actual_score: result.actual_score,
      pick_result: result.pick_result,
      result_date: data.date,
      source_file: path.basename(sourceFile),
      processed_at: new Date().toISOString()
    }));

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('graded_results')
        .upsert(batch, {
          onConflict: 'game_id,result_date',
          ignoreDuplicates: false
        });

      if (error) {
        logger.error(`Supabase insert error: ${error.message}`);
        return false;
      }
    }

    // Update prediction outcomes
    for (const result of data.results) {
      if (result.status !== 'pending') {
        await supabase
          .from('daily_predictions')
          .update({
            outcome: result.status,
            actual_score: result.actual_score,
            graded_at: new Date().toISOString()
          })
          .eq('game_id', result.game_id)
          .eq('prediction_date', data.date);
      }
    }

    logger.success(`Saved ${records.length} results to Supabase`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to save results: ${err.message}`);
    return false;
  }
}

// Archive processed file
async function archiveFile(sourcePath: string, subdir: string): Promise<boolean> {
  try {
    const filename = path.basename(sourcePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${timestamp}_${filename}`;
    const destDir = path.join(CONFIG.archiveDir, subdir);
    const destPath = path.join(destDir, archiveName);

    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    await fs.unlink(sourcePath);

    logger.success(`Archived: ${filename} → ${destPath}`);
    return true;
  } catch (err: any) {
    logger.error(`Failed to archive file: ${err.message}`);
    return false;
  }
}

// Process predictions
async function processPredictions(): Promise<number> {
  const files = await findPredictionFiles();
  if (files.length === 0) {
    logger.info('No prediction files found');
    return 0;
  }

  logger.info(`Found ${files.length} prediction file(s)`);
  let processed = 0;

  for (const filePath of files) {
    try {
      logger.info(`Processing: ${path.basename(filePath)}`);

      const content = await fs.readFile(filePath, 'utf-8');
      const data: PredictionFile = JSON.parse(content);

      // Validate structure
      if (!data.picks || !Array.isArray(data.picks)) {
        logger.error(`Invalid predictions format in ${filePath}`);
        continue;
      }

      // Save to Supabase
      const saved = await savePredictionsToSupabase(data, filePath);
      if (!saved) {
        logger.error(`Failed to save predictions from ${filePath}`);
        continue;
      }

      // Archive file
      const archived = await archiveFile(filePath, 'predictions');
      if (!archived) {
        logger.error(`Failed to archive ${filePath}`);
        continue;
      }

      processed++;
    } catch (err: any) {
      logger.error(`Error processing ${filePath}: ${err.message}`);
    }
  }

  return processed;
}

// Process results
async function processResults(): Promise<number> {
  const files = await findResultsFiles();
  if (files.length === 0) {
    logger.info('No results files found');
    return 0;
  }

  logger.info(`Found ${files.length} results file(s)`);
  let processed = 0;

  for (const filePath of files) {
    try {
      logger.info(`Processing: ${path.basename(filePath)}`);

      const content = await fs.readFile(filePath, 'utf-8');
      const data: ResultsFile = JSON.parse(content);

      // Validate structure
      if (!data.results || !Array.isArray(data.results)) {
        logger.error(`Invalid results format in ${filePath}`);
        continue;
      }

      // Save to Supabase
      const saved = await saveResultsToSupabase(data, filePath);
      if (!saved) {
        logger.error(`Failed to save results from ${filePath}`);
        continue;
      }

      // Archive file
      const archived = await archiveFile(filePath, 'results');
      if (!archived) {
        logger.error(`Failed to archive ${filePath}`);
        continue;
      }

      processed++;
    } catch (err: any) {
      logger.error(`Error processing ${filePath}: ${err.message}`);
    }
  }

  return processed;
}

// Main execution
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PROBABILITY ANALYZER SCHEDULER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();

  try {
    await ensureDirectories();

    // Process predictions
    logger.info('Phase 1: Processing predictions...');
    const predictionsProcessed = await processPredictions();

    // Process results
    logger.info('Phase 2: Processing results...');
    const resultsProcessed = await processResults();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 SCHEDULER COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Predictions processed: ${predictionsProcessed}`);
    console.log(`Results processed: ${resultsProcessed}`);
    console.log(`Duration: ${duration}s`);
    console.log('');

    await logger.save();

    process.exit(predictionsProcessed + resultsProcessed > 0 ? 0 : 0);
  } catch (err: any) {
    logger.error(`Fatal error: ${err.message}`);
    await logger.save();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, processPredictions, processResults };

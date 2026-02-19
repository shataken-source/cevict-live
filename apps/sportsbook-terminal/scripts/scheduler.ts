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

console.log('[SCHEDULER] Starting up...');

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

console.log('[SCHEDULER] Imports loaded');

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('[SCHEDULER] __dirname:', __dirname);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
console.log('[SCHEDULER] dotenv loaded');

// Configuration
const CONFIG = {
  predictionsDir: 'C:\\cevict-live\\apps\\progno',  // Where prediction files are created
  resultsDir: 'C:\\cevict-live\\apps\\progno',      // Where results files are created
  archiveDir: 'C:\\cevict-archive\\Probabilityanalyzer',
  logDir: path.join(__dirname, '../logs'),
  resultsGenerationTime: '03:00', // 3:00 AM for next-day results
};

console.log('[SCHEDULER] CONFIG:', CONFIG);

// Verify we're using production database
const PRODUCTION_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[SCHEDULER] Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
console.log('[SCHEDULER] Supabase Key:', supabaseKey ? 'Set' : 'NOT SET');

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

console.log('[SCHEDULER] Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('[SCHEDULER] Supabase client created');

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

// Save predictions to Supabase - using existing predictions table structure
async function savePredictionsToSupabase(data: PredictionFile, sourceFile: string): Promise<boolean> {
  try {
    logger.info(`Processing ${data.picks.length} picks for Supabase...`);

    const today = new Date().toISOString().split('T')[0];
    let marketsCreated = 0;
    let predictionsCreated = 0;

    for (const pick of data.picks) {
      try {
        // Step 1: Create market for the game
        const gameId = pick.id || pick.game_id || `${pick.league}-${pick.home_team}-${pick.away_team}-${today}`;

        const marketData = {
          external_id: gameId,
          venue: 'sportsbook',
          market_type: 'sports',
          event_name: `${pick.home_team} vs ${pick.away_team}`,
          event_date: pick.game_time || new Date().toISOString(),
          sport: pick.sport || pick.league,
          league: pick.league,
          home_team: pick.home_team,
          away_team: pick.away_team,
          market_description: `${pick.pick} (${pick.pick_type})`,
          contract_type: pick.pick_type,
          american_odds: pick.odds,
          status: 'open',
          source_data: {
            pick: pick.pick,
            pick_type: pick.pick_type,
            recommended_line: pick.recommended_line,
            confidence: pick.confidence,
            ev: pick.expected_value,
            exported_from: 'scheduler'
          }
        };

        const { data: market, error: marketError } = await supabase
          .from('markets')
          .insert(marketData)
          .select('id')
          .single();

        if (marketError) {
          // Check if this is a unique constraint violation (market already exists)
          if (marketError.code === '23505') {
            logger.info(`Market already exists for ${gameId}, finding existing...`);
            const { data: existing } = await supabase
              .from('markets')
              .select('id')
              .eq('external_id', gameId)
              .single();
            if (existing) {
              const marketId = existing.id;
              logger.info(`Found existing market: ${marketId}`);

              // Step 2: Create prediction
              const winProb = pick.mc_win_probability || (pick.confidence / 100);
              const ev = pick.expected_value;
              const impliedProb = pick.odds ? (pick.odds > 0 ? 100 / (pick.odds + 100) : -pick.odds / (-pick.odds + 100)) : 0.5;
              const edge = winProb - impliedProb;

              const predictionData = {
                market_id: marketId,
                model_version: 'scheduler-v1',
                model_probability: winProb,
                confidence: pick.confidence,
                variance: 0.05,
                market_probability: impliedProb,
                edge: edge,
                expected_value: ev,
                value_bet_edge: ev > 0 ? ev : 0,
                is_premium: pick.confidence >= 70,
                correlation_group: pick.league,
                simulation_count: 10000,
                valid_until: pick.game_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              };

              const { error: predError } = await supabase
                .from('predictions')
                .insert(predictionData);

              if (predError) {
                logger.error(`Failed to create prediction: ${predError.message}`);
                continue;
              }

              predictionsCreated++;
            }
          } else {
            logger.error(`Failed to create market: ${marketError.message}`);
            continue;
          }
        } else if (market) {
          const marketId = market.id;
          marketsCreated++;
          logger.info(`Created new market: ${marketId}`);

          // Step 2: Create prediction
          const winProb = pick.mc_win_probability || (pick.confidence / 100);
          const ev = pick.expected_value;
          const impliedProb = pick.odds ? (pick.odds > 0 ? 100 / (pick.odds + 100) : -pick.odds / (-pick.odds + 100)) : 0.5;
          const edge = winProb - impliedProb;

          const predictionData = {
            market_id: marketId,
            model_version: 'scheduler-v1',
            model_probability: winProb,
            confidence: pick.confidence,
            variance: 0.05,
            market_probability: impliedProb,
            edge: edge,
            expected_value: ev,
            value_bet_edge: ev > 0 ? ev : 0,
            is_premium: pick.confidence >= 70,
            correlation_group: pick.league,
            simulation_count: 10000,
            valid_until: pick.game_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };

          const { error: predError } = await supabase
            .from('predictions')
            .insert(predictionData);

          if (predError) {
            logger.error(`Failed to create prediction: ${predError.message}`);
            continue;
          }

          predictionsCreated++;
        } else {
          logger.error(`Failed to get market ID for ${gameId}`);
          continue;
        }
      } catch (err: any) {
        logger.error(`Failed to process pick ${pick.home_team} vs ${pick.away_team}: ${err.message}`);
      }
    }

    logger.success(`Created ${marketsCreated} markets and ${predictionsCreated} predictions`);
    return predictionsCreated > 0;
  } catch (err: any) {
    logger.error(`Failed to save predictions: ${err.message}`);
    return false;
  }
}

// Save results to Supabase - results table doesn't exist, just log for now
async function saveResultsToSupabase(data: ResultsFile, sourceFile: string): Promise<boolean> {
  try {
    logger.info(`Results file found: ${data.results.length} results`);
    logger.info(`Note: graded_results table not in schema - archiving only`);

    // Just archive the file without trying to save to non-existent table
    return true;
  } catch (err: any) {
    logger.error(`Failed to process results: ${err.message}`);
    return false;
  }
}

// Import Kalshi sports picks from prognostication API
async function importKalshiSportsPicks(): Promise<number> {
  try {
    logger.info('Importing Kalshi sports picks from prognostication API...');

    const prognoUrl = process.env.PROGNO_URL || 'http://localhost:3000';
    const response = await fetch(`${prognoUrl}/api/kalshi/sports?tier=all&limit=20`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      logger.error(`Prognostication API returned ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (!data.success || !data.elite || !data.pro || !data.free) {
      logger.error('Invalid response from prognostication API');
      return 0;
    }

    // Combine all tiers
    const allPicks = [
      ...data.elite.map((p: any) => ({ ...p, tier: 'elite' })),
      ...data.pro.map((p: any) => ({ ...p, tier: 'pro' })),
      ...data.free.map((p: any) => ({ ...p, tier: 'free' }))
    ];

    let imported = 0;

    for (const pick of allPicks) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('kalshi_bets')
          .select('id')
          .eq('market_id', pick.marketId || pick.id)
          .single();

        if (existing) {
          logger.info(`Skipping duplicate: ${pick.market}`);
          continue;
        }

        // Insert Kalshi bet
        const { error } = await supabase.from('kalshi_bets').insert({
          market_id: pick.marketId || pick.id,
          market_title: pick.market,
          category: pick.category,
          pick: pick.pick,
          probability: pick.probability,
          edge: pick.edge,
          market_price: pick.marketPrice,
          expires_at: pick.expires,
          reasoning: pick.reasoning,
          confidence: pick.confidence,
          tier: pick.tier,
          original_sport: pick.originalSport,
          game_info: pick.gameInfo,
          status: 'open',
          source: 'prognostication_api'
        });

        if (error) {
          logger.error(`Failed to import ${pick.market}: ${error.message}`);
          continue;
        }

        imported++;
      } catch (err: any) {
        logger.error(`Error importing ${pick.market}: ${err.message}`);
      }
    }

    logger.success(`Imported ${imported} Kalshi sports picks (Elite: ${data.elite.length}, Pro: ${data.pro.length}, Free: ${data.free.length})`);
    return imported;
  } catch (err: any) {
    logger.error(`Failed to import Kalshi sports picks: ${err.message}`);
    return 0;
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
    console.log('[MAIN] Ensuring directories...');
    await ensureDirectories();
    console.log('[MAIN] Directories ready');

    // Process predictions
    console.log('[MAIN] Starting Phase 1: Processing predictions...');
    const predictionsProcessed = await processPredictions();
    console.log(`[MAIN] Phase 1 complete: ${predictionsProcessed} files processed`);

    // Process results
    console.log('[MAIN] Starting Phase 2: Processing results...');
    const resultsProcessed = await processResults();
    console.log(`[MAIN] Phase 2 complete: ${resultsProcessed} files processed`);

    // Import Kalshi sports picks
    console.log('[MAIN] Starting Phase 3: Importing Kalshi sports picks...');
    const kalshiImported = await importKalshiSportsPicks();
    console.log(`[MAIN] Phase 3 complete: ${kalshiImported} picks imported`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 SCHEDULER COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Predictions processed: ${predictionsProcessed}`);
    console.log(`Results processed: ${resultsProcessed}`);
    console.log(`Kalshi picks imported: ${kalshiImported}`);
    console.log(`Duration: ${duration}s`);
    console.log('');

    await logger.save();

    process.exit(0);
  } catch (err: any) {
    console.error('[MAIN] Fatal error:', err.message);
    logger.error(`Fatal error: ${err.message}`);
    await logger.save();
    process.exit(1);
  }
}

// Run if called directly
console.log('[SCHEDULER] Checking if should run main...');
console.log('[SCHEDULER] import.meta.url:', import.meta.url);
console.log('[SCHEDULER] process.argv[1]:', process.argv[1]);

// Normalize paths for comparison (handle Windows backslashes and file:// prefix)
const currentFile = import.meta.url.replace('file:///', '').replace(/\//g, '\\');
const entryFile = process.argv[1];
console.log('[SCHEDULER] Normalized current file:', currentFile);
console.log('[SCHEDULER] Entry file:', entryFile);

if (currentFile.toLowerCase() === entryFile.toLowerCase()) {
  console.log('[SCHEDULER] Running main()...');
  main();
} else {
  console.log('[SCHEDULER] Not running main - module import detected');
}

export { main, processPredictions, processResults };

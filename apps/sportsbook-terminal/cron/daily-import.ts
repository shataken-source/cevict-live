#!/usr/bin/env node
/**
 * Sportsbook-Terminal Daily Import Cron Job
 *
 * Runs daily at 7:30 AM
 * Imports Kalshi picks from Prognostication API
 * Imports sports picks from archive
 * Refreshes cache files
 *
 * Schedule: 30 7 * * *
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const LOG_DIR = 'C:\\cevict-archive\\sportsbook-terminal\\logs';
const CACHE_DIR = 'C:\\cevict-live\\apps\\sportsbook-terminal\\data';
const PROGNO_URL = process.env.PROGNO_URL || 'http://localhost:3005';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

class CronLogger {
  private logs: string[] = [];

  info(msg: string) {
    const line = `[${new Date().toISOString()}] [SPORTSBOOK-CRON] ${msg}`;
    console.log(line);
    this.logs.push(line);
  }

  error(msg: string) {
    const line = `[${new Date().toISOString()}] [SPORTSBOOK-CRON] ERROR: ${msg}`;
    console.error(line);
    this.logs.push(line);
  }

  success(msg: string) {
    const line = `[${new Date().toISOString()}] [SPORTSBOOK-CRON] ✅ ${msg}`;
    console.log(line);
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

interface KalshiPick {
  id: string;
  marketId: string;
  market: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  tier?: string;
}

async function importKalshiPicks(): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    logger.info('Fetching Kalshi picks from Prognostication API...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${PROGNO_URL}/api/kalshi/picks?tier=all&limit=50`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || (!data.elite && !data.pro && !data.free)) {
      throw new Error('Invalid API response structure');
    }

    const allPicks: KalshiPick[] = [
      ...((data.elite || []) as KalshiPick[]).map((p: KalshiPick) => ({ ...p, tier: 'elite' })),
      ...((data.pro || []) as KalshiPick[]).map((p: KalshiPick) => ({ ...p, tier: 'pro' })),
      ...((data.free || []) as KalshiPick[]).map((p: KalshiPick) => ({ ...p, tier: 'free' }))
    ];

    logger.info(`Fetched ${allPicks.length} picks from API`);

    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    for (const pick of allPicks) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('kalshi_bets')
          .select('id')
          .eq('market_id', pick.marketId)
          .single();

        if (existing) {
          logger.info(`Skipping duplicate: ${pick.market}`);
          continue;
        }

        // Insert new pick
        const { error } = await supabase.from('kalshi_bets').insert({
          market_id: pick.marketId,
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
          status: 'open',
          source: 'prognostication_api'
        });

        if (error) {
          errors.push(`${pick.market}: ${error.message}`);
          continue;
        }

        imported++;
      } catch (err: any) {
        errors.push(`${pick.market}: ${err.message}`);
      }
    }

    logger.success(`Imported ${imported} Kalshi picks`);

    // Update cache file
    await updateCacheFile(data);

  } catch (error: any) {
    logger.error(`Import failed: ${error.message}`);
    errors.push(error.message);
  }

  return { imported, errors };
}

async function importPolymarketPicks(): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    logger.info('Fetching Polymarket picks from Prognostication API...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${PROGNO_URL}/api/polymarket/picks?tier=all&limit=50`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.info('Polymarket API not available (expected if not configured)');
      return { imported: 0, errors: [] };
    }

    const data = await response.json();

    if (!data.success || data.total === 0) {
      logger.info('No Polymarket picks available');
      return { imported: 0, errors: [] };
    }

    logger.info(`Fetched ${data.total} Polymarket picks from API`);

    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Process each Polymarket pick
    for (const pick of data.picks || []) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('polymarket_bets')
          .select('id')
          .eq('market_id', pick.marketId || pick.id)
          .single();

        if (existing) {
          logger.info(`Skipping duplicate Polymarket: ${pick.market}`);
          continue;
        }

        // Insert new Polymarket pick
        const { error } = await supabase.from('polymarket_bets').insert({
          market_id: pick.marketId || pick.id,
          market_title: pick.market,
          category: pick.category || 'unknown',
          pick: pick.pick,
          probability: pick.probability,
          edge: pick.edge,
          market_price: pick.marketPrice,
          expires_at: pick.expires,
          reasoning: pick.reasoning,
          confidence: pick.confidence,
          status: 'open',
          source: 'prognostication_api'
        });

        if (error) {
          errors.push(`${pick.market}: ${error.message}`);
          continue;
        }

        imported++;
      } catch (err: any) {
        errors.push(`${pick.market || 'unknown'}: ${err.message}`);
      }
    }

    logger.success(`Imported ${imported} Polymarket picks`);

  } catch (error: any) {
    logger.error(`Polymarket import failed: ${error.message}`);
    errors.push(error.message);
  }

  return { imported, errors };
}

async function updateCacheFile(data: any): Promise<void> {
  try {
    const cacheFile = path.join(CACHE_DIR, 'kalshi-picks.json');
    await fs.mkdir(CACHE_DIR, { recursive: true });

    await fs.writeFile(
      cacheFile,
      JSON.stringify({
        ...data,
        cached_at: new Date().toISOString(),
        cached_by: 'cron-job'
      }, null, 2)
    );

    logger.success(`Cache file updated: ${cacheFile}`);
  } catch (error: any) {
    logger.error(`Cache update failed: ${error.message}`);
  }
}

async function processArchivedPredictions(): Promise<void> {
  try {
    logger.info('Processing archived predictions...');

    const archiveDir = 'C:\\cevict-archive\\Probabilityanalyzer\\predictions';
    const files = await fs.readdir(archiveDir);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find today's prediction files
    const todayFiles = files.filter(f =>
      f.includes(`predictions-${today}`) && f.endsWith('.json')
    );

    if (todayFiles.length === 0) {
      logger.info('No today prediction files found in archive');
      return;
    }

    // Get the most recent file
    todayFiles.sort().reverse();
    const latestFile = todayFiles[0];

    logger.success(`Found today's predictions: ${latestFile}`);

    // Read and parse the prediction file
    const filePath = path.join(archiveDir, latestFile);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const predictions = JSON.parse(fileContent);

    if (!Array.isArray(predictions) || predictions.length === 0) {
      logger.info('No predictions found in archive file');
      return;
    }

    logger.info(`Processing ${predictions.length} archived predictions...`);

    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    let imported = 0;
    for (const pred of predictions) {
      try {
        // Check for duplicates by game_id and pick
        const { data: existing } = await supabase
          .from('syndicated_picks')
          .select('id')
          .eq('game_id', pred.gameId || pred.id)
          .eq('pick', pred.pick)
          .single();

        if (existing) {
          continue;
        }

        // Insert into syndicated_picks
        const { error } = await supabase.from('syndicated_picks').insert({
          game_id: pred.gameId || pred.id,
          sport: pred.sport || pred.league || 'unknown',
          home_team: pred.homeTeam,
          away_team: pred.awayTeam,
          pick: pred.pick,
          confidence: pred.confidence,
          edge: pred.edge || 0,
          odds: pred.odds,
          expected_value: pred.expectedValue || pred.edge || 0,
          source: 'progno_archive',
          status: 'pending',
          created_at: new Date().toISOString()
        });

        if (error) {
          logger.error(`Failed to import ${pred.gameId}: ${error.message}`);
          continue;
        }

        imported++;
      } catch (err: any) {
        logger.error(`Error processing prediction: ${err.message}`);
      }
    }

    logger.success(`Imported ${imported} archived predictions to syndicated_picks`);

  } catch (error: any) {
    logger.error(`Archive processing failed: ${error.message}`);
  }
}

async function checkDatabaseStats(): Promise<void> {
  if (!supabase) {
    logger.error('Supabase not configured');
    return;
  }

  try {
    const { count: kalshiCount } = await supabase
      .from('kalshi_bets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: polyCount } = await supabase
      .from('polymarket_bets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    logger.info(`Database stats: ${kalshiCount} Kalshi bets, ${polyCount} Polymarket bets`);
  } catch (error: any) {
    logger.error(`Stats check failed: ${error.message}`);
  }
}

async function main() {
  logger.info('========================================');
  logger.info('SPORTSBOOK-TERMINAL IMPORT CRON - Starting');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info('========================================');

  try {
    // Step 1: Import Kalshi picks
    const kalshiResult = await importKalshiPicks();

    // Step 2: Import Polymarket picks
    const polyResult = await importPolymarketPicks();

    // Step 3: Process archived predictions
    await processArchivedPredictions();

    // Step 4: Check database stats
    await checkDatabaseStats();

    const totalImported = kalshiResult.imported + polyResult.imported;
    const totalErrors = [...kalshiResult.errors, ...polyResult.errors];

    if (totalImported > 0) {
      logger.success(`✅ Import completed: ${totalImported} picks imported`);
    } else {
      logger.error('❌ No picks imported');
    }

    if (totalErrors.length > 0) {
      logger.error(`Errors encountered: ${totalErrors.length}`);
      totalErrors.slice(0, 5).forEach(e => logger.error(`  - ${e}`));
    }

  } catch (error: any) {
    logger.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  } finally {
    await logger.save();
  }
}

main();

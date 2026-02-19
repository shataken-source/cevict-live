/**
 * Sportsbook Terminal Backend Server
 *
 * This server:
 * 1. Serves the frontend (index.html)
 * 2. Provides API endpoints for admin actions
 * 3. Executes scheduler and file operations
 *
 * To start:
 *   node server.js
 *
 * Or with auto-reload:
 *   npx nodemon server.js
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
  console.log('[SERVER] Loaded .env.local');
}

const app = express();
const PORT = 3433;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run scheduler endpoint
app.post('/api/run-scheduler', async (req, res) => {
  console.log('[SERVER] Running scheduler...');
  console.log('[SERVER] CWD:', __dirname);
  console.log('[SERVER] Command: npx tsx scripts/scheduler.ts');

  try {
    const result = await runCommand('npx', ['tsx', 'scripts/scheduler.ts'], {
      cwd: __dirname,
      timeout: 60000,
      env: { ...process.env, DEBUG: 'true' }
    });

    console.log('[SERVER] Scheduler stdout:', result.stdout);
    console.log('[SERVER] Scheduler stderr:', result.stderr);

    res.json({
      success: true,
      message: 'Scheduler completed',
      output: result.stdout || 'No output',
      errors: result.stderr || 'No errors'
    });
  } catch (error) {
    console.error('[SERVER] Scheduler failed:', error);
    console.error('[SERVER] stdout:', error.stdout);
    console.error('[SERVER] stderr:', error.stderr);
    res.status(500).json({
      success: false,
      message: 'Scheduler failed',
      error: error.message,
      output: error.stdout || 'No output',
      stderr: error.stderr || 'No stderr'
    });
  }
});

// Archive files endpoint (same as scheduler)
app.post('/api/archive', async (req, res) => {
  console.log('[SERVER] Archiving files...');

  try {
    const result = await runCommand('npx', ['tsx', 'scripts/scheduler.ts'], {
      cwd: __dirname,
      timeout: 60000,
      env: { ...process.env, DEBUG: 'true' }
    });

    console.log('[SERVER] Archive stdout:', result.stdout);
    console.log('[SERVER] Archive stderr:', result.stderr);

    res.json({
      success: true,
      message: 'Files archived successfully',
      output: result.stdout || 'No output',
      errors: result.stderr || 'No errors'
    });
  } catch (error) {
    console.error('[SERVER] Archive failed:', error);
    res.status(500).json({
      success: false,
      message: 'Archive failed',
      error: error.message,
      output: error.stdout || 'No output',
      stderr: error.stderr || 'No stderr'
    });
  }
});

// Export picks from frontend to Supabase (bypasses RLS using service key)
app.post('/api/export-picks', async (req, res) => {
  console.log('[SERVER] Exporting picks from frontend to Supabase...');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const picks = req.body.picks || [];

    if (picks.length === 0) {
      return res.status(400).json({ success: false, message: 'No picks provided' });
    }

    console.log(`[SERVER] Exporting ${picks.length} picks...`);

    // Use service role key for RLS bypass
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, message: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let marketsCreated = 0;
    let predictionsCreated = 0;
    let errors = [];
    const today = new Date().toISOString().split('T')[0];

    for (const pick of picks) {
      try {
        // Create market
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
            exported_from: 'frontend-export'
          }
        };

        const { data: market, error: marketError } = await supabase
          .from('markets')
          .insert(marketData)
          .select('id')
          .single();

        let marketId;
        if (marketError && marketError.code === '23505') {
          // Market exists, find it
          const { data: existing } = await supabase
            .from('markets')
            .select('id')
            .eq('external_id', gameId)
            .single();
          if (existing) marketId = existing.id;
        } else if (market) {
          marketId = market.id;
          marketsCreated++;
        }

        if (!marketId) {
          errors.push(`${pick.home_team} vs ${pick.away_team}: Failed to create/find market`);
          continue;
        }

        // Create prediction
        const winProb = pick.mc_win_probability || (pick.confidence / 100);
        const ev = pick.expected_value || pick.ev || 0;
        const impliedProb = pick.odds ? (pick.odds > 0 ? 100 / (pick.odds + 100) : -pick.odds / (-pick.odds + 100)) : 0.5;
        const edge = winProb - impliedProb;

        const predictionData = {
          market_id: marketId,
          model_version: 'frontend-export-v1',
          model_probability: Math.min(winProb, 0.9999),
          confidence: Math.min(pick.confidence, 999.99),
          variance: 0.05,
          market_probability: Math.min(impliedProb, 0.9999),
          edge: Math.max(-999.99, Math.min(edge, 999.99)),
          expected_value: Math.max(-999999.99, Math.min(ev, 999999.99)),
          value_bet_edge: Math.max(0, Math.min(ev, 999.99)),
          is_premium: pick.confidence >= 70,
          correlation_group: pick.league,
          simulation_count: 10000,
          valid_until: pick.game_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const { error: predError } = await supabase
          .from('predictions')
          .insert(predictionData);

        if (predError) {
          errors.push(`${pick.home_team} vs ${pick.away_team}: ${predError.message}`);
          continue;
        }

        predictionsCreated++;
      } catch (err) {
        errors.push(`${pick.home_team} vs ${pick.away_team}: ${err.message}`);
      }
    }

    console.log(`[SERVER] Export complete: ${marketsCreated} markets, ${predictionsCreated} predictions`);

    res.json({
      success: true,
      message: `Exported ${predictionsCreated}/${picks.length} predictions`,
      marketsCreated,
      predictionsCreated,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('[SERVER] Export picks failed:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Export to Supabase endpoint (runs scheduler which does the export)
app.post('/api/export-supabase', async (req, res) => {
  console.log('[SERVER] Exporting to Supabase...');

  try {
    const result = await runCommand('npx', ['tsx', 'scripts/scheduler.ts'], {
      cwd: __dirname,
      timeout: 60000
    });

    res.json({
      success: true,
      message: 'Exported to Supabase',
      output: result.stdout,
      errors: result.stderr
    });
  } catch (error) {
    console.error('[SERVER] Export failed:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Fetch Kalshi sports picks from prognostication API
app.get('/api/import-kalshi-sports', async (req, res) => {
  console.log('[SERVER] Importing Kalshi sports picks from prognostication API...');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, message: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch from prognostication API
    const prognoUrl = process.env.PROGNO_URL || 'http://localhost:3000';
    const response = await fetch(`${prognoUrl}/api/kalshi/sports?tier=all&limit=20`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Prognostication API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.elite || !data.pro || !data.free) {
      throw new Error('Invalid response from prognostication API');
    }

    // Combine all tiers
    const allPicks = [
      ...data.elite.map(p => ({ ...p, tier: 'elite' })),
      ...data.pro.map(p => ({ ...p, tier: 'pro' })),
      ...data.free.map(p => ({ ...p, tier: 'free' }))
    ];

    let imported = 0;
    let errors = [];

    // Import each pick as a Kalshi bet
    for (const pick of allPicks) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('kalshi_bets')
          .select('id')
          .eq('market_id', pick.marketId || pick.id)
          .single();

        if (existing) {
          console.log(`[IMPORT] Skipping duplicate: ${pick.market}`);
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
          errors.push(`${pick.market}: ${error.message}`);
          continue;
        }

        imported++;
      } catch (err) {
        errors.push(`${pick.market}: ${err.message}`);
      }
    }

    console.log(`[SERVER] Imported ${imported} Kalshi sports picks`);

    res.json({
      success: true,
      message: `Imported ${imported} Kalshi sports picks`,
      imported,
      errors: errors.slice(0, 10),
      tiers: {
        elite: data.elite.length,
        pro: data.pro.length,
        free: data.free.length
      }
    });
  } catch (error) {
    console.error('[SERVER] Import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// ============ PUBLIC API ENDPOINTS FOR OTHER APPS ============
// These endpoints allow external applications to consume prediction data

// GET /api/v1/predictions - Get all current predictions
app.get('/api/v1/predictions', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get predictions with market data
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        markets (
          id, external_id, sport, league, home_team, away_team,
          event_date, american_odds, status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      count: predictions?.length || 0,
      data: predictions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/markets - Get all active markets
app.get('/api/v1/markets', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get markets with their predictions
    const { data: markets, error } = await supabase
      .from('markets')
      .select(`
        *,
        predictions (
          id, model_probability, confidence, edge, expected_value,
          is_premium, model_version
        )
      `)
      .eq('status', 'open')
      .order('event_date', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      count: markets?.length || 0,
      data: markets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching markets:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/signals - Get active trading signals
app.get('/api/v1/signals', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active signals with prediction and market data
    const { data: signals, error } = await supabase
      .from('signals')
      .select(`
        *,
        predictions (
          *,
          markets (*)
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: signals?.length || 0,
      data: signals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching signals:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/stats - Get system statistics
app.get('/api/v1/stats', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get counts from various tables
    const [marketsCount, predictionsCount, signalsCount] = await Promise.all([
      supabase.from('markets').select('*', { count: 'exact', head: true }),
      supabase.from('predictions').select('*', { count: 'exact', head: true }),
      supabase.from('signals').select('*', { count: 'exact', head: true })
    ]);

    // Get archive file counts
    const fs = require('fs');
    const archiveDir = 'C:\\cevict-archive\\Probabilityanalyzer';
    let archivedPredictions = 0;
    let archivedResults = 0;

    if (fs.existsSync(path.join(archiveDir, 'predictions'))) {
      archivedPredictions = fs.readdirSync(path.join(archiveDir, 'predictions')).filter(f => f.endsWith('.json')).length;
    }
    if (fs.existsSync(path.join(archiveDir, 'results'))) {
      archivedResults = fs.readdirSync(path.join(archiveDir, 'results')).filter(f => f.endsWith('.json')).length;
    }

    res.json({
      success: true,
      stats: {
        database: {
          markets: marketsCount.count || 0,
          predictions: predictionsCount.count || 0,
          signals: signalsCount.count || 0
        },
        archive: {
          predictions: archivedPredictions,
          results: archivedResults,
          total: archivedPredictions + archivedResults
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/archive/predictions - Get list of archived prediction files
app.get('/api/v1/archive/predictions', (req, res) => {
  try {
    const fs = require('fs');
    const archiveDir = 'C:\\cevict-archive\\Probabilityanalyzer\\predictions';

    if (!fs.existsSync(archiveDir)) {
      return res.json({ success: true, files: [], count: 0 });
    }

    const files = fs.readdirSync(archiveDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(archiveDir, f));
        return {
          filename: f,
          size: stats.size,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({
      success: true,
      count: files.length,
      files: files,
      archiveLocation: archiveDir,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching archived predictions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/archive/results - Get list of archived results files
app.get('/api/v1/archive/results', (req, res) => {
  try {
    const fs = require('fs');
    const archiveDir = 'C:\\cevict-archive\\Probabilityanalyzer\\results';

    if (!fs.existsSync(archiveDir)) {
      return res.json({ success: true, files: [], count: 0 });
    }

    const files = fs.readdirSync(archiveDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(archiveDir, f));
        return {
          filename: f,
          size: stats.size,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({
      success: true,
      count: files.length,
      files: files,
      archiveLocation: archiveDir,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching archived results:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/kalshi-bets - Get Kalshi-format sports bets
app.get('/api/v1/kalshi-bets', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const tier = req.query.tier || 'all';
    const limit = Math.min(parseInt(req.query.limit || '10'), 30);

    let query = supabase
      .from('kalshi_bets')
      .select('*')
      .eq('status', 'open')
      .order('confidence', { ascending: false })
      .limit(limit);

    if (tier !== 'all') {
      query = query.eq('tier', tier);
    }

    const { data: bets, error } = await query;

    if (error) throw error;

    // Group by tier
    const grouped = {
      elite: bets?.filter(b => b.tier === 'elite') || [],
      pro: bets?.filter(b => b.tier === 'pro') || [],
      free: bets?.filter(b => b.tier === 'free') || []
    };

    res.json({
      success: true,
      count: bets?.length || 0,
      tier,
      data: grouped,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error fetching Kalshi bets:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api - API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Sportsbook Terminal API',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}/api`,
    endpoints: {
      // Public data endpoints
      'GET /api/v1/predictions': 'Get all current predictions with market data',
      'GET /api/v1/markets': 'Get all active markets with predictions',
      'GET /api/v1/signals': 'Get active trading signals',
      'GET /api/v1/stats': 'Get system statistics (counts, archive status)',
      'GET /api/v1/archive/predictions': 'List archived prediction files',
      'GET /api/v1/archive/results': 'List archived results files',
      'GET /api/v1/kalshi-bets': 'Get Kalshi-format sports bets by tier',

      // Admin endpoints
      'GET /api/health': 'Health check',
      'POST /api/run-scheduler': 'Run the scheduler to process files',
      'POST /api/archive': 'Archive files to external storage',
      'POST /api/export-picks': 'Export picks from frontend to Supabase',
      'GET /api/archive-status': 'Check archive directory status',
      'GET /api/import-kalshi-sports': 'Import Kalshi sports picks from prognostication API'
    },
    documentation: {
      description: 'REST API for accessing sports betting predictions and market data',
      authentication: 'Currently no authentication required (internal use only)',
      rateLimiting: 'None currently implemented',
      formats: ['JSON'],
      cors: 'Enabled for all origins'
    },
    timestamp: new Date().toISOString()
  });
});

// Get archive status
app.get('/api/archive-status', (req, res) => {
  const fs = require('fs');
  const archiveDir = 'C:\\cevict-archive\\Probabilityanalyzer';

  try {
    const predictionsDir = path.join(archiveDir, 'predictions');
    const resultsDir = path.join(archiveDir, 'results');

    let predictionFiles = [];
    let resultsFiles = [];

    if (fs.existsSync(predictionsDir)) {
      predictionFiles = fs.readdirSync(predictionsDir).filter(f => f.endsWith('.json'));
    }

    if (fs.existsSync(resultsDir)) {
      resultsFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
    }

    res.json({
      archiveLocation: archiveDir,
      predictionFiles,
      resultsFiles,
      totalFiles: predictionFiles.length + resultsFiles.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read archive',
      message: error.message
    });
  }
});

// Helper function to run shell commands
function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[SCHEDULER] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[SCHEDULER ERROR] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    child.on('error', (error) => {
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`
========================================
  Sportsbook Terminal Server
========================================

  Server running at: http://localhost:${PORT}

  📊 PUBLIC API (for external apps):
  - GET  /api/v1/predictions       - All predictions with markets
  - GET  /api/v1/markets           - Active markets with predictions
  - GET  /api/v1/signals           - Trading signals
  - GET  /api/v1/stats             - System statistics
  - GET  /api/v1/archive/predictions - Archived prediction files
  - GET  /api/v1/archive/results     - Archived results files
  - GET  /api/v1/kalshi-bets       - Kalshi-format sports bets by tier
  - GET  /api                      - API documentation

  🔧 ADMIN ENDPOINTS:
  - GET  /api/health               - Health check
  - POST /api/run-scheduler         - Run scheduler
  - POST /api/archive               - Archive files
  - POST /api/export-picks          - Export to Supabase
  - GET  /api/archive-status        - Check archive status
  - GET  /api/import-kalshi-sports  - Import from prognostication API

  📚 Documentation:
  ${path.join(__dirname, 'API_DOCUMENTATION.md')}

========================================
  `);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[SERVER] Unhandled rejection:', err);
});

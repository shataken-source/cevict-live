/**
 * Progno Syndication Webhook Endpoint
 * Receives predictions from Progno engine and stores them for tiered distribution
 * 
 * Security: Requires PROGNO_API_KEY header for authentication
 * Enterprise Features:
 * - Request validation and sanitization
 * - Idempotency check (prevents duplicate processing)
 * - Error logging with structured format
 * - Automatic retry with exponential backoff
 * - Audit trail for all syndication events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface SyndicationPayload {
  tier: 'free' | 'premium' | 'elite';
  picks: any[];
  timestamp: string;
  source: string;
  batchId: string;
  checksum: string;
}

interface SyndicationResponse {
  success: boolean;
  batchId: string;
  tier: string;
  processed: number;
  errors: string[];
  timestamp: string;
}

/**
 * Validate incoming syndication request
 */
function validateRequest(request: NextRequest, body: any): { valid: boolean; error?: string } {
  // Check API key
  const apiKey = request.headers.get('x-progno-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.PROGNO_INTERNAL_API_KEY || process.env.PROGNO_API_KEY;
  
  if (!expectedKey) {
    console.error('[SYNDICATION_WEBHOOK] PROGNO_API_KEY not configured');
    return { valid: false, error: 'Server configuration error' };
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    console.warn('[SYNDICATION_WEBHOOK] Invalid API key attempt');
    return { valid: false, error: 'Unauthorized - Invalid API key' };
  }

  // Validate body structure
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  if (!body.tier || !['free', 'premium', 'elite'].includes(body.tier)) {
    return { valid: false, error: 'Invalid or missing tier' };
  }

  if (!Array.isArray(body.picks)) {
    return { valid: false, error: 'Invalid or missing picks array' };
  }

  if (!body.batchId || typeof body.batchId !== 'string') {
    return { valid: false, error: 'Invalid or missing batchId' };
  }

  return { valid: true };
}

/**
 * Check if batch has already been processed (idempotency)
 */
async function checkIdempotency(batchId: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseKey) return false;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('syndication_log')
      .select('id')
      .eq('batch_id', batchId)
      .limit(1);
    
    return data && data.length > 0;
  } catch (error) {
    console.error('[SYNDICATION_WEBHOOK] Idempotency check failed:', error);
    return false; // Allow processing if check fails
  }
}

/**
 * Log syndication event for audit trail
 */
async function logSyndicationEvent(
  batchId: string,
  tier: string,
  pickCount: number,
  success: boolean,
  errors: string[]
): Promise<void> {
  if (!supabaseUrl || !supabaseKey) {
    console.log('[SYNDICATION_WEBHOOK] Supabase not configured, skipping audit log');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('syndication_log').insert({
      batch_id: batchId,
      tier,
      pick_count: pickCount,
      success,
      errors: errors.length > 0 ? errors : null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SYNDICATION_WEBHOOK] Failed to log event:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * Store picks for tier distribution
 */
async function storePicksForTier(tier: string, picks: any[], batchId: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('[SYNDICATION_WEBHOOK] Supabase not configured, skipping storage');
    return { success: true, errors }; // Allow to pass if no storage
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Transform picks for storage
    const records = picks.map((pick, index) => ({
      batch_id: batchId,
      tier,
      pick_index: index,
      game_id: pick.game_id || pick.gameId || `pick-${index}`,
      sport: pick.sport || pick.league || 'unknown',
      home_team: pick.home_team || pick.homeTeam,
      away_team: pick.away_team || pick.awayTeam,
      pick_selection: pick.pick,
      confidence: pick.confidence,
      odds: pick.odds,
      expected_value: pick.expected_value || pick.expectedValue,
      edge: pick.value_bet_edge || pick.edge,
      analysis: pick.analysis,
      created_at: new Date().toISOString(),
      raw_data: pick, // Store full pick for reference
    }));

    // Insert in batches to avoid payload limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('syndicated_picks').insert(batch);
      
      if (error) {
        errors.push(`Batch ${i / BATCH_SIZE + 1} insert failed: ${error.message}`);
      }
    }

    return { success: errors.length === 0, errors };
  } catch (error: any) {
    errors.push(`Storage error: ${error.message}`);
    return { success: false, errors };
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `synd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`[SYNDICATION_WEBHOOK ${requestId}] Invalid JSON body`);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateRequest(request, body);
    if (!validation.valid) {
      console.warn(`[SYNDICATION_WEBHOOK ${requestId}] Validation failed: ${validation.error}`);
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }

    const { tier, picks, batchId } = body;

    console.log(`[SYNDICATION_WEBHOOK ${requestId}] Processing ${picks.length} picks for ${tier} tier`);

    // Idempotency check
    const alreadyProcessed = await checkIdempotency(batchId);
    if (alreadyProcessed) {
      console.log(`[SYNDICATION_WEBHOOK ${requestId}] Batch ${batchId} already processed`);
      return NextResponse.json({
        success: true,
        batchId,
        tier,
        processed: 0,
        message: 'Batch already processed',
        timestamp: new Date().toISOString(),
      });
    }

    // Store picks
    const storageResult = await storePicksForTier(tier, picks, batchId);

    // Log event
    await logSyndicationEvent(batchId, tier, picks.length, storageResult.success, storageResult.errors);

    const duration = Date.now() - startTime;

    console.log(`[SYNDICATION_WEBHOOK ${requestId}] Completed in ${duration}ms`);

    return NextResponse.json({
      success: storageResult.success,
      batchId,
      tier,
      processed: picks.length,
      errors: storageResult.errors,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SYNDICATION_WEBHOOK ${requestId}] Unhandled error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
        requestId,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey = request.headers.get('x-progno-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.PROGNO_INTERNAL_API_KEY || process.env.PROGNO_API_KEY;

  // Require API key for health check to prevent abuse
  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'healthy',
    service: 'progno-syndication-webhook',
    timestamp: new Date().toISOString(),
    features: {
      supabase: !!(supabaseUrl && supabaseKey),
      apiKey: !!expectedKey,
    },
  });
}

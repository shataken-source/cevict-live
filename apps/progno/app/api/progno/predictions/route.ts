import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to get Supabase client
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  // Dynamic import to avoid issues if Supabase isn't installed yet
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[PROGNO DB] Supabase client not available:', error);
    return null;
  }
}

const predictionSchema = z.object({
  prediction_type: z.string().min(1),
  category: z.string().optional(),
  question: z.string().min(1),
  context: z.unknown().optional(),
  prediction_data: z.unknown(),
  confidence: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v) : v),
    z.number().finite()
  ),
  edge_pct: z.preprocess(
    (v) => (v === undefined || v === null ? undefined : typeof v === 'string' ? Number(v) : v),
    z.number().finite().optional()
  ),
  risk_level: z.string().optional(),
  source: z.string().optional(),
  user_id: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Fetch predictions with filters
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const sport = searchParams.get('sport') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`[PREDICTIONS] Fetching predictions for date: ${date}, sport: ${sport}, limit: ${limit}`);

    // Load picks directly from Supabase (avoids localhost self-fetch / ECONNREFUSED)
    let realPicks = [];
    try {
      // Use created_at with a 36-hour window (date 00:00 UTC to date+1 12:00 UTC)
      // to capture all picks generated on `date` regardless of timezone.
      // game_time in UTC can spill into the next day for evening US games.
      const windowEnd = new Date(date);
      windowEnd.setDate(windowEnd.getDate() + 1);
      const windowEndStr = windowEnd.toISOString().split('T')[0] + 'T12:00:00';

      const { data: dbPicks, error: dbErr } = await client
        .from('picks')
        .select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', windowEndStr)
        .order('confidence', { ascending: false })
        .limit(limit);

      if (dbErr) {
        console.warn('[PREDICTIONS] Supabase picks query error:', dbErr.message);
      } else if (dbPicks && dbPicks.length > 0) {
        realPicks = dbPicks.map((pick: any) => ({
          id: pick.id || `pick_${pick.home_team || ''}_${pick.away_team || ''}_${date}`.replace(/\s+/g, '_'),
          gameDate: date,
          league: pick.league?.toUpperCase() || 'UNKNOWN',
          sport: pick.sport?.toUpperCase() || 'UNKNOWN',
          homeTeam: pick.home_team || 'Unknown',
          awayTeam: pick.away_team || 'Unknown',
          gameTime: pick.game_time || new Date().toISOString(),
          venue: pick.venue,
          prediction: {
            winner: pick.pick || 'Unknown',
            confidence: pick.confidence || 0,
            score: pick.mc_predicted_score || { home: 0, away: 0 },
            edge: pick.value_bet_edge || 0,
            keyFactors: pick.analysis ? pick.analysis.split('\n').filter((f: string) => f.trim()) : []
          },
          odds: {
            moneyline: pick.odds
              ? (typeof pick.odds === 'object' ? pick.odds : { home: pick.odds, away: null })
              : undefined,
            spread: pick.home_spread != null ? { home: pick.home_spread, away: pick.away_spread ?? null } : undefined,
            total: pick.total_line != null ? pick.total_line : undefined,
          },
          isLive: false,
          isCompleted: false
        }));
      }
    } catch (err) {
      console.warn('[PREDICTIONS] Could not load picks from Supabase:', err);
    }

    // If no real picks available, return empty array (no mock data in production)
    if (realPicks.length === 0) {
      console.log('[PREDICTIONS] No real picks available for date:', date);
    }

    // Filter by sport if specified
    let filteredPicks = realPicks;
    if (sport !== 'all') {
      filteredPicks = realPicks.filter(pick =>
        pick.sport.toLowerCase() === sport.toLowerCase() ||
        pick.league.toLowerCase() === sport.toLowerCase()
      );
    }

    // Apply limit
    filteredPicks = filteredPicks.slice(0, limit);

    return NextResponse.json({
      success: true,
      picks: filteredPicks,
      total: filteredPicks.length,
      date,
      sport,
      limit,
      source: 'progno-prediction-engine',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[PREDICTIONS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST - Create a new prediction
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const raw = await request.json().catch(() => null);
    const parsed = predictionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid prediction payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      prediction_type,
      category,
      question,
      context,
      prediction_data,
      confidence,
      edge_pct,
      risk_level,
      source,
      user_id,
      notes,
    } = parsed.data;

    const confClamped = Math.max(0, Math.min(100, confidence));

    console.log('[PROGNO DB] New prediction', {
      type: prediction_type,
      category,
      conf: confClamped,
      edge_pct,
      source,
    });

    const { data, error } = await client
      .from('progno_predictions')
      .insert({
        prediction_type,
        category: category || null,
        question,
        context: context || null,
        prediction_data,
        confidence: confClamped, // Clamp 0-100
        edge_pct: edge_pct || null,
        risk_level: risk_level || null,
        source: source || null,
        user_id: user_id || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[PROGNO DB] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prediction: data,
    });
  } catch (error: any) {
    console.error('[PROGNO DB] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create prediction' }, { status: 500 });
  }
}


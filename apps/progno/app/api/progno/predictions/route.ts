import { NextRequest, NextResponse } from 'next/server';

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
      const { data: dbPicks, error: dbErr } = await client
        .from('picks')
        .select('*')
        .gte('game_time', `${date}T00:00:00`)
        .lt('game_time', `${date}T23:59:59`)
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
            confidence: (pick.confidence || 0) / 100,
            score: pick.mc_predicted_score || { home: 0, away: 0 },
            edge: pick.value_bet_edge || 0,
            keyFactors: pick.analysis ? pick.analysis.split('\n').filter((f: string) => f.trim()) : []
          },
          odds: {
            moneyline: pick.odds ? { home: pick.odds, away: 0 } : undefined,
            spread: pick.odds ? { home: pick.odds, away: 0 } : undefined,
            total: pick.odds ? pick.odds : undefined
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
    const body = await request.json();
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
    } = body;

    // Validation
    if (!prediction_type || !question || !prediction_data || confidence === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: prediction_type, question, prediction_data, confidence' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('progno_predictions')
      .insert({
        prediction_type,
        category: category || null,
        question,
        context: context || null,
        prediction_data,
        confidence: Math.max(0, Math.min(100, confidence)), // Clamp 0-100
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


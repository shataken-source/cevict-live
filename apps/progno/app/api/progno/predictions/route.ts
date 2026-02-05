import { NextRequest, NextResponse } from 'next/server';

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
    const predictionType = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = client
      .from('progno_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (predictionType) {
      query = query.eq('prediction_type', predictionType);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PROGNO DB] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      predictions: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('[PROGNO DB] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch predictions' }, { status: 500 });
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


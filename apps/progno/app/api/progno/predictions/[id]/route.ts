import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    return null;
  }
}

// GET - Get a specific prediction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { data, error } = await client
      .from('progno_predictions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, prediction: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch prediction' }, { status: 500 });
  }
}

// PATCH - Update a prediction (mainly for recording outcomes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      outcome_data,
      is_correct,
      accuracy_score,
      confidence_accuracy,
      profit,
      notes,
    } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (outcome_data !== undefined) updates.outcome_data = outcome_data;
    if (is_correct !== undefined) updates.is_correct = is_correct;
    if (accuracy_score !== undefined) updates.accuracy_score = accuracy_score;
    if (confidence_accuracy !== undefined) updates.confidence_accuracy = confidence_accuracy;
    if (profit !== undefined) updates.profit = profit;
    if (notes !== undefined) updates.notes = notes;

    // Set outcome_recorded_at if we're recording an outcome
    if (outcome_data && !updates.outcome_recorded_at) {
      updates.outcome_recorded_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('progno_predictions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PROGNO DB] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If outcome was recorded, also create an outcome record
    if (outcome_data) {
      await client.from('progno_outcomes').insert({
        prediction_id: id,
        outcome_type: body.outcome_type || 'manual_entry',
        outcome_data,
        source: body.outcome_source || 'api',
        notes: body.outcome_notes || null,
      });
    }

    return NextResponse.json({ success: true, prediction: data });
  } catch (error: any) {
    console.error('[PROGNO DB] PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update prediction' }, { status: 500 });
  }
}


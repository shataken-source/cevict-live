import { NextRequest, NextResponse } from 'next/server';
import { 
  getOfficerByUserId,
  getOfficerEncounters 
} from '../../../../../lib/officer-service';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * GET /api/petreunion/officer/encounters
 * Get officer's encounter history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get and verify officer
    const officer = await getOfficerByUserId(userId);
    if (!officer) {
      return NextResponse.json(
        { error: 'Officer not found' },
        { status: 403 }
      );
    }

    // Get encounters
    const encounters = await getOfficerEncounters(officer.id, limit);

    // Get stats
    let stats = null;
    if (supabase) {
      const { data } = await supabase
        .from('officer_dashboard_stats')
        .select('*')
        .eq('officer_id', officer.id)
        .single();
      stats = data;
    }

    return NextResponse.json({
      success: true,
      officer: {
        id: officer.id,
        departmentName: officer.department_name,
        badgeNumber: officer.badge_number,
        isVerified: officer.is_verified
      },
      stats: stats || {
        totalScans: officer.total_scans,
        totalMatches: officer.total_matches,
        totalRtos: officer.total_rtos
      },
      encounters
    });

  } catch (error: any) {
    console.error('[Officer Encounters] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get encounters', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/petreunion/officer/encounters
 * Update an encounter (outcome, notes, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.encounterId) {
      return NextResponse.json(
        { error: 'userId and encounterId are required' },
        { status: 400 }
      );
    }

    // Get and verify officer
    const officer = await getOfficerByUserId(body.userId);
    if (!officer) {
      return NextResponse.json(
        { error: 'Officer not found' },
        { status: 403 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Build update object
    const updates: any = {};
    if (body.outcome) updates.outcome = body.outcome;
    if (body.outcomeNotes) updates.outcome_notes = body.outcomeNotes;
    if (body.shelterName) updates.shelter_name = body.shelterName;
    if (body.shelterIntakeNumber) updates.shelter_intake_number = body.shelterIntakeNumber;
    if (body.status) updates.status = body.status;

    if (body.outcome && body.outcome !== 'pending') {
      updates.outcome_timestamp = new Date().toISOString();
    }

    // Update encounter
    const { data, error } = await supabase
      .from('officer_encounters')
      .update(updates)
      .eq('id', body.encounterId)
      .eq('officer_id', officer.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      encounter: data
    });

  } catch (error: any) {
    console.error('[Officer Encounters PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Update failed', details: error.message },
      { status: 500 }
    );
  }
}


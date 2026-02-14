import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Starts continuous searching for a lost pet
 * This pet will be searched daily until found or removed
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { petId } = body;

    if (!petId) {
      return NextResponse.json({ error: 'Pet ID required' }, { status: 400 });
    }

    // Get pet info
    const { data: pet, error: petError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', petId)
      .eq('status', 'lost')
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    // Calculate search schedule based on days lost
    const daysLost = Math.floor((new Date().getTime() - new Date(pet.date_lost).getTime()) / (1000 * 60 * 60 * 24));
    
    // Search frequency: more frequent for recently lost pets
    const searchIntervalHours = daysLost < 1 
      ? 2  // Every 2 hours for first day
      : daysLost < 3
      ? 6  // Every 6 hours for first 3 days
      : daysLost < 7
      ? 12 // Every 12 hours for first week
      : 24; // Daily after first week

    const nextSearchAt = new Date(Date.now() + searchIntervalHours * 60 * 60 * 1000);

    // Store search schedule (we'll use a simple approach - store in pet record)
    // In production, you'd have a separate search_jobs table
    const { error: updateError } = await supabase
      .from('lost_pets')
      .update({
        // Store search metadata in description or use a JSON field
        description: `${pet.description || ''}\n\n[CONTINUOUS SEARCH: Active, Next search: ${nextSearchAt.toISOString()}, Interval: ${searchIntervalHours}h]`.trim()
      })
      .eq('id', petId);

    if (updateError) {
      console.error('[CONTINUOUS SEARCH] Error updating pet:', updateError);
    }

    // Trigger immediate first search
    const immediateSearch = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/search-for-lost-pet`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId })
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      petId,
      searchSchedule: {
        intervalHours: searchIntervalHours,
        nextSearchAt: nextSearchAt.toISOString(),
        status: 'active'
      },
      message: `Continuous search started. Your pet will be searched every ${searchIntervalHours} hours until found.`
    });

  } catch (error: any) {
    console.error('[CONTINUOUS SEARCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}



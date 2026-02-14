import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'email';
    const value = searchParams.get('value');

    if (!value) {
      return NextResponse.json(
        { error: 'Search value is required' },
        { status: 400 }
      );
    }

    // Build query based on search type
    let query = supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost'); // Only show lost pets

    if (type === 'email') {
      query = query.ilike('owner_email', `%${value}%`);
    } else if (type === 'phone') {
      query = query.ilike('owner_phone', `%${value.replace(/\D/g, '')}%`); // Remove non-digits for phone search
    } else if (type === 'name') {
      query = query.ilike('owner_name', `%${value}%`);
    }

    const { data: pets, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[FIND MY PET] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to search for pets' },
        { status: 500 }
      );
    }

    // Get search stats for each pet
    const petsWithStats = await Promise.all((pets || []).map(async (pet) => {
      // Get search/match stats from search_logs table (if it exists)
      const { data: searchLogs } = await supabase
        .from('pet_search_logs')
        .select('*')
        .eq('pet_id', pet.id)
        .order('searched_at', { ascending: false });

      const totalSearches = searchLogs?.length || 0;
      const lastSearchTime = searchLogs?.[0]?.searched_at || null;
      const matchAttempts = searchLogs?.filter(log => log.matches_found > 0).length || 0;

      return {
        ...pet,
        search_stats: {
          totalSearches,
          matchAttempts,
          lastSearchTime,
          isActive: lastSearchTime ? (Date.now() - new Date(lastSearchTime).getTime()) < 7 * 24 * 60 * 60 * 1000 : false // Active if searched in last 7 days
        }
      };
    }));

    return NextResponse.json({
      success: true,
      pets: petsWithStats,
      count: petsWithStats.length
    });

  } catch (error: any) {
    console.error('[FIND MY PET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for pets' },
      { status: 500 }
    );
  }
}


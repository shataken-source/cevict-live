import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split('T')[0];

  try {
    // Delete NHL picks with unrealistic 5-5 scores
    const { data, error } = await supabase
      .from('picks')
      .delete()
      .gte('game_time', `${today}T00:00:00`)
      .lt('game_time', `${today}T23:59:59`)
      .or('sport.eq.NHL,league.eq.NHL')
      .filter('mc_predicted_score->home', 'gte', 5)
      .filter('mc_predicted_score->away', 'gte', 5);

    if (error) {
      console.error('[Clear Cache] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cleared unrealistic NHL predictions from cache',
      cleared: (data as any[])?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Clear Cache] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to clear unrealistic NHL cache entries'
  });
}

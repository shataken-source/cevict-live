import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

/**
 * Get booking statistics (live data)
 */
export async function GET() {
  try {
    let supabase;
    try {
      supabase = createSupabaseServiceClient();
    } catch {
      return NextResponse.json({
        today: 0,
        thisWeek: 0,
        revenue: 0,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get bookings from today (Supabase chain returns a Promise; no .catch() on builder)
    const { data: todayData, error: todayError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', today.toISOString());

    const todayList = todayError ? [] : (todayData || []);

    // Get bookings from this week
    const { data: weekData, error: weekError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', weekAgo.toISOString());

    const weekList = weekError ? [] : (weekData || []);

    const revenue = weekList.reduce((sum: number, booking: any) => {
      return sum + (booking.total_amount || booking.price || 0);
    }, 0);

    return NextResponse.json({
      today: todayList.length,
      thisWeek: weekList.length,
      revenue: revenue || 0,
    });
  } catch (error: any) {
    console.error('Error fetching booking stats:', error);
    return NextResponse.json({
      today: 0,
      thisWeek: 0,
      revenue: 0,
    });
  }
}


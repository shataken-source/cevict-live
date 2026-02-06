import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get booking statistics (live data)
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        today: 0,
        thisWeek: 0,
        revenue: 0,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get bookings from today
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', today.toISOString())
      .catch(() => ({ data: [] }));

    // Get bookings from this week
    const { data: weekBookings } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .catch(() => ({ data: [] }));

    const revenue = (weekBookings?.data || []).reduce((sum: number, booking: any) => {
      return sum + (booking.total_amount || booking.price || 0);
    }, 0);

    return NextResponse.json({
      today: todayBookings?.data?.length || 0,
      thisWeek: weekBookings?.data?.length || 0,
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


export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// GET - Get monitoring stats for a website (auth required; must own website)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const period = searchParams.get('period') || 'week'; // day, week, month

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data: site } = await supabase
      .from('monitored_websites')
      .select('id')
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .single();
    if (!site) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    // Get uptime stats
    const daysBack = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const { data: uptimeChecks } = await supabase
      .from('uptime_checks')
      .select('*')
      .eq('website_id', websiteId)
      .gte('checked_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false });

    // Get visitor stats
    const { data: visitorStats } = await supabase
      .from('visitor_stats')
      .select('*')
      .eq('website_id', websiteId)
      .gte('date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get bot status (latest row per bot_name)
    const { data: botStatusRows } = await supabase
      .from('bot_status')
      .select('*')
      .eq('website_id', websiteId)
      .order('updated_at', { ascending: false });
    const seen = new Set<string>();
    const botStatuses = (botStatusRows || []).filter((row: { bot_name: string }) => {
      if (seen.has(row.bot_name)) return false;
      seen.add(row.bot_name);
      return true;
    });

    // Calculate uptime percentage
    const totalChecks = uptimeChecks?.length || 0;
    const upChecks = uptimeChecks?.filter(c => c.status === 'up').length || 0;
    const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const responseTimes = uptimeChecks?.filter(c => c.response_time !== null).map(c => c.response_time) || [];
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // Get latest status
    const latestCheck = uptimeChecks?.[0] || null;

    // Calculate unique visitors
    const totalUniqueVisitors = visitorStats?.reduce((sum, stat) => sum + (stat.unique_visitors || 0), 0) || 0;
    const todayVisitors = visitorStats?.find(s => s.date === new Date().toISOString().split('T')[0])?.unique_visitors || 0;

    return NextResponse.json({
      websiteId,
      period,
      uptime: {
        percentage: uptimePercentage,
        totalChecks,
        upChecks,
        downChecks: totalChecks - upChecks,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
        latestStatus: latestCheck?.status || 'unknown',
        latestResponseTime: latestCheck?.response_time || null,
        latestError: latestCheck?.error_message || null,
        lastCheckedAt: latestCheck?.checked_at || null,
      },
      visitors: {
        today: todayVisitors,
        total: totalUniqueVisitors,
        daily: visitorStats || [],
      },
      bots: botStatuses || [],
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


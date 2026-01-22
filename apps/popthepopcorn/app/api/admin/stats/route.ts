import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // Check authentication
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get total headlines count
    const { count: totalHeadlines } = await supabase
      .from('headlines')
      .select('*', { count: 'exact', head: true })

    // Get top voted story
    const { data: topVoted } = await supabase
      .from('headlines')
      .select('*')
      .order('upvotes', { ascending: false })
      .limit(1)
      .single()

    // Get reported stories count
    const { count: reportedCount } = await supabase
      .from('reported_stories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get active alerts count
    const { count: activeAlerts } = await supabase
      .from('user_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get average drama score
    const { data: allHeadlines } = await supabase
      .from('headlines')
      .select('drama_score')
      .limit(1000)

    const averageDrama = allHeadlines && allHeadlines.length > 0
      ? allHeadlines.reduce((sum, h) => sum + h.drama_score, 0) / allHeadlines.length
      : 5

    // Get drama history (last 24 hours)
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: dramaHistory } = await supabase
      .from('drama_history')
      .select('*')
      .gte('recorded_at', yesterday.toISOString())
      .order('recorded_at', { ascending: true })

    return NextResponse.json({
      totalHeadlines: totalHeadlines || 0,
      topVotedStory: topVoted || null,
      reportedStories: reportedCount || 0,
      activeAlerts: activeAlerts || 0,
      averageDrama,
      dramaHistory: dramaHistory || [],
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

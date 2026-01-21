import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/trends
 * Returns current trending topics from Twitter/X
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured',
      }, { status: 500 })
    }

    // Get current trending topics (not expired)
    const { data: trends, error } = await supabase
      .from('trending_topics')
      .select('topic_name, tweet_count, fetched_at')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[API] Error fetching trends:', error)
      return NextResponse.json({
        error: 'Database error',
        message: error.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      trends: (trends || []).map(t => ({
        name: t.topic_name,
        tweetCount: t.tweet_count,
        fetchedAt: t.fetched_at,
      })),
    })
  } catch (error: any) {
    console.error('[API] Error in trends route:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
  }
}

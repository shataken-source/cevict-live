import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering (can't be statically generated due to DB queries)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/trends
 * Returns current trending topics from Twitter/X and Google Trends
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
    // Prioritize trends that appear in both sources
    const { data: trends, error } = await supabase
      .from('trending_topics')
      .select('topic_name, tweet_count, source, fetched_at')
      .gt('expires_at', new Date().toISOString())
      .order('source', { ascending: true }) // 'both' comes before 'google' and 'twitter'
      .order('fetched_at', { ascending: false })
      .limit(25)

    if (error) {
      console.error('[API] Error fetching trends:', error)
      // During build or schema cache issues, return empty trends
      if (process.env.NEXT_PHASE === 'phase-production-build' || error.code === 'PGRST205') {
        console.warn('[API] Schema cache issue during build, returning empty trends')
        return NextResponse.json({
          trends: [],
        })
      }
      return NextResponse.json({
        error: 'Database error',
        message: error.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      trends: (trends || []).map(t => ({
        name: t.topic_name,
        tweetCount: t.tweet_count,
        source: t.source || 'unknown',
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

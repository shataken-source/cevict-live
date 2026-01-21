import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch headlines ordered by drama score and recency
    const { data: headlines, error } = await supabase
      .from('headlines')
      .select('*')
      .order('drama_score', { ascending: false })
      .order('posted_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching headlines:', error)
      return NextResponse.json({ error: 'Failed to fetch headlines', details: error }, { status: 500 })
    }

    // Log for debugging
    console.log(`[API] Fetched ${headlines?.length || 0} headlines`)
    if (headlines && headlines.length > 0) {
      const categories = [...new Set(headlines.map(h => h.category))]
      console.log(`[API] Categories found: ${categories.join(', ')}`)
    }

    // Calculate overall drama score (average of top 10)
    const topHeadlines = headlines?.slice(0, 10) || []
    const overallDrama = topHeadlines.length > 0
      ? Math.round(topHeadlines.reduce((sum, h) => sum + h.drama_score, 0) / topHeadlines.length)
      : 5

    return NextResponse.json({
      headlines: headlines || [],
      overallDrama,
    })
  } catch (error) {
    console.error('Error in headlines API:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

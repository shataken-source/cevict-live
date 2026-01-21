import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Validate Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[API] Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Server configuration error', 
        message: 'Supabase credentials not configured. Please check environment variables.',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 })
    }

    // Fetch headlines ordered by drama score and recency
    // Try with reactions join first, fallback to simple query if it fails
    let headlines: any[] = []
    let error: any = null

    try {
      const queryPromise = supabase
        .from('headlines')
        .select(`
          *,
          reactions:reactions(reaction_type)
        `)
        .order('drama_score', { ascending: false })
        .order('posted_at', { ascending: false })
        .limit(100)

      const result = await Promise.race([queryPromise, queryTimeout]) as any
      headlines = result.data || []
      error = result.error
    } catch (timeoutError: any) {
      console.error('[API] Query timeout, trying simple query')
      error = timeoutError
    }

    // If join fails (e.g., RLS issue or timeout), try without reactions
    if (error) {
      console.warn('[API] Headlines query with reactions failed, trying without:', error.message)
      try {
        const simpleQueryPromise = supabase
          .from('headlines')
          .select('*')
          .order('drama_score', { ascending: false })
          .order('posted_at', { ascending: false })
          .limit(100)

        const simpleResult = await Promise.race([simpleQueryPromise, queryTimeout]) as any
        
        if (simpleResult.error) {
          console.error('[API] Error fetching headlines (simple query):', simpleResult.error)
          return NextResponse.json({ 
            error: 'Failed to fetch headlines', 
            message: simpleResult.error.message,
            code: simpleResult.error.code,
            details: simpleResult.error,
            hint: 'Check RLS policies and schema cache'
          }, { status: 500 })
        }
        
        headlines = simpleResult.data || []
        error = null
      } catch (simpleTimeoutError) {
        console.error('[API] Simple query also timed out')
        return NextResponse.json({ 
          error: 'Request timeout', 
          message: 'Database query took too long. Please try again.',
        }, { status: 504 })
      }
    }

    // Log for debugging
    const duration = Date.now() - startTime
    console.log(`[API] Fetched ${headlines?.length || 0} headlines in ${duration}ms`)
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

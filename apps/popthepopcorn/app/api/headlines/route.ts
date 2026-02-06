import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering (can't be statically generated due to DB queries)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // IMMEDIATE response if we can't connect - don't even try
  const startTime = Date.now()
  
  try {
    // Validate Supabase configuration FIRST - return immediately if missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[API] Missing Supabase environment variables - returning empty array immediately')
      // Always return empty array instead of error to prevent hanging
      return NextResponse.json({
        headlines: [],
        overallDrama: 5,
        warning: 'Supabase not configured',
      })
    }

    // Create Supabase client inside the handler to avoid module-level issues
    // Add timeout to client creation itself
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'public' },
        auth: { persistSession: false },
      })
    } catch (clientError) {
      console.error('[API] Failed to create Supabase client:', clientError)
      return NextResponse.json({
        headlines: [],
        overallDrama: 5,
        warning: 'Database connection failed',
      })
    }

    // Fetch headlines ordered by drama score and recency
    // Try with reactions join first, fallback to simple query if it fails
    let headlines: Array<{
      id: string
      title: string
      url: string
      source: string
      category: string
      drama_score: number
      upvotes: number
      downvotes: number
      posted_at: string
      is_breaking: boolean
      [key: string]: unknown
    }> = []
    let error: Error | { code?: string; message: string } | null = null

    // Aggressive timeout: 2 seconds max for first query
    const QUERY_TIMEOUT_MS = 2000
    let timeoutHandle: NodeJS.Timeout | null = null
    
    try {
      const queryPromise = supabase
        .from('headlines')
        .select('*') // Skip reactions join initially - too slow
        .order('drama_score', { ascending: false })
        .order('posted_at', { ascending: false })
        .limit(50) // Reduced limit for faster query

      // Race between query and timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error('Database query timeout after 2 seconds'))
        }, QUERY_TIMEOUT_MS)
      })

      const result = await Promise.race([queryPromise, timeoutPromise]) as {
        data: typeof headlines | null
        error: { code?: string; message: string } | null
      }
      
      if (timeoutHandle) clearTimeout(timeoutHandle)
      
      headlines = result.data || []
      error = result.error
    } catch (timeoutError: unknown) {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      console.error('[API] Query timeout:', timeoutError)
      // Return empty array immediately on timeout
      return NextResponse.json({ 
        headlines: [],
        overallDrama: 5,
        warning: 'Database query timed out. Please check connection.',
      })
    }

    // If query failed, return empty array immediately (no retries to prevent hanging)
    if (error) {
      const errorMessage = error instanceof Error ? error.message : error?.message || 'Unknown error'
      console.warn('[API] Headlines query failed:', errorMessage)
      // Always return empty array instead of error to prevent hanging
      return NextResponse.json({ 
        headlines: [],
        overallDrama: 5,
        warning: `Database error: ${errorMessage}`,
      })
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

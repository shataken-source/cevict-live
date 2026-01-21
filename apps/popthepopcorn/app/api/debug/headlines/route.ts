import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Diagnostic endpoint to debug headline fetching issues
 * GET /api/debug/headlines
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...' || 'missing',
    },
    tests: {},
  }

  try {
    // Test 1: Simple count query
    const { count, error: countError } = await supabase
      .from('headlines')
      .select('*', { count: 'exact', head: true })
    
    diagnostics.tests.countQuery = {
      success: !countError,
      count: count || 0,
      error: countError?.message || null,
      code: countError?.code || null,
    }

    // Test 2: Simple select (limit 1)
    const { data: sample, error: sampleError } = await supabase
      .from('headlines')
      .select('id, title, drama_score')
      .limit(1)
    
    diagnostics.tests.sampleQuery = {
      success: !sampleError,
      hasData: !!sample && sample.length > 0,
      sample: sample?.[0] || null,
      error: sampleError?.message || null,
      code: sampleError?.code || null,
    }

    // Test 3: Full query (what the API uses)
    const { data: full, error: fullError } = await supabase
      .from('headlines')
      .select('*')
      .order('drama_score', { ascending: false })
      .limit(10)
    
    diagnostics.tests.fullQuery = {
      success: !fullError,
      count: full?.length || 0,
      error: fullError?.message || null,
      code: fullError?.code || null,
    }

    // Test 4: Query with reactions join
    const { data: withReactions, error: reactionsError } = await supabase
      .from('headlines')
      .select(`
        *,
        reactions:reactions(reaction_type)
      `)
      .limit(1)
    
    diagnostics.tests.reactionsJoin = {
      success: !reactionsError,
      hasData: !!withReactions && withReactions.length > 0,
      error: reactionsError?.message || null,
      code: reactionsError?.code || null,
    }

    // Test 5: Check RLS status (if possible)
    try {
      const { data: rlsCheck, error: rlsError } = await supabase
        .rpc('check_rls_status', { table_name: 'headlines' })
        .single()
      
      diagnostics.tests.rlsStatus = {
        success: !rlsError,
        data: rlsCheck,
        error: rlsError?.message || null,
      }
    } catch (e) {
      diagnostics.tests.rlsStatus = {
        success: false,
        error: 'RPC function not available',
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    diagnostics.error = {
      message: error.message,
      stack: error.stack,
    }
    return NextResponse.json(diagnostics, { status: 500 })
  }
}

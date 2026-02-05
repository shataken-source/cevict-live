import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Check authentication
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try to query the headlines table to verify it exists
    const { data, error } = await supabase
      .from('headlines')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
      }, { status: 200 })
    }

    // Also check what tables are available
    let tables = null
    try {
      const { data } = await supabase.rpc('get_tables', {})
      tables = data
    } catch (error) {
      // RPC function may not exist, ignore
    }

    return NextResponse.json({
      exists: true,
      tableCount: data?.length || 0,
      message: 'Headlines table exists and is accessible',
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      exists: false,
      error: errorMessage,
    }, { status: 200 })
  }
}

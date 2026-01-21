import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  // Check authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('reported_stories')
      .select(`
        *,
        headline:headlines(*)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching reported stories:', error)
      return NextResponse.json({ error: 'Failed to fetch reported stories' }, { status: 500 })
    }

    return NextResponse.json({ reported: data || [] })
  } catch (error) {
    console.error('Error in reported stories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  // Check authentication
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { reportId, status } = await request.json()

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Missing reportId or status' }, { status: 400 })
    }

    if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reported_stories')
      .update({ status })
      .eq('id', reportId)

    if (error) {
      console.error('Error updating report:', error)
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reported stories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

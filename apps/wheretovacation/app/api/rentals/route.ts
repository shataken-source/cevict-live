import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    )
  }

  try {
    // Query accommodations table (if it exists)
    const { data: rentals, error } = await admin
      .from('accommodations')
      .select('*')
      .eq('available_for_booking', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // Table might not exist yet - return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          rentals: [],
          message: 'Rentals table not yet set up. This is expected for new installations.',
        })
      }
      throw error
    }

    return NextResponse.json({
      rentals: rentals || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load rentals', details: error.message },
      { status: 500 }
    )
  }
}

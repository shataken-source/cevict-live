import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    )
  }

  const { data: bookings, error } = await admin
    .from('bookings')
    .select('id, rental_id, check_in, check_out, total_amount, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[bookings/list] Failed to load bookings:', error.message)
    return NextResponse.json(
      { error: 'Failed to load bookings' },
      { status: 500 }
    )
  }

  const list = bookings || []
  const bookingIds = list.map((b: { id: string }) => b.id)

  let packageSet = new Set<string>()
  if (bookingIds.length > 0) {
    const { data: unified } = await admin
      .from('unified_bookings')
      .select('wtv_booking_id')
      .eq('user_id', user.id)
      .eq('is_package', true)
      .in('wtv_booking_id', bookingIds)
    if (unified?.length) {
      packageSet = new Set(unified.map((u: { wtv_booking_id: string }) => u.wtv_booking_id))
    }
  }

  const bookingsWithBundle = list.map((b: { id: string; [k: string]: unknown }) => ({
    ...b,
    is_package: packageSet.has(b.id),
  }))

  return NextResponse.json({
    ok: true,
    bookings: bookingsWithBundle,
  })
}


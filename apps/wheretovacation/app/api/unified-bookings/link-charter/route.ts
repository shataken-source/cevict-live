/**
 * Link a GCC charter booking to an existing WTV rental (unified_bookings).
 * POST { wtv_booking_id, gcc_booking_id?, gcc_vessel_id?, gcc_trip_date?, gcc_duration_hours?, gcc_passengers?, gcc_total? }
 * Finds unified_booking by wtv_booking_id (must belong to current user), updates to package and sets GCC fields.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getServerUser } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: {
    wtv_booking_id?: string
    gcc_booking_id?: string
    gcc_vessel_id?: string
    gcc_trip_date?: string
    gcc_duration_hours?: number
    gcc_passengers?: number
    gcc_total?: number
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wtvBookingId = body.wtv_booking_id
  if (!wtvBookingId) {
    return NextResponse.json({ error: 'wtv_booking_id required' }, { status: 400 })
  }

  const { data: existing, error: fetchError } = await admin
    .from('unified_bookings')
    .select('id, user_id, wtv_subtotal, wtv_total, total_amount')
    .eq('wtv_booking_id', wtvBookingId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Unified booking not found for this WTV booking' }, { status: 404 })
  }

  const gccTotal = typeof body.gcc_total === 'number' ? body.gcc_total : 0
  const wtvSub = Number(existing.wtv_subtotal) || Number(existing.wtv_total) || 0
  const newSubtotal = wtvSub + gccTotal

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    booking_type: 'package',
    is_package: true,
    gcc_booking_id: body.gcc_booking_id || null,
    gcc_vessel_id: body.gcc_vessel_id || null,
    gcc_trip_date: body.gcc_trip_date || null,
    gcc_duration_hours: body.gcc_duration_hours ?? null,
    gcc_passengers: body.gcc_passengers ?? null,
    gcc_subtotal: gccTotal,
    gcc_total: gccTotal,
    wtv_subtotal: wtvSub,
    subtotal: newSubtotal,
    total_amount: newSubtotal,
    total_amount_usd: newSubtotal,
  }

  const { data: updated, error: updateError } = await admin
    .from('unified_bookings')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, booking: updated })
}
